
import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, Info, FileSpreadsheet, Database, Trash2, Check, ArrowRight } from 'lucide-react';
import { BROKERS } from '../constants';
import { parseBrokerCsvLogic, parseExcelLogic, parsePdfLogic } from '../services/marketService';
import { Asset } from '../types';

interface ImporterProps {
  onAssetsImported: (assets: Partial<Asset>[]) => void;
}

export const Importer: React.FC<ImporterProps> = ({ onAssetsImported }) => {
  const [selectedBroker, setSelectedBroker] = useState(BROKERS[0]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<'idle' | 'review' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [previewData, setPreviewData] = useState<Partial<Asset>[]>([]);

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
        setPreviewData(imported);
        setStatus('review');
      } else {
        throw new Error("Não conseguimos ler os dados deste arquivo. Tente um formato mais limpo.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao processar arquivo.");
      setStatus('error');
    } finally {
      setIsProcessing(false);
      e.target.value = ''; // Reset input
    }
  };

  const handleConfirmImport = () => {
    onAssetsImported(previewData);
    setStatus('success');
    setPreviewData([]);
  };

  const removeItem = (index: number) => {
    setPreviewData(prev => prev.filter((_, i) => i !== index));
    if (previewData.length <= 1) setStatus('idle');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="text-center">
        <h1 className="text-3xl font-black text-slate-800 tracking-tight">Importador Inteligente</h1>
        <p className="text-slate-500 mt-2 font-medium">Reconhecemos automaticamente PDF, Excel e CSV para organizar seu Supabase.</p>
      </div>

      {status === 'review' ? (
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden animate-in zoom-in-95">
          <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
            <div>
              <h3 className="font-black text-slate-800">Revisar Dados Extraídos</h3>
              <p className="text-xs text-slate-500">Confirme se as quantidades e tickers estão corretos.</p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setStatus('idle')}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-200 rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={handleConfirmImport}
                className="px-6 py-2 bg-emerald-600 text-white text-xs font-black rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-100 flex items-center gap-2"
              >
                <Database className="w-3.5 h-3.5" />
                Organizar no Supabase
              </button>
            </div>
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-white shadow-sm">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Ticker</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase text-right">Quantidade</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase text-right">Preço Médio</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {previewData.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-black text-slate-800">{item.ticker}</td>
                    <td className="px-6 py-4 text-right font-medium text-slate-600">{item.quantity}</td>
                    <td className="px-6 py-4 text-right font-medium text-slate-600">
                      {item.averagePrice?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button onClick={() => removeItem(idx)} className="p-2 text-slate-300 hover:text-rose-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-slate-100 space-y-6">
            <div className="relative border-2 border-dashed border-slate-200 rounded-3xl p-16 hover:border-emerald-400 hover:bg-emerald-50/30 transition-all group cursor-pointer text-center">
              <input 
                type="file" 
                accept=".csv,.pdf,.xlsx,.xls"
                onChange={handleFileUpload}
                disabled={isProcessing}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
              />
              <div className="flex flex-col items-center">
                <div className={`p-6 rounded-2xl mb-6 shadow-sm transition-all ${isProcessing ? 'bg-emerald-100' : 'bg-white group-hover:scale-110'}`}>
                  {isProcessing ? (
                    <Loader2 className="w-12 h-12 text-emerald-600 animate-spin" />
                  ) : (
                    <div className="flex gap-3">
                       <FileText className="w-10 h-10 text-blue-400" />
                       <FileSpreadsheet className="w-10 h-10 text-emerald-400" />
                    </div>
                  )}
                </div>
                <h3 className="text-xl font-black text-slate-800">
                  {isProcessing ? 'Analisando documento...' : 'Subir Arquivo'}
                </h3>
                <p className="text-slate-400 text-sm mt-2 font-medium max-w-xs mx-auto">
                  PDF de corretagem, Planilha Excel ou extrato CSV. Nossa IA local organiza tudo.
                </p>
              </div>
            </div>

            {status === 'success' && (
              <div className="flex items-center gap-4 p-5 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-100">
                <div className="bg-emerald-100 p-2 rounded-full"><Check className="w-5 h-5" /></div>
                <div>
                   <p className="font-black text-sm">Organizado com sucesso!</p>
                   <p className="text-xs font-medium opacity-80">Todos os ativos foram salvos no seu banco de dados Supabase.</p>
                </div>
              </div>
            )}

            {status === 'error' && (
              <div className="flex items-center gap-4 p-5 bg-rose-50 text-rose-700 rounded-2xl border border-rose-100">
                <AlertCircle className="w-6 h-6 shrink-0" />
                <div className="text-sm">
                   <p className="font-black">Erro de Leitura</p>
                   <p className="font-medium opacity-80">{errorMsg}</p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-xl">
              <div className="flex items-center gap-2 text-emerald-400 mb-4">
                <Database className="w-5 h-5" />
                <span className="font-black text-[10px] uppercase tracking-widest">Sincronização Ativa</span>
              </div>
              <h3 className="text-lg font-bold mb-3">Como funciona?</h3>
              <div className="space-y-4 text-sm text-slate-400 font-medium">
                <div className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px] text-white">1</div>
                  <p>Arraste o arquivo original emitido pela corretora.</p>
                </div>
                <div className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px] text-white">2</div>
                  <p>Nossa IA local extrai os ativos sem enviar seus dados para ninguém.</p>
                </div>
                <div className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px] text-white">3</div>
                  <p>Você revisa e confirma a gravação segura no Supabase.</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100">
              <div className="flex items-center gap-2 text-blue-600 mb-2">
                 <Info className="w-4 h-4" />
                 <span className="font-bold text-xs uppercase">Dica Master</span>
              </div>
              <p className="text-xs text-blue-700 leading-relaxed font-medium">
                Prefira arquivos <strong>PDF</strong> para notas de corretagem. São mais precisos para nossa detecção automática.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
