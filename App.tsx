
import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Portfolio } from './components/Portfolio';
import { Importer } from './components/Importer';
import { Transactions } from './components/Transactions';
import { Asset, AssetType, Transaction } from './types';
import { fetchCurrentPrices } from './services/marketService';
import { calculatePosition } from './services/investmentService';
import { getTransactions, saveTransaction, deleteTransactionFromDb, supabase } from './services/supabase';
import { Loader2, CloudCheck, CloudOff, Database } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error' | 'local'>('local');
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);
  const [forceOpenTransactionForm, setForceOpenTransactionForm] = useState(false);

  // Carrega transações ao iniciar
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

  // Recalcula ativos sempre que as transações mudarem
  useEffect(() => {
    const uniqueTickers = Array.from(new Set(transactions.map(t => t.ticker)));
    
    const recalculatedAssets: Asset[] = uniqueTickers.map(ticker => {
      const { quantity, averagePrice } = calculatePosition(ticker, transactions);
      const existingAsset = assets.find(a => a.ticker === ticker);
      
      return {
        id: existingAsset?.id || Math.random().toString(36).substr(2, 9),
        ticker,
        name: existingAsset?.name || 'Ativo Registrado',
        type: ticker.endsWith('11') ? AssetType.FII : AssetType.STOCK,
        quantity,
        averagePrice,
        currentPrice: existingAsset?.currentPrice || averagePrice,
        lastUpdated: existingAsset?.lastUpdated || new Date().toISOString()
      };
    }).filter(a => a.quantity > 0);

    setAssets(recalculatedAssets);
  }, [transactions]);

  const handleAddTransaction = async (t: Transaction) => {
    const prevStatus = syncStatus;
    setSyncStatus('syncing');
    try {
      await saveTransaction(t);
      setTransactions(prev => [t, ...prev]);
      setSyncStatus(supabase ? 'synced' : 'local');
    } catch (err) {
      console.error("Erro ao salvar:", err);
      setSyncStatus('error');
      alert("Erro ao salvar. Verifique se a tabela 'transactions' existe no Supabase.");
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
        setTransactions(prev => [t, ...prev]);
      }
      setSyncStatus(supabase ? 'synced' : 'local');
      setActiveTab('portfolio');
    } catch (err) {
      setSyncStatus('error');
    }
  };

  const handleRefreshPrices = async () => {
    if (assets.length === 0) return;
    setIsLoadingPrices(true);
    try {
      const tickers = assets.map(a => a.ticker);
      const prices = await fetchCurrentPrices(tickers);
      
      setAssets(prev => prev.map(asset => ({
        ...asset,
        currentPrice: prices[asset.ticker] || asset.currentPrice,
        lastUpdated: new Date().toISOString()
      })));
    } catch (err) {
      console.error("Erro ao atualizar cotações", err);
    } finally {
      setIsLoadingPrices(false);
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
      <div className="flex justify-end mb-4">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border border-slate-200 shadow-sm text-xs font-medium">
          {syncStatus === 'synced' && <><CloudCheck className="w-4 h-4 text-emerald-500" /> <span className="text-slate-600">Sincronizado com Nuvem</span></>}
          {syncStatus === 'local' && <><Database className="w-4 h-4 text-slate-400" /> <span className="text-slate-500">Armazenamento Local (Offline)</span></>}
          {syncStatus === 'syncing' && <><Loader2 className="w-4 h-4 text-amber-500 animate-spin" /> <span className="text-slate-600">Sincronizando...</span></>}
          {syncStatus === 'error' && <><CloudOff className="w-4 h-4 text-rose-500" /> <span className="text-rose-600">Erro de Conexão</span></>}
        </div>
      </div>

      {activeTab === 'dashboard' && <Dashboard assets={assets} />}
      {activeTab === 'portfolio' && (
        <Portfolio 
          assets={assets} 
          transactions={transactions}
          onRefreshPrices={handleRefreshPrices} 
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
