
import React, { useMemo } from 'react';
import { Asset, AssetType, Transaction } from '../types';
import { ArrowUpRight, ArrowDownRight, RefreshCw, Plus, Info, TrendingUp, Tags } from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { calculateHistoricalData } from '../services/investmentService';

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
    case AssetType.FII: return 'bg-emerald-50 text-emerald-600 border-emerald-100';
    case AssetType.CRYPTO: return 'bg-amber-50 text-amber-600 border-amber-100';
    case AssetType.FIXED_INCOME: return 'bg-slate-50 text-slate-600 border-slate-100';
    default: return 'bg-slate-50 text-slate-400 border-slate-100';
  }
};

export const Portfolio: React.FC<PortfolioProps> = ({ assets, transactions, onRefreshPrices, isLoading, onAddAsset }) => {
  const chartData = useMemo(() => calculateHistoricalData(transactions, assets), [transactions, assets]);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Sua Carteira</h1>
          <p className="text-slate-500 text-sm">Posições detalhadas com cotações atualizadas via Brapi.</p>
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

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ativo / Tipo</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Quantidade</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">P. Médio</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Cotação</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Saldo Atual</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Resultado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {assets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center opacity-40">
                      <Tags className="w-12 h-12 mb-2" />
                      <p className="text-slate-500 font-medium">Nenhum ativo em custódia no momento.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                assets.map((asset) => {
                  const totalInvested = asset.quantity * asset.averagePrice;
                  const marketValue = asset.quantity * asset.currentPrice;
                  const gain = marketValue - totalInvested;
                  const gainPercent = totalInvested > 0 ? (gain / totalInvested) * 100 : 0;

                  return (
                    <tr key={asset.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-1.5">
                          <span className="font-black text-slate-900 leading-none group-hover:text-emerald-600 transition-colors">{asset.ticker}</span>
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
                      <td className="px-6 py-5 text-right font-black text-slate-900">
                        {marketValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className={`flex items-center justify-end gap-1 font-black text-sm ${gain >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {gain >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          <span>{gainPercent.toFixed(2)}%</span>
                        </div>
                        <div className={`text-[10px] font-bold ${gain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {gain.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
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

      {/* Evolução Section */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mt-10">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Crescimento de Patrimônio</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Baseado no seu histórico de aportes</p>
            </div>
          </div>
        </div>

        <div className="h-[300px] w-full">
          {chartData.length > 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorEq" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} dy={10} />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                />
                <Area 
                  name="Patrimônio" 
                  type="monotone" 
                  dataKey="equity" 
                  stroke="#10b981" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorEq)" 
                />
                <Area 
                  name="Investido" 
                  type="monotone" 
                  dataKey="invested" 
                  stroke="#3b82f6" 
                  strokeWidth={2} 
                  strokeDasharray="5 5" 
                  fill="transparent" 
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-300 text-sm italic border border-dashed border-slate-100 rounded-xl">
              Gráfico será gerado após sua segunda transação.
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-3 p-4 bg-blue-50/40 rounded-xl border border-blue-100/50">
        <Info className="w-5 h-5 text-blue-500 shrink-0" />
        <p className="text-[11px] text-blue-700 leading-snug">
          <strong>Aviso de Cotações:</strong> Os dados de mercado são provenientes da Brapi API. Em períodos de alta volatilidade ou fechamento de mercado, pode haver atraso de até 15 minutos nas cotações de ativos da B3.
        </p>
      </div>
    </div>
  );
};
