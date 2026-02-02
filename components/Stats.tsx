
import React from 'react';
import { Asset, AssetType } from '../types';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, PieChart, Pie, Legend } from 'recharts';
import { Target, ShieldCheck, Activity } from 'lucide-react';

interface StatsProps {
  assets: Asset[];
}

export const Stats: React.FC<StatsProps> = ({ assets }) => {
  const totalValue = assets.reduce((acc, a) => acc + (a.quantity * a.currentPrice), 0);

  const allocationData = Object.values(AssetType).map(type => {
    const value = assets
      .filter(a => a.type === type)
      .reduce((acc, a) => acc + (a.quantity * a.currentPrice), 0);
    return { name: type, value, percentage: totalValue > 0 ? (value / totalValue) * 100 : 0 };
  }).filter(d => d.value > 0);

  const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#f43f5e', '#06b6d4'];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <header>
        <h1 className="text-2xl font-bold text-slate-800">Análise de Alocação</h1>
        <p className="text-slate-500 text-sm">Entenda o equilíbrio da sua carteira global.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-emerald-50 rounded-lg"><Target className="w-5 h-5 text-emerald-600" /></div>
            <h3 className="font-bold text-slate-800">Diversificação por Classe</h3>
          </div>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={allocationData} 
                  innerRadius={80} 
                  outerRadius={120} 
                  paddingAngle={5} 
                  dataKey="value"
                  stroke="none"
                >
                  {allocationData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-50 rounded-lg"><Activity className="w-5 h-5 text-blue-600" /></div>
            <h3 className="font-bold text-slate-800">Concentração de Ativos (%)</h3>
          </div>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={assets.sort((a,b) => (b.quantity*b.currentPrice) - (a.quantity*a.currentPrice)).slice(0, 8)} layout="vertical">
                <XAxis type="number" hide />
                <YAxis dataKey="ticker" type="category" axisLine={false} tickLine={false} width={80} style={{ fontWeight: 700 }} />
                <Tooltip 
                   formatter={(value: number) => ((value/totalValue)*100).toFixed(2) + '%'}
                   contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey={(a: Asset) => a.quantity * a.currentPrice} fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <ShieldCheck className="w-32 h-32" />
        </div>
        <div className="relative z-10 max-w-xl">
          <h3 className="text-xl font-bold mb-2">Sugestão de Rebalanceamento</h3>
          <p className="text-slate-400 text-sm leading-relaxed">
            Seus ativos internacionais (Stocks/REITs) representam {((allocationData.find(d => d.name === AssetType.STOCK_INT)?.percentage || 0) + (allocationData.find(d => d.name === AssetType.REIT)?.percentage || 0)).toFixed(1)}% da carteira. Especialistas sugerem entre 20% a 40% para proteção cambial.
          </p>
        </div>
      </div>
    </div>
  );
};
