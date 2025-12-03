"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { publicClient } from "@/wagmi.config";
import { formatEther } from "viem";
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Filter,
  Search,
  RefreshCw,
  Clock,
  BarChart3,
  DollarSign,
  Activity,
} from "lucide-react";
import { Asset } from "@/lib/types";
import { Input } from "@/components/ui/input";

interface MarketAnalytics {
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

export default function PortfolioPage() {
  const { address } = useAccount();
  const [totalValue, setTotalValue] = useState(0);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"value" | "change">("value");
  const [marketAnalytics, setMarketAnalytics] = useState<MarketAnalytics | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [nextUpdate, setNextUpdate] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Helper functions for caching (defined before loadPortfolio)
  const getCachedData = (key: string) => {
    if (typeof window === 'undefined') return null;
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    
    try {
      const { data, expiry } = JSON.parse(cached);
      if (Date.now() > expiry) {
        localStorage.removeItem(key);
        return null;
      }
      return data;
    } catch (error) {
      console.error('Error parsing cache:', error);
      localStorage.removeItem(key);
      return null;
    }
  };

  const setCachedData = (key: string, data: any, duration: number) => {
    if (typeof window === 'undefined') return;
    try {
      const expiry = Date.now() + duration;
      localStorage.setItem(key, JSON.stringify({ data, expiry }));
    } catch (error) {
      console.error('Error setting cache:', error);
    }
  };

  const loadPortfolio = useCallback(async (forceRefresh = false) => {
    if (!address) return;
    
    setLoading(true);
    if (forceRefresh) setIsRefreshing(true);
    
    try {
      // Get ETH balance
      const ethBalance = await publicClient.getBalance({ address });
      const ethAmount = parseFloat(formatEther(ethBalance));
      
      // Fetch comprehensive market data from CoinGecko with 30-min cache
      const cacheKey = 'portfolio-analytics-ethereum';
      const cachedData = !forceRefresh ? getCachedData(cacheKey) : null;
      
      let analyticsData;
      if (cachedData) {
        analyticsData = cachedData;
      } else {
        const response = await fetch(
          'https://api.coingecko.com/api/v3/coins/ethereum?localization=false&tickers=false&community_data=true&developer_data=false&sparkline=true'
        );
        analyticsData = await response.json();
        setCachedData(cacheKey, analyticsData, 30 * 60 * 1000); // 30 minutes
      }

      const ethPrice = analyticsData.market_data?.current_price?.usd || 0;
      const eth24hChange = analyticsData.market_data?.price_change_percentage_24h || 0;
      const ethValue = ethAmount * ethPrice;

      // Set market analytics
      const analytics: MarketAnalytics = {
        currentPrice: ethPrice,
        marketCap: analyticsData.market_data?.market_cap?.usd || 0,
        marketCapRank: analyticsData.market_cap_rank || 0,
        volume24h: analyticsData.market_data?.total_volume?.usd || 0,
        volumeMarketCapRatio: analyticsData.market_data?.total_volume?.usd && analyticsData.market_data?.market_cap?.usd
          ? (analyticsData.market_data.total_volume.usd / analyticsData.market_data.market_cap.usd * 100).toFixed(2)
          : '0',
        priceChange24h: eth24hChange,
        priceChange7d: analyticsData.market_data?.price_change_percentage_7d || 0,
        priceChange30d: analyticsData.market_data?.price_change_percentage_30d || 0,
        priceChange1y: analyticsData.market_data?.price_change_percentage_1y || 0,
        high24h: analyticsData.market_data?.high_24h?.usd || 0,
        low24h: analyticsData.market_data?.low_24h?.usd || 0,
        ath: analyticsData.market_data?.ath?.usd || 0,
        athDate: analyticsData.market_data?.ath_date?.usd || null,
        athChangePercentage: analyticsData.market_data?.ath_change_percentage?.usd || 0,
        atl: analyticsData.market_data?.atl?.usd || 0,
        atlDate: analyticsData.market_data?.atl_date?.usd || null,
        atlChangePercentage: analyticsData.market_data?.atl_change_percentage?.usd || 0,
        circulatingSupply: analyticsData.market_data?.circulating_supply || 0,
        totalSupply: analyticsData.market_data?.total_supply || 0,
        maxSupply: analyticsData.market_data?.max_supply || null,
        fullyDilutedValuation: analyticsData.market_data?.fully_diluted_valuation?.usd || null,
        sentiment: {
          votesUpPercentage: analyticsData.sentiment_votes_up_percentage || 0,
          votesDownPercentage: analyticsData.sentiment_votes_down_percentage || 0,
        },
        sparkline: analyticsData.market_data?.sparkline_7d?.price || [],
        lastUpdated: analyticsData.last_updated,
      };

      setMarketAnalytics(analytics);

      // Real assets with live data
      const realAssets: Asset[] = [
        {
          id: "ethereum",
          symbol: "ETH",
          name: "Ethereum",
          balance: ethAmount.toFixed(4),
          value: ethValue,
          price: ethPrice,
          change24h: eth24hChange,
        },
      ];

      setAssets(realAssets);
      setTotalValue(ethValue);
      
      const now = new Date();
      setLastUpdate(now);
      setNextUpdate(new Date(now.getTime() + 30 * 60 * 1000)); // 30 minutes from now
      
    } catch (error) {
      console.error("Error loading portfolio:", error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]); // getCachedData and setCachedData are stable utility functions

  // Auto-refresh every 30 minutes
  useEffect(() => {
    if (address) {
      loadPortfolio();
      
      const interval = setInterval(() => {
        loadPortfolio();
      }, 30 * 60 * 1000); // 30 minutes

      return () => clearInterval(interval);
    }
  }, [address, loadPortfolio]);

  const formatLargeNumber = (num: number) => {
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    return `$${num.toFixed(2)}`;
  };

  const formatSupply = (num: number) => {
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return num.toFixed(0);
  };

  const getTimeUntilUpdate = () => {
    if (!nextUpdate) return '';
    const diff = nextUpdate.getTime() - Date.now();
    const minutes = Math.floor(diff / 60000);
    return minutes > 0 ? `${minutes} min` : 'Updating...';
  };

  const filteredAssets = assets
    .filter(asset =>
      asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.symbol.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === "value") {
        return b.value - a.value;
      }
      return b.change24h - a.change24h;
    });


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Portfolio Analytics</h1>
          <p className="text-gray-600">Real-time market data powered by CoinGecko</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdate && (
            <div className="text-sm text-gray-500 flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>Next update in {getTimeUntilUpdate()}</span>
            </div>
          )}
          <Button
            onClick={() => loadPortfolio(true)}
            disabled={isRefreshing}
            size="sm"
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Total Value Card */}
      <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl p-8 text-white shadow-xl">
        <p className="text-blue-100 mb-2">Total Portfolio Value</p>
        {loading ? (
          <div className="h-16 w-64 bg-white/20 rounded animate-pulse" />
        ) : (
          <div className="flex items-baseline gap-3">
            <h2 className="text-6xl font-bold">
              ${totalValue.toFixed(2)}
            </h2>
            {marketAnalytics && (
              <div className="flex items-center gap-1 text-xl">
                {marketAnalytics.priceChange24h >= 0 ? (
                  <TrendingUp className="h-6 w-6 text-green-300" />
                ) : (
                  <TrendingDown className="h-6 w-6 text-red-300" />
                )}
                <span className={marketAnalytics.priceChange24h >= 0 ? "text-green-300" : "text-red-300"}>
                  {marketAnalytics.priceChange24h >= 0 ? "+" : ""}{marketAnalytics.priceChange24h.toFixed(2)}%
                </span>
              </div>
            )}
          </div>
        )}
        <p className="text-blue-100 mt-2">Last 24 hours</p>

        {/* Performance Stats */}
        {marketAnalytics && (
          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-blue-200 text-sm">7 Days</p>
              <p className={`text-xl font-bold ${marketAnalytics.priceChange7d >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                {marketAnalytics.priceChange7d >= 0 ? '+' : ''}{marketAnalytics.priceChange7d.toFixed(2)}%
              </p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-blue-200 text-sm">30 Days</p>
              <p className={`text-xl font-bold ${marketAnalytics.priceChange30d >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                {marketAnalytics.priceChange30d >= 0 ? '+' : ''}{marketAnalytics.priceChange30d.toFixed(2)}%
              </p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-blue-200 text-sm">1 Year</p>
              <p className={`text-xl font-bold ${marketAnalytics.priceChange1y >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                {marketAnalytics.priceChange1y >= 0 ? '+' : ''}{marketAnalytics.priceChange1y.toFixed(2)}%
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Market Analytics Cards */}
      {marketAnalytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Market Cap */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-5 w-5 text-blue-600" />
              <p className="text-sm text-gray-600">Market Cap</p>
            </div>
            <p className="text-2xl font-bold">{formatLargeNumber(marketAnalytics.marketCap)}</p>
            <p className="text-sm text-gray-500 mt-1">Rank #{marketAnalytics.marketCapRank}</p>
          </div>

          {/* Volume */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-5 w-5 text-purple-600" />
              <p className="text-sm text-gray-600">24h Volume</p>
            </div>
            <p className="text-2xl font-bold">{formatLargeNumber(marketAnalytics.volume24h)}</p>
            <p className="text-sm text-gray-500 mt-1">{marketAnalytics.volumeMarketCapRatio}% of MCap</p>
          </div>

          {/* 24h Range */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-5 w-5 text-green-600" />
              <p className="text-sm text-gray-600">24h Range</p>
            </div>
            <p className="text-lg font-bold">${marketAnalytics.low24h.toFixed(2)}</p>
            <p className="text-lg font-bold">${marketAnalytics.high24h.toFixed(2)}</p>
          </div>

          {/* ATH */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-orange-600" />
              <p className="text-sm text-gray-600">All-Time High</p>
            </div>
            <p className="text-2xl font-bold">${marketAnalytics.ath.toFixed(2)}</p>
            <p className={`text-sm mt-1 ${marketAnalytics.athChangePercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {marketAnalytics.athChangePercentage >= 0 ? '+' : ''}{marketAnalytics.athChangePercentage.toFixed(2)}% from ATH
            </p>
          </div>
        </div>
      )}

      {/* Supply & Sentiment */}
      {marketAnalytics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Supply Info */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold mb-4">Supply Information</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Circulating Supply</span>
                <span className="font-semibold">{formatSupply(marketAnalytics.circulatingSupply)} ETH</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Supply</span>
                <span className="font-semibold">{formatSupply(marketAnalytics.totalSupply)} ETH</span>
              </div>
              {marketAnalytics.maxSupply && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Max Supply</span>
                  <span className="font-semibold">{formatSupply(marketAnalytics.maxSupply)} ETH</span>
                </div>
              )}
              {marketAnalytics.fullyDilutedValuation && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Fully Diluted Valuation</span>
                  <span className="font-semibold">{formatLargeNumber(marketAnalytics.fullyDilutedValuation)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Sentiment */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold mb-4">Market Sentiment</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Bullish</span>
                  <span className="font-semibold text-green-600">{marketAnalytics.sentiment.votesUpPercentage.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: `${marketAnalytics.sentiment.votesUpPercentage}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Bearish</span>
                  <span className="font-semibold text-red-600">{marketAnalytics.sentiment.votesDownPercentage.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-red-500 h-2 rounded-full"
                    style={{ width: `${marketAnalytics.sentiment.votesDownPercentage}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assets List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {/* Controls */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search assets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={sortBy === "value" ? "default" : "outline"}
                size="sm"
                onClick={() => setSortBy("value")}
              >
                Value
              </Button>
              <Button
                variant={sortBy === "change" ? "default" : "outline"}
                size="sm"
                onClick={() => setSortBy("change")}
              >
                Change
              </Button>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Assets Table */}
        <div className="divide-y divide-gray-200">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>No assets found</p>
            </div>
          ) : (
            filteredAssets.map((asset) => (
              <div
                key={asset.id}
                className="p-6 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between">
                  {/* Asset Info */}
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="font-bold text-blue-600">{asset.symbol}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-lg">{asset.name}</p>
                      <p className="text-sm text-gray-500">
                        {asset.balance} {asset.symbol}
                      </p>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="text-right">
                    <p className="font-semibold">${asset.price.toFixed(2)}</p>
                    <div
                      className={`flex items-center justify-end gap-1 text-sm ${
                        asset.change24h >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {asset.change24h >= 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {asset.change24h >= 0 ? "+" : ""}
                      {asset.change24h.toFixed(2)}%
                    </div>
                  </div>

                  {/* Value */}
                  <div className="text-right ml-8">
                    <p className="font-bold text-lg">${asset.value.toFixed(2)}</p>
                    <p className="text-sm text-gray-500">
                      {((asset.value / totalValue) * 100).toFixed(1)}% of portfolio
                    </p>
                  </div>

                  {/* Action */}
                  <Button variant="ghost" size="sm" className="ml-4">
                    <ArrowUpRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* CoinGecko Attribution */}
      <p className="text-sm text-gray-500 text-center">
        Powered by{" "}
        <a
          href="https://www.coingecko.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          CoinGecko API
        </a>
      </p>
    </div>
  );
}

