
import React, { useMemo } from 'react';
import { Asset, AssetType, Transaction } from '../types';
import { ArrowUpRight, ArrowDownRight, RefreshCw, Plus, Info, TrendingUp, Tags, Banknote, Globe } from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { calculateHistoricalData, calculateAccumulatedDividends } from '../services/investmentService';

interface PortfolioProps {
  assets: Asset[];
  transactions: Transaction[];
  onRefreshPrices: () => void;
  isLoading: boolean;
  onAddAsset: () => void;
}

const getTypeColor = (type: AssetType) => {
  switch (type) {
    case AssetType.STOCK: return 'bg-blue-50 text-blue-600 border-blue-100';
    case AssetType.STOCK_INT: return 'bg-indigo-50 text-indigo-600 border-indigo-100';
    case AssetType.FII: return 'bg-emerald-50 text-emerald-600 border-emerald-100';
    case AssetType.REIT: return 'bg-teal-50 text-teal-600 border-teal-100';
    case AssetType.ETF: return 'bg-purple-50 text-purple-600 border-purple-100';
    case AssetType.CRYPTO: return 'bg-amber-50 text-amber-600 border-amber-100';
    default: return 'bg-slate-50 text-slate-400 border-slate-100';
  }
};

export const Portfolio: React.FC<PortfolioProps> = ({ assets, transactions, onRefreshPrices, isLoading, onAddAsset }) => {
  const chartData = useMemo(() => calculateHistoricalData(transactions, assets), [transactions, assets]);
  const dividendTransactions = useMemo(() => 
    transactions.filter(t => t.type === 'DIVIDEND').sort((a,b) => b.date.localeCompare(a.date)),
    [transactions]
  );
  const totalDividends = dividendTransactions.reduce((acc, t) => acc + (t.price - t.costs), 0);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Portfolio Global</h1>
          <p className="text-slate-500 text-sm flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5" />
            Ativos no Brasil e Exterior sincronizados via Brapi.
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={onRefreshPrices}
            disabled={isLoading || assets.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-all disabled:opacity-50 shadow-sm text-sm font-semibold"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar Cotações
          </button>
          <button 
            onClick={onAddAsset}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 active:scale-95 text-sm font-bold"
          >
            <Plus className="w-4 h-4" />
            Adicionar Ativo
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ativo / Tipo</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Quantidade</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">P. Médio (R$)</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Cotação (R$)</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Proventos</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Total (R$)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {assets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center opacity-40">
                      <Tags className="w-12 h-12 mb-2" />
                      <p className="text-slate-500 font-medium">Nenhum ativo global cadastrado.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                assets.map((asset) => {
                  const totalInvested = asset.quantity * asset.averagePrice;
                  const marketValue = asset.quantity * asset.currentPrice;
                  const capitalGain = marketValue - totalInvested;
                  const dividends = calculateAccumulatedDividends(asset.ticker, transactions);
                  const totalProfit = capitalGain + dividends;
                  const totalReturnPercent = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;
                  const isInt = asset.type === AssetType.STOCK_INT || asset.type === AssetType.REIT;

                  return (
                    <tr key={asset.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2">
                             <span className="font-black text-slate-900 leading-none">{asset.ticker}</span>
                             {isInt && <span className="text-[10px] bg-slate-100 text-slate-400 px-1 rounded font-bold">USD</span>}
                          </div>
                          <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold border w-fit uppercase ${getTypeColor(asset.type)}`}>
                            {asset.type}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right font-semibold text-slate-600">{asset.quantity}</td>
                      <td className="px-6 py-5 text-right text-slate-500 text-sm">
                        {asset.averagePrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="px-6 py-5 text-right text-slate-900 font-bold">
                        {asset.currentPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="px-6 py-5 text-right text-blue-600 font-bold">
                        {dividends > 0 ? dividends.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'}
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className={`flex items-center justify-end gap-1 font-black text-sm ${totalProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {totalProfit >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          <span>{totalReturnPercent.toFixed(2)}%</span>
                        </div>
                        <div className={`text-[10px] font-bold ${totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {marketValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-xl border border-amber-100 shadow-sm shadow-amber-50">
        <Info className="w-5 h-5 text-amber-500 shrink-0" />
        <p className="text-[11px] text-amber-800 leading-snug">
          <strong>Ativos Internacionais:</strong> Cotações de Stocks e REITs americanos são convertidas automaticamente para Reais (BRL) usando a taxa PTAX mais recente da Brapi. Lucros e dividendos refletem o valor convertido.
        </p>
      </div>
    </div>
  );
};
