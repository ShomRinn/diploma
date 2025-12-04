"use client";

/**
 * React Hook for Real-Time Blockchain Data
 * 
 * This hook connects to the SSE endpoint and provides real-time blockchain data
 * with automatic reconnection and connection status tracking.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { 
  RealtimeState, 
  RealtimeEvent, 
  BlockEvent, 
  GasEvent, 
  TransactionEvent 
} from '../types';
import { SUPPORTED_NETWORKS, type NetworkConfig } from '../networks';

// =============================================================================
// Types
// =============================================================================

interface UseRealtimeBlockchainOptions {
  networkId?: string;
  watchAddress?: string;
  enabled?: boolean;
  onBlock?: (event: BlockEvent) => void;
  onGasUpdate?: (event: GasEvent) => void;
  onTransaction?: (event: TransactionEvent) => void;
  onNetworkChange?: (network: NetworkConfig) => void;
}

interface UseRealtimeBlockchainReturn {
  // Connection
  isConnected: boolean;
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting' | 'error';
  error: string | null;
  
  // Network
  networkId: string;
  network: NetworkConfig | null;
  availableNetworks: NetworkConfig[];
  switchNetwork: (networkId: string) => void;
  
  // Data
  latestBlock: RealtimeState['latestBlock'];
  gasInfo: RealtimeState['gasInfo'];
  pendingTransactions: RealtimeState['pendingTransactions'];
  recentTransactions: RealtimeState['recentTransactions'];
  
  // Stats
  blocksReceived: number;
  eventsReceived: number;
  uptime: number;
  lastEventTime: number | null;
  
  // Actions
  reconnect: () => void;
}

// =============================================================================
// Constants
// =============================================================================

const RECONNECT_DELAY = 3000;
const MAX_RECONNECT_ATTEMPTS = 5;

// =============================================================================
// Hook Implementation
// =============================================================================

export function useRealtimeBlockchain(
  options: UseRealtimeBlockchainOptions = {}
): UseRealtimeBlockchainReturn {
  const { 
    networkId: initialNetworkId = 'linea-sepolia',
    watchAddress, 
    enabled = true,
    onBlock,
    onGasUpdate,
    onTransaction,
    onNetworkChange,
  } = options;

  // Network state
  const [networkId, setNetworkId] = useState(initialNetworkId);
  const network = SUPPORTED_NETWORKS.find(n => n.id === networkId) || null;

  // Connection state
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'reconnecting' | 'error'>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [latestBlock, setLatestBlock] = useState<RealtimeState['latestBlock']>(null);
  const [gasInfo, setGasInfo] = useState<RealtimeState['gasInfo']>(null);
  const [pendingTransactions, setPendingTransactions] = useState<RealtimeState['pendingTransactions']>([]);
  const [recentTransactions, setRecentTransactions] = useState<RealtimeState['recentTransactions']>([]);
  const [blocksReceived, setBlocksReceived] = useState(0);
  const [eventsReceived, setEventsReceived] = useState(0);
  const [lastEventTime, setLastEventTime] = useState<number | null>(null);
  const [uptime, setUptime] = useState(0);

  // Refs
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const startTimeRef = useRef<number>(Date.now());
  const uptimeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Callbacks refs (to avoid stale closures)
  const onBlockRef = useRef(onBlock);
  const onGasUpdateRef = useRef(onGasUpdate);
  const onTransactionRef = useRef(onTransaction);
  const onNetworkChangeRef = useRef(onNetworkChange);
  
  useEffect(() => {
    onBlockRef.current = onBlock;
    onGasUpdateRef.current = onGasUpdate;
    onTransactionRef.current = onTransaction;
    onNetworkChangeRef.current = onNetworkChange;
  }, [onBlock, onGasUpdate, onTransaction, onNetworkChange]);

  // Switch network handler
  const switchNetwork = useCallback((newNetworkId: string) => {
    const newNetwork = SUPPORTED_NETWORKS.find(n => n.id === newNetworkId);
    if (!newNetwork) {
      console.error(`Unknown network: ${newNetworkId}`);
      return;
    }

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    // Reset state
    setLatestBlock(null);
    setGasInfo(null);
    setPendingTransactions([]);
    setRecentTransactions([]);
    setBlocksReceived(0);
    setEventsReceived(0);
    setUptime(0);
    setError(null);
    startTimeRef.current = Date.now();
    reconnectAttemptsRef.current = 0;

    // Update network
    setNetworkId(newNetworkId);
    onNetworkChangeRef.current?.(newNetwork);
  }, []);

  // ===========================================================================
  // Event Handlers
  // ===========================================================================

  const handleEvent = useCallback((event: RealtimeEvent) => {
    setLastEventTime(Date.now());
    setEventsReceived(prev => prev + 1);

    switch (event.type) {
      case 'block':
        setBlocksReceived(prev => prev + 1);
        setLatestBlock({
          number: BigInt(event.data.number),
          hash: event.data.hash,
          timestamp: BigInt(event.data.timestamp),
          transactionCount: event.data.transactionCount,
        });
        onBlockRef.current?.(event);
        break;

      case 'gas_update':
        setGasInfo(prev => ({
          gasPriceGwei: event.data.gasPriceGwei,
          baseFeeGwei: event.data.baseFeeGwei,
          priorityFeeGwei: event.data.priorityFeeGwei,
          networkLoad: event.data.networkLoad,
          trend: event.data.trend,
          history: [
            { timestamp: Date.now(), gwei: event.data.gasPriceGwei },
            ...(prev?.history || []).slice(0, 29),
          ],
        }));
        onGasUpdateRef.current?.(event);
        break;

      case 'transaction':
        if (event.data.status === 'pending') {
          setPendingTransactions(prev => [event.data, ...prev.slice(0, 9)]);
        } else {
          setRecentTransactions(prev => [event.data, ...prev.slice(0, 19)]);
          setPendingTransactions(prev => prev.filter(t => t.hash !== event.data.hash));
        }
        onTransactionRef.current?.(event);
        break;

      case 'connection':
        setConnectionStatus(event.data.status);
        if (event.data.status === 'error' && event.data.message) {
          setError(event.data.message);
        }
        break;
    }
  }, []);

  // ===========================================================================
  // SSE Connection
  // ===========================================================================

  const connect = useCallback(() => {
    console.log(`[useRealtimeBlockchain] Connecting to network: ${networkId}`);
    
    if (eventSourceRef.current) {
      console.log('[useRealtimeBlockchain] Closing existing connection');
      eventSourceRef.current.close();
    }

    const url = new URL('/api/realtime/stream', window.location.origin);
    url.searchParams.set('network', networkId);
    if (watchAddress) {
      url.searchParams.set('address', watchAddress);
    }
    
    console.log(`[useRealtimeBlockchain] SSE URL: ${url.toString()}`);

    setConnectionStatus('reconnecting');
    setError(null);

    const eventSource = new EventSource(url.toString());
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setConnectionStatus('connected');
      setError(null);
      reconnectAttemptsRef.current = 0;
      startTimeRef.current = Date.now();
    };

    eventSource.onmessage = (e) => {
      try {
        const event: RealtimeEvent = JSON.parse(e.data);
        handleEvent(event);
      } catch (err) {
        console.error('[useRealtimeBlockchain] Failed to parse event:', err);
      }
    };

    eventSource.onerror = () => {
      setConnectionStatus('error');
      setError('Connection lost');
      eventSource.close();

      // Attempt reconnect
      if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttemptsRef.current++;
        setConnectionStatus('reconnecting');
        setTimeout(connect, RECONNECT_DELAY);
      } else {
        setError('Failed to connect after multiple attempts');
      }
    };

    // Listen for specific event types
    eventSource.addEventListener('block', (e) => {
      try {
        const event: BlockEvent = JSON.parse(e.data);
        handleEvent(event);
      } catch (err) {
        console.error('[useRealtimeBlockchain] Failed to parse block event:', err);
      }
    });

    eventSource.addEventListener('gas_update', (e) => {
      try {
        const event: GasEvent = JSON.parse(e.data);
        handleEvent(event);
      } catch (err) {
        console.error('[useRealtimeBlockchain] Failed to parse gas event:', err);
      }
    });

    eventSource.addEventListener('transaction', (e) => {
      try {
        const event: TransactionEvent = JSON.parse(e.data);
        handleEvent(event);
      } catch (err) {
        console.error('[useRealtimeBlockchain] Failed to parse transaction event:', err);
      }
    });

  }, [networkId, watchAddress, handleEvent]);

  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    connect();
  }, [connect]);

  // ===========================================================================
  // Effects
  // ===========================================================================

  // Connect/disconnect based on enabled state
  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setConnectionStatus('disconnected');
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [enabled, connect]);

  // Uptime counter
  useEffect(() => {
    if (connectionStatus === 'connected') {
      uptimeIntervalRef.current = setInterval(() => {
        setUptime(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    } else {
      if (uptimeIntervalRef.current) {
        clearInterval(uptimeIntervalRef.current);
      }
    }

    return () => {
      if (uptimeIntervalRef.current) {
        clearInterval(uptimeIntervalRef.current);
      }
    };
  }, [connectionStatus]);

  // Reconnect when network changes
  useEffect(() => {
    if (enabled) {
      connect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [networkId]);

  // ===========================================================================
  // Return
  // ===========================================================================

  return {
    isConnected: connectionStatus === 'connected',
    connectionStatus,
    error,
    networkId,
    network,
    availableNetworks: SUPPORTED_NETWORKS,
    switchNetwork,
    latestBlock,
    gasInfo,
    pendingTransactions,
    recentTransactions,
    blocksReceived,
    eventsReceived,
    uptime,
    lastEventTime,
    reconnect,
  };
}

