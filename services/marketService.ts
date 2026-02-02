
import { Asset, AssetType } from "../types";
import * as XLSX from 'xlsx';
// @ts-ignore
import * as pdfjsLib from 'pdfjs-dist';

// Configuração do worker do PDF.js via CDN
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs`;

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

/**
 * Parser para arquivos Excel (.xlsx, .xls)
 */
export async function parseExcelLogic(data: ArrayBuffer): Promise<Partial<Asset>[]> {
  const workbook = XLSX.read(data, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
  
  if (json.length < 1) return [];

  // Flatten the excel into strings to use the legacy text parser logic
  const textContent = json.map(row => row.join(';')).join('\n');
  return legacyParser(textContent.split('\n'));
}

/**
 * Parser para arquivos PDF (Notas de Corretagem ou Extratos)
 */
export async function parsePdfLogic(data: ArrayBuffer): Promise<Partial<Asset>[]> {
  const loadingTask = pdfjsLib.getDocument({ data });
  const pdf = await loadingTask.promise;
  let fullText = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(' ');
    fullText += pageText + "\n";
  }

  // O PDF costuma ser bagunçado, o legacyParser é ideal aqui pois busca padrões de ticker
  return legacyParser(fullText.split('\n'));
}

export function parseBrokerCsvLogic(csvText: string): Partial<Asset>[] {
  const lines = csvText.split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = lines[0].toLowerCase().split(/[;,]/);
  const results: Partial<Asset>[] = [];

  const colIndex = {
    ticker: headers.findIndex(h => h.includes('ativo') || h.includes('ticker') || h.includes('código') || h.includes('papel')),
    qty: headers.findIndex(h => h.includes('qtd') || h.includes('quantidade')),
    price: headers.findIndex(h => h.includes('preço') || h.includes('medio') || h.includes('valor unitário'))
  };

  if (colIndex.ticker === -1) {
    return legacyParser(lines);
  }

  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(/[;,]/).map(c => c.trim());
    if (cells.length < 2) continue;

    const ticker = cells[colIndex.ticker]?.toUpperCase();
    const qty = parseFloat(cells[colIndex.qty]?.replace(',', '.'));
    const price = parseFloat(cells[colIndex.price]?.replace(',', '.'));

    if (ticker && !isNaN(qty) && !isNaN(price)) {
      results.push({
        ticker,
        quantity: qty,
        averagePrice: price,
        type: ticker.endsWith('11') ? AssetType.FII : AssetType.STOCK
      });
    }
  }

  return results;
}

function legacyParser(lines: string[]): Partial<Asset>[] {
  const results: Partial<Asset>[] = [];
  lines.forEach(line => {
    // Regex para tickers brasileiros: 4 letras + 1 ou 2 números (ex: PETR4, MXRF11)
    const parts = line.split(/[\s,;]+/).map(p => p.trim());
    const tickerMatch = parts.find(p => /^[A-Z]{4}(3|4|5|6|11)$/.test(p));
    
    if (tickerMatch) {
      // Procura números na linha que possam ser quantidade e preço
      const numbers = parts
        .map(p => p.replace(/[R$\s.]/g, '').replace(',', '.'))
        .filter(p => !isNaN(parseFloat(p)) && parseFloat(p) !== 0 && p !== tickerMatch);
      
      if (numbers.length >= 2) {
        // Assume o maior valor como preço e o menor (ou primeiro) como quantidade
        // Ou segue a ordem natural se parecer coerente
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
