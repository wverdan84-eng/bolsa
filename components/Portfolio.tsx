
import React, { useMemo } from 'react';
import { Asset, Transaction } from '../types';
import { ArrowUpRight, ArrowDownRight, RefreshCw, Plus, Info, TrendingUp } from 'lucide-react';
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

export const Portfolio: React.FC<PortfolioProps> = ({ assets, transactions, onRefreshPrices, isLoading, onAddAsset }) => {
  const chartData = useMemo(() => calculateHistoricalData(transactions, assets), [transactions, assets]);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Sua Carteira</h1>
          <p className="text-slate-500">Posições consolidadas baseadas no seu histórico de transações.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={onRefreshPrices}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar Cotações
          </button>
          <button 
            onClick={onAddAsset}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all shadow-md shadow-emerald-100 active:scale-95"
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
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Ativo</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Qtd.</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">P. Médio (c/ taxas)</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Investido</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Cotação Atual</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Valor de Mercado</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Lucro/Prejuízo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {assets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    Sua carteira está vazia. Adicione transações para ver suas posições.
                  </td>
                </tr>
              ) : (
                assets.map((asset) => {
                  const totalInvested = asset.quantity * asset.averagePrice;
                  const marketValue = asset.quantity * asset.currentPrice;
                  const gain = marketValue - totalInvested;
                  const gainPercent = totalInvested > 0 ? (gain / totalInvested) * 100 : 0;

                  return (
                    <tr key={asset.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">{asset.ticker}</span>
                          <span className="text-[10px] text-slate-400 uppercase font-medium">{asset.type}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-slate-700">{asset.quantity}</td>
                      <td className="px-6 py-4 text-right text-slate-600">
                        {asset.averagePrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-500 text-sm">
                        {totalInvested.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-900 font-semibold">
                        {asset.currentPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-slate-900">
                        {marketValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className={`flex items-center justify-end gap-1 ${gain >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {gain >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          <span className="font-bold text-sm">{gainPercent.toFixed(2)}%</span>
                        </div>
                        <div className={`text-[11px] font-medium ${gain >= 0 ? 'text-emerald-500' : 'text-rose-400'}`}>
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

      {/* Historical Profitability Section */}
      <div className="grid grid-cols-1 gap-6 mt-12">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Evolução do Patrimônio</h3>
              <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mt-0.5">Total Investido vs. Valor de Mercado</p>
            </div>
          </div>

          <div className="h-[350px] w-full">
            {chartData.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorInvested" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: '#94a3b8' }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: '#94a3b8' }}
                    tickFormatter={(value) => `R$ ${value >= 1000 ? (value/1000).toFixed(1) + 'k' : value}`}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => [value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })]}
                  />
                  <Legend verticalAlign="top" height={36}/>
                  <Area 
                    name="Valor de Mercado"
                    type="monotone" 
                    dataKey="equity" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorEquity)" 
                  />
                  <Area 
                    name="Total Investido"
                    type="monotone" 
                    dataKey="invested" 
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    strokeDasharray="5 5"
                    fillOpacity={1} 
                    fill="url(#colorInvested)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full border-2 border-dashed border-slate-100 rounded-xl">
                <p className="text-slate-400 text-sm">Dados insuficientes para gerar o gráfico. Adicione mais transações.</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex gap-3 items-start">
        <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-700 leading-relaxed">
          <p className="font-bold mb-1">Sobre o Gráfico de Rentabilidade:</p>
          <p>
            O gráfico mostra a evolução do montante total desembolsado (linha tracejada azul) comparado ao valor que essas mesmas cotas valeriam hoje (linha verde), 
            acumulado ao longo do tempo. Nota: Devido a restrições de custo, os cálculos usam a cotação atual como referência para o valor de mercado.
          </p>
        </div>
      </div>
    </div>
  );
};
