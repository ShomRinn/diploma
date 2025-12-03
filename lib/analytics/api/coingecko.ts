/**
 * CoinGecko API Integration
 * Handles all API calls to CoinGecko for real-time market data
 */

import { getCoinGeckoFetchOptions } from '@/ai/utils/constants';

export interface CoinGeckoMarketData {
  id: string;
  symbol: string;
  name: string;
  market_data: {
    current_price: { usd: number };
    market_cap: { usd: number };
    total_volume: { usd: number };
    price_change_percentage_24h: number;
    price_change_percentage_7d: number;
    price_change_percentage_30d: number;
    price_change_percentage_1y: number;
    high_24h: { usd: number };
    low_24h: { usd: number };
    ath: { usd: number };
    ath_date: { usd: string };
    ath_change_percentage: { usd: number };
    atl: { usd: number };
    atl_date: { usd: string };
    atl_change_percentage: { usd: number };
    circulating_supply: number;
    total_supply: number;
    max_supply: number | null;
    fully_diluted_valuation: { usd: number } | null;
    sparkline_7d?: { price: number[] };
  };
  market_cap_rank: number;
  sentiment_votes_up_percentage?: number;
  sentiment_votes_down_percentage?: number;
  last_updated: string;
}

const API_BASE_URL = 'https://api.coingecko.com/api/v3';

/**
 * Fetch comprehensive market data for a coin
 */
export async function fetchCoinMarketData(
  coinId: string
): Promise<CoinGeckoMarketData> {
  const response = await fetch(
    `${API_BASE_URL}/coins/${coinId}?localization=false&tickers=false&community_data=true&developer_data=false&sparkline=true`,
    getCoinGeckoFetchOptions()
  );

  if (!response.ok) {
    throw new Error(`CoinGecko API error: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch simple price data (lightweight)
 */
export async function fetchSimplePrice(
  coinIds: string[],
  vsCurrency: string = 'usd'
): Promise<Record<string, { usd: number; usd_24h_change: number }>> {
  const ids = coinIds.join(',');
  const response = await fetch(
    `${API_BASE_URL}/simple/price?ids=${ids}&vs_currencies=${vsCurrency}&include_24hr_change=true`,
    getCoinGeckoFetchOptions()
  );

  if (!response.ok) {
    throw new Error(`CoinGecko API error: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch multiple coins market data
 */
export async function fetchMultipleCoinsData(
  coinIds: string[]
): Promise<CoinGeckoMarketData[]> {
  return Promise.all(coinIds.map((id) => fetchCoinMarketData(id)));
}

