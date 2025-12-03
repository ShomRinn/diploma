import { tool as createTool } from "ai";
import { z } from "zod";
import { publicClient } from "@/wagmi.config";
import { formatEther } from "viem";
import { symbolToCoinId, cachedFetch, retryFetch } from "../utils/helpers";
import { API_ENDPOINTS, getCoinGeckoFetchOptions } from "../utils/constants";

export const getCryptoPriceTool = createTool({
  description: "Get current cryptocurrency price in USD",
  parameters: z.object({
    symbol: z.string().describe("Crypto symbol (ETH, BTC, etc.)"),
    vsCurrency: z.string().optional().default("usd").describe("Currency to compare against"),
  }),
  execute: async ({ symbol, vsCurrency }) => {
    console.log(`getCryptoPriceTool called for ${symbol}`);
    try {
      const coinId = symbolToCoinId(symbol);
      console.log(`Fetching price from CoinGecko for ${coinId}...`);

      // Cache for 60 seconds for price data
      const data = await cachedFetch(
        `price-${coinId}-${vsCurrency}`,
        () =>
          retryFetch(() =>
            fetch(
              `${API_ENDPOINTS.COINGECKO}/simple/price?ids=${coinId}&vs_currencies=${vsCurrency}&include_24hr_change=true`,
              getCoinGeckoFetchOptions()
            ).then((res) => res.json())
          ),
        60000
      );

      if (data[coinId]) {
        console.log(`Got price for ${symbol}: $${data[coinId][vsCurrency]}`);
        return {
          symbol: symbol.toUpperCase(),
          price: data[coinId][vsCurrency],
          change24h: data[coinId][`${vsCurrency}_24h_change`],
          currency: vsCurrency.toUpperCase(),
        };
      }

      return {
        symbol: symbol.toUpperCase(),
        error: 'Price data not available for this cryptocurrency',
      };
    } catch (error) {
      console.error('Crypto price error:', error);
      return {
        symbol: symbol.toUpperCase(),
        error: 'Failed to fetch cryptocurrency price',
      };
    }
  },
});

export const getPortfolioValueTool = createTool({
  description: "Calculate total portfolio value in USD with comprehensive analytics",
  parameters: z.object({
    address: z.string().describe("User's wallet address"),
  }),
  execute: async ({ address }) => {
    try {
      // Get ETH balance
      const ethBalance = await publicClient.getBalance({
        address: address as `0x${string}`,
      });

      // Get comprehensive ETH data from CoinGecko (cached for 30 minutes)
      const coinId = symbolToCoinId('ETH');
      const marketData = await cachedFetch(
        `portfolio-analytics-${coinId}`,
        () =>
          retryFetch(() =>
            fetch(
              `${API_ENDPOINTS.COINGECKO}/coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=true`,
              getCoinGeckoFetchOptions()
            ).then((res) => res.json())
          ),
        1800000 // 30 minutes cache
      );

      const ethBalanceFormatted = parseFloat(formatEther(ethBalance));
      const ethPrice = marketData.market_data?.current_price?.usd || 0;
      const ethValue = ethBalanceFormatted * ethPrice;

      return {
        totalValueUsd: ethValue.toFixed(2),
        breakdown: {
          eth: {
            balance: ethBalanceFormatted.toFixed(4),
            priceUsd: ethPrice.toFixed(2),
            valueUsd: ethValue.toFixed(2),
            change24h: marketData.market_data?.price_change_percentage_24h?.toFixed(2) || '0',
            change7d: marketData.market_data?.price_change_percentage_7d?.toFixed(2) || '0',
            change30d: marketData.market_data?.price_change_percentage_30d?.toFixed(2) || '0',
            marketCap: marketData.market_data?.market_cap?.usd || 0,
            marketCapRank: marketData.market_cap_rank || 0,
            volume24h: marketData.market_data?.total_volume?.usd || 0,
            high24h: marketData.market_data?.high_24h?.usd || 0,
            low24h: marketData.market_data?.low_24h?.usd || 0,
            ath: marketData.market_data?.ath?.usd || 0,
            athChange: marketData.market_data?.ath_change_percentage?.usd || 0,
            atl: marketData.market_data?.atl?.usd || 0,
            atlChange: marketData.market_data?.atl_change_percentage?.usd || 0,
            circulatingSupply: marketData.market_data?.circulating_supply || 0,
            totalSupply: marketData.market_data?.total_supply || 0,
          },
        },
        analytics: {
          lastUpdated: marketData.last_updated || new Date().toISOString(),
          nextUpdate: new Date(Date.now() + 1800000).toISOString(), // 30 mins from now
        },
        address,
      };
    } catch (error) {
      console.error('Portfolio value error:', error);
      return {
        totalValueUsd: '0',
        address,
        error: 'Failed to calculate portfolio value',
      };
    }
  },
});

export const getMarketAnalyticsTool = createTool({
  description: "Get comprehensive market analytics for cryptocurrencies from CoinGecko",
  parameters: z.object({
    coins: z.array(z.string()).optional().default(['ethereum']).describe("Array of coin IDs to analyze"),
  }),
  execute: async ({ coins }) => {
    try {
      const analyticsData = await Promise.all(
        coins.map(async (coinId) => {
          const data = await cachedFetch(
            `market-analytics-${coinId}`,
              () =>
                retryFetch(() =>
                  fetch(
                    `${API_ENDPOINTS.COINGECKO}/coins/${coinId}?localization=false&tickers=false&community_data=true&developer_data=false&sparkline=true`,
                    getCoinGeckoFetchOptions()
                  ).then((res) => res.json())
                ),
            1800000 // 30 minutes cache
          );

          return {
            id: data.id,
            symbol: data.symbol?.toUpperCase(),
            name: data.name,
            currentPrice: data.market_data?.current_price?.usd || 0,
            marketCap: data.market_data?.market_cap?.usd || 0,
            marketCapRank: data.market_cap_rank || 0,
            volume24h: data.market_data?.total_volume?.usd || 0,
            volumeMarketCapRatio: data.market_data?.total_volume?.usd && data.market_data?.market_cap?.usd
              ? (data.market_data.total_volume.usd / data.market_data.market_cap.usd).toFixed(4)
              : 0,
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
        })
      );

      return {
        analytics: analyticsData,
        timestamp: new Date().toISOString(),
        nextUpdate: new Date(Date.now() + 1800000).toISOString(),
        cacheDuration: '30 minutes',
      };
    } catch (error) {
      console.error('Market analytics error:', error);
      return {
        error: 'Failed to fetch market analytics',
        analytics: [],
      };
    }
  },
});

