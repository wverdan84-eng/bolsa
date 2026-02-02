import { Asset, AssetType } from "../types";
import * as XLSX from 'xlsx';
// @ts-ignore
import * as pdfjsLib from 'pdfjs-dist';

const PDFJS_VERSION = '4.10.38';
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.mjs`;

// Configurações de API
const BRAPI_TOKEN = "71LiaxkJdh38TusGMWWcbe"; 
const BRAPI_CHUNK_SIZE = 20;
const TWELVE_DATA_CHUNK_SIZE = 8; // Limite do plano free para requisições em lote

const getStoredKey = (key: string) => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(key) || "";
  }
  return "";
};

async function safeFetch(url: string): Promise<any> {
  try {
    const response = await fetch(url);
    const text = await response.text();
    if (!response.ok) return null;
    return JSON.parse(text);
  } catch (error) {
    console.error(`[MarketService] Error fetching ${url}:`, error);
    return null;
  }
}

/**
 * Busca a cotação USD/BRL atual
 */
export async function fetchUsdRate(): Promise<number> {
  const data = await safeFetch(`https://brapi.dev/api/v2/currency?currency=USD-BRL&token=${BRAPI_TOKEN}`);
  return data?.currency?.[0]?.bidPrice || 5.50; 
}

/**
 * Busca preços na Twelve Data (Internacional)
 * Lida com o limite do plano free de 8 símbolos por lote
 */
async function fetchTwelveDataBatch(tickers: string[], apiKey: string): Promise<Record<string, number>> {
  if (tickers.length === 0 || !apiKey) return {};
  
  const results: Record<string, number> = {};
  const chunks = [];
  
  for (let i = 0; i < tickers.length; i += TWELVE_DATA_CHUNK_SIZE) {
    chunks.push(tickers.slice(i, i + TWELVE_DATA_CHUNK_SIZE));
  }

  for (const chunk of chunks) {
    const symbols = chunk.join(',');
    const url = `https://api.twelvedata.com/price?symbol=${symbols}&apikey=${apiKey}`;
    const data = await safeFetch(url);

    if (!data) continue;

    // Se pedir 1, retorna { price: "..." }
    // Se pedir vários, retorna { SYMBOL: { price: "..." } }
    if (chunk.length === 1) {
      const ticker = chunk[0];
      const price = parseFloat(data.price);
      if (!isNaN(price)) results[ticker] = price;
    } else {
      Object.keys(data).forEach(ticker => {
        const price = parseFloat(data[ticker]?.price);
        if (!isNaN(price)) results[ticker] = price;
      });
    }
    
    // Pequeno delay para evitar rate limit do plano free (8 req/min)
    if (chunks.length > 1) await new Promise(r => setTimeout(r, 500));
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
    const data = await safeFetch(url);

    if (data && data.results) {
      data.results.forEach((item: any) => {
        if (item.symbol && typeof item.regularMarketPrice === 'number') {
          let price = item.regularMarketPrice;
          // Se o ativo vier em USD pela Brapi, convertemos para BRL
          if (item.currency === 'USD') price = price * usdRate;
          results[item.symbol] = price;
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
  const uniqueTickers = Array.from(new Set(tickers)).filter(t => t && t.length > 0);
  if (uniqueTickers.length === 0) return {};

  const usdRate = await fetchUsdRate();
  const twelveKey = getStoredKey('bolsamaster_twelve_key');

  // Separação de Tickers
  const cryptoList = ['BTC', 'ETH', 'SOL', 'USDT', 'ADA', 'DOGE', 'USDC', 'XRP', 'DOT', 'LINK'];
  const brTickers = uniqueTickers.filter(t => {
    const isCrypto = cryptoList.includes(t.toUpperCase());
    const isB3 = /[0-9]$/.test(t); // Tickers B3 terminam em 3, 4, 11, etc.
    return isB3 || isCrypto;
  });
  
  const intlTickers = uniqueTickers.filter(t => !brTickers.includes(t));

  const [brResults, intlResultsUsd] = await Promise.all([
    fetchBrapiBatch(brTickers, usdRate),
    twelveKey ? fetchTwelveDataBatch(intlTickers, twelveKey) : Promise.resolve({} as Record<string, number>)
  ]);

  const finalResults: Record<string, number> = { ...brResults };

  // Converte resultados internacionais (USD) para BRL
  Object.entries(intlResultsUsd).forEach(([ticker, priceUsd]) => {
    // Explicitly cast priceUsd to number to avoid "unknown" type issues in some TS environments
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