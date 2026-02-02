
export enum AssetType {
  STOCK = 'Ação',
  FII = 'FII',
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
}

export interface Transaction {
  id: string;
  date: string;
  ticker: string;
  type: 'BUY' | 'SELL';
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
