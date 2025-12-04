# Real-Time Blockchain Analytics

## Overview

This module provides real-time blockchain event streaming for the wallet application. It delivers live updates for network status, gas prices, and transaction notifications with a target latency of **1-5 seconds**.

## Table of Contents

1. [Architecture](#architecture)
2. [Event Flow](#event-flow)
3. [Real-Time Data Definition](#real-time-data-definition)
4. [Implementation Details](#implementation-details)
5. [API Reference](#api-reference)
6. [Frontend Integration](#frontend-integration)
7. [Error Handling](#error-handling)

---

## Architecture

### System Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          REAL-TIME ANALYTICS SYSTEM                          │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐     ┌──────────────────────┐     ┌───────────────────────────┐
│   SOURCES    │     │       BACKEND        │     │         FRONTEND          │
│              │     │                      │     │                           │
│ ┌──────────┐ │     │ ┌──────────────────┐ │     │ ┌───────────────────────┐ │
│ │Blockchain│─┼────►│ │ BlockchainService│ │     │ │  useRealtimeBlockchain│ │
│ │  (RPC)   │ │     │ │                  │ │     │ │        (Hook)         │ │
│ └──────────┘ │     │ │ • Block Watcher  │ │     │ └───────────┬───────────┘ │
│              │     │ │ • Gas Poller     │ │     │             │             │
│ ┌──────────┐ │     │ │ • TX Monitor     │ │     │             ▼             │
│ │  Linea   │ │     │ └────────┬─────────┘ │     │ ┌───────────────────────┐ │
│ │ Sepolia  │ │     │          │           │     │ │    RealtimePanel      │ │
│ └──────────┘ │     │          ▼           │     │ │                       │ │
│              │     │ ┌──────────────────┐ │     │ │ • Connection Status   │ │
└──────────────┘     │ │   SSE Endpoint   │─┼────►│ │ • Block Number        │ │
                     │ │ /api/realtime/   │ │ SSE │ │ • Gas Price + Chart   │ │
                     │ │     stream       │ │     │ │ • Network Load        │ │
                     │ └──────────────────┘ │     │ │ • TX Feed             │ │
                     │                      │     │ └───────────────────────┘ │
                     │ ┌──────────────────┐ │     │                           │
                     │ │  REST Endpoint   │ │     │ ┌───────────────────────┐ │
                     │ │ /api/realtime/   │─┼────►│ │   ConnectionBanner    │ │
                     │ │     state        │ │REST │ │ (Error/Reconnecting)  │ │
                     │ └──────────────────┘ │     │ └───────────────────────┘ │
                     │                      │     │                           │
                     └──────────────────────┘     └───────────────────────────┘
```

### Component Structure

```
lib/realtime/
├── types.ts                    # Type definitions
├── blockchain-service.ts       # Core service (event processing)
├── index.ts                    # Module exports
└── hooks/
    └── useRealtimeBlockchain.ts  # React hook

app/api/realtime/
├── stream/
│   └── route.ts                # SSE streaming endpoint
└── state/
    └── route.ts                # REST state endpoint

components/
└── RealtimePanel.tsx           # UI component
```

---

## Event Flow

### End-to-End Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             EVENT FLOW DIAGRAM                               │
└─────────────────────────────────────────────────────────────────────────────┘

 SOURCE              TRIGGER           BACKEND              DELIVERY      UI
────────────────────────────────────────────────────────────────────────────────

┌─────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────┐    ┌──────┐
│Blockchain│────►│ New Block   │────►│BlockService │────►│   SSE   │───►│Block │
│  Node   │     │  Mined      │     │ watchBlocks │     │ Stream  │    │Number│
└─────────┘     └─────────────┘     └─────────────┘     └─────────┘    └──────┘
                      │
                      │              ┌─────────────┐     ┌─────────┐    ┌──────┐
                      └─────────────►│ Gas Poller  │────►│   SSE   │───►│ Gas  │
                                     │ (12s interval)   │ Stream  │    │Price │
                                     └─────────────┘     └─────────┘    └──────┘
                                            │
                                            │            ┌─────────┐    ┌──────┐
                                            └───────────►│   SSE   │───►│Chart │
                                                         │ Stream  │    │      │
                                                         └─────────┘    └──────┘

┌─────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────┐    ┌──────┐
│Blockchain│────►│ TX in Block │────►│  TX Filter  │────►│   SSE   │───►│ TX   │
│  Node   │     │(user address)│    │ (address    │     │ Stream  │    │ Feed │
└─────────┘     └─────────────┘     │  matching)  │     └─────────┘    └──────┘
                                     └─────────────┘

┌─────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────┐    ┌──────┐
│  SSE    │────►│ Connection  │────►│ Error       │────►│ React   │───►│Banner│
│ Error   │     │ Lost        │     │ Handler     │     │ State   │    │      │
└─────────┘     └─────────────┘     └─────────────┘     └─────────┘    └──────┘
```

### Detailed Event Processing

```
1. BLOCK EVENT
   ┌──────────────────────────────────────────────────────────────────────────┐
   │ Blockchain RPC ──► viem.watchBlocks() ──► BlockEvent ──► SSE ──► UI     │
   │                                                                          │
   │ Latency: ~1-3 seconds (block propagation + RPC delay)                   │
   └──────────────────────────────────────────────────────────────────────────┘

2. GAS PRICE EVENT
   ┌──────────────────────────────────────────────────────────────────────────┐
   │ setInterval(12s) ──► getGasPrice() ──► GasEvent ──► SSE ──► UI          │
   │                                                                          │
   │ Latency: ~12 seconds (polling interval aligned with block time)         │
   └──────────────────────────────────────────────────────────────────────────┘

3. TRANSACTION EVENT (for watched address)
   ┌──────────────────────────────────────────────────────────────────────────┐
   │ New Block ──► getBlock(includeTX) ──► filter(address) ──► TXEvent ──► UI│
   │                                                                          │
   │ Latency: ~1-5 seconds (after block confirmation)                        │
   └──────────────────────────────────────────────────────────────────────────┘
```

---

## Real-Time Data Definition

### What is "Real-Time"?

| Data Type | Update Frequency | Target Latency | Justification |
|-----------|-----------------|----------------|---------------|
| **Block Number** | Every ~12 seconds | 1-3 seconds | Block time on Ethereum/Linea is ~12s. Updates arrive within 1-3s of block propagation. |
| **Gas Price** | Every ~12 seconds | 1-3 seconds | Gas prices change per block; polling aligned with block time is sufficient. |
| **Network Load** | Every ~12 seconds | 1-3 seconds | Derived from gas used/limit ratio per block. |
| **Transactions** | On-block | 1-5 seconds | Detected when block containing TX is processed. Acceptable for non-HFT use cases. |
| **Connection Status** | Immediate | <100ms | Local state, no network delay. |

### Latency Justification

**Target: 1-5 seconds**

1. **Blockchain Constraint**: Ethereum/Linea blocks are mined every ~12 seconds. Data cannot be more "real-time" than the block rate.

2. **User Experience**: For a wallet dashboard:
   - Users don't need millisecond updates
   - 1-5 second latency is imperceptible for checking balances/gas
   - Matches user mental model of "live" data

3. **Resource Efficiency**: 
   - Lower than polling every 30 minutes (current)
   - Higher than WebSocket per-transaction (expensive)
   - Optimal balance of freshness vs. cost

### Event Source & Data Format

**Source**: Linea Sepolia RPC via viem library

**Transport**: Server-Sent Events (SSE)

**Format**: JSON with TypeScript types

```typescript
// Base Event Structure
interface RealtimeEvent {
  type: 'block' | 'gas_update' | 'transaction' | 'connection' | 'error';
  timestamp: number;  // Unix timestamp in ms
  data: BlockData | GasData | TransactionData | ConnectionData | ErrorData;
}

// SSE Wire Format
id: block-1701234567890
event: block
data: {"type":"block","timestamp":1701234567890,"data":{...}}
```

---

## Implementation Details

### Backend

#### 1. Real-Time Data Ingestion

**Technology**: Server-Sent Events (SSE)

**Location**: `app/api/realtime/stream/route.ts`

```typescript
// SSE endpoint creates a ReadableStream
export async function GET(request: NextRequest) {
  const stream = new ReadableStream({
    start(controller) {
      // Subscribe to blockchain events
      const unsubscribe = service.subscribe((event) => {
        controller.enqueue(formatSSEMessage(event));
      });
      
      // Cleanup on disconnect
      request.signal.addEventListener('abort', () => {
        unsubscribe();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

#### 2. Event Processing

**Location**: `lib/realtime/blockchain-service.ts`

Events are processed as they arrive:

- **Filtering**: Only emit transactions for watched addresses
- **Aggregation**: Calculate gas trend from price history
- **Enrichment**: Add human-readable values (Gwei, ETH)

```typescript
// Block processing
this.client.watchBlocks({
  onBlock: async (block) => {
    // 1. Emit block event
    this.emit(blockEvent);
    
    // 2. Check for user transactions
    await this.checkBlockForTransactions(block);
    
    // 3. Gas is polled separately on 12s interval
  },
});
```

#### 3. State Retrieval Endpoint

**Location**: `app/api/realtime/state/route.ts`

```typescript
// GET /api/realtime/state
{
  "success": true,
  "timestamp": 1701234567890,
  "data": {
    "connectionStatus": "connected",
    "latestBlock": { "number": "21324567", ... },
    "gasInfo": { "gasPriceGwei": 23.5, ... },
    "stats": { "blocksReceived": 42, ... }
  }
}
```

#### 4. Module Separation

The real-time logic is isolated in `lib/realtime/`:

```
lib/realtime/
├── types.ts              # Pure type definitions
├── blockchain-service.ts # Core logic (singleton service)
├── index.ts              # Public exports
└── hooks/                # React integration
```

### Frontend

#### 1. Dynamic Visualization

**Component**: `components/RealtimePanel.tsx`

Updates without page reloads via React state:

```tsx
function RealtimePanel() {
  const {
    latestBlock,
    gasInfo,
    connectionStatus,
    // ... all reactive
  } = useRealtimeBlockchain();

  // UI updates automatically when SSE events arrive
  return (
    <div>
      <BlockDisplay block={latestBlock} />
      <GasChart data={gasInfo.history} />
    </div>
  );
}
```

#### 2. Connection Status Display

```tsx
// Always visible connection indicator
<ConnectionStatus status={connectionStatus} onReconnect={reconnect} />

// Banner shown when disconnected
{status !== 'connected' && (
  <ConnectionLostBanner 
    status={status}
    error={error}
    onReconnect={reconnect}
  />
)}
```

**States displayed**:
- 🟢 **Live** - Connected and receiving events
- 🟡 **Reconnecting** - Attempting to reconnect
- 🔴 **Error/Offline** - Connection failed

**User messaging**:
```
⚠️ Connection Lost
Real-time data may be unavailable. Displayed information could be stale.
[Retry Button]
```

---

## API Reference

### SSE Endpoint

```
GET /api/realtime/stream?address={walletAddress}
```

**Query Parameters**:
- `address` (optional): Wallet address to watch for transactions

**Response**: `text/event-stream`

**Events**:
- `block` - New block mined
- `gas_update` - Gas price changed
- `transaction` - User transaction detected
- `connection` - Connection status change

### State Endpoint

```
GET /api/realtime/state
```

**Response**: Current state snapshot (JSON)

```
POST /api/realtime/state
```

**Body**:
```json
{ "action": "start" | "stop", "address": "0x..." }
```

---

## Frontend Integration

### Using the Hook

```tsx
import { useRealtimeBlockchain } from '@/lib/realtime';

function MyComponent() {
  const {
    isConnected,
    connectionStatus,
    error,
    latestBlock,
    gasInfo,
    recentTransactions,
    reconnect,
  } = useRealtimeBlockchain({
    watchAddress: '0x...',
    enabled: true,
    onBlock: (event) => console.log('New block:', event),
    onTransaction: (event) => toast('Transaction detected!'),
  });
}
```

### Using the Component

```tsx
import { RealtimePanel } from '@/components/RealtimePanel';

// Full panel
<RealtimePanel />

// Compact mode
<RealtimePanel compact />
```

---

## Error Handling

### Reconnection Strategy

1. On SSE error, close connection
2. Wait 3 seconds
3. Attempt reconnect (up to 5 times)
4. Show "Reconnecting..." status
5. After 5 failures, show error with manual retry button

### Error States

| Error | User Message | Action |
|-------|-------------|--------|
| SSE connection lost | "Connection Lost" | Auto-reconnect |
| RPC error | "Network error" | Retry button |
| Max reconnects | "Failed to connect" | Manual retry |

---

## Performance Considerations

- **SSE vs WebSocket**: SSE chosen for simplicity and HTTP/2 compatibility
- **Singleton Service**: Only one blockchain connection per server instance
- **Gas History**: Limited to 30 readings (~6 minutes) to bound memory
- **Transaction History**: Limited to 20 transactions
- **Keep-alive**: 30-second ping to prevent proxy timeouts

---

## Future Improvements

- [ ] WebSocket fallback for environments where SSE is blocked
- [ ] Multi-chain support
- [ ] Pending transaction pool monitoring
- [ ] Price feed integration (when free sources available)
- [ ] Historical data export

