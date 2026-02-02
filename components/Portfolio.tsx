
import React, { useMemo, useState } from 'react';
import { Asset, AssetType, Transaction } from '../types';
import { ArrowUpRight, ArrowDownRight, RefreshCw, Plus, Info, TrendingUp, Tags, Globe, Calendar, Flag, Landmark } from 'lucide-react';
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

type TimeRange = '1W' | '1M' | '3M' | 'YTD' | 'ALL';
type PortfolioTab = 'ALL' | 'BR' | 'INTL';

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
  const [range, setRange] = useState<TimeRange>('ALL');
  const [activeTab, setActiveTab] = useState<PortfolioTab>('ALL');

  const rawChartData = useMemo(() => calculateHistoricalData(transactions, assets), [transactions, assets]);

  const filteredChartData = useMemo(() => {
    if (rawChartData.length === 0) return [];
    
    const now = new Date();
    let cutoff = new Date(0); 

    if (range === '1W') cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    else if (range === '1M') cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    else if (range === '3M') cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    else if (range === 'YTD') cutoff = new Date(now.getFullYear(), 0, 1);

    if (range === 'ALL') return rawChartData;
    
    const counts: Record<TimeRange, number> = { '1W': 7, '1M': 30, '3M': 90, 'YTD': 200, 'ALL': 9999 };
    return rawChartData.slice(-counts[range]);
  }, [rawChartData, range]);

  // Filtro dos ativos baseado na aba selecionada
  const displayedAssets = useMemo(() => {
    return assets.filter(asset => {
      const isIntl = asset.type === AssetType.STOCK_INT || asset.type === AssetType.REIT || asset.type === AssetType.ETF;
      
      if (activeTab === 'BR') return !isIntl;
      if (activeTab === 'INTL') return isIntl;
      return true;
    });
  }, [assets, activeTab]);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Portfolio Global</h1>
          <p className="text-slate-500 text-sm flex items-center gap-1.5 font-medium">
            <Globe className="w-3.5 h-3.5" />
            Gestão unificada de ativos nacionais e internacionais.
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={onRefreshPrices}
            disabled={isLoading || assets.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-all disabled:opacity-50 shadow-sm text-sm font-semibold"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
          <button 
            onClick={onAddAsset}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 active:scale-95 text-sm font-bold"
          >
            <Plus className="w-4 h-4" />
            Novo Ativo
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex p-1 bg-slate-200/50 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('ALL')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <TrendingUp className="w-3.5 h-3.5" /> Visão Geral
        </button>
        <button
          onClick={() => setActiveTab('BR')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'BR' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Flag className="w-3.5 h-3.5" /> Brasil
        </button>
        <button
          onClick={() => setActiveTab('INTL')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'INTL' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Landmark className="w-3.5 h-3.5" /> Internacional
        </button>
      </div>

      {/* Chart Section (Only Visible in 'ALL') */}
      {activeTab === 'ALL' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h3 className="font-black text-slate-800 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                Evolução Patrimonial
              </h3>
              <p className="text-xs text-slate-400 font-medium">Patrimônio consolidado (Convertido para BRL)</p>
            </div>
            <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
              {(['1W', '1M', '3M', 'YTD', 'ALL'] as TimeRange[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${
                    range === r 
                    ? 'bg-white text-emerald-600 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {r === 'ALL' ? 'TUDO' : r}
                </button>
              ))}
            </div>
          </div>
          
          <div className="h-[250px] w-full">
            {filteredChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={filteredChartData}>
                  <defs>
                    <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 10, fontWeight: 600, fill: '#94a3b8'}}
                    minTickGap={30}
                  />
                  <YAxis hide domain={['auto', 'auto']} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    labelStyle={{ fontWeight: 800, color: '#1e293b', marginBottom: '4px' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="invested" 
                    stroke="#94a3b8" 
                    fill="transparent" 
                    strokeWidth={2} 
                    strokeDasharray="5 5"
                    name="Investido"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="equity" 
                    stroke="#10b981" 
                    fillOpacity={1} 
                    fill="url(#colorEquity)" 
                    strokeWidth={3}
                    name="Patrimônio"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-300 gap-2">
                <Calendar className="w-5 h-5" />
                <span className="text-sm font-medium">Dados insuficientes para o gráfico.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Portfolio Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ativo / Tipo</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Quantidade</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">P. Médio (BRL)</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Cotação (BRL)</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Proventos</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Total (BRL)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedAssets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center opacity-40">
                      <Tags className="w-12 h-12 mb-2" />
                      <p className="text-slate-500 font-medium">Nenhum ativo encontrado nesta seção.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                displayedAssets.map((asset) => {
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
                             {isInt && (
                               <span className="flex items-center gap-1 text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100 font-bold">
                                 <Landmark className="w-2 h-2" />
                                 US
                               </span>
                             )}
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

      <div className="flex items-center gap-3 p-4 bg-slate-100 rounded-xl border border-slate-200">
        <Info className="w-5 h-5 text-slate-500 shrink-0" />
        <div className="text-[11px] text-slate-600 leading-snug font-medium">
          <p><strong>Fonte de Dados:</strong></p>
          <ul className="list-disc list-inside mt-1 ml-1 space-y-1">
             <li>Brasil e Cripto via <strong>Brapi</strong>.</li>
             <li>EUA (Stocks/REITs) via <strong>Twelve Data</strong>.</li>
             <li>Todos os valores internacionais são convertidos para BRL pela PTAX do dia.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
