
import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Portfolio } from './components/Portfolio';
import { Importer } from './components/Importer';
import { Transactions } from './components/Transactions';
import { Asset, AssetType, Transaction } from './types';
import { INITIAL_ASSETS } from './constants';
import { fetchCurrentPrices } from './services/marketService';
import { calculatePosition } from './services/investmentService';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Transações do usuário
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('bolsamaster_transactions');
    return saved ? JSON.parse(saved) : [];
  });

  // Ativos calculados dinamicamente
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);

  // Persistência das transações
  useEffect(() => {
    localStorage.setItem('bolsamaster_transactions', JSON.stringify(transactions));
  }, [transactions]);

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

  const handleAddTransaction = (t: Transaction) => {
    setTransactions(prev => [...prev, t]);
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const handleImportedAssets = (newAssetData: Partial<Asset>[]) => {
    const newTransactions: Transaction[] = newAssetData.map(data => ({
      id: Math.random().toString(36).substr(2, 9),
      ticker: data.ticker || 'UNKNOWN',
      type: 'BUY',
      quantity: data.quantity || 0,
      price: data.averagePrice || 0,
      costs: 0,
      date: new Date().toISOString().split('T')[0]
    }));
    
    setTransactions(prev => [...prev, ...newTransactions]);
    setActiveTab('portfolio');
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

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === 'dashboard' && <Dashboard assets={assets} />}
      {activeTab === 'portfolio' && (
        <Portfolio 
          assets={assets} 
          transactions={transactions}
          onRefreshPrices={handleRefreshPrices} 
          isLoading={isLoadingPrices} 
        />
      )}
      {activeTab === 'transactions' && (
        <Transactions 
          transactions={transactions}
          onAddTransaction={handleAddTransaction}
          onDeleteTransaction={handleDeleteTransaction}
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
