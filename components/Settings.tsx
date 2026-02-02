
import React, { useState, useEffect } from 'react';
import { Save, Globe, Check, Wallet, Heart, Info } from 'lucide-react';

export const Settings: React.FC = () => {
  const [pixKey, setPixKey] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const storedPix = localStorage.getItem('bolsamaster_pix_key');
    if (storedPix) setPixKey(storedPix);
  }, []);

  const handleSave = () => {
    localStorage.setItem('bolsamaster_pix_key', pixKey.trim());
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <header>
        <h1 className="text-2xl font-bold text-slate-800">Configurações</h1>
        <p className="text-slate-500 text-sm">Gerencie suas preferências e apoio ao projeto.</p>
      </header>

      {/* Info Yahoo Finance */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Globe className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">Cotações Globais</h3>
            <p className="text-xs text-slate-500">Fontes de dados em tempo real.</p>
          </div>
        </div>

        <div className="p-8 space-y-4">
          <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <div className="text-sm text-slate-600 leading-relaxed">
              <p className="font-bold text-slate-800 mb-1">Motor Yahoo Finance Ativo</p>
              <p>O BolsaMaster agora utiliza o **Yahoo Finance** para TODOS os ativos. O sistema gerencia automaticamente os sufixos para o mercado brasileiro e criptomoedas, garantindo precisão global sem custos de API.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pix / Monetização */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex items-center gap-3">
          <div className="p-2 bg-emerald-50 rounded-lg">
            <Wallet className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">Apoio ao Projeto</h3>
            <p className="text-xs text-slate-500">Exiba sua chave Pix para doações ou apoio.</p>
          </div>
        </div>

        <div className="p-8 space-y-6">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Heart className="w-3 h-3" /> Chave Pix (E-mail, CPF ou Aleatória)
            </label>
            <input 
              type="text" 
              value={pixKey}
              onChange={(e) => setPixKey(e.target.value)}
              placeholder="Ex: seuemail@exemplo.com"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-700"
            />
            <p className="text-[11px] text-slate-400 font-medium italic">
              Se configurada, esta chave aparecerá discretamente no seu Dashboard para que usuários possam apoiar seu trabalho.
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button 
          onClick={handleSave}
          className={`px-10 py-3 rounded-2xl font-black transition-all flex items-center gap-2 shadow-lg ${
            isSaved 
            ? 'bg-emerald-500 text-white scale-95' 
            : 'bg-slate-900 text-white hover:bg-slate-800 hover:-translate-y-0.5'
          }`}
        >
          {isSaved ? <Check className="w-5 h-5" /> : <Save className="w-5 h-5" />}
          {isSaved ? 'Configurações Salvas!' : 'Salvar Alterações'}
        </button>
      </div>
    </div>
  );
};
