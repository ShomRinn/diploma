/**
 * Analytics Module
 * Real-time cryptocurrency analytics powered by CoinGecko
 */

// API
export * from './api/coingecko';

// Hooks
export * from './hooks/usePortfolioAnalytics';

// Utils
export * from './utils/cache';
export * from './utils/formatters';

// Constants
export * from './constants';

// Types
export type { MarketAnalytics } from './hooks/usePortfolioAnalytics';
export type { CoinGeckoMarketData } from './api/coingecko';
export type { CacheEntry } from './utils/cache';

