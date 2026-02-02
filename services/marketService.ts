import { Asset, AssetType } from "../types";

// COLOQUE SUA CHAVE DA BRAPI AQUI
const BRAPI_TOKEN = "71LiaxkJdh38TusGMWWcbe"; 

/**
 * INTEGRAÇÃO REAL (Brapi.dev)
 * Documentação: https://brapi.dev/docs
 */
export async function fetchCurrentPrices(tickers: string[]): Promise<Record<string, number>> {
  if (tickers.length === 0) return {};
  
  try {
    // Filtra apenas tickers que parecem ser da B3 (evita mandar BTC/ETH para Brapi se não estiver no plano certo)
    const b3Tickers = tickers.filter(t => t.length >= 5 || (t.length === 4 && !isNaN(Number(t.charAt(3)))));
    
    if (b3Tickers.length === 0) return {};

    const response = await fetch(
      `https://brapi.dev/api/quote/${b3Tickers.join(',')}?token=${BRAPI_TOKEN}`
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Erro na Brapi:", errorData.message || response.statusText);
      return {};
    }

    const data = await response.json();
    const results: Record<string, number> = {};

    // A Brapi retorna um array em data.results
    if (data.results && Array.isArray(data.results)) {
      data.results.forEach((item: any) => {
        if (item.symbol && item.regularMarketPrice) {
          results[item.symbol] = item.regularMarketPrice;
        }
      });
    }

    return results;
  } catch (error) {
    console.error("Erro de rede ao buscar cotações:", error);
    return {};
  }
}

/**
 * Parser Robusto para Corretoras Brasileiras
 * Tenta identificar colunas por nome (Case Insensitive)
 */
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
    const parts = line.split(/[;,]/).map(p => p.trim());
    const tickerMatch = parts.find(p => /^[A-Z]{4}[3456]|11$/.test(p));
    if (tickerMatch) {
      const numbers = parts
        .map(p => p.replace(',', '.'))
        .filter(p => !isNaN(parseFloat(p)) && parseFloat(p) !== 0);
      if (numbers.length >= 2) {
        results.push({
          ticker: tickerMatch,
          quantity: parseFloat(numbers[0]),
          averagePrice: parseFloat(numbers[1]),
          type: tickerMatch.endsWith('11') ? AssetType.FII : AssetType.STOCK
        });
      }
    }
  });
  return results;
}
