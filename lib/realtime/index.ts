/**
 * Real-Time Blockchain Analytics Module
 * 
 * This module provides real-time blockchain event streaming for:
 * - New block notifications
 * - Gas price updates
 * - Transaction monitoring
 * 
 * @module lib/realtime
 */

// Types
export * from './types';

// Networks
export * from './networks';

// Service
export { 
  BlockchainRealtimeService, 
  getRealtimeService, 
  resetRealtimeService 
} from './blockchain-service';

// Hooks (for frontend)
export { useRealtimeBlockchain } from './hooks/useRealtimeBlockchain';

