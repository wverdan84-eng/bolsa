
import React, { useState, useEffect } from 'react';
import { Asset, AssetType } from '../types';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend,
  CartesianGrid
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, PieChart as PieChartIcon, LayoutGrid, Wallet, RefreshCw, Heart, Copy, Check } from 'lucide-react';

interface DashboardProps {
  assets: Asset[];
}

export const Dashboard: React.FC<DashboardProps> = ({ assets }) => {
  const [pixKey, setPixKey] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('bolsamaster_pix_key');
    if (stored) setPixKey(stored);
  }, []);

  const totalEquity = assets.reduce((acc, curr) => acc + (curr.quantity * curr.currentPrice), 0);
  const totalCost = assets.reduce((acc, curr) => acc + (curr.quantity * curr.averagePrice), 0);
  const totalGain = totalEquity - totalCost;
  const totalGainPercentage = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;

  const dataByType = Object.values(AssetType).map(type => {
    const value = assets
      .filter(a => a.type === type)
      .reduce((acc, curr) => acc + (curr.quantity * curr.currentPrice), 0);
    return { name: type, value };
  }).filter(d => d.value > 0);

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#f43f5e'];

  const copyPix = () => {
    navigator.clipboard.writeText(pixKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (assets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <LayoutGrid className="w-10 h-10 text-slate-300" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Seu Dashboard está pronto</h2>
        <p className="text-slate-500 max-w-xs">Adicione sua primeira transação ou importe um CSV para visualizar as estatísticas da sua carteira.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-16">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Resumo Patrimonial</h1>
          <p className="text-slate-500 text-sm">Visão geral do desempenho e alocação dos seus investimentos.</p>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100/50 px-3 py-1 rounded-full border border-slate-200">
          <RefreshCw className="w-3 h-3 animate-[spin_10s_linear_infinite]" />
          Cálculos atualizados em tempo real
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
             <Wallet className="w-24 h-24 text-blue-600" />
          </div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-50 rounded-lg">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Patrimônio Bruto</span>
          </div>
          <p className="text-3xl font-black text-slate-900 leading-tight">
            {totalEquity.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
          <div className="mt-4 flex items-center gap-2">
            <div className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 ${totalGain >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              {totalGain >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {totalGainPercentage.toFixed(2)}%
            </div>
            <span className="text-[11px] text-slate-400 font-medium">vs. preço médio</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
             <TrendingUp className="w-24 h-24 text-emerald-600" />
          </div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Lucro Estimado</span>
          </div>
          <p className={`text-3xl font-black leading-tight ${totalGain >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {totalGain.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
          <p className="mt-4 text-[11px] text-slate-400 font-medium">Variação patrimonial acumulada</p>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
             <LayoutGrid className="w-24 h-24 text-amber-600" />
          </div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-50 rounded-lg">
              <PieChartIcon className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Diversificação</span>
          </div>
          <p className="text-3xl font-black text-slate-900 leading-tight">{assets.length} Ativos</p>
          <p className="mt-4 text-[11px] text-slate-400 font-medium">Em {dataByType.length} classes diferentes</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-8">
             <h3 className="font-bold text-slate-800">Alocação por Tipo</h3>
             <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
          </div>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dataByType}
                  cx="50%"
                  cy="50%"
                  innerRadius={75}
                  outerRadius={105}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                >
                  {dataByType.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-8">
             <h3 className="font-bold text-slate-800">Maiores Posições</h3>
             <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded font-bold uppercase">Patrimônio</span>
          </div>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={assets.sort((a,b) => (b.quantity*b.currentPrice) - (a.quantity*a.currentPrice)).slice(0, 5)}
                margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="ticker" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 700, fill: '#64748b'}} />
                <YAxis hide />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                />
                <Bar 
                  dataKey={(d: Asset) => d.quantity * d.currentPrice} 
                  fill="#3b82f6" 
                  radius={[8, 8, 0, 0]} 
                  barSize={45}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Pix Support Card */}
      {pixKey && (
        <div className="bg-slate-900 p-6 rounded-3xl text-white flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative border border-slate-800">
           <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
             <Heart className="w-32 h-32 text-emerald-400" />
           </div>
           <div className="flex items-center gap-4 relative z-10">
              <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                <Heart className="w-6 h-6 text-emerald-400 fill-emerald-400/20" />
              </div>
              <div>
                <h4 className="font-bold text-lg leading-tight">Apoie este projeto</h4>
                <p className="text-slate-400 text-xs">Gostou da ferramenta? Considere fazer um Pix de qualquer valor para o desenvolvedor.</p>
              </div>
           </div>
           <button 
             onClick={copyPix}
             className={`relative z-10 flex items-center gap-3 px-6 py-3 rounded-2xl font-black text-sm transition-all active:scale-95 ${
               copied 
               ? 'bg-emerald-500 text-white' 
               : 'bg-white text-slate-900 hover:bg-slate-100 shadow-xl'
             }`}
           >
             {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
             {copied ? 'Chave Copiada!' : 'Copiar Chave Pix'}
           </button>
        </div>
      )}
    </div>
  );
};
