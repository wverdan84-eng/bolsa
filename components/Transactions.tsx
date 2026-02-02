
import React, { useState, useRef, useEffect } from 'react';
import { Transaction } from '../types';
import { Plus, Trash2, ArrowUpCircle, ArrowDownCircle, Search, X } from 'lucide-react';
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

  // Detecta sinal de abertura forçada vindo do App.tsx
  useEffect(() => {
    if (forceOpenForm) {
      setShowForm(true);
      if (onFormOpened) onFormOpened();
    }
  }, [forceOpenForm, onFormOpened]);

  // Close suggestions when clicking outside
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
      const existingTickers = Array.from(new Set(transactions.map(t => t.ticker)));
      const allPossible = Array.from(new Set([...existingTickers, ...COMMON_TICKERS]));
      
      const filtered = allPossible
        .filter(t => t.startsWith(upperValue))
        .slice(0, 6); // Limit suggestions
      
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (ticker: string) => {
    setFormData({ ...formData, ticker });
    setShowSuggestions(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newTransaction: Transaction = {
      id: generateId(),
      ticker: formData.ticker.toUpperCase(),
      type: formData.type,
      quantity: parseFloat(formData.quantity),
      price: parseFloat(formData.price),
      costs: parseFloat(formData.costs),
      date: formData.date
    };
    onAddTransaction(newTransaction);
    setShowForm(false);
    setFormData({ ...formData, ticker: '', quantity: '', price: '', costs: '0' });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Histórico de Transações</h1>
          <p className="text-slate-500 text-sm">Registro de compras, vendas e custos operacionais.</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all shadow-sm font-medium ${
            showForm 
            ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' 
            : 'bg-emerald-600 text-white hover:bg-emerald-700'
          }`}
        >
          {showForm ? <><X className="w-4 h-4" /> Cancelar</> : <><Plus className="w-4 h-4" /> Nova Transação</>}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="space-y-1 relative" ref={suggestionRef}>
            <label className="text-xs font-bold text-slate-500 uppercase">Ticker</label>
            <div className="relative">
              <input 
                required
                placeholder="Ex: PETR4"
                value={formData.ticker}
                onChange={e => handleTickerChange(e.target.value)}
                onFocus={() => formData.ticker && setShowSuggestions(suggestions.length > 0)}
                autoComplete="off"
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              />
              <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-300" />
            </div>
            
            {showSuggestions && (
              <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-100 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => selectSuggestion(s)}
                    className="w-full text-left px-4 py-3 hover:bg-emerald-50 text-slate-700 font-medium transition-colors border-b border-slate-50 last:border-0"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Tipo</label>
            <select 
              value={formData.type}
              onChange={e => setFormData({...formData, type: e.target.value as 'BUY' | 'SELL'})}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            >
              <option value="BUY">Compra</option>
              <option value="SELL">Venda</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Data</label>
            <input 
              type="date"
              required
              value={formData.date}
              onChange={e => setFormData({...formData, date: e.target.value})}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Quantidade</label>
            <input 
              type="number"
              step="any"
              required
              value={formData.quantity}
              onChange={e => setFormData({...formData, quantity: e.target.value})}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Preço Unitário (R$)</label>
            <input 
              type="number"
              step="0.01"
              required
              value={formData.price}
              onChange={e => setFormData({...formData, price: e.target.value})}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Custos / Taxas (R$)</label>
            <input 
              type="number"
              step="0.01"
              value={formData.costs}
              onChange={e => setFormData({...formData, costs: e.target.value})}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            />
          </div>
          <div className="md:col-span-3 flex justify-end pt-2">
            <button type="submit" className="px-8 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 transition-all shadow-md shadow-emerald-100 active:scale-95">
              Salvar Transação
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Data</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Ativo</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Tipo</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Qtd</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Preço</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Custos</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Total</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.sort((a,b) => b.date.localeCompare(a.date)).map((t) => {
                const total = (t.quantity * t.price) + (t.type === 'BUY' ? t.costs : -t.costs);
                return (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-500">{new Date(t.date).toLocaleDateString('pt-BR')}</td>
                    <td className="px-6 py-4 font-bold text-slate-900">{t.ticker}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase ${t.type === 'BUY' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {t.type === 'BUY' ? <ArrowUpCircle className="w-3 h-3" /> : <ArrowDownCircle className="w-3 h-3" />}
                        {t.type === 'BUY' ? 'COMPRA' : 'VENDA'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-slate-700 font-medium">{t.quantity}</td>
                    <td className="px-6 py-4 text-right text-slate-600">
                      {t.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                    <td className="px-6 py-4 text-right text-rose-300 text-xs">
                      {t.costs > 0 ? t.costs.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-slate-900">
                      {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => onDeleteTransaction(t.id)}
                        className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">Nenhuma transação registrada.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
