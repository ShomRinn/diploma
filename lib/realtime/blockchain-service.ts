/**
 * Real-Time Blockchain Service
 * 
 * This service handles real-time blockchain event streaming using viem.
 * It connects to the blockchain via WebSocket/HTTP and emits events for:
 * - New blocks
 * - Gas price updates
 * - Transaction notifications (for watched addresses)
 * 
 * Target Latency: 1-5 seconds (justified by block time ~12s on Ethereum/Linea)
 */

import { createPublicClient, http, formatGwei, formatEther, Chain } from 'viem';
import {
  RealtimeEvent,
  RealtimeState,
  RealtimeConfig,
  DEFAULT_CONFIG,
  BlockEvent,
  GasEvent,
  TransactionEvent,
  ConnectionEvent,
} from './types';
import { NetworkConfig, DEFAULT_NETWORK, getNetworkById } from './networks';

// =============================================================================
// Event Emitter Type
// =============================================================================

type EventCallback = (event: RealtimeEvent) => void;

// =============================================================================
// Helper: Create chain config from NetworkConfig
// =============================================================================

function createChainFromNetwork(network: NetworkConfig): Chain {
  return {
    id: network.chainId,
    name: network.name,
    nativeCurrency: network.nativeCurrency,
    rpcUrls: {
      default: { http: [network.rpcUrl] },
    },
    blockExplorers: {
      default: { name: 'Explorer', url: network.blockExplorer },
    },
  };
}

// =============================================================================
// Blockchain Service Class
// =============================================================================

export class BlockchainRealtimeService {
  private config: RealtimeConfig;
  private client: ReturnType<typeof createPublicClient>;
  private listeners: Set<EventCallback> = new Set();
  private state: RealtimeState;
  private gasInterval: NodeJS.Timeout | null = null;
  private startTime: number = Date.now();
  private lastGasPrice: number = 0;
  private isRunning: boolean = false;
  private currentNetwork: NetworkConfig;

  constructor(config: Partial<RealtimeConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Get network config
    this.currentNetwork = config.networkId 
      ? getNetworkById(config.networkId) || DEFAULT_NETWORK
      : DEFAULT_NETWORK;
    
    // Initialize viem client
    this.client = createPublicClient({
      chain: createChainFromNetwork(this.currentNetwork),
      transport: http(this.currentNetwork.rpcUrl),
    });

    // Initialize state
    this.state = {
      connectionStatus: 'disconnected',
      lastEventTime: null,
      latestBlock: null,
      gasInfo: null,
      watchedAddress: this.config.watchAddress || null,
      pendingTransactions: [],
      recentTransactions: [],
      blocksReceived: 0,
      eventsReceived: 0,
      uptime: 0,
      networkId: this.currentNetwork.id,
    };
  }

  // ===========================================================================
  // Network Management
  // ===========================================================================

  /**
   * Switch to a different network
   */
  async switchNetwork(networkId: string): Promise<void> {
    const network = getNetworkById(networkId);
    if (!network) {
      throw new Error(`Unknown network: ${networkId}`);
    }

    // Stop current watchers
    const wasRunning = this.isRunning;
    if (wasRunning) {
      this.stop();
    }

    // Update network
    this.currentNetwork = network;
    this.client = createPublicClient({
      chain: createChainFromNetwork(network),
      transport: http(network.rpcUrl),
    });

    // Reset state
    this.state = {
      ...this.state,
      connectionStatus: 'disconnected',
      lastEventTime: null,
      latestBlock: null,
      gasInfo: null,
      blocksReceived: 0,
      eventsReceived: 0,
      networkId: network.id,
    };
    this.lastGasPrice = 0;

    // Emit network change event
    this.emit({
      type: 'connection',
      timestamp: Date.now(),
      data: {
        status: 'disconnected',
        message: `Switched to ${network.name}`,
      },
    });

    // Restart if was running
    if (wasRunning) {
      await this.start();
    }
  }

  /**
   * Get current network
   */
  getCurrentNetwork(): NetworkConfig {
    return this.currentNetwork;
  }

  // ===========================================================================
  // Public Methods
  // ===========================================================================

