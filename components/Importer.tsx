
import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, Info, FileSpreadsheet, FileArchive } from 'lucide-react';
import { BROKERS } from '../constants';
import { parseBrokerCsvLogic, parseExcelLogic, parsePdfLogic } from '../services/marketService';
import { Asset } from '../types';

interface ImporterProps {
  onAssetsImported: (assets: Partial<Asset>[]) => void;
}

export const Importer: React.FC<ImporterProps> = ({ onAssetsImported }) => {
  const [selectedBroker, setSelectedBroker] = useState(BROKERS[0]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setStatus('idle');
    setErrorMsg('');

    try {
      const fileName = file.name.toLowerCase();
      let imported: Partial<Asset>[] = [];

      if (fileName.endsWith('.csv')) {
        const text = await file.text();
        imported = parseBrokerCsvLogic(text);
      } 
      else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        const buffer = await file.arrayBuffer();
        imported = await parseExcelLogic(buffer);
      } 
      else if (fileName.endsWith('.pdf')) {
        const buffer = await file.arrayBuffer();
        imported = await parsePdfLogic(buffer);
      } else {
        throw new Error("Formato de arquivo não suportado.");
      }
      
      if (imported.length > 0) {
        onAssetsImported(imported);
        setStatus('success');
      } else {
        throw new Error("Não foi possível identificar ativos no arquivo. Verifique se o formato está correto.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao processar arquivo.");
      setStatus('error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="text-center">
        <h1 className="text-3xl font-black text-slate-800 tracking-tight">Importação Multi-Formato</h1>
        <p className="text-slate-500 mt-2 font-medium">Arraste seu PDF de corretagem, planilha Excel ou CSV.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-slate-100 space-y-6">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Sua Corretora Base</label>
            <select 
              value={selectedBroker}
              onChange={(e) => setSelectedBroker(e.target.value)}
              className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-slate-700 transition-all"
            >
              {BROKERS.map(broker => (
                <option key={broker} value={broker}>{broker}</option>
              ))}
            </select>
          </div>

          <div className="relative border-2 border-dashed border-slate-200 rounded-3xl p-12 hover:border-emerald-400 hover:bg-emerald-50/30 transition-all group cursor-pointer text-center">
            <input 
              type="file" 
              accept=".csv,.pdf,.xlsx,.xls"
              onChange={handleFileUpload}
              disabled={isProcessing}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" 
            />
            <div className="flex flex-col items-center">
              <div className={`p-5 rounded-2xl mb-4 shadow-sm transition-all ${isProcessing ? 'bg-emerald-100' : 'bg-white group-hover:scale-110'}`}>
                {isProcessing ? (
                  <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
                ) : (
                  <div className="flex gap-2">
                     <FileText className="w-8 h-8 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                     <FileSpreadsheet className="w-8 h-8 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                  </div>
                )}
              </div>
              <p className="text-slate-800 font-black">
                {isProcessing ? 'Extraindo dados financeiros...' : 'Clique ou arraste o arquivo'}
              </p>
              <p className="text-slate-400 text-xs mt-2 font-medium">PDF, XLSX, XLS ou CSV</p>
            </div>
          </div>

          {status === 'success' && (
            <div className="flex items-center gap-3 p-5 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-100 animate-in fade-in slide-in-from-bottom-2">
              <CheckCircle className="w-6 h-6 shrink-0" />
              <div className="text-sm">
                 <p className="font-black">Sucesso!</p>
                 <p className="font-medium opacity-80">Ativos importados e sincronizados com sua carteira.</p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="flex items-center gap-3 p-5 bg-rose-50 text-rose-700 rounded-2xl border border-rose-100 animate-in fade-in slide-in-from-bottom-2">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <div className="text-sm">
                 <p className="font-black">Falha no processamento</p>
                 <p className="font-medium opacity-80">{errorMsg}</p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl">
            <h3 className="font-black text-[10px] uppercase tracking-widest text-emerald-400 mb-4">Notas de Corretagem</h3>
            <p className="text-sm leading-relaxed text-slate-300 font-medium">
              Agora você pode subir o <strong>PDF original</strong> emitido pela sua corretora. Nossa inteligência local extrai os ativos, quantidades e preços automaticamente.
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="font-black text-slate-800 text-xs mb-3 uppercase tracking-wider">Formatos Suportados</h3>
            <div className="space-y-3">
               <div className="flex items-center gap-2 text-xs text-slate-500 font-bold">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div> Excel (.xlsx, .xls)
               </div>
               <div className="flex items-center gap-2 text-xs text-slate-500 font-bold">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div> PDF (Extratos B3)
               </div>
               <div className="flex items-center gap-2 text-xs text-slate-500 font-bold">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> CSV Padrão
               </div>
            </div>
            <div className="mt-5 pt-4 border-t border-slate-50 flex items-start gap-2 text-[10px] text-slate-400 font-medium">
              <Info className="w-3 h-3 text-emerald-500 shrink-0" />
              <p>O processamento é 100% privado e acontece no seu navegador.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
