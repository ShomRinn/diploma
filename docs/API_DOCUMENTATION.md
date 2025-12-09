# API Documentation

## Overview

This document describes the REST API endpoints for the wallet-agent application. All endpoints require JWT authentication via the `Authorization` header or `token` cookie.

Base URL: `/api`

## Authentication

All API endpoints require JWT authentication. The token can be provided in one of two ways:

1. **Authorization Header**: `Authorization: Bearer <token>`
2. **Cookie**: `token=<token>`

If authentication fails, endpoints return `401 Unauthorized` with the following response:

```json
{
  "error": "Unauthorized: Invalid or expired JWT token"
}
```

## Rate Limiting

The `/api/chat` endpoint implements rate limiting to prevent abuse. Rate limit information is included in response headers:

- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Timestamp when the rate limit resets

When rate limit is exceeded, the endpoint returns `429 Too Many Requests`:

```json
{
  "error": "Rate limit exceeded",
  "retryAfter": 60
}
```

---

## Endpoints

### POST /api/chat

Sends messages to the AI assistant and receives streaming responses.

**Authentication**: Required (JWT)

**Rate Limiting**: Yes (see above)

**Request Headers**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "messages": [
    {
      "role": "user",
      "content": "What is my balance?"
    }
  ],
  "contacts": [
    {
      "name": "Alice",
      "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
    }
  ]
}
```

**Request Fields**:
- `messages` (array, required): Array of message objects with `role` and `content` fields
  - `role`: "user" | "assistant" | "system"
  - `content`: string message content
- `contacts` (array, optional): Array of contact objects for AI context
  - `name`: string contact name
  - `address`: string Ethereum address

**Response**:
- **Status**: `200 OK`
- **Content-Type**: `text/event-stream` (Server-Sent Events)
- **Body**: Streaming text response from AI assistant

**Response Format** (SSE):
```
data: {"type":"text","content":"Your balance is..."}

data: {"type":"tool-call","toolName":"getBalance",...}

data: {"type":"tool-result","result":{...}}
```

**Error Responses**:

`400 Bad Request` - Invalid request format:
```json
{
  "error": "Invalid request",
  "details": ["Messages array is required"]
}
```

`400 Bad Request` - Content moderation blocked:
```json
{
  "error": "Content blocked by moderation",
  "blocked": true
}
```

`401 Unauthorized` - Invalid or missing token:
```json
{
  "error": "Unauthorized: Invalid or expired JWT token"
}
```

`429 Too Many Requests` - Rate limit exceeded:
```json
{
  "error": "Rate limit exceeded",
  "retryAfter": 60
}
```

`500 Internal Server Error` - Server error:
```json
{
  "error": "An unexpected error occurred. Please try again.",
  "type": "UNKNOWN",
  "retryable": true
}
```

**Security Features**:
- Input validation (message format, length limits)
- Content moderation (blocked content detection)
- Prompt injection protection (sanitization)
- Conversation truncation (max length enforcement)

**Example Request**:
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "What is my ETH balance?"}
    ]
  }'
```

---

### GET /api/realtime/stream

Establishes a Server-Sent Events (SSE) connection for real-time blockchain data streaming.

**Authentication**: Required (JWT)

**Rate Limiting**: No

**Request Headers**:
```
Authorization: Bearer <token>
```

**Query Parameters**:
- `network` (string, optional): Network ID to monitor. Default: "ethereum"
  - Valid values: "ethereum", "linea-mainnet", "polygon", "arbitrum", "optimism", "base", "linea-sepolia", "sepolia"
- `address` (string, optional): Wallet address to watch for transactions

**Response**:
- **Status**: `200 OK`
- **Content-Type**: `text/event-stream`
- **Connection**: `keep-alive`

**Event Types**:

1. **connection** - Connection established:
```
event: connection
data: {"type":"connection","timestamp":1234567890,"data":{"status":"connected","message":"Connected to Ethereum Mainnet"}}
```

2. **block** - New block detected:
```
event: block
data: {"type":"block","timestamp":1234567890,"data":{"number":"18500000","hash":"0x...","timestamp":"1234567890","transactionCount":150}}
```

3. **gas_update** - Gas price update:
```
event: gas_update
data: {"type":"gas_update","timestamp":1234567890,"data":{"gasPriceGwei":25.5,"baseFeeGwei":20.0,"priorityFeeGwei":5.5,"networkLoad":0.75,"trend":"up"}}
```

4. **transaction** - Transaction detected (if address is watched):
```
event: transaction
data: {"type":"transaction","timestamp":1234567890,"data":{"hash":"0x...","from":"0x...","to":"0x...","value":"1000000000000000000"}}
```

**Keep-Alive**: Server sends `: ping\n\n` every 30 seconds to maintain connection.

**Error Responses**:

`400 Bad Request` - Invalid network:
```json
{
  "error": "Unknown network: invalid-network"
}
```

`401 Unauthorized` - Invalid or missing token:
```json
{
  "error": "Unauthorized: Invalid or expired JWT token"
}
```

**Example Request**:
```bash
curl -N -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/realtime/stream?network=ethereum&address=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
```

**Client Implementation** (JavaScript):
```javascript
const eventSource = new EventSource('/api/realtime/stream?network=ethereum', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

eventSource.addEventListener('block', (event) => {
  const data = JSON.parse(event.data);
  console.log('New block:', data.data.number);
});

eventSource.addEventListener('gas_update', (event) => {
  const data = JSON.parse(event.data);
  console.log('Gas price:', data.data.gasPriceGwei);
});
```

