
import { Asset, AssetType } from "../types";
import * as XLSX from 'xlsx';
// @ts-ignore
import * as pdfjsLib from 'pdfjs-dist';

const PDFJS_VERSION = '4.10.38';
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.mjs`;

// Configurações de API
const BRAPI_TOKEN = "71LiaxkJdh38TusGMWWcbe"; 
const TWELVE_DATA_TOKEN = "demo"; // SUBSTITUA POR SUA API KEY DA TWELVE DATA (https://twelvedata.com)
const CHUNK_SIZE = 20;

/**
 * Helper para requisições seguras
 */
async function safeFetch(url: string): Promise<any> {
  try {
    const response = await fetch(url);
    const text = await response.text();

    if (!response.ok) {
      console.warn(`[MarketService] Request failed: ${response.status} for ${url}`);
      return null;
    }

    try {
      return JSON.parse(text);
    } catch (e) {
      console.warn(`[MarketService] Invalid JSON received from ${url}`);
      return null;
    }
  } catch (error) {
    console.warn(`[MarketService] Network error: ${(error as Error).message}`);
    return null;
  }
}

/**
 * Busca preço do Dólar (Usado para converter preços da Twelve Data)
 */
export async function fetchUsdRate(): Promise<number> {
  const data = await safeFetch(`https://brapi.dev/api/v2/currency?currency=USD-BRL&token=${BRAPI_TOKEN}`);
  return data?.currency?.[0]?.bidPrice || 5.50; 
}

/**
 * Busca na TWELVE DATA (Apenas Internacional)
 */
async function fetchTwelveDataPrices(tickers: string[]): Promise<Record<string, number>> {
  if (tickers.length === 0) return {};
  
  // Twelve Data usa símbolos separados por vírgula (ex: AAPL,MSFT)
  // Endpoint: https://api.twelvedata.com/price?symbol=...&apikey=...
  const url = `https://api.twelvedata.com/price?symbol=${tickers.join(',')}&apikey=${TWELVE_DATA_TOKEN}`;
  
  const data = await safeFetch(url);
  const results: Record<string, number> = {};

  if (!data) return {};

  // Se pedir apenas 1 ticker, a Twelve Data retorna o objeto direto (ex: {price: 150})
  // Se pedir vários, retorna { AAPL: {price: 150}, MSFT: {price: 300} }
  
  if (tickers.length === 1 && data.price) {
    const price = parseFloat(data.price);
    if (!isNaN(price)) results[tickers[0]] = price;
  } else {
    // Resposta múltipla
    Object.keys(data).forEach(key => {
      if (data[key]?.price) {
        const price = parseFloat(data[key].price);
        if (!isNaN(price)) results[key] = price;
      }
    });
  }

  return results;
}

/**
 * Busca na BRAPI (Brasil e Cripto)
 */
async function fetchBrapiPrices(tickers: string[], usdRate: number): Promise<Record<string, number>> {
  if (tickers.length === 0) return {};
  
  const chunks = [];
  for (let i = 0; i < tickers.length; i += CHUNK_SIZE) {
    chunks.push(tickers.slice(i, i + CHUNK_SIZE));
  }

  const promises = chunks.map(async (chunk) => {
    const url = `https://brapi.dev/api/quote/${chunk.join(',')}?token=${BRAPI_TOKEN}`;
    const data = await safeFetch(url);
    const chunkResults: Record<string, number> = {};

    if (data && data.results && Array.isArray(data.results)) {
      data.results.forEach((item: any) => {
        if (item.symbol && typeof item.regularMarketPrice === 'number') {
          let price = item.regularMarketPrice;
          if (item.currency === 'USD') price = price * usdRate; // Fallback caso Brapi retorne algo em USD
          chunkResults[item.symbol] = price;
        }
      });
    }
    return chunkResults;
  });

  const allResults = await Promise.all(promises);
  let final: Record<string, number> = {};
  allResults.forEach(r => { final = { ...final, ...r }; });
  return final;
}

/**
 * ORQUESTRADOR PRINCIPAL
 * Separa os tickers e chama a API correta para cada grupo
 */
export async function fetchCurrentPrices(tickers: string[]): Promise<Record<string, number>> {
  const validTickers = Array.from(new Set(tickers)).filter(t => t && t.trim().length > 0);
  if (validTickers.length === 0) return {};

  const usdRate = await fetchUsdRate();
  const results: Record<string, number> = {};

  // 1. Separação de Tickers
  // Brasil/Cripto: Termina em número (PETR4), termina em 11 (FIIs), ou Criptos conhecidas
  const cryptoList = ['BTC', 'ETH', 'SOL', 'USDT', 'ADA', 'DOGE'];
  
  const brTickers = validTickers.filter(t => {
    const isCrypto = cryptoList.includes(t.toUpperCase()) || cryptoList.some(c => t.toUpperCase().includes(c));
    const isB3 = /[0-9]$/.test(t); // Termina em número (ex: 3, 4, 11)
    return isB3 || isCrypto;
  });

  // Internacional: O que sobrar (Stocks e REITs geralmente são apenas letras, ex: AAPL, O, VNQ)
  const intlTickers = validTickers.filter(t => !brTickers.includes(t));

  // 2. Execução Paralela
  const [brPrices, intlPricesInUsd] = await Promise.all([
    fetchBrapiPrices(brTickers, usdRate),
    fetchTwelveDataPrices(intlTickers)
  ]);

  // 3. Processamento Brasil (Já vem em BRL da Brapi)
  Object.assign(results, brPrices);

  // 4. Processamento Internacional (Vem em USD da Twelve Data, converte para BRL)
  Object.entries(intlPricesInUsd).forEach(([ticker, priceUsd]) => {
    results[ticker] = priceUsd * usdRate;
  });

  return results;
}

// ... (Restante das funções de parseExcelLogic, parsePdfLogic mantidas iguais)

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
