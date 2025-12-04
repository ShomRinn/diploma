/**
 * Real-Time Blockchain Analytics - Type Definitions
 * 
 * This module defines all types for real-time blockchain event streaming.
 */

// =============================================================================
// Event Types
// =============================================================================

export type RealtimeEventType = 
  | 'block'           // New block mined
  | 'gas_update'      // Gas price change
  | 'transaction'     // User transaction detected
  | 'connection'      // Connection status change
  | 'error';          // Error event

// =============================================================================
// Block Events
// =============================================================================

export interface BlockEvent {
  type: 'block';
  timestamp: number;
  data: {
    number: bigint;
    hash: string;
    parentHash: string;
    timestamp: bigint;
    gasUsed: bigint;
    gasLimit: bigint;
    baseFeePerGas: bigint | null;
    transactionCount: number;
  };
}

// =============================================================================
// Gas Events
// =============================================================================

export interface GasEvent {
  type: 'gas_update';
  timestamp: number;
  data: {
    gasPrice: bigint;          // Current gas price in wei
    gasPriceGwei: number;      // Gas price in Gwei (human readable)
    baseFee: bigint | null;    // Base fee (EIP-1559)
    baseFeeGwei: number | null;
    priorityFee: bigint;       // Suggested priority fee
    priorityFeeGwei: number;
    networkLoad: number;       // 0-100 percentage
    trend: 'rising' | 'falling' | 'stable';
  };
}

// =============================================================================
// Transaction Events
// =============================================================================

export interface TransactionEvent {
  type: 'transaction';
  timestamp: number;
  data: {
    hash: string;
    from: string;
    to: string | null;
    value: bigint;
    valueEth: string;
    status: 'pending' | 'confirmed' | 'failed';
    direction: 'incoming' | 'outgoing';
    blockNumber?: bigint;
    confirmations?: number;
  };
}

// =============================================================================
// Connection Events
// =============================================================================

export interface ConnectionEvent {
  type: 'connection';
  timestamp: number;
  data: {
    status: 'connected' | 'disconnected' | 'reconnecting' | 'error';
    message?: string;
    retryCount?: number;
    latency?: number;  // ms
  };
}

// =============================================================================
// Error Events
// =============================================================================

export interface ErrorEvent {
  type: 'error';
  timestamp: number;
  data: {
    code: string;
    message: string;
    recoverable: boolean;
  };
}

// =============================================================================
// Union Type
// =============================================================================

export type RealtimeEvent = 
  | BlockEvent 
  | GasEvent 
  | TransactionEvent 
  | ConnectionEvent 
  | ErrorEvent;

// =============================================================================
// State Types
// =============================================================================

export interface RealtimeState {
  // Connection
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting' | 'error';
  lastEventTime: number | null;
  
  // Latest block info
  latestBlock: {
    number: bigint;
    hash: string;
    timestamp: bigint;
    transactionCount: number;
  } | null;
  
  // Gas info
  gasInfo: {
    gasPriceGwei: number;
    baseFeeGwei: number | null;
    priorityFeeGwei: number;
    networkLoad: number;
    trend: 'rising' | 'falling' | 'stable';
    history: Array<{ timestamp: number; gwei: number }>;
  } | null;
  
  // User transactions (if watching an address)
  watchedAddress: string | null;
  pendingTransactions: TransactionEvent['data'][];
  recentTransactions: TransactionEvent['data'][];
  
  // Stats
  blocksReceived: number;
  eventsReceived: number;
  uptime: number; // seconds
}

// =============================================================================
// Configuration
// =============================================================================

export interface RealtimeConfig {
  // RPC endpoint
  rpcUrl: string;
  
  // What to watch
  watchBlocks: boolean;
  watchGas: boolean;
  watchAddress?: string;
  
  // Performance
  gasHistoryLength: number;      // How many gas readings to keep
  transactionHistoryLength: number;
  reconnectAttempts: number;
  reconnectDelay: number;        // ms
}

export const DEFAULT_CONFIG: RealtimeConfig = {
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.sepolia.linea.build',
  watchBlocks: true,
  watchGas: true,
  gasHistoryLength: 30,          // ~6 minutes of data
  transactionHistoryLength: 20,
  reconnectAttempts: 5,
  reconnectDelay: 3000,
};

// =============================================================================
// SSE Message Format
// =============================================================================

export interface SSEMessage {
  id: string;
  event: RealtimeEventType;
  data: RealtimeEvent;
}

