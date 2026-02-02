
import { Asset, AssetType } from "../types";
import * as XLSX from 'xlsx';
// @ts-ignore
import * as pdfjsLib from 'pdfjs-dist';

const PDFJS_VERSION = '4.10.38';
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.mjs`;

const BRAPI_TOKEN = "71LiaxkJdh38TusGMWWcbe"; 

/**
 * Busca preço do Dólar atualizado para conversão
 */
export async function fetchUsdRate(): Promise<number> {
  try {
    const response = await fetch(`https://brapi.dev/api/v2/currency?currency=USD-BRL&token=${BRAPI_TOKEN}`);
    const data = await response.json();
    return data.currency?.[0]?.bidPrice || 5.0; // Fallback seguro
  } catch (error) {
    return 5.0;
  }
}

export async function fetchCurrentPrices(tickers: string[]): Promise<Record<string, number>> {
  if (tickers.length === 0) return {};
  try {
    const results: Record<string, number> = {};
    const usdRate = await fetchUsdRate();

    // Separa tickers BR de US
    const brTickers = tickers.filter(t => /^[A-Z]{4}(3|4|5|6|11)$/.test(t.toUpperCase()));
    const usTickers = tickers.filter(t => !brTickers.includes(t));

    // Busca BR
    if (brTickers.length > 0) {
      const response = await fetch(`https://brapi.dev/api/quote/${brTickers.join(',')}?token=${BRAPI_TOKEN}`);
      const data = await response.json();
      data.results?.forEach((item: any) => {
        if (item.symbol && item.regularMarketPrice) {
          results[item.symbol] = item.regularMarketPrice;
        }
      });
    }

    // Busca US (Brapi usa rota v2/quote para ativos internacionais em muitos casos)
    if (usTickers.length > 0) {
      const response = await fetch(`https://brapi.dev/api/v2/quote?symbols=${usTickers.join(',')}&token=${BRAPI_TOKEN}`);
      const data = await response.json();
      data.results?.forEach((item: any) => {
        if (item.symbol && item.regularMarketPrice) {
          // Converte para Real automaticamente para o Dashboard consolidado
          results[item.symbol] = item.regularMarketPrice * usdRate;
        }
      });
    }

    return results;
  } catch (error) {
    console.error("Erro na busca de preços:", error);
    return {};
  }
}

export async function parseExcelLogic(data: ArrayBuffer): Promise<Partial<Asset>[]> {
  const workbook = XLSX.read(data, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
  
  if (json.length < 1) return [];
  const textContent = json.map(row => row.join(';')).join('\n');
  return legacyParser(textContent.split('\n'));
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
    return legacyParser(fullText.split('\n'));
  } catch (err) {
    throw new Error("Falha ao ler o PDF.");
  }
}

export function parseBrokerCsvLogic(csvText: string): Partial<Asset>[] {
  const lines = csvText.split(/\r?\n/);
  if (lines.length < 2) return [];
  return legacyParser(lines);
}

function legacyParser(lines: string[]): Partial<Asset>[] {
  const results: Partial<Asset>[] = [];
  lines.forEach(line => {
    const parts = line.split(/[\s,;]+/).map(p => p.trim());
    // Ticker match agora aceita 1-5 letras (US) ou padrão B3
    const tickerMatch = parts.find(p => /^[A-Z]{1,5}$/.test(p) || /^[A-Z]{4}(3|4|5|6|11)$/.test(p));
    
    if (tickerMatch) {
      const numbers = parts
        .map(p => p.replace(/[R$\s.]/g, '').replace(',', '.'))
        .filter(p => !isNaN(parseFloat(p)) && parseFloat(p) !== 0 && p !== tickerMatch);
      
      if (numbers.length >= 2) {
        const val1 = parseFloat(numbers[0]);
        const val2 = parseFloat(numbers[1]);
        results.push({
          ticker: tickerMatch,
          quantity: val1,
          averagePrice: val2
        });
      }
    }
  });
  return results;
}
