
import { Asset, AssetType } from "../types";
import * as XLSX from 'xlsx';
// @ts-ignore
import * as pdfjsLib from 'pdfjs-dist';

const PDFJS_VERSION = '4.10.38';
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.mjs`;

// Configurações de API
const BRAPI_TOKEN = "71LiaxkJdh38TusGMWWcbe"; 
const BRAPI_CHUNK_SIZE = 20;

/**
 * Função de fetch segura que lida com Proxy para evitar erros de CORS
 * e Ad-blockers.
 */
async function safeFetch(url: string, useProxy = false): Promise<any> {
  try {
    // Usamos o endpoint /get do AllOrigins que é mais robusto que o /raw
    const fetchUrl = useProxy 
      ? `https://api.allorigins.win/get?url=${encodeURIComponent(url)}&timestamp=${Date.now()}` 
      : url;
      
    const response = await fetch(fetchUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      mode: 'cors'
    });

    if (!response.ok) {
      console.warn(`[MarketService] HTTP Error ${response.status} for: ${url}`);
      return null;
    }

    const data = await response.json();

    // Se usou o proxy /get, o JSON real está dentro da propriedade 'contents' como string
    if (useProxy && data.contents) {
      try {
        return JSON.parse(data.contents);
      } catch (e) {
        console.error(`[MarketService] Failed to parse proxied content for: ${url}`);
        return null;
      }
    }

    return data;
  } catch (error) {
    console.error(`[MarketService] Network/CORS Error for ${url}. Verifique se há ad-blockers ativos.`, error);
    return null;
  }
}

/**
 * Busca a cotação USD/BRL atual
 */
export async function fetchUsdRate(): Promise<number> {
  const data = await safeFetch(`https://brapi.dev/api/v2/currency?currency=USD-BRL&token=${BRAPI_TOKEN}`);
  const rate = data?.currency?.[0]?.bidPrice;
  if (!rate) {
    console.warn("[MarketService] Usando fallback para USD/BRL (5.50)");
    return 5.50;
  }
  return parseFloat(rate);
}

/**
 * Busca preços no Yahoo Finance (Internacional)
 * Requer proxy AllOrigins devido ao bloqueio de CORS do Yahoo
 */
async function fetchYahooFinanceBatch(tickers: string[]): Promise<Record<string, number>> {
  if (tickers.length === 0) return {};
  
  const results: Record<string, number> = {};
  const symbols = tickers.join(',');
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols}`;
  
  // SEMPRE usar proxy para Yahoo Finance no navegador
  const data = await safeFetch(url, true);

  if (data?.quoteResponse?.result) {
    data.quoteResponse.result.forEach((item: any) => {
      if (item.symbol && typeof item.regularMarketPrice === 'number') {
        results[item.symbol.toUpperCase()] = item.regularMarketPrice;
      }
    });
  }

  return results;
}

/**
 * Busca preços na Brapi (Nacional e Cripto)
 */
async function fetchBrapiBatch(tickers: string[], usdRate: number): Promise<Record<string, number>> {
  if (tickers.length === 0) return {};
  
  const results: Record<string, number> = {};
  const chunks = [];
  for (let i = 0; i < tickers.length; i += BRAPI_CHUNK_SIZE) {
    chunks.push(tickers.slice(i, i + BRAPI_CHUNK_SIZE));
  }

  for (const chunk of chunks) {
    const url = `https://brapi.dev/api/quote/${chunk.join(',')}?token=${BRAPI_TOKEN}`;
    // Brapi costuma aceitar CORS, mas se falhar, AllOrigins pode ser usado aqui também
    const data = await safeFetch(url);

    if (data?.results) {
      data.results.forEach((item: any) => {
        if (item.symbol && typeof item.regularMarketPrice === 'number') {
          let price = item.regularMarketPrice;
          if (item.currency === 'USD') price = price * usdRate;
          results[item.symbol.toUpperCase()] = price;
        }
      });
    }
  }

  return results;
}

