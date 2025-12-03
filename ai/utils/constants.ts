// Known token addresses for different networks

export const KNOWN_TOKENS: Record<number, Record<string, string>> = {
  // Linea Sepolia (chainId: 59141)
  59141: {
    // Add testnet token addresses when available
    // 'USDC': '0x...',
    // 'USDT': '0x...',
    // 'DAI': '0x...',
  },
  // Linea Mainnet (chainId: 59144)
  59144: {
    'USDC': '0x176211869cA2b568f2A7D4EE941E073a821EE1ff',
    'USDT': '0xA219439258ca9da29E9Cc4cE5596924745e12B93',
    // Add more mainnet tokens as needed
  },
  // Ethereum Mainnet (chainId: 1)
  1: {
    'USDC': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    'USDT': '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    'DAI': '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    'WETH': '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  },
};

// Map crypto symbols to CoinGecko IDs
export const SYMBOL_TO_COINGECKO_ID: Record<string, string> = {
  'ETH': 'ethereum',
  'BTC': 'bitcoin',
  'USDC': 'usd-coin',
  'USDT': 'tether',
  'DAI': 'dai',
  'WETH': 'weth',
  'LINK': 'chainlink',
  'UNI': 'uniswap',
  'AAVE': 'aave',
  'MATIC': 'matic-network',
  'BNB': 'binancecoin',
  'SOL': 'solana',
  'ADA': 'cardano',
  'DOT': 'polkadot',
  'AVAX': 'avalanche-2',
};

// API Endpoints
export const API_ENDPOINTS = {
  LINEA_SEPOLIA_SCAN: 'https://api-sepolia.lineascan.build/api',
  LINEA_MAINNET_SCAN: 'https://api.lineascan.build/api',
  ETHERSCAN: 'https://api.etherscan.io/api',
  COINGECKO: 'https://api.coingecko.com/api/v3',
};

// CoinGecko API Key (if available)
export const COINGECKO_API_KEY = process.env.NEXT_PUBLIC_COINGECKO_API_KEY || process.env.COINGECKO_API_KEY;

// Helper to create CoinGecko fetch options with API key
export const getCoinGeckoFetchOptions = (): RequestInit => {
  const headers: HeadersInit = {
    'Accept': 'application/json',
  };
  
  if (COINGECKO_API_KEY) {
    // Add API key to headers
    headers['x-cg-demo-api-key'] = COINGECKO_API_KEY;
    console.log('[CoinGecko] Using authenticated API key');
  } else {
    console.warn('[CoinGecko] No API key found, using free tier (lower rate limits)');
  }
  
  return { headers };
};

// Chain IDs
export const CHAIN_IDS = {
  ETHEREUM_MAINNET: 1,
  LINEA_MAINNET: 59144,
  LINEA_SEPOLIA: 59141,
};

// Gas price multipliers for different speeds
export const GAS_MULTIPLIERS = {
  SLOW: 0.9, // 90%
  STANDARD: 1.0, // 100%
  FAST: 1.1, // 110%
};

