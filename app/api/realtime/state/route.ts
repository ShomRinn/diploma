/**
 * Real-Time State REST Endpoint
 * 
 * This endpoint provides the current state of the real-time service.
 * Use this for initial data load or when SSE is not available.
 * 
 * @route GET /api/realtime/state
 * @returns Current blockchain state snapshot
 */

import { NextResponse } from 'next/server';
import { getRealtimeService } from '@/lib/realtime/blockchain-service';

// =============================================================================
// Types
// =============================================================================

interface StateResponse {
  success: boolean;
  timestamp: number;
  data: {
    connectionStatus: string;
    lastEventTime: number | null;
    latestBlock: {
      number: string;
      hash: string;
      timestamp: string;
      transactionCount: number;
    } | null;
    gasInfo: {
      gasPriceGwei: number;
      baseFeeGwei: number | null;
      priorityFeeGwei: number;
      networkLoad: number;
      trend: string;
      history: Array<{ timestamp: number; gwei: number }>;
    } | null;
    stats: {
      blocksReceived: number;
      eventsReceived: number;
      uptime: number;
    };
  };
}

// =============================================================================
// Route Handler
// =============================================================================

export async function GET() {
  try {
    const service = getRealtimeService();
    const state = service.getState();

    // Serialize BigInt values
    const response: StateResponse = {
      success: true,
      timestamp: Date.now(),
      data: {
        connectionStatus: state.connectionStatus,
        lastEventTime: state.lastEventTime,
        latestBlock: state.latestBlock
          ? {
              number: state.latestBlock.number.toString(),
              hash: state.latestBlock.hash,
              timestamp: state.latestBlock.timestamp.toString(),
              transactionCount: state.latestBlock.transactionCount,
            }
          : null,
        gasInfo: state.gasInfo,
        stats: {
          blocksReceived: state.blocksReceived,
          eventsReceived: state.eventsReceived,
          uptime: state.uptime,
        },
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[State API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        timestamp: Date.now(),
        error: 'Failed to get realtime state',
      },
      { status: 500 }
    );
  }
}

/**
 * Start/Stop the realtime service
 * 
 * @route POST /api/realtime/state
 * @body { action: 'start' | 'stop', address?: string }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, address } = body;

    const service = getRealtimeService();

    if (action === 'start') {
      if (address) {
        service.setWatchAddress(address);
      }
      await service.start();
      return NextResponse.json({ success: true, message: 'Service started' });
    }

    if (action === 'stop') {
      service.stop();
      return NextResponse.json({ success: true, message: 'Service stopped' });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action. Use "start" or "stop"' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[State API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to perform action' },
      { status: 500 }
    );
  }
}



