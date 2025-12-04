# Real-Time Blockchain Analytics

## Overview

This module provides real-time blockchain event streaming for the wallet application. It delivers live updates for network status, gas prices, and transaction notifications with a target latency of **2-12 seconds** (depending on network block time).

### Key Features
- **Multi-network support**: Switch between 8 blockchain networks
- **HTTP polling**: Works with all free public RPCs (no WebSocket required)
- **Network selector UI**: Users can choose which network to monitor
- **Gas price chart**: Visual history of gas prices over time

## Table of Contents

1. [Supported Networks](#supported-networks)
2. [Architecture](#architecture)
3. [Event Flow](#event-flow)
4. [Real-Time Data Definition](#real-time-data-definition)
5. [Implementation Details](#implementation-details)
6. [API Reference](#api-reference)
7. [Frontend Integration](#frontend-integration)
8. [Error Handling](#error-handling)

---

## Supported Networks

| Network | Chain ID | RPC Provider | Block Time | Type |
|---------|----------|--------------|------------|------|
| Ethereum Mainnet | 1 | Ankr | ~12s | Mainnet |
| Linea Mainnet | 59144 | Linea | ~2s | L2 |
| Linea Sepolia | 59141 | Linea | ~2s | Testnet |
| Polygon | 137 | Ankr | ~2s | Mainnet |
| Arbitrum One | 42161 | Ankr | ~0.25s | L2 |
| Optimism | 10 | Ankr | ~2s | L2 |
| Base | 8453 | Base | ~2s | L2 |
| Sepolia | 11155111 | Ankr | ~12s | Testnet |

**Default**: Linea Sepolia (testnet) - recommended to avoid rate limits on free RPCs.

---

## Architecture

### System Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     REAL-TIME ANALYTICS SYSTEM (Multi-Network)              │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐     ┌────────────────────────┐     ┌─────────────────────┐
│  NETWORK SOURCES │     │        BACKEND         │     │      FRONTEND       │
│                  │     │                        │     │                     │
│ ┌──────────────┐ │     │ ┌────────────────────┐ │     │ ┌─────────────────┐ │
│ │ Ethereum RPC │─┼────►│ │                    │ │     │ │ Network Selector│ │
│ │  (Ankr)      │ │     │ │ BlockchainService  │ │     │ │  [Dropdown]     │ │
│ └──────────────┘ │     │ │                    │ │     │ └────────┬────────┘ │
│ ┌──────────────┐ │     │ │ • HTTP Polling     │ │     │          │          │
│ │ Linea RPC    │─┼────►│ │ • Per-network      │ │     │          ▼          │
│ └──────────────┘ │     │ │   instances        │ │     │ ┌─────────────────┐ │
│ ┌──────────────┐ │     │ │ • Gas price fetch  │ │     │ │ RealtimePanel   │ │
│ │ Polygon RPC  │─┼────►│ │ • TX monitoring    │ │     │ │                 │ │
│ │  (Ankr)      │ │     │ └─────────┬──────────┘ │     │ │ • Block #       │ │
│ └──────────────┘ │     │           │            │     │ │ • Gas + Chart   │ │
│ ┌──────────────┐ │     │           ▼            │     │ │ • Network Load  │ │
│ │ Arbitrum RPC │─┼────►│ ┌────────────────────┐ │     │ │ • TX Feed       │ │
│ │  (Ankr)      │ │     │ │  SSE Endpoint      │─┼────►│ └─────────────────┘ │
│ └──────────────┘ │     │ │ ?network=ethereum  │ │ SSE │                     │
│       ...        │     │ └────────────────────┘ │     │ ┌─────────────────┐ │
└──────────────────┘     │                        │     │ │ConnectionBanner │ │
                         │                        │     │ │ (if disconnected)│ │
                         └────────────────────────┘     │ └─────────────────┘ │
                                                        └─────────────────────┘
```

### Component Structure

```
lib/realtime/
├── types.ts                      # Type definitions
├── networks.ts                   # Network configurations (NEW)
├── blockchain-service.ts         # Core service (HTTP polling)
├── index.ts                      # Module exports
└── hooks/
    └── useRealtimeBlockchain.ts  # React hook with network switching

app/api/realtime/
├── stream/
│   └── route.ts                  # SSE endpoint (?network=xxx)
└── state/
    └── route.ts                  # REST state endpoint

components/
└── RealtimePanel.tsx             # UI with network selector + chart
```

---

## Event Flow

### End-to-End Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        EVENT FLOW DIAGRAM (HTTP Polling)                     │
└─────────────────────────────────────────────────────────────────────────────┘

 SOURCE              TRIGGER              BACKEND              DELIVERY     UI
────────────────────────────────────────────────────────────────────────────────

┌─────────┐     ┌──────────────────┐     ┌─────────────┐     ┌───────┐   ┌──────┐
│ RPC     │◄────│ HTTP Poll        │◄────│BlockService │────►│  SSE  │──►│Block │
│ (Ankr)  │     │ eth_getBlock     │     │ (per network)    │ Stream│   │Number│
└─────────┘     │ every 2-12s      │     └─────────────┘     └───────┘   └──────┘
                └──────────────────┘              │
                                                  │
                ┌──────────────────┐              │          ┌───────┐   ┌──────┐
                │ HTTP Poll        │◄─────────────┤         │  SSE  │──►│ Gas  │
                │ eth_gasPrice     │              │         │ Stream│   │Price │
                │ every 12s        │              │         └───────┘   └──────┘
                └──────────────────┘              │
                                                  │          ┌───────┐   ┌──────┐
                                                  └─────────►│  SSE  │──►│Chart │
                                                             │ Stream│   │      │
                                                             └───────┘   └──────┘
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

#### 2. Event Processing (HTTP Polling)

**Location**: `lib/realtime/blockchain-service.ts`

**Why Polling instead of WebSocket?**
- Most free public RPCs don't support WebSocket subscriptions (`eth_subscribe`)
- HTTP polling works with ALL RPC providers (Ankr, Infura, Alchemy free tiers)
- More reliable - no dropped connections through Cloudflare/proxies

Events are processed via HTTP polling:

- **Block polling**: `eth_getBlockByNumber("latest")` every 2-12 seconds
- **Gas polling**: `eth_gasPrice` every 12 seconds
- **Filtering**: Only emit new blocks (compare block numbers)
- **Aggregation**: Calculate gas trend from price history

```typescript
// Block polling (more reliable than WebSocket for free RPCs)
private startBlockPolling(): void {
  const pollInterval = Math.max(this.currentNetwork.avgBlockTime * 1000, 2000);
  
  const pollBlocks = async () => {
    const block = await this.client.getBlock({ blockTag: 'latest' });
    
    if (block.number > lastBlockNumber) {
      lastBlockNumber = block.number;
      this.emit(blockEvent);
      
      // Check for user transactions
      if (this.state.watchedAddress) {
        await this.checkBlockForTransactions(block);
      }
    }
    
    // Schedule next poll
    if (this.isRunning) {
      setTimeout(pollBlocks, pollInterval);
    }
  };
}
```

**Per-Network Instances**: Each network gets its own service instance to allow simultaneous monitoring.

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
GET /api/realtime/stream?network={networkId}&address={walletAddress}
```

**Query Parameters**:
- `network` (required): Network ID to connect to. Options:
  - `ethereum` - Ethereum Mainnet
  - `linea` - Linea Mainnet
  - `linea-sepolia` - Linea Sepolia (default)
  - `polygon` - Polygon Mainnet
  - `arbitrum` - Arbitrum One
  - `optimism` - Optimism
  - `base` - Base
  - `sepolia` - Sepolia Testnet
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
{ "action": "start" | "stop", "address": "0x...", "network": "ethereum" }
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
    // Network
    networkId,
    network,
    availableNetworks,
    switchNetwork,
    // Data
    latestBlock,
    gasInfo,
    recentTransactions,
    reconnect,
  } = useRealtimeBlockchain({
    networkId: 'linea-sepolia', // Default network
    watchAddress: '0x...',
    enabled: true,
    onBlock: (event) => console.log('New block:', event),
    onTransaction: (event) => toast('Transaction detected!'),
    onNetworkChange: (network) => console.log('Switched to:', network.name),
  });

  // Switch network programmatically
  const handleNetworkSwitch = () => {
    switchNetwork('ethereum'); // Switch to Ethereum Mainnet
  };
}
```

### Using the Component

```tsx
import { RealtimePanel } from '@/components/RealtimePanel';

// Full panel with network selector
<RealtimePanel />

// Compact mode (no network selector)
<RealtimePanel compact />
```

### Network Selector UI

The `RealtimePanel` includes a dropdown to switch networks:

```
┌─────────────────────────────────────────────────────────────────┐
│ ⚡ Real-Time Network   [🌐 Linea Sepolia ▼]           🟢 Live   │
├─────────────────────────────────────────────────────────────────┤
│                        ┌─────────────────────┐                  │
│                        │ Ethereum Mainnet    │                  │
│                        │ Linea Mainnet       │                  │
│                        │ Linea Sepolia ✓     │                  │
│                        │ Polygon       [Test]│                  │
│                        └─────────────────────┘                  │
└─────────────────────────────────────────────────────────────────┘
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

- **HTTP Polling vs WebSocket**: Polling chosen for compatibility with free public RPCs
- **Per-Network Instances**: Each network gets its own service instance (Map-based)
- **Polling Intervals**: 
  - Ethereum/Sepolia: 12 seconds (matches block time)
  - L2s (Linea, Arbitrum, etc.): 2 seconds
- **Gas History**: Limited to 30 readings (~6 minutes) to bound memory
- **Transaction History**: Limited to 20 transactions
- **Keep-alive**: 30-second ping to prevent proxy timeouts
- **RPC Provider**: Ankr (free tier with generous rate limits)

---

