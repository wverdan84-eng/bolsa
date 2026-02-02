
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Portfolio } from './components/Portfolio';
import { Importer } from './components/Importer';
import { Transactions } from './components/Transactions';
import { Asset, AssetType, Transaction } from './types';
import { fetchCurrentPrices } from './services/marketService';
import { calculatePosition, detectAssetType } from './services/investmentService';
import { getTransactions, saveTransaction, deleteTransactionFromDb, supabase } from './services/supabase';
import { Loader2, CheckCircle, CloudOff, Database, Clock } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error' | 'local'>('local');
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);
  const [lastPriceUpdate, setLastPriceUpdate] = useState<Date | null>(null);
  const [forceOpenTransactionForm, setForceOpenTransactionForm] = useState(false);
  
  const prevAssetsLength = useRef(0);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const data = await getTransactions();
        setTransactions(data || []);
        setSyncStatus(supabase ? 'synced' : 'local');
      } catch (err) {
        setSyncStatus('error');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    const uniqueTickers = Array.from(new Set<string>(transactions.map(t => t.ticker)));
    
    const recalculatedAssets: Asset[] = uniqueTickers.map(ticker => {
      const { quantity, averagePrice } = calculatePosition(ticker, transactions);
      const existingAsset = assets.find(a => a.ticker === ticker);
      
      return {
        id: existingAsset?.id || Math.random().toString(36).substr(2, 9),
        ticker,
        name: existingAsset?.name || 'Ativo Registrado',
        type: detectAssetType(ticker),
        quantity,
        averagePrice,
        currentPrice: existingAsset?.currentPrice || averagePrice,
        lastUpdated: existingAsset?.lastUpdated || new Date().toISOString()
      };
    }).filter(a => a.quantity > 0);

    setAssets(recalculatedAssets);
  }, [transactions]);

  const handleRefreshPrices = useCallback(async (targetAssets?: Asset[]) => {
    const assetsToFetch = targetAssets || assets;
    if (assetsToFetch.length === 0 || isLoadingPrices) return;
    
    setIsLoadingPrices(true);
    try {
      const tickers = assetsToFetch.map(a => a.ticker);
      const prices = await fetchCurrentPrices(tickers);
      
      if (Object.keys(prices).length > 0) {
        setAssets(prev => prev.map(asset => ({
          ...asset,
          currentPrice: prices[asset.ticker] || asset.currentPrice,
          lastUpdated: new Date().toISOString()
        })));
        setLastPriceUpdate(new Date());
      }
    } catch (err) {
      console.error("Erro ao atualizar cotações", err);
    } finally {
      setIsLoadingPrices(false);
    }
  }, [assets, isLoadingPrices]);

  // Monitora mudanças na carteira para atualizar preços de novos ativos imediatamente
  useEffect(() => {
    if (assets.length > prevAssetsLength.current) {
      handleRefreshPrices();
    }
    prevAssetsLength.current = assets.length;
  }, [assets.length, handleRefreshPrices]);

  // Timer de 5 minutos
  useEffect(() => {
    if (assets.length > 0) {
      const interval = setInterval(() => {
        handleRefreshPrices();
      }, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [assets.length, handleRefreshPrices]);

  const handleAddTransaction = async (t: Transaction) => {
    setSyncStatus('syncing');
    try {
      await saveTransaction(t);
      setTransactions(prev => [t, ...prev]);
      setSyncStatus(supabase ? 'synced' : 'local');
    } catch (err) {
      setSyncStatus('error');
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    setSyncStatus('syncing');
    try {
      await deleteTransactionFromDb(id);
      setTransactions(prev => prev.filter(t => t.id !== id));
      setSyncStatus(supabase ? 'synced' : 'local');
    } catch (err) {
      setSyncStatus('error');
    }
  };

  const handleGoToAddTransaction = () => {
    setForceOpenTransactionForm(true);
    setActiveTab('transactions');
  };

  const handleImportedAssets = async (newAssetData: Partial<Asset>[]) => {
    setSyncStatus('syncing');
    try {
      const addedTransactions: Transaction[] = [];
      for (const data of newAssetData) {
        const t: Transaction = {
          id: Math.random().toString(36).substr(2, 9),
          ticker: data.ticker || 'UNKNOWN',
          type: 'BUY',
          quantity: data.quantity || 0,
          price: data.averagePrice || 0,
          costs: 0,
          date: new Date().toISOString().split('T')[0]
        };
        await saveTransaction(t);
        addedTransactions.push(t);
      }
      setTransactions(prev => [...addedTransactions, ...prev]);
      setSyncStatus(supabase ? 'synced' : 'local');
      setActiveTab('portfolio');
    } catch (err) {
      setSyncStatus('error');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mx-auto" />
          <p className="text-slate-500 font-medium">Carregando dados...</p>
        </div>
      </div>
    );
  }

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      <div className="flex flex-col md:flex-row justify-end items-center gap-3 mb-4">
        {lastPriceUpdate && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100 shadow-sm text-[10px] font-black uppercase tracking-wider">
            <Clock className="w-3.5 h-3.5" />
            <span>Preços: {lastPriceUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        )}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border border-slate-200 shadow-sm text-xs font-medium">
          {syncStatus === 'synced' && <><CheckCircle className="w-4 h-4 text-emerald-500" /> <span className="text-slate-600">Sincronizado</span></>}
          {syncStatus === 'local' && <><Database className="w-4 h-4 text-slate-400" /> <span className="text-slate-500">Dados Locais</span></>}
          {syncStatus === 'syncing' && <><Loader2 className="w-4 h-4 text-amber-500 animate-spin" /> <span className="text-slate-600">Sincronizando...</span></>}
          {syncStatus === 'error' && <><CloudOff className="w-4 h-4 text-rose-500" /> <span className="text-rose-600">Erro Nuvem</span></>}
        </div>
      </div>

      {activeTab === 'dashboard' && <Dashboard assets={assets} />}
      {activeTab === 'portfolio' && (
        <Portfolio 
          assets={assets} 
          transactions={transactions}
          onRefreshPrices={() => handleRefreshPrices()} 
          isLoading={isLoadingPrices} 
          onAddAsset={handleGoToAddTransaction}
        />
      )}
      {activeTab === 'transactions' && (
        <Transactions 
          transactions={transactions}
          onAddTransaction={handleAddTransaction}
          onDeleteTransaction={handleDeleteTransaction}
          forceOpenForm={forceOpenTransactionForm}
          onFormOpened={() => setForceOpenTransactionForm(false)}
        />
      )}
      {activeTab === 'import' && <Importer onAssetsImported={handleImportedAssets} />}
      {activeTab === 'stats' && (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-center py-20">
            <h2 className="text-xl font-bold text-slate-800">Estatísticas Avançadas</h2>
            <p className="text-slate-500 mt-2">Módulo em desenvolvimento para o MVP.</p>
        </div>
      )}
    </Layout>
  );
};

export default App;
