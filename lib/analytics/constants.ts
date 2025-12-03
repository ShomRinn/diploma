/**
 * Analytics Constants
 * Configuration and constants for analytics features
 */

/**
 * Cache duration in milliseconds
 */
export const CACHE_DURATION = {
  MARKET_DATA: 30 * 60 * 1000, // 30 minutes
  PRICE_DATA: 60 * 1000, // 1 minute
  PORTFOLIO: 30 * 60 * 1000, // 30 minutes
};

/**
 * Auto-refresh intervals in milliseconds
 */
export const REFRESH_INTERVALS = {
  MARKET_DATA: 30 * 60 * 1000, // 30 minutes
  PORTFOLIO: 30 * 60 * 1000, // 30 minutes
};

/**
 * Supported coins for analytics
 */
export const SUPPORTED_COINS = {
  ETHEREUM: 'ethereum',
  BITCOIN: 'bitcoin',
  USDC: 'usd-coin',
  USDT: 'tether',
  DAI: 'dai',
} as const;

/**
 * CoinGecko API configuration
 */
export const COINGECKO_CONFIG = {
  BASE_URL: 'https://api.coingecko.com/api/v3',
  RATE_LIMIT_FREE: 50, // calls per minute
  RATE_LIMIT_PRO: 500, // calls per minute
};

/**
 * Cache key prefixes
 */
export const CACHE_KEYS = {
  PORTFOLIO_ANALYTICS: 'portfolio-analytics-',
  MARKET_ANALYTICS: 'market-analytics-',
  PRICE_DATA: 'price-data-',
};

/**
 * Default values
 */
export const DEFAULTS = {
  COIN_ID: 'ethereum',
  VS_CURRENCY: 'usd',
  DECIMAL_PLACES: 2,
};

/**
 * UI Configuration
 */
export const UI_CONFIG = {
  MAX_SPARKLINE_POINTS: 168, // 7 days * 24 hours
  CHART_COLORS: {
    POSITIVE: '#10b981', // green-500
    NEGATIVE: '#ef4444', // red-500
    NEUTRAL: '#6b7280', // gray-500
  },
};

/**
 * Analytics metrics thresholds
 */
export const THRESHOLDS = {
  HIGH_VOLUME_RATIO: 10, // Volume/MarketCap > 10%
  EXTREME_CHANGE: 20, // Price change > 20%
  SIGNIFICANT_CHANGE: 5, // Price change > 5%
};

