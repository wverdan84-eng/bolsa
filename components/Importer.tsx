
import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, Info, FileSpreadsheet } from 'lucide-react';
import { BROKERS } from '../constants';
import { parseBrokerCsvLogic } from '../services/marketService';
import { Asset } from '../types';

interface ImporterProps {
  onAssetsImported: (assets: Partial<Asset>[]) => void;
}

export const Importer: React.FC<ImporterProps> = ({ onAssetsImported }) => {
  const [selectedBroker, setSelectedBroker] = useState(BROKERS[0]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setStatus('idle');

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      try {
        await new Promise(r => setTimeout(r, 800));
        const imported = parseBrokerCsvLogic(text);
        
        if (imported.length > 0) {
          onAssetsImported(imported);
          setStatus('success');
        } else {
          setStatus('error');
        }
      } catch (err) {
        setStatus('error');
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-800">Importação Inteligente</h1>
        <p className="text-slate-500 mt-2">Sincronize sua carteira enviando o extrato ou planilha da sua corretora.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white p-8 rounded-2xl shadow-sm border border-slate-100 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Selecione sua Corretora</label>
            <select 
              value={selectedBroker}
              onChange={(e) => setSelectedBroker(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              {BROKERS.map(broker => (
                <option key={broker} value={broker}>{broker}</option>
              ))}
            </select>
          </div>

          <div className="relative border-2 border-dashed border-slate-200 rounded-2xl p-10 hover:border-emerald-400 transition-colors group cursor-pointer text-center">
            <input 
              type="file" 
              accept=".csv"
              onChange={handleFileUpload}
              disabled={isProcessing}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" 
            />
            <div className="flex flex-col items-center">
              <div className={`p-4 rounded-full mb-4 ${isProcessing ? 'bg-emerald-100' : 'bg-slate-50 group-hover:bg-emerald-50'}`}>
                {isProcessing ? (
                  <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                ) : (
                  <FileSpreadsheet className="w-8 h-8 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                )}
              </div>
              <p className="text-slate-600 font-medium">
                {isProcessing ? 'Analisando dados...' : 'Clique ou arraste o CSV'}
              </p>
            </div>
          </div>

          {status === 'success' && (
            <div className="flex items-center gap-3 p-4 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 animate-in fade-in zoom-in-95">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm font-medium">Importação concluída! Verifique sua carteira.</span>
            </div>
          )}

          {status === 'error' && (
            <div className="flex items-center gap-3 p-4 bg-rose-50 text-rose-700 rounded-xl border border-rose-100 animate-in fade-in zoom-in-95">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm font-medium">Erro ao processar. Certifique-se de que o CSV tem as colunas Ativo, Quantidade e Preço.</span>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg">
            <h3 className="font-bold text-sm uppercase tracking-widest text-slate-400 mb-4">Dica Pro</h3>
            <p className="text-sm leading-relaxed text-slate-300">
              A maioria das corretoras permite exportar um arquivo chamado "Posição Atual" ou "Custódia". Esse é o arquivo ideal para importar aqui.
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-2xl border border-slate-100">
            <h3 className="font-bold text-slate-800 text-sm mb-3">Segurança</h3>
            <div className="flex items-start gap-2 text-xs text-slate-500">
              <Info className="w-4 h-4 text-emerald-500 shrink-0" />
              <p>Seus dados financeiros nunca saem do seu computador. O processamento é feito localmente.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
