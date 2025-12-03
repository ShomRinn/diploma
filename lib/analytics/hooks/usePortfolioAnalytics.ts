import { useState, useEffect, useCallback } from 'react';
import { fetchCoinMarketData, CoinGeckoMarketData } from '../api/coingecko';
import { getCachedData, setCachedData } from '../utils/cache';

export interface MarketAnalytics {
  currentPrice: number;
  marketCap: number;
  marketCapRank: number;
  volume24h: number;
  volumeMarketCapRatio: string;
  priceChange24h: number;
  priceChange7d: number;
  priceChange30d: number;
  priceChange1y: number;
  high24h: number;
  low24h: number;
  ath: number;
  athDate: string | null;
  athChangePercentage: number;
  atl: number;
  atlDate: string | null;
  atlChangePercentage: number;
  circulatingSupply: number;
  totalSupply: number;
  maxSupply: number | null;
  fullyDilutedValuation: number | null;
  sentiment: {
    votesUpPercentage: number;
    votesDownPercentage: number;
  };
  sparkline: number[];
  lastUpdated: string;
}

export function usePortfolioAnalytics(coinId: string = 'ethereum') {
  const [analytics, setAnalytics] = useState<MarketAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [nextUpdate, setNextUpdate] = useState<Date | null>(null);

  const transformData = useCallback((data: CoinGeckoMarketData): MarketAnalytics => {
    return {
      currentPrice: data.market_data?.current_price?.usd || 0,
      marketCap: data.market_data?.market_cap?.usd || 0,
      marketCapRank: data.market_cap_rank || 0,
      volume24h: data.market_data?.total_volume?.usd || 0,
      volumeMarketCapRatio:
        data.market_data?.total_volume?.usd && data.market_data?.market_cap?.usd
          ? ((data.market_data.total_volume.usd / data.market_data.market_cap.usd) * 100).toFixed(2)
          : '0',
      priceChange24h: data.market_data?.price_change_percentage_24h || 0,
      priceChange7d: data.market_data?.price_change_percentage_7d || 0,
      priceChange30d: data.market_data?.price_change_percentage_30d || 0,
      priceChange1y: data.market_data?.price_change_percentage_1y || 0,
      high24h: data.market_data?.high_24h?.usd || 0,
      low24h: data.market_data?.low_24h?.usd || 0,
      ath: data.market_data?.ath?.usd || 0,
      athDate: data.market_data?.ath_date?.usd || null,
      athChangePercentage: data.market_data?.ath_change_percentage?.usd || 0,
      atl: data.market_data?.atl?.usd || 0,
      atlDate: data.market_data?.atl_date?.usd || null,
      atlChangePercentage: data.market_data?.atl_change_percentage?.usd || 0,
      circulatingSupply: data.market_data?.circulating_supply || 0,
      totalSupply: data.market_data?.total_supply || 0,
      maxSupply: data.market_data?.max_supply || null,
      fullyDilutedValuation: data.market_data?.fully_diluted_valuation?.usd || null,
      sentiment: {
        votesUpPercentage: data.sentiment_votes_up_percentage || 0,
        votesDownPercentage: data.sentiment_votes_down_percentage || 0,
      },
      sparkline: data.market_data?.sparkline_7d?.price || [],
      lastUpdated: data.last_updated,
    };
  }, []);

  const loadAnalytics = useCallback(
    async (forceRefresh = false) => {
      setLoading(true);
      setError(null);

      try {
        const cacheKey = `portfolio-analytics-${coinId}`;
        let data: CoinGeckoMarketData | null = null;

        if (!forceRefresh) {
          data = getCachedData<CoinGeckoMarketData>(cacheKey);
        }

        if (!data) {
          data = await fetchCoinMarketData(coinId);
          setCachedData(cacheKey, data, 30 * 60 * 1000); // 30 minutes
        }

        const transformedData = transformData(data);
        setAnalytics(transformedData);

        const now = new Date();
        setLastUpdate(now);
        setNextUpdate(new Date(now.getTime() + 30 * 60 * 1000));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analytics');
        console.error('Error loading analytics:', err);
      } finally {
        setLoading(false);
      }
    },
    [coinId, transformData]
  );

  // Auto-refresh every 30 minutes
  useEffect(() => {
    loadAnalytics();

    const interval = setInterval(() => {
      loadAnalytics();
    }, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, [loadAnalytics]);

  return {
    analytics,
    loading,
    error,
    lastUpdate,
    nextUpdate,
    refresh: () => loadAnalytics(true),
  };
}

