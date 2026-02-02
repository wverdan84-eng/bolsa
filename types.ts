
export enum AssetType {
  STOCK = 'Ação BR',
  STOCK_INT = 'Stock US',
  FII = 'FII',
  REIT = 'REIT',
  CRYPTO = 'Cripto',
  FIXED_INCOME = 'Renda Fixa',
  ETF = 'ETF'
}

export interface Asset {
  id: string;
  ticker: string;
  name: string;
  type: AssetType;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  lastUpdated: string;
  currency?: 'BRL' | 'USD';
}

export interface Transaction {
  id: string;
  date: string;
  ticker: string;
  type: 'BUY' | 'SELL' | 'DIVIDEND';
  quantity: number;
  price: number;
  costs: number;
}

export interface DashboardStats {
  totalEquity: number;
  totalGain: number;
  totalGainPercentage: number;
  monthlyDividend: number;
}
