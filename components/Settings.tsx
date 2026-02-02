
import React, { useState, useEffect } from 'react';
import { Save, Key, Globe, ShieldAlert, Check, Wallet, Heart } from 'lucide-react';

export const Settings: React.FC = () => {
  const [twelveKey, setTwelveKey] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const storedTwelve = localStorage.getItem('bolsamaster_twelve_key');
    const storedPix = localStorage.getItem('bolsamaster_pix_key');
    if (storedTwelve) setTwelveKey(storedTwelve);
    if (storedPix) setPixKey(storedPix);
  }, []);

  const handleSave = () => {
    localStorage.setItem('bolsamaster_twelve_key', twelveKey.trim());
    localStorage.setItem('bolsamaster_pix_key', pixKey.trim());
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <header>
        <h1 className="text-2xl font-bold text-slate-800">Configurações</h1>
        <p className="text-slate-500 text-sm">Configure suas APIs e preferências de visualização.</p>
      </header>

      {/* API Twelve Data */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex items-center gap-3">
          <div className="p-2 bg-indigo-50 rounded-lg">
            <Globe className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">Cotações Internacionais</h3>
            <p className="text-xs text-slate-500">Dados reais de Stocks e REITs via Twelve Data.</p>
          </div>
        </div>

        <div className="p-8 space-y-6">
          <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 flex gap-3 items-start">
             <ShieldAlert className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
             <div className="text-sm text-indigo-800">
               <p className="font-bold mb-1">Por que preciso disso?</p>
               <p className="opacity-90 leading-relaxed">
                 O plano gratuito da Twelve Data é excelente para carteiras pessoais. Ele permite atualizar os ativos americanos de forma independente.
               </p>
             </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Key className="w-3 h-3" /> Sua API Key (Twelve Data)
            </label>
            <input 
              type="password" 
              value={twelveKey}
              onChange={(e) => setTwelveKey(e.target.value)}
              placeholder="2c5114736a7245dd9a8fa54f2af69813"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700"
            />
            <p className="text-[11px] text-slate-400 font-medium">
              Obtenha grátis em <a href="https://twelvedata.com/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">twelvedata.com</a>
            </p>
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
              Se configurada, esta chave aparecerá discretamente no seu Dashboard.
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
