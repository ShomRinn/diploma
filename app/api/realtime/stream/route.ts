/**
 * Real-Time SSE Streaming Endpoint
 * 
 * This endpoint provides Server-Sent Events (SSE) for real-time blockchain data.
 * 
 * Event Flow:
 * 1. Client connects via EventSource
 * 2. Server subscribes to blockchain events
 * 3. Events are streamed to client as SSE messages
 * 4. Client receives and processes events in real-time
 * 
 * Target Latency: 1-5 seconds
 * 
 * @route GET /api/realtime/stream
 * @query network - Network ID (ethereum, linea, polygon, etc.)
 * @query address - Optional wallet address to watch for transactions
 */

import { NextRequest } from 'next/server';
import { verifyAuthHeader, createAuthErrorResponse } from '@/lib/api-auth';
import { getRealtimeService } from '@/lib/realtime/blockchain-service';
import { getNetworkById } from '@/lib/realtime/networks';
import type { RealtimeEvent } from '@/lib/realtime/types';

// =============================================================================
// SSE Response Headers
// =============================================================================

const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache, no-transform',
  'Connection': 'keep-alive',
  'X-Accel-Buffering': 'no', // Disable nginx buffering
};

// =============================================================================
// Helper Functions
// =============================================================================

function formatSSEMessage(event: RealtimeEvent): string {
  const id = `${event.type}-${event.timestamp}`;
  const data = JSON.stringify(event);

  return `id: ${id}\nevent: ${event.type}\ndata: ${data}\n\n`;
}

function serializeEvent(event: RealtimeEvent): RealtimeEvent {
  // Convert BigInt to string for JSON serialization
  const serialized = JSON.parse(
    JSON.stringify(event, (_, value) =>
      typeof value === 'bigint' ? value.toString() : value
    )
  );
  return serialized;
}

// =============================================================================
// Route Handler
// =============================================================================

export async function GET(request: NextRequest) {
  // JWT Authentication - Verify token validity
  const auth = verifyAuthHeader(request);
  if (!auth) {
    console.warn('[Realtime SSE] Request rejected: invalid or missing JWT token');
    return createAuthErrorResponse('Unauthorized: Invalid or expired JWT token');
  }
  console.log('[Realtime SSE] Request authenticated for user:', auth.userId);

  const searchParams = request.nextUrl.searchParams;
  const networkId = searchParams.get('network') || 'ethereum';
  const watchAddress = searchParams.get('address');

  // Validate network
  const network = getNetworkById(networkId);
  if (!network) {
    return new Response(
      JSON.stringify({ error: `Unknown network: ${networkId}` }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  console.log(`[SSE] New connection for network: ${networkId}`);

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      
      // Get or create the realtime service for this network
      const service = getRealtimeService({ networkId });
      console.log(`[SSE] Using service for network: ${service.getCurrentNetwork().name}`);
      
      // Set watch address if provided
      if (watchAddress) {
        service.setWatchAddress(watchAddress);
      }
      
      // Start the service if not already running
      service.start().catch((error) => {
        console.error('[SSE] Failed to start service:', error);
      });

      // Send initial connection event with network info
      const currentNetwork = service.getCurrentNetwork();
      const connectionEvent: RealtimeEvent = {
        type: 'connection',
        timestamp: Date.now(),
        data: {
          status: 'connected',
          message: `Connected to ${currentNetwork.name}`,
        },
      };
      controller.enqueue(encoder.encode(formatSSEMessage(connectionEvent)));
      console.log(`[SSE] Client connected to ${currentNetwork.name}`);

      // Send current state as initial data
      const state = service.getState();
      if (state.latestBlock) {
        const blockEvent: RealtimeEvent = {
          type: 'block',
          timestamp: Date.now(),
          data: {
            number: state.latestBlock.number,
            hash: state.latestBlock.hash,
            parentHash: '',
            timestamp: state.latestBlock.timestamp,
            gasUsed: BigInt(0),
            gasLimit: BigInt(0),
            baseFeePerGas: null,
            transactionCount: state.latestBlock.transactionCount,
          },
        };
        controller.enqueue(encoder.encode(formatSSEMessage(serializeEvent(blockEvent))));
      }

      if (state.gasInfo) {
        const gasEvent: RealtimeEvent = {
          type: 'gas_update',
          timestamp: Date.now(),
          data: {
            gasPrice: BigInt(Math.round(state.gasInfo.gasPriceGwei * 1e9)),
            gasPriceGwei: state.gasInfo.gasPriceGwei,
            baseFee: state.gasInfo.baseFeeGwei ? BigInt(Math.round(state.gasInfo.baseFeeGwei * 1e9)) : null,
            baseFeeGwei: state.gasInfo.baseFeeGwei,
            priorityFee: BigInt(Math.round(state.gasInfo.priorityFeeGwei * 1e9)),
            priorityFeeGwei: state.gasInfo.priorityFeeGwei,
            networkLoad: state.gasInfo.networkLoad,
            trend: state.gasInfo.trend,
          },
        };
        controller.enqueue(encoder.encode(formatSSEMessage(serializeEvent(gasEvent))));
      }

      // Subscribe to events
      const unsubscribe = service.subscribe((event) => {
        try {
          const serialized = serializeEvent(event);
          const message = formatSSEMessage(serialized);
          controller.enqueue(encoder.encode(message));
        } catch (error) {
          console.error('[SSE] Error sending event:', error);
        }
      });

      // Keep-alive ping every 30 seconds
      const pingInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': ping\n\n'));
        } catch {
          clearInterval(pingInterval);
        }
      }, 30000);

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        unsubscribe();
        clearInterval(pingInterval);
        controller.close();
      });
    },
  });

  return new Response(stream, { headers: SSE_HEADERS });
}

