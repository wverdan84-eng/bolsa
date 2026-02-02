
import { Asset, AssetType } from "../types";
import * as XLSX from 'xlsx';
// @ts-ignore
import * as pdfjsLib from 'pdfjs-dist';

const PDFJS_VERSION = '4.10.38';
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.mjs`;

const BRAPI_TOKEN = "71LiaxkJdh38TusGMWWcbe"; 

/**
 * Busca preço do Dólar (Fallback)
 */
export async function fetchUsdRate(): Promise<number> {
  try {
    const response = await fetch(`https://brapi.dev/api/v2/currency?currency=USD-BRL&token=${BRAPI_TOKEN}`);
    const data = await response.json();
    return data.currency?.[0]?.bidPrice || 5.45; 
  } catch {
    return 5.45;
  }
}

/**
 * BUSCA SECUNDÁRIA: Yahoo Finance (via Proxy)
 * Usado se a Brapi falhar ou não tiver o ticker.
 */
async function fetchFromYahooFinance(tickers: string[]): Promise<Record<string, number>> {
  const results: Record<string, number> = {};
  const usdRate = await fetchUsdRate();
  
  try {
    // Usamos o AllOrigins para evitar bloqueio de CORS do Yahoo Finance no navegador
    const symbols = tickers.map(t => {
       // Converte tickers BR para o formato Yahoo (ex: PETR4 -> PETR4.SA)
       if (/^[A-Z]{4}(3|4|5|6|11)$/.test(t.toUpperCase())) return `${t.toUpperCase()}.SA`;
       return t.toUpperCase();
    }).join(',');

    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(
      `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols}`
    )}`;

    const response = await fetch(proxyUrl);
    const data = await response.json();

    data.quoteResponse?.result?.forEach((quote: any) => {
      let ticker = quote.symbol.replace('.SA', '');
      let price = quote.regularMarketPrice;

      if (quote.currency === 'USD') {
        price = price * usdRate;
      }
      results[ticker] = price;
    });

    return results;
  } catch (error) {
    console.error("Yahoo Finance Fallback Error:", error);
    return {};
  }
}

/**
 * BUSCA PRINCIPAL: Brapi + Fallback Yahoo
 */
export async function fetchCurrentPrices(tickers: string[]): Promise<Record<string, number>> {
  if (tickers.length === 0) return {};
  
  let finalResults: Record<string, number> = {};
  const usdRate = await fetchUsdRate();

  try {
    const brTickers = tickers.filter(t => /^[A-Z]{4}(3|4|5|6|11)$/.test(t.toUpperCase()));
    const usTickers = tickers.filter(t => !brTickers.includes(t));

    // 1. Tenta Brapi
    if (brTickers.length > 0) {
      const resp = await fetch(`https://brapi.dev/api/quote/${brTickers.join(',')}?token=${BRAPI_TOKEN}`);
      const data = await resp.json();
      data.results?.forEach((item: any) => {
        if (item.symbol && item.regularMarketPrice) finalResults[item.symbol] = item.regularMarketPrice;
      });
    }

    if (usTickers.length > 0) {
      const resp = await fetch(`https://brapi.dev/api/v2/quote?symbols=${usTickers.join(',')}&token=${BRAPI_TOKEN}`);
      const data = await resp.json();
      data.results?.forEach((item: any) => {
        if (item.symbol && item.regularMarketPrice) finalResults[item.symbol] = item.regularMarketPrice * usdRate;
      });
    }

    // 2. Verifica tickers faltantes
    const missing = tickers.filter(t => !finalResults[t]);
    if (missing.length > 0) {
      console.log(`Buscando ${missing.length} ativos no Yahoo Finance...`);
      const yahooData = await fetchFromYahooFinance(missing);
      finalResults = { ...finalResults, ...yahooData };
    }

    return finalResults;
  } catch (error) {
    // Se a Brapi cair totalmente, tenta tudo no Yahoo
    return fetchFromYahooFinance(tickers);
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
