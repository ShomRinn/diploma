# AI Tools Documentation

## Overview

This document describes all available AI tools in the wallet agent and how to use them.

## Available Tools

### 1. Balance Tool (`displayBalance`)

**Description:** Get the ETH balance for a wallet address.

**Example Commands:**
- "What is my balance?"
- "Check my wallet balance"
- "How much ETH do I have?"

**Returns:**
```json
{
  "balance": "0.5" // Balance in ETH
}
```

---

### 2. Send Transaction Tool (`sendTransaction`)

**Description:** Prepare an ETH transfer (requires MetaMask confirmation).

**Example Commands:**
- "Send 0.01 ETH to 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
- "Transfer 0.5 ETH to [address]"

**Returns:** Button to execute transaction via MetaMask

---

### 3. Transaction History Tool (`getTransactionHistory`)

**Description:** Fetch transaction history for a wallet.

**Example Commands:**
- "Show my last 10 transactions"
- "What did I send yesterday?"
- "Display my transaction history"

**Returns:**
```json
{
  "transactions": [...],
  "count": 10,
  "address": "0x..."
}
```

**Requirements:** `ETHERSCAN_API_KEY` environment variable

---

### 4. Gas Price Tool (`getGasPrice`)

**Description:** Get current gas prices for different transaction speeds.

**Example Commands:**
- "What's the current gas price?"
- "Is it expensive to send now?"
- "Show me gas prices"

**Returns:**
```json
{
  "slow": "10.5",
  "standard": "12.0",
  "fast": "13.5",
  "baseFee": "11.0",
  "unit": "gwei"
}
```

---

### 5. Gas Estimation Tool (`estimateTransactionCost`)

**Description:** Estimate the cost of a transaction before sending.

**Example Commands:**
- "How much will it cost to send 0.1 ETH?"
- "Estimate gas for sending to [address]"
- "Calculate transaction fee"

**Returns:**
```json
{
  "gasEstimate": "21000",
  "gasCostGwei": "12.5",
  "gasCostEth": "0.0002625",
  "totalCostEth": "0.1002625",
  "valueEth": "0.1"
}
```

---

### 6. Token Balance Tool (`getTokenBalance`)

**Description:** Check ERC-20 token balance.

**Example Commands:**
- "What's my USDC balance?"
- "How many LINK tokens do I have?"
- "Check token balance at [address]"

**Returns:**
```json
{
  "balance": "100.50",
  "symbol": "USDC",
  "tokenAddress": "0x...",
  "decimals": 6
}
```

---

### 7. Send Token Tool (`sendToken`)

**Description:** Prepare ERC-20 token transfer (requires MetaMask confirmation).

**Example Commands:**
- "Send 100 USDC to [address]"
- "Transfer 50 DAI to [address]"

**Returns:** Button to execute token transfer via MetaMask

---

### 8. Crypto Price Tool (`getCryptoPrice`)

**Description:** Get current cryptocurrency prices.

**Example Commands:**
- "What's the price of ETH?"
- "How much is Bitcoin worth?"
- "Show me the ETH price in USD"

**Returns:**
```json
{
  "symbol": "ETH",
  "price": 3500.50,
  "change24h": 2.5,
  "currency": "USD"
}
```

**Requirements:** Optional `COINGECKO_API_KEY` (works without but with rate limits)

---

### 9. Portfolio Value Tool (`getPortfolioValue`)

**Description:** Calculate total portfolio value in USD.

**Example Commands:**
- "What's my portfolio worth?"
- "Total value of my wallet"
- "Show my net worth"

**Returns:**
```json
{
  "totalValueUsd": "1750.25",
  "breakdown": {
    "eth": {
      "balance": "0.5000",
      "priceUsd": "3500.50",
      "valueUsd": "1750.25",
      "change24h": "2.50"
    }
  },
  "address": "0x..."
}
```

---

### 10. Transaction Status Tool (`getTransactionStatus`)

**Description:** Check the status of a transaction.

**Example Commands:**
- "Is my transaction confirmed?"
- "Check status of [hash]"
- "Transaction status"

**Returns:**
```json
{
  "status": "confirmed", // or "pending" or "failed"
  "blockNumber": "12345",
  "gasUsed": "21000",
  "from": "0x...",
  "to": "0x...",
  "value": "0.1"
}
```

---

### 11. Block Info Tool (`getBlockInfo`)

**Description:** Get information about blocks.

**Example Commands:**
- "What's the current block number?"
- "Latest block info"
- "Show block 12345"

**Returns:**
```json
{
  "number": "12345",
  "timestamp": "2024-12-02T10:30:00.000Z",
  "transactions": 150,
  "gasUsed": "12500000",
  "gasLimit": "30000000",
  "baseFeePerGas": "12.5",
  "hash": "0x..."
}
```

---

## Tool Execution Flow

1. **User sends message** → AI receives request
2. **AI analyzes message** → Determines which tool(s) to use
3. **AI calls tool** → Tool executes and returns data
4. **AI formats response** → Returns natural language answer with data
5. **UI displays result** → Shows formatted data or action buttons

## Error Handling

All tools include error handling:
- API failures return error messages
- Invalid inputs return validation errors
- Network issues trigger retry logic
- Graceful degradation when services are unavailable

## Caching

Some tools use caching to improve performance:
- **Price data**: Cached for 60 seconds
- **Gas prices**: Cached for 30 seconds
- **Block info**: Cached for 30 seconds

## Rate Limits

### Free Tier Limits:
- **Etherscan**: 5 calls/second
- **CoinGecko**: 50 calls/minute (no key), 500/minute (with key)
- **Alchemy**: 300 compute units/second

### Recommendations:
- Use caching to reduce API calls
- Implement request queuing for high-traffic
- Consider paid tiers for production

## Security Notes

1. **API Keys**: Always use environment variables, never commit to git
2. **Transactions**: All transactions require MetaMask confirmation
3. **Validation**: All addresses and amounts are validated
4. **No Private Keys**: Tools never access or store private keys

## Adding New Tools

To add a new tool:

1. Create tool file in `ai/tools/[category].ts`
2. Define tool with `createTool()` from `ai` package
3. Add parameters with Zod schema
4. Implement execute function
5. Export from `ai/tools/index.ts`
6. Update Chat component if UI interaction needed
7. Add to this documentation

Example:
```typescript
export const myNewTool = createTool({
  description: "Description for AI to understand when to use this",
  parameters: z.object({
    param1: z.string().describe("What this parameter is for"),
  }),
  execute: async ({ param1 }) => {
    // Your implementation
    return { result: "data" };
  },
});
```

---

**Last Updated:** December 2, 2025

