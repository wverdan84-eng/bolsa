
import { Asset, AssetType } from './types';

export const INITIAL_ASSETS: Asset[] = [
  {
    id: '1',
    ticker: 'PETR4',
    name: 'Petrobras PN',
    type: AssetType.STOCK,
    quantity: 100,
    averagePrice: 32.50,
    currentPrice: 38.45,
    lastUpdated: new Date().toISOString()
  },
  {
    id: '2',
    ticker: 'VALE3',
    name: 'Vale ON',
    type: AssetType.STOCK,
    quantity: 50,
    averagePrice: 65.20,
    currentPrice: 62.15,
    lastUpdated: new Date().toISOString()
  },
  {
    id: '3',
    ticker: 'HGLG11',
    name: 'CGHG Logística',
    type: AssetType.FII,
    quantity: 20,
    averagePrice: 160.00,
    currentPrice: 165.30,
    lastUpdated: new Date().toISOString()
  },
  {
    id: '4',
    ticker: 'BTC',
    name: 'Bitcoin',
    type: AssetType.CRYPTO,
    quantity: 0.005,
    averagePrice: 240000.00,
    currentPrice: 350000.00,
    lastUpdated: new Date().toISOString()
  }
];

export const BROKERS = [
  'XP Investimentos',
  'Rico',
  'BTG Pactual',
  'Inter',
  'NuInvest',
  'Clear'
];

export const COMMON_TICKERS = [
  'PETR4', 'PETR3', 'VALE3', 'ITUB4', 'BBDC4', 'BBDC3', 'ABEV3', 'BBAS3', 'ITSA4', 'WEGE3', 
  'MGLU3', 'B3SA3', 'JBSS3', 'RENT3', 'SUZB3', 'EQTL3', 'LREN3', 'GGBR4', 'RDOR3', 'RADL3',
  'HGLG11', 'KNRI11', 'VISC11', 'MXRF11', 'XPML11', 'BTLG11', 'XPLG11', 'HGRU11', 'RECR11', 'IRDM11',
  'BOVA11', 'IVVB11', 'SMALL11', 'HASH11', 'BTC', 'ETH', 'SOL'
];