/**
 * Orquestrador Principal de Cotações
 */
export async function fetchCurrentPrices(tickers: string[]): Promise<Record<string, number>> {
  const uniqueTickers = Array.from(new Set(tickers.map(t => t.toUpperCase()))).filter(t => t && t.length > 0);
  if (uniqueTickers.length === 0) return {};

  const usdRate = await fetchUsdRate();

  // Separação de Tickers: Cripto, B3 (Nacionais) e Internacionais
  const cryptoList = ['BTC', 'ETH', 'SOL', 'USDT', 'ADA', 'DOGE', 'USDC', 'XRP', 'DOT', 'LINK'];
  const brTickers = uniqueTickers.filter(t => {
    const isCrypto = cryptoList.includes(t);
    const isB3 = /[0-9]$/.test(t); 
    return isB3 || isCrypto;
  });
  
  const intlTickers = uniqueTickers.filter(t => !brTickers.includes(t));

  const [brResults, intlResultsUsd] = await Promise.all([
    fetchBrapiBatch(brTickers, usdRate),
    fetchYahooFinanceBatch(intlTickers)
  ]);

  const finalResults: Record<string, number> = { ...brResults };

  // Converte resultados internacionais (USD) para BRL
  Object.entries(intlResultsUsd).forEach(([ticker, priceUsd]) => {
    finalResults[ticker] = (priceUsd as number) * usdRate;
  });

  return finalResults;
}

export async function parseExcelLogic(data: ArrayBuffer): Promise<Partial<Asset>[]> {
  const workbook = XLSX.read(data, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
  
  if (json.length < 1) return [];
  const textContent = json.map(row => row.join(' ')).join('\n');
  return universalParser(textContent);
}

export async function parsePdfLogic(data: ArrayBuffer): Promise<Partial<Asset>[]> {
  try {
    const loadingTask = pdfjsLib.getDocument({ data });
    const pdf = await loadingTask.promise;
    let fullText = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => 'str' in item ? item.str : '').join(' ');
      fullText += pageText + "\n";
    }
    return universalParser(fullText);
  } catch (err) {
    throw new Error("Falha ao ler o PDF.");
  }
}

export function parseBrokerCsvLogic(csvText: string): Partial<Asset>[] {
  return universalParser(csvText);
}

function universalParser(text: string): Partial<Asset>[] {
  const lines = text.split(/\n/);
  const results: Partial<Asset>[] = [];
  
  lines.forEach(line => {
    const words = line.split(/[\s,;]+/).filter(w => w.length > 0);
    const tickerMatch = words.find(w => /^[A-Z]{4}(3|4|5|6|11)$/.test(w) || /^[A-Z]{1,5}$/.test(w));
    
    if (tickerMatch) {
      const numbers = words
        .map(w => w.replace(/[R$]/g, '').replace(/\./g, '').replace(',', '.'))
        .map(w => parseFloat(w))
        .filter(n => !isNaN(n) && n !== 0 && n.toString() !== tickerMatch);

      if (numbers.length >= 2) {
        results.push({
          ticker: tickerMatch.toUpperCase(),
          quantity: numbers[0],
          averagePrice: numbers[1]
        });
      }
    }
  });

  const consolidated: Record<string, Partial<Asset>> = {};
  results.forEach(item => {
    const t = item.ticker!;
    if (!consolidated[t]) {
      consolidated[t] = { ...item };
    } else {
      const old = consolidated[t];
      const newQty = (old.quantity || 0) + (item.quantity || 0);
      const newCost = ((old.quantity || 0) * (old.averagePrice || 0)) + ((item.quantity || 0) * (item.averagePrice || 0));
      consolidated[t] = {
        ticker: t,
        quantity: newQty,
        averagePrice: newQty > 0 ? newCost / newQty : 0
      };
    }
  });

  return Object.values(consolidated);
}
