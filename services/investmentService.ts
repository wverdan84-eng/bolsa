import { Transaction, Asset } from "../types";

/**
 * Calcula a posição consolidada de um ativo seguindo as normas da B3/Receita Federal.
 * 
 * Regras:
 * 1. COMPRA: (Preço * Qtd) + Taxas aumenta o Custo Total. Qtd aumenta.
 *    Novo Preço Médio = Custo Total / Qtd Total.
 * 2. VENDA: Qtd diminui. Custo Total diminui proporcionalmente ao Preço Médio atual.
 *    O Preço Médio não muda na venda.
 */
export function calculatePosition(ticker: string, transactions: Transaction[]) {
  const tickerTransactions = transactions
    .filter(t => t.ticker === ticker)
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
        // O custo base é reduzido proporcionalmente à quantidade vendida
        // O Preço Médio permanece o mesmo
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
 * Gera dados históricos para o gráfico de evolução de patrimônio.
 * Como não temos APIs de preços históricos (restrição de custo zero),
 * calculamos a evolução do Capital Investido (Custo) vs o Valor de Mercado (usando cotações atuais).
 */
export function calculateHistoricalData(transactions: Transaction[], assets: Asset[]) {
  if (transactions.length === 0) return [];

  const sortedTransactions = [...transactions].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const history: any[] = [];
  const runningPositions: Record<string, number> = {};
  let runningInvested = 0;

  // Pegamos todas as datas únicas de transações
  const dates = Array.from(new Set(sortedTransactions.map(t => t.date))).sort();

  dates.forEach(date => {
    const dayTransactions = sortedTransactions.filter(t => t.date === date);
    
    dayTransactions.forEach(t => {
      if (!runningPositions[t.ticker]) runningPositions[t.ticker] = 0;
      
      if (t.type === 'BUY') {
        runningPositions[t.ticker] += t.quantity;
        runningInvested += (t.quantity * t.price) + t.costs;
      } else if (t.type === 'SELL') {
        // Redução proporcional do capital investido para o gráfico (realização)
        const currentQty = runningPositions[t.ticker];
        if (currentQty > 0) {
          const sellQty = Math.min(t.quantity, currentQty);
          const ratio = sellQty / currentQty;
          
          // Estimativa: reduzimos o 'investido' na mesma proporção da quantidade vendida
          // Isso mantém a visualização do capital que permanece "em risco"
          const totalTickerInvested = assets.find(a => a.ticker === t.ticker)?.averagePrice || t.price;
          runningInvested -= (sellQty * totalTickerInvested);
          
          runningPositions[t.ticker] -= sellQty;
        }
      }
    });

    // Calcula valor de mercado atual daquelas posições naquela data específica
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