  /**
   * Start the real-time service
   */
  async start(): Promise<void> {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.startTime = Date.now();
    
    console.log(`[RealtimeService] Starting for network: ${this.currentNetwork.name}`);
    console.log(`[RealtimeService] RPC URL: ${this.currentNetwork.rpcUrl}`);

    try {
      // Fetch initial block immediately to verify connection
      console.log('[RealtimeService] Fetching initial block...');
      await this.fetchInitialBlock();
      
      // Fetch initial gas price
      console.log('[RealtimeService] Fetching initial gas price...');
      await this.fetchGasPrice();
      
      this.emitConnectionEvent('connected');

      // Start watching blocks (polling mode for HTTP RPCs)
      if (this.config.watchBlocks) {
        this.startBlockPolling();
      }

      // Start gas price polling (every 12 seconds)
      if (this.config.watchGas) {
        this.gasInterval = setInterval(() => this.fetchGasPrice(), 12000);
      }

    } catch (error) {
      console.error('[RealtimeService] Failed to start:', error);
      this.emitConnectionEvent('error', `Failed to connect: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Fetch initial block to verify connection and get initial data
   */
  private async fetchInitialBlock(): Promise<void> {
    try {
      const block = await this.client.getBlock({ blockTag: 'latest' });
      console.log(`[RealtimeService] Got block #${block.number}`);
      
      this.state.blocksReceived++;
      this.state.eventsReceived++;
      this.state.lastEventTime = Date.now();

      // Update state
      this.state.latestBlock = {
        number: block.number,
        hash: block.hash,
        timestamp: block.timestamp,
        transactionCount: block.transactions.length,
      };

      // Emit block event
      const blockEvent: BlockEvent = {
        type: 'block',
        timestamp: Date.now(),
        data: {
          number: block.number,
          hash: block.hash,
          parentHash: block.parentHash,
          timestamp: block.timestamp,
          gasUsed: block.gasUsed,
          gasLimit: block.gasLimit,
          baseFeePerGas: block.baseFeePerGas ?? null,
          transactionCount: block.transactions.length,
        },
      };
      this.emit(blockEvent);
      
    } catch (error) {
      console.error('[RealtimeService] Failed to fetch initial block:', error);
      throw error;
    }
  }

  /**
   * Start polling for new blocks (more reliable than WebSocket for public RPCs)
   */
  private startBlockPolling(): void {
    const pollInterval = Math.max(this.currentNetwork.avgBlockTime * 1000, 2000); // At least 2 seconds
    console.log(`[RealtimeService] Starting block polling every ${pollInterval}ms`);
    
    let lastBlockNumber = this.state.latestBlock?.number || BigInt(0);

    const pollBlocks = async () => {
      if (!this.isRunning) return;
      
      try {
        const block = await this.client.getBlock({ blockTag: 'latest' });
        
        // Only emit if new block
        if (block.number > lastBlockNumber) {
          lastBlockNumber = block.number;
          
          this.state.blocksReceived++;
          this.state.eventsReceived++;
          this.state.lastEventTime = Date.now();

          // Update state
          this.state.latestBlock = {
            number: block.number,
            hash: block.hash,
            timestamp: block.timestamp,
            transactionCount: block.transactions.length,
          };

          // Emit block event
          const blockEvent: BlockEvent = {
            type: 'block',
            timestamp: Date.now(),
            data: {
              number: block.number,
              hash: block.hash,
              parentHash: block.parentHash,
              timestamp: block.timestamp,
              gasUsed: block.gasUsed,
              gasLimit: block.gasLimit,
              baseFeePerGas: block.baseFeePerGas ?? null,
              transactionCount: block.transactions.length,
            },
          };
          this.emit(blockEvent);

          // Check for user transactions
          if (this.state.watchedAddress) {
            await this.checkBlockForTransactions(block);
          }
        }
      } catch (error) {
        console.error('[RealtimeService] Block polling error:', error);
      }

      // Schedule next poll
      if (this.isRunning) {
        setTimeout(pollBlocks, pollInterval);
      }
    };

    // Start polling after initial delay
    setTimeout(pollBlocks, pollInterval);
  }

  /**
   * Stop the real-time service
   */
  stop(): void {
    console.log(`[RealtimeService] Stopping service for ${this.currentNetwork.name}`);
    this.isRunning = false;
    
    if (this.gasInterval) {
      clearInterval(this.gasInterval);
      this.gasInterval = null;
    }

    this.emitConnectionEvent('disconnected');
  }

  /**
   * Subscribe to events
   */
  subscribe(callback: EventCallback): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Get current state snapshot
   */
  getState(): RealtimeState {
    return {
      ...this.state,
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
    };
  }

  /**
   * Set address to watch for transactions
   */
  setWatchAddress(address: string | null): void {
    this.state.watchedAddress = address;
    this.state.pendingTransactions = [];
    this.state.recentTransactions = [];
  }

  // ===========================================================================
  // Private Methods - Transaction Checking
  // ===========================================================================

  private async checkBlockForTransactions(block: any): Promise<void> {
    if (!this.state.watchedAddress) return;

    const address = this.state.watchedAddress.toLowerCase();

    try {
      // Get full block with transactions
      const fullBlock = await this.client.getBlock({
        blockNumber: block.number,
        includeTransactions: true,
      });

      for (const tx of fullBlock.transactions) {
        if (typeof tx === 'string') continue;
        
        const isIncoming = tx.to?.toLowerCase() === address;
        const isOutgoing = tx.from.toLowerCase() === address;

        if (isIncoming || isOutgoing) {
          const txEvent: TransactionEvent = {
            type: 'transaction',
            timestamp: Date.now(),
            data: {
              hash: tx.hash,
              from: tx.from,
              to: tx.to,
              value: tx.value,
              valueEth: formatEther(tx.value),
              status: 'confirmed',
              direction: isIncoming ? 'incoming' : 'outgoing',
              blockNumber: block.number,
              confirmations: 1,
            },
          };

          // Update state
          this.state.recentTransactions = [
            txEvent.data,
            ...this.state.recentTransactions.slice(0, this.config.transactionHistoryLength - 1),
          ];

          // Remove from pending if exists
          this.state.pendingTransactions = this.state.pendingTransactions.filter(
            (t) => t.hash !== tx.hash
          );

          this.state.eventsReceived++;
          this.emit(txEvent);
        }
      }
    } catch (error) {
      console.error('[RealtimeService] Error checking transactions:', error);
    }
  }

  // ===========================================================================
  // Private Methods - Gas Price
  // ===========================================================================

  private async fetchGasPrice(): Promise<void> {
    try {
      // Get gas price from RPC
      let gasPrice = await this.client.getGasPrice();
      let gasPriceGwei = parseFloat(formatGwei(gasPrice));

      // Get base fee from latest block (more reliable on some networks)
      let baseFeeGwei: number | null = null;
      let networkLoad = 50; // Default
      
      if (this.state.latestBlock) {
        try {
          const block = await this.client.getBlock({ blockNumber: this.state.latestBlock.number });
          
          // Use baseFeePerGas if available (EIP-1559)
          if (block.baseFeePerGas) {
            baseFeeGwei = parseFloat(formatGwei(block.baseFeePerGas));
            
            // If RPC returned 0 gas price, estimate from baseFee + priority
            if (gasPriceGwei === 0 || gasPriceGwei < 0.001) {
              gasPriceGwei = baseFeeGwei + 2; // baseFee + 2 Gwei priority
              gasPrice = BigInt(Math.round(gasPriceGwei * 1e9));
            }
          }
          
          // Calculate network load
          if (block.gasLimit > BigInt(0)) {
            networkLoad = Math.round(Number((block.gasUsed * BigInt(100)) / block.gasLimit));
          }
        } catch {
          // Ignore - block data not available
        }
      }

      // Fallback: If still 0, use a reasonable default for display
      // (Linea Sepolia testnet often has very low/zero gas)
      if (gasPriceGwei === 0 || gasPriceGwei < 0.001) {
        gasPriceGwei = 0.05; // 0.05 Gwei minimum display (common on L2s)
        gasPrice = BigInt(Math.round(gasPriceGwei * 1e9));
      }

      // Calculate trend
      let trend: 'rising' | 'falling' | 'stable' = 'stable';
      if (this.lastGasPrice > 0) {
        const diff = gasPriceGwei - this.lastGasPrice;
        if (diff > 0.1) trend = 'rising';
        else if (diff < -0.1) trend = 'falling';
      }
      this.lastGasPrice = gasPriceGwei;

      // Create gas event
      const gasEvent: GasEvent = {
        type: 'gas_update',
        timestamp: Date.now(),
        data: {
          gasPrice,
          gasPriceGwei,
          baseFee: baseFeeGwei ? BigInt(Math.round(baseFeeGwei * 1e9)) : null,
          baseFeeGwei,
          priorityFee: BigInt(Math.round(2 * 1e9)), // 2 Gwei default priority
          priorityFeeGwei: 2,
          networkLoad,
          trend,
        },
      };

      // Update state with history
      const history = this.state.gasInfo?.history || [];
      const newHistory = [
        { timestamp: Date.now(), gwei: gasPriceGwei },
        ...history.slice(0, this.config.gasHistoryLength - 1),
      ];

      this.state.gasInfo = {
        gasPriceGwei,
        baseFeeGwei,
        priorityFeeGwei: 2,
        networkLoad,
        trend,
        history: newHistory,
      };

      this.state.eventsReceived++;
      this.state.lastEventTime = Date.now();
      this.emit(gasEvent);

    } catch (error) {
      console.error('[RealtimeService] Error fetching gas price:', error);
    }
  }

  // ===========================================================================
  // Private Methods - Event Emission
  // ===========================================================================

  private emit(event: RealtimeEvent): void {
    for (const callback of this.listeners) {
      try {
        callback(event);
      } catch (error) {
        console.error('[RealtimeService] Error in listener:', error);
      }
    }
  }

  private emitConnectionEvent(
    status: ConnectionEvent['data']['status'],
    message?: string
  ): void {
    this.state.connectionStatus = status;
    
    const event: ConnectionEvent = {
      type: 'connection',
      timestamp: Date.now(),
      data: {
        status,
        message,
      },
    };
    
    this.emit(event);
  }
}

// =============================================================================
// Service Instances (one per network)
// =============================================================================

const serviceInstances: Map<string, BlockchainRealtimeService> = new Map();

export function getRealtimeService(config?: Partial<RealtimeConfig>): BlockchainRealtimeService {
  const networkId = config?.networkId || 'ethereum';
  
  let service = serviceInstances.get(networkId);
  if (!service) {
    service = new BlockchainRealtimeService({ ...config, networkId });
    serviceInstances.set(networkId, service);
  }
  
  return service;
}

export function resetRealtimeService(networkId?: string): void {
  if (networkId) {
    const service = serviceInstances.get(networkId);
    if (service) {
      service.stop();
      serviceInstances.delete(networkId);
    }
  } else {
    // Reset all
    serviceInstances.forEach((service) => service.stop());
    serviceInstances.clear();
  }
}

