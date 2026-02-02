
import React, { useState, useRef, useEffect } from 'react';
import { Transaction } from '../types';
import { Plus, Trash2, ArrowUpCircle, ArrowDownCircle, Search, X, Calendar, Wallet } from 'lucide-react';
import { generateId } from '../services/investmentService';
import { COMMON_TICKERS } from '../constants';

interface TransactionsProps {
  transactions: Transaction[];
  onAddTransaction: (t: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  forceOpenForm?: boolean;
  onFormOpened?: () => void;
}

export const Transactions: React.FC<TransactionsProps> = ({ 
  transactions, 
  onAddTransaction, 
  onDeleteTransaction,
  forceOpenForm,
  onFormOpened
}) => {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    ticker: '',
    type: 'BUY' as 'BUY' | 'SELL',
    quantity: '',
    price: '',
    costs: '0',
    date: new Date().toISOString().split('T')[0]
  });

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (forceOpenForm) {
      setShowForm(true);
      if (onFormOpened) onFormOpened();
    }
  }, [forceOpenForm, onFormOpened]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTickerChange = (value: string) => {
    const upperValue = value.toUpperCase();
    setFormData({ ...formData, ticker: upperValue });

    if (upperValue.length > 0) {
      // Explicitly type Set<string> to avoid 'unknown' inference during suggestion filtering
      const existingTickers = Array.from(new Set<string>(transactions.map(t => t.ticker)));
      const allPossible = Array.from(new Set<string>([...existingTickers, ...COMMON_TICKERS]));
      const filtered = allPossible.filter(t => t.startsWith(upperValue)).slice(0, 5);
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.ticker || !formData.quantity || !formData.price) return;

    const newTransaction: Transaction = {
      id: generateId(),
      ticker: formData.ticker.toUpperCase(),
      type: formData.type,
      quantity: parseFloat(formData.quantity),
      price: parseFloat(formData.price),
      costs: parseFloat(formData.costs || '0'),
      date: formData.date
    };
    onAddTransaction(newTransaction);
    setShowForm(false);
    setFormData({ ...formData, ticker: '', quantity: '', price: '', costs: '0' });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Histórico</h1>
          <p className="text-slate-500 text-sm font-medium">Controle total das suas movimentações financeiras.</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all shadow-sm font-bold text-sm ${
            showForm 
            ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' 
            : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-100'
          }`}
        >
          {showForm ? <><X className="w-4 h-4" /> Fechar</> : <><Plus className="w-4 h-4" /> Nova Transação</>}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 grid grid-cols-1 md:grid-cols-6 gap-6 animate-in slide-in-from-top-4 duration-300">
          <div className="md:col-span-2 space-y-2 relative" ref={suggestionRef}>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Search className="w-3 h-3" /> Ativo (Ticker)
            </label>
            <input 
              required
              placeholder="Ex: ITUB4"
              value={formData.ticker}
              onChange={e => handleTickerChange(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-bold"
              autoComplete="off"
            />
            {showSuggestions && (
              <div className="absolute z-50 left-0 right-0 mt-2 bg-white border border-slate-100 rounded-xl shadow-2xl overflow-hidden">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => { setFormData({...formData, ticker: s}); setShowSuggestions(false); }}
                    className="w-full text-left px-4 py-3 hover:bg-emerald-50 text-slate-700 font-bold transition-colors border-b border-slate-50 last:border-0"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="md:col-span-1 space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Wallet className="w-3 h-3" /> Tipo
            </label>
            <select 
              value={formData.type}
              onChange={e => setFormData({...formData, type: e.target.value as 'BUY' | 'SELL'})}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-bold"
            >
              <option value="BUY">Compra</option>
              <option value="SELL">Venda</option>
            </select>
          </div>

          <div className="md:col-span-1 space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Calendar className="w-3 h-3" /> Data
            </label>
            <input 
              type="date"
              required
              value={formData.date}
              onChange={e => setFormData({...formData, date: e.target.value})}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm font-medium"
            />
          </div>

          <div className="md:col-span-2 grid grid-cols-3 gap-4">
             <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Qtd</label>
                <input type="number" step="any" required value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold" />
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Preço</label>
                <input type="number" step="0.01" required value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold" />
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Taxas</label>
                <input type="number" step="0.01" value={formData.costs} onChange={e => setFormData({...formData, costs: e.target.value})} className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold" />
             </div>
          </div>

          <div className="md:col-span-6 flex justify-end">
            <button type="submit" className="px-10 py-3 bg-slate-900 text-white rounded-xl font-black hover:bg-slate-800 transition-all shadow-lg active:scale-95">
              Confirmar Lançamento
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ativo</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Operação</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Quantidade</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Valor Unit.</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Financeiro</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 italic">Nenhum registro encontrado.</td>
                </tr>
              ) : (
                transactions.sort((a,b) => b.date.localeCompare(a.date)).map((t) => {
                  const total = (t.quantity * t.price) + (t.type === 'BUY' ? t.costs : -t.costs);
                  return (
                    <tr key={t.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-5 text-xs font-bold text-slate-400">{new Date(t.date).toLocaleDateString('pt-BR')}</td>
                      <td className="px-6 py-5 font-black text-slate-800">{t.ticker}</td>
                      <td className="px-6 py-5 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black tracking-widest uppercase ${t.type === 'BUY' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                          {t.type === 'BUY' ? 'COMPRA' : 'VENDA'}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right text-slate-600 font-bold">{t.quantity}</td>
                      <td className="px-6 py-5 text-right text-slate-600 font-medium">
                        {t.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="px-6 py-5 text-right font-black text-slate-900">
                        {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="px-6 py-5 text-center">
                        <button 
                          onClick={() => onDeleteTransaction(t.id)}
                          className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                          title="Excluir Transação"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
