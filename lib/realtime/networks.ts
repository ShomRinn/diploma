/**
 * Network Configuration for Real-Time Analytics
 * 
 * Supported networks with their RPC endpoints and metadata.
 */

export interface NetworkConfig {
  id: string;
  name: string;
  chainId: number;
  rpcUrl: string;
  blockExplorer: string;
  isTestnet: boolean;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  avgBlockTime: number; // seconds
}

export const SUPPORTED_NETWORKS: NetworkConfig[] = [
  {
    id: 'ethereum',
    name: 'Ethereum Mainnet',
    chainId: 1,
    rpcUrl: 'https://rpc.ankr.com/eth', // Ankr - more generous rate limits
    blockExplorer: 'https://etherscan.io',
    isTestnet: false,
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    avgBlockTime: 12,
  },
  {
    id: 'linea',
    name: 'Linea Mainnet',
    chainId: 59144,
    rpcUrl: 'https://rpc.linea.build',
    blockExplorer: 'https://lineascan.build',
    isTestnet: false,
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    avgBlockTime: 2,
  },
  {
    id: 'linea-sepolia',
    name: 'Linea Sepolia',
    chainId: 59141,
    rpcUrl: 'https://rpc.sepolia.linea.build',
    blockExplorer: 'https://sepolia.lineascan.build',
    isTestnet: true,
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    avgBlockTime: 2,
  },
  {
    id: 'polygon',
    name: 'Polygon Mainnet',
    chainId: 137,
    rpcUrl: 'https://rpc.ankr.com/polygon', // Ankr
    blockExplorer: 'https://polygonscan.com',
    isTestnet: false,
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18,
    },
    avgBlockTime: 2,
  },
  {
    id: 'arbitrum',
    name: 'Arbitrum One',
    chainId: 42161,
    rpcUrl: 'https://rpc.ankr.com/arbitrum', // Ankr - more reliable
    blockExplorer: 'https://arbiscan.io',
    isTestnet: false,
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    avgBlockTime: 0.25,
  },
  {
    id: 'optimism',
    name: 'Optimism',
    chainId: 10,
    rpcUrl: 'https://rpc.ankr.com/optimism', // Ankr
    blockExplorer: 'https://optimistic.etherscan.io',
    isTestnet: false,
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    avgBlockTime: 2,
  },
  {
    id: 'base',
    name: 'Base',
    chainId: 8453,
    rpcUrl: 'https://mainnet.base.org',
    blockExplorer: 'https://basescan.org',
    isTestnet: false,
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    avgBlockTime: 2,
  },
  {
    id: 'sepolia',
    name: 'Sepolia Testnet',
    chainId: 11155111,
    rpcUrl: 'https://rpc.ankr.com/eth_sepolia', // Ankr
    blockExplorer: 'https://sepolia.etherscan.io',
    isTestnet: true,
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    avgBlockTime: 12,
  },
];

// Default to Linea Sepolia (testnet) to avoid rate limits on mainnet RPCs
export const DEFAULT_NETWORK = SUPPORTED_NETWORKS.find(n => n.id === 'linea-sepolia')!;

export function getNetworkById(id: string): NetworkConfig | undefined {
  return SUPPORTED_NETWORKS.find(n => n.id === id);
}

export function getNetworkByChainId(chainId: number): NetworkConfig | undefined {
  return SUPPORTED_NETWORKS.find(n => n.chainId === chainId);
}

