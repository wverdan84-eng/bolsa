
import { Transaction, Asset, AssetType } from "../types";

/**
 * Detecta o tipo de ativo baseado no ticker (Regras B3)
 */
export function detectAssetType(ticker: string): AssetType {
  const t = ticker.toUpperCase();
  if (t.endsWith('11')) {
    // Lista comum de ETFs para diferenciar de FIIs
    const etfs = ['BOVA11', 'IVVB11', 'SMALL11', 'HASH11', 'ECOO11', 'SMAL11', 'XINA11'];
    return etfs.includes(t) ? AssetType.ETF : AssetType.FII;
  }
  if (t.endsWith('3') || t.endsWith('4') || t.endsWith('5') || t.endsWith('6')) return AssetType.STOCK;
  if (t.length < 5) return AssetType.CRYPTO; // Simplificação para cripto (BTC, ETH)
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

/**
 * Calcula o total de proventos recebidos por um ticker específico
 */
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
      equity: Math.max(0, Math.round(currentMarketValue)),
      gain: Math.round(currentMarketValue - runningInvested)
    });
  });

  return history;
}

export function generateId() {
  return Math.random().toString(36).substr(2, 9);
}
