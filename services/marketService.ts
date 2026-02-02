
import { Asset, AssetType } from "../types";
import * as XLSX from 'xlsx';
// @ts-ignore
import * as pdfjsLib from 'pdfjs-dist';

const PDFJS_VERSION = '4.10.38';
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.mjs`;

/**
 * Função de fetch via Proxy AllOrigins para contornar CORS e bloqueios de rede.
 */
async function safeFetch(url: string, useProxy = true): Promise<any> {
  try {
    const fetchUrl = useProxy 
      ? `https://api.allorigins.win/get?url=${encodeURIComponent(url)}&timestamp=${Date.now()}` 
      : url;
      
    const response = await fetch(fetchUrl);
    if (!response.ok) return null;

    const data = await response.json();
    if (useProxy && data.contents) {
      return JSON.parse(data.contents);
    }
    return data;
  } catch (error) {
    console.error(`[MarketService] Yahoo Finance Fetch Error:`, error);
    return null;
  }
}

/**
 * Busca a cotação USD/BRL via Yahoo Finance (USDBRL=X)
 */
export async function fetchUsdRate(): Promise<number> {
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=USDBRL=X`;
  const data = await safeFetch(url);
  const rate = data?.quoteResponse?.result?.[0]?.regularMarketPrice;
  
  if (!rate) {
    console.warn("[MarketService] Falha ao obter USD/BRL do Yahoo, usando fallback 5.60");
    return 5.60;
  }
  return parseFloat(rate);
}

/**
 * Transforma o ticker interno no formato esperado pelo Yahoo Finance
 */
function mapTickerToYahoo(ticker: string): string {
  const t = ticker.toUpperCase();
  const cryptoList = ['BTC', 'ETH', 'SOL', 'USDT', 'ADA', 'DOGE', 'USDC', 'XRP', 'DOT', 'LINK'];
  
  // 1. Cripto (Ex: BTC -> BTC-USD)
  if (cryptoList.includes(t)) return `${t}-USD`;
  
  // 2. B3 / Brasil (Ex: PETR4 -> PETR4.SA)
  // Regra: 4 letras + número(s)
  if (/^[A-Z]{4}[0-9]{1,2}$/.test(t)) return `${t}.SA`;
  
  // 3. Internacional / US (Ex: AAPL -> AAPL)
  return t;
}

/**
 * Busca preços no Yahoo Finance para um lote de tickers
 */
async function fetchYahooBatch(tickers: string[], usdRate: number): Promise<Record<string, number>> {
  if (tickers.length === 0) return {};
  
  const results: Record<string, number> = {};
  // Mapeia os tickers para o formato Yahoo
  const yahooTickersMap = tickers.reduce((acc, t) => {
    acc[mapTickerToYahoo(t)] = t;
    return acc;
  }, {} as Record<string, string>);

  const symbols = Object.keys(yahooTickersMap).join(',');
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols}`;
  
  const data = await safeFetch(url);

  if (data?.quoteResponse?.result) {
    data.quoteResponse.result.forEach((item: any) => {
      const originalTicker = yahooTickersMap[item.symbol.toUpperCase()];
      if (originalTicker && typeof item.regularMarketPrice === 'number') {
        let price = item.regularMarketPrice;
        
        // Se a moeda do ativo for USD, convertemos para BRL para o portfólio consolidado
        if (item.currency === 'USD') {
          price = price * usdRate;
        }
        
        results[originalTicker] = price;
      }
    });
  }

  return results;
}

/**
 * Orquestrador Principal de Cotações (Total Yahoo Finance)
 */
export async function fetchCurrentPrices(tickers: string[]): Promise<Record<string, number>> {
  const uniqueTickers = Array.from(new Set(tickers.map(t => t.toUpperCase()))).filter(t => t && t.length > 0);
  if (uniqueTickers.length === 0) return {};

  try {
    const usdRate = await fetchUsdRate();
    // Dividimos em chunks de 40 para evitar URLs muito longas (embora o Yahoo aceite bastante)
    const CHUNK_SIZE = 40;
    const finalResults: Record<string, number> = {};
    
    for (let i = 0; i < uniqueTickers.length; i += CHUNK_SIZE) {
      const chunk = uniqueTickers.slice(i, i + CHUNK_SIZE);
      const batchResults = await fetchYahooBatch(chunk, usdRate);
      Object.assign(finalResults, batchResults);
    }

    return finalResults;
  } catch (err) {
    console.error("[MarketService] Critical error in fetchCurrentPrices:", err);
    return {};
  }
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
