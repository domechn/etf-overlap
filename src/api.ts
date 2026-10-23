import axios from 'axios';

const API_BASE = '/api';

export interface ETFSearchResult {
  symbol: string;
  shortname: string;
  longname: string;
  exchange: string;
}

export interface Holding {
  symbol: string;
  name: string;
  percent: number;
}

export interface OverlapCell {
  weight: number;
  count: number;
  common: {
    symbol: string;
    name: string;
    weight_a: number;
    weight_b: number;
  }[];
}

export interface HoldingsMeta {
  source: 'ishares' | 'vanguard' | 'spdr' | 'invesco' | 'sec' | 'yahoo';
  as_of: string;
  complete: boolean;
  count: number;
  total: number;
  coverage: number;
  reason: string;
  errors?: string[];
}

export interface AnalysisResult {
  holdings_meta: Record<string, HoldingsMeta>;
  holdings: Record<string, Holding[]>;
  etf_info: Record<string, { shortname: string; longname: string; currency: string }>;
  overlap_matrix: OverlapCell[][];
  tickers: string[];
}

export const searchETFs = async (query: string): Promise<ETFSearchResult[]> => {
  const response = await axios.get(`${API_BASE}/search`, { params: { q: query } });
  return response.data;
};

export const analyzeETFs = async (tickers: string[], market: string): Promise<AnalysisResult> => {
  const response = await axios.post(`${API_BASE}/analyze`, { tickers, market });
  return response.data;
};
