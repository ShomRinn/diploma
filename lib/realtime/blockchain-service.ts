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

import { createPublicClient, http, webSocket, formatGwei, formatEther } from 'viem';
import { lineaSepolia, mainnet } from 'viem/chains';
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

// =============================================================================
// Event Emitter Type
// =============================================================================

type EventCallback = (event: RealtimeEvent) => void;

// =============================================================================
// Blockchain Service Class
// =============================================================================

export class BlockchainRealtimeService {
  private config: RealtimeConfig;
  private client: ReturnType<typeof createPublicClient>;
  private listeners: Set<EventCallback> = new Set();
  private state: RealtimeState;
  private unwatchBlock: (() => void) | null = null;
  private gasInterval: NodeJS.Timeout | null = null;
  private startTime: number = Date.now();
  private lastGasPrice: number = 0;
  private isRunning: boolean = false;

  constructor(config: Partial<RealtimeConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Initialize viem client
    this.client = createPublicClient({
      chain: lineaSepolia,
      transport: http(this.config.rpcUrl),
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
    };
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
    this.emitConnectionEvent('connected');

    try {
      // Start watching blocks
      if (this.config.watchBlocks) {
        await this.startBlockWatcher();
      }

      // Start gas price polling (every 12 seconds - each block)
      if (this.config.watchGas) {
        await this.fetchGasPrice(); // Initial fetch
        this.gasInterval = setInterval(() => this.fetchGasPrice(), 12000);
      }

    } catch (error) {
      console.error('[RealtimeService] Failed to start:', error);
      this.emitConnectionEvent('error', 'Failed to connect to blockchain');
    }
  }

  /**
   * Stop the real-time service
   */
  stop(): void {
    this.isRunning = false;
    
    if (this.unwatchBlock) {
      this.unwatchBlock();
      this.unwatchBlock = null;
    }
    
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
  // Private Methods - Block Watching
  // ===========================================================================

  private async startBlockWatcher(): Promise<void> {
    try {
      this.unwatchBlock = this.client.watchBlocks({
        onBlock: async (block) => {
          this.state.blocksReceived++;
          this.state.eventsReceived++;
          this.state.lastEventTime = Date.now();

          // Create block event
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

          // Update state
          this.state.latestBlock = {
            number: block.number,
            hash: block.hash,
            timestamp: block.timestamp,
            transactionCount: block.transactions.length,
          };

          // Emit event
          this.emit(blockEvent);

          // Check for user transactions if watching an address
          if (this.state.watchedAddress) {
            await this.checkBlockForTransactions(block);
          }
        },
        onError: (error) => {
          console.error('[RealtimeService] Block watcher error:', error);
          this.emitConnectionEvent('error', error.message);
        },
      });
    } catch (error) {
      console.error('[RealtimeService] Failed to start block watcher:', error);
      throw error;
    }
  }

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
// Singleton Instance
// =============================================================================

let serviceInstance: BlockchainRealtimeService | null = null;

export function getRealtimeService(config?: Partial<RealtimeConfig>): BlockchainRealtimeService {
  if (!serviceInstance) {
    serviceInstance = new BlockchainRealtimeService(config);
  }
  return serviceInstance;
}

export function resetRealtimeService(): void {
  if (serviceInstance) {
    serviceInstance.stop();
    serviceInstance = null;
  }
}

