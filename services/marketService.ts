
import { Asset, AssetType } from "../types";
import * as XLSX from 'xlsx';
// @ts-ignore
import * as pdfjsLib from 'pdfjs-dist';

// Configuração robusta do worker
const PDFJS_VERSION = '4.10.38';
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.mjs`;

const BRAPI_TOKEN = "71LiaxkJdh38TusGMWWcbe"; 

export async function fetchCurrentPrices(tickers: string[]): Promise<Record<string, number>> {
  if (tickers.length === 0) return {};
  try {
    const b3Tickers = tickers.filter(t => t.length >= 5 || (t.length === 4 && !isNaN(Number(t.charAt(3)))));
    if (b3Tickers.length === 0) return {};
    const response = await fetch(`https://brapi.dev/api/quote/${b3Tickers.join(',')}?token=${BRAPI_TOKEN}`);
    if (!response.ok) return {};
    const data = await response.json();
    const results: Record<string, number> = {};
    if (data.results && Array.isArray(data.results)) {
      data.results.forEach((item: any) => {
        if (item.symbol && item.regularMarketPrice) {
          results[item.symbol] = item.regularMarketPrice;
        }
      });
    }
    return results;
  } catch (error) {
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
    console.error("Erro no PDF Parser:", err);
    throw new Error("Falha ao ler o PDF. Certifique-se que o arquivo não está protegido por senha.");
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
    const tickerMatch = parts.find(p => /^[A-Z]{4}(3|4|5|6|11)$/.test(p));
    
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
          averagePrice: val2,
          type: tickerMatch.endsWith('11') ? AssetType.FII : AssetType.STOCK
        });
      }
    }
  });
  return results;
}