---

### GET /api/realtime/state

Retrieves the current state of the real-time blockchain service.

**Authentication**: Required (JWT)

**Rate Limiting**: No

**Request Headers**:
```
Authorization: Bearer <token>
```

**Response**:
- **Status**: `200 OK`
- **Content-Type**: `application/json`

**Response Body**:
```json
{
  "success": true,
  "timestamp": 1234567890,
  "data": {
    "connectionStatus": "connected",
    "lastEventTime": 1234567890,
    "latestBlock": {
      "number": "18500000",
      "hash": "0x...",
      "timestamp": "1234567890",
      "transactionCount": 150
    },
    "gasInfo": {
      "gasPriceGwei": 25.5,
      "baseFeeGwei": 20.0,
      "priorityFeeGwei": 5.5,
      "networkLoad": 0.75,
      "trend": "up",
      "history": [
        {"timestamp": 1234567800, "gwei": 24.0},
        {"timestamp": 1234567890, "gwei": 25.5}
      ]
    },
    "stats": {
      "blocksReceived": 100,
      "eventsReceived": 250,
      "uptime": 3600
    }
  }
}
```

**Response Fields**:
- `success`: boolean indicating request success
- `timestamp`: server timestamp in milliseconds
- `data.connectionStatus`: "connected" | "disconnected" | "connecting"
- `data.lastEventTime`: timestamp of last event (null if none)
- `data.latestBlock`: latest block information (null if not available)
- `data.gasInfo`: current gas price information (null if not available)
- `data.stats`: service statistics

**Error Responses**:

`401 Unauthorized` - Invalid or missing token:
```json
{
  "error": "Unauthorized: Invalid or expired JWT token"
}
```

`500 Internal Server Error` - Server error:
```json
{
  "success": false,
  "timestamp": 1234567890,
  "error": "Failed to get realtime state"
}
```

**Example Request**:
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/realtime/state
```

---

### POST /api/realtime/state

Starts or stops the real-time blockchain service.

**Authentication**: Required (JWT)

**Rate Limiting**: No

**Request Headers**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "action": "start",
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
}
```

**Request Fields**:
- `action` (string, required): "start" | "stop"
- `address` (string, optional): Wallet address to watch (only for "start" action)

**Response**:
- **Status**: `200 OK`
- **Content-Type**: `application/json`

**Success Response**:
```json
{
  "success": true,
  "message": "Service started"
}
```

**Error Responses**:

`400 Bad Request` - Invalid action:
```json
{
  "success": false,
  "error": "Invalid action. Use \"start\" or \"stop\""
}
```

`401 Unauthorized` - Invalid or missing token:
```json
{
  "error": "Unauthorized: Invalid or expired JWT token"
}
```

`500 Internal Server Error` - Server error:
```json
{
  "success": false,
  "error": "Failed to perform action"
}
```

**Example Request**:
```bash
curl -X POST http://localhost:3000/api/realtime/state \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"action": "start", "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"}'
```

---

## Error Handling

All endpoints follow consistent error response format:

```json
{
  "error": "Human-readable error message",
  "type": "ERROR_TYPE",
  "retryable": true,
  "retryAfter": 60
}
```

**Error Types**:
- `TIMEOUT`: Request timed out
- `RATE_LIMIT`: Rate limit exceeded
- `AUTH_ERROR`: Authentication failed
- `INVALID_REQUEST`: Invalid request format
- `MODEL_OVERLOADED`: AI service overloaded
- `SERVICE_UNAVAILABLE`: Service temporarily unavailable
- `CONTENT_FILTER`: Content blocked by moderation
- `CONTEXT_LENGTH`: Conversation too long
- `UNKNOWN`: Unknown error

**HTTP Status Codes**:
- `200 OK`: Success
- `400 Bad Request`: Invalid request
- `401 Unauthorized`: Authentication required
- `408 Request Timeout`: Request timed out
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error
- `503 Service Unavailable`: Service temporarily unavailable

---

## Data Types

### Message Object
```typescript
{
  role: "user" | "assistant" | "system",
  content: string
}
```

### Contact Object
```typescript
{
  name: string,
  address: string  // Ethereum address (0x...)
}
```

### RealtimeEvent
```typescript
{
  type: "connection" | "block" | "gas_update" | "transaction",
  timestamp: number,  // Unix timestamp in milliseconds
  data: object  // Event-specific data
}
```

### Block Data
```typescript
{
  number: string,  // Block number as string
  hash: string,    // Block hash
  timestamp: string,  // Block timestamp as string
  transactionCount: number
}
```

### Gas Info
```typescript
{
  gasPriceGwei: number,
  baseFeeGwei: number | null,
  priorityFeeGwei: number,
  networkLoad: number,  // 0.0 to 1.0
  trend: "up" | "down" | "stable",
  history: Array<{timestamp: number, gwei: number}>
}
```

---

## Notes

1. All timestamps are in milliseconds since Unix epoch.

2. BigInt values (block numbers, gas values) are serialized as strings in JSON responses.

3. SSE connections are kept alive with ping messages every 30 seconds.

4. The realtime service maintains state in server memory and does not persist between server restarts.

5. Rate limiting is applied per client identifier (IP address or user ID).

6. Content moderation and prompt injection protection are applied to all chat messages before processing.

7. Conversation history is automatically truncated if it exceeds maximum length limits.

8. All endpoints validate JWT tokens and reject requests with invalid or expired tokens.

---

## Version

API Version: 1.0.0

Last Updated: 2025-01-02

