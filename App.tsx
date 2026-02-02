
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Portfolio } from './components/Portfolio';
import { Importer } from './components/Importer';
import { Transactions } from './components/Transactions';
import { Stats } from './components/Stats';
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

  // Carregamento Inicial
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

  // Recalcula ativos sempre que as transações mudam
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

  // Função centralizada de atualização de preços (Com Fallback Yahoo Finance)
  const handleRefreshPrices = useCallback(async (targetAssets?: Asset[]) => {
    const list = targetAssets || assets;
    if (list.length === 0 || isLoadingPrices) return;
    
    setIsLoadingPrices(true);
    try {
      const tickers = list.map(a => a.ticker);
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
      console.error("Market Data Error:", err);
    } finally {
      setIsLoadingPrices(false);
    }
  }, [assets, isLoadingPrices]);

  // Gatilho para novos ativos
  useEffect(() => {
    if (assets.length > prevAssetsLength.current) {
      handleRefreshPrices();
    }
    prevAssetsLength.current = assets.length;
  }, [assets.length, handleRefreshPrices]);

  // Intervalo de 5 min
  useEffect(() => {
    if (assets.length > 0) {
      const interval = setInterval(() => handleRefreshPrices(), 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [assets.length, handleRefreshPrices]);

  const handleAddTransaction = async (t: Transaction) => {
    setSyncStatus('syncing');
    await saveTransaction(t);
    setTransactions(prev => [t, ...prev]);
    setSyncStatus(supabase ? 'synced' : 'local');
  };

  const handleDeleteTransaction = async (id: string) => {
    setSyncStatus('syncing');
    await deleteTransactionFromDb(id);
    setTransactions(prev => prev.filter(t => t.id !== id));
    setSyncStatus(supabase ? 'synced' : 'local');
  };

  const handleImportedAssets = async (newAssetData: Partial<Asset>[]) => {
    setSyncStatus('syncing');
    const added: Transaction[] = [];
    
    // Organiza as transações no Supabase
    for (const data of newAssetData) {
      const t: Transaction = {
        id: Math.random().toString(36).substr(2, 9),
        ticker: data.ticker?.toUpperCase() || 'UNKNOWN',
        type: 'BUY',
        quantity: data.quantity || 0,
        price: data.averagePrice || 0,
        costs: 0,
        date: new Date().toISOString().split('T')[0]
      };
      await saveTransaction(t);
      added.push(t);
    }
    
    setTransactions(prev => [...added, ...prev]);
    setSyncStatus(supabase ? 'synced' : 'local');
    
    // Após organizar, move o usuário para a carteira para ver os preços sendo carregados
    setActiveTab('portfolio');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
      </div>
    );
  }

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      <div className="flex flex-col md:flex-row justify-end items-center gap-3 mb-6">
        {lastPriceUpdate && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100 text-[10px] font-black uppercase">
            <Clock className="w-3.5 h-3.5" />
            Live (Brapi + Yahoo): {lastPriceUpdate.toLocaleTimeString('pt-BR')}
          </div>
        )}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border border-slate-200 text-xs font-medium">
          {syncStatus === 'synced' ? <><CheckCircle className="w-4 h-4 text-emerald-500" /> Cloud Sync</> : <><Database className="w-4 h-4 text-slate-400" /> Local Storage</>}
        </div>
      </div>

      {activeTab === 'dashboard' && <Dashboard assets={assets} />}
      {activeTab === 'portfolio' && (
        <Portfolio 
          assets={assets} 
          transactions={transactions}
          onRefreshPrices={() => handleRefreshPrices()} 
          isLoading={isLoadingPrices} 
          onAddAsset={() => {setForceOpenTransactionForm(true); setActiveTab('transactions');}}
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
      {activeTab === 'stats' && <Stats assets={assets} />}
    </Layout>
  );
};

export default App;
