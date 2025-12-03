import { SYMBOL_TO_COINGECKO_ID } from './constants';

/**
 * Map cryptocurrency symbol to CoinGecko ID
 */
export function symbolToCoinId(symbol: string): string {
  const upperSymbol = symbol.toUpperCase();
  return SYMBOL_TO_COINGECKO_ID[upperSymbol] || symbol.toLowerCase();
}

/**
 * Format transaction data for display
 */
export function formatTransaction(tx: any) {
  return {
    hash: tx.hash,
    from: tx.from,
    to: tx.to || 'Contract Creation',
    value: tx.value,
    timestamp: tx.timeStamp ? new Date(parseInt(tx.timeStamp) * 1000).toISOString() : null,
    blockNumber: tx.blockNumber,
    gasUsed: tx.gasUsed,
    status: tx.isError === '0' ? 'success' : 'failed',
  };
}

/**
 * Get explorer API endpoint based on chain ID
 */
export function getExplorerApiUrl(chainId: number): string {
  switch (chainId) {
    case 1:
      return 'https://api.etherscan.io/api';
    case 59144:
      return 'https://api.lineascan.build/api';
    case 59141:
      return 'https://api-sepolia.lineascan.build/api';
    default:
      return 'https://api-sepolia.lineascan.build/api';
  }
}

/**
 * Cache wrapper for API calls
 */
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 30000; // 30 seconds

export async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  duration: number = CACHE_DURATION
): Promise<T> {
  const now = Date.now();
  const cached = cache.get(key);

  if (cached && now - cached.timestamp < duration) {
    console.log(`Using cached data for ${key}`);
    return cached.data as T;
  }

  console.log(`Fetching fresh data from API for ${key}...`);
  const data = await fetcher();
  cache.set(key, { data, timestamp: now });
  console.log(`Data fetched and cached for ${key}`);
  return data;
}

/**
 * Retry wrapper for API calls
 */
export async function retryFetch<T>(
  fetcher: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fetcher();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }

  throw lastError;
}

