
import { Transaction, Asset, AssetType } from "../types";

/**
 * Detecta o tipo de ativo baseado no ticker (Regras B3 e US Market)
 */
export function detectAssetType(ticker: string): AssetType {
  const t = ticker.toUpperCase();
  
  // 1. Criptos conhecidas
  const cryptos = ['BTC', 'ETH', 'SOL', 'ADA', 'DOT', 'USDT'];
  if (cryptos.includes(t)) return AssetType.CRYPTO;

  // 2. Regras B3 (Brasil)
  // Tickers BR costumam ter 4 letras seguidas de números
  if (/^[A-Z]{4}(3|4|5|6|11)$/.test(t)) {
    if (t.endsWith('11')) {
      const etfs = ['BOVA11', 'IVVB11', 'SMALL11', 'HASH11', 'ECOO11', 'SMAL11'];
      return etfs.includes(t) ? AssetType.ETF : AssetType.FII;
    }
    return AssetType.STOCK;
  }

  // 3. Regras Mercado Americano (US)
  // Tickers US costumam ter 1 a 5 letras, sem números
  if (/^[A-Z]{1,5}$/.test(t)) {
    // REITs famosos para ajudar na classificação, caso contrário Stock
    const commonReits = ['O', 'AMT', 'PLD', 'CCI', 'VICI', 'EQIX', 'PSA'];
    if (commonReits.includes(t)) return AssetType.REIT;
    
    // ETFs Americanos comuns
    const commonUsEtfs = ['VOO', 'IVV', 'QQQ', 'VTI', 'VXUS', 'SCHD'];
    if (commonUsEtfs.includes(t)) return AssetType.ETF;

    return AssetType.STOCK_INT;
  }

  return AssetType.STOCK;
}

/**
 * Calcula a posição consolidada de um ativo
 */
export function calculatePosition(ticker: string, transactions: Transaction[]) {
  const tickerTransactions = transactions
    .filter(t => t.ticker === ticker && t.type !== 'DIVIDEND')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let totalQty = 0;
  let totalCostBasis = 0;

  tickerTransactions.forEach(t => {
    if (t.type === 'BUY') {
      const acquisitionCost = (t.quantity * t.price) + (t.costs || 0);
      totalCostBasis += acquisitionCost;
      totalQty += t.quantity;
    } else if (t.type === 'SELL') {
      if (totalQty > 0) {
        const currentAvgPrice = totalCostBasis / totalQty;
        const sellQty = Math.min(t.quantity, totalQty);
        totalQty -= sellQty;
        totalCostBasis = totalQty * currentAvgPrice;
      }
    }
  });

  return {
    quantity: totalQty,
    averagePrice: totalQty > 0 ? totalCostBasis / totalQty : 0,
    totalCostBasis: totalCostBasis
  };
}

export function calculateAccumulatedDividends(ticker: string, transactions: Transaction[]): number {
  return transactions
    .filter(t => t.ticker === ticker && t.type === 'DIVIDEND')
    .reduce((acc, t) => acc + (t.price - t.costs), 0);
}

export function calculateHistoricalData(transactions: Transaction[], assets: Asset[]) {
  if (transactions.length === 0) return [];

  const equityTransactions = transactions.filter(t => t.type !== 'DIVIDEND');
  const sortedTransactions = [...equityTransactions].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const history: any[] = [];
  const runningPositions: Record<string, number> = {};
  let runningInvested = 0;

  const dates = Array.from(new Set(sortedTransactions.map(t => t.date))).sort();

  dates.forEach(date => {
    const dayTransactions = sortedTransactions.filter(t => t.date === date);
    
    dayTransactions.forEach(t => {
      if (!runningPositions[t.ticker]) runningPositions[t.ticker] = 0;
      if (t.type === 'BUY') {
        runningPositions[t.ticker] += t.quantity;
        runningInvested += (t.quantity * t.price) + t.costs;
      } else if (t.type === 'SELL') {
        const currentQty = runningPositions[t.ticker];
        if (currentQty > 0) {
          const sellQty = Math.min(t.quantity, currentQty);
          const asset = assets.find(a => a.ticker === t.ticker);
          const avgPrice = asset ? asset.averagePrice : t.price;
          runningInvested -= (sellQty * avgPrice);
          runningPositions[t.ticker] -= sellQty;
        }
      }
    });

    let currentMarketValue = 0;
    Object.entries(runningPositions).forEach(([ticker, qty]) => {
      const asset = assets.find(a => a.ticker === ticker);
      const price = asset ? asset.currentPrice : 0;
      currentMarketValue += qty * price;
    });

    history.push({
      date: new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      invested: Math.max(0, Math.round(runningInvested)),
      equity: Math.max(0, Math.round(currentMarketValue))
    });
  });

  return history;
}

export function generateId() {
  return Math.random().toString(36).substr(2, 9);
}
