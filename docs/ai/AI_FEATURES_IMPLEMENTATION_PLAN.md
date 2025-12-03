# AI Features Implementation Plan

## 📋 Overview

This document outlines the implementation plan for enhancing the AI Assistant with advanced blockchain and cryptocurrency management capabilities. The goal is to transform the AI from a basic balance checker into a comprehensive Web3 wallet assistant.

---

## 🎯 Current State

### Existing Tools
- ✅ **Balance Check** - Get ETH balance for user's wallet
- ✅ **Send Transaction** - Prepare ETH transfer with user confirmation

### Limitations
- Only supports native ETH operations
- No transaction history
- No gas price information
- No ERC-20 token support
- No price data integration
- No ENS resolution

---

## 🚀 Features to Implement

### Phase 1: Essential Blockchain Data (Priority: HIGH)

#### 1.1 Transaction History Tool
**Purpose:** Fetch and display user's transaction history

**Commands:**
- "Show my last 10 transactions"
- "What did I send yesterday?"
- "Display my transaction history"

**Technical Requirements:**
- Etherscan API integration OR
- Alchemy/Infura transaction API OR
- On-chain scanning with viem

**Implementation Details:**
```typescript
export const getTransactionHistoryTool = createTool({
  description: "Get transaction history for the user's wallet address",
  parameters: z.object({
    address: z.string().describe("User's wallet address"),
    limit: z.number().optional().default(10).describe("Number of transactions to fetch"),
  }),
  execute: async ({ address, limit }) => {
    // Implementation using Etherscan API
    const apiKey = process.env.ETHERSCAN_API_KEY;
    const response = await fetch(
      `https://api-sepolia.lineascan.build/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=${limit}&sort=desc&apikey=${apiKey}`
    );
    const data = await response.json();
    return { transactions: data.result };
  },
});
```

**Dependencies:**
- Etherscan API key (free tier: 5 calls/sec)
- Or Alchemy SDK: `npm install alchemy-sdk`

---

#### 1.2 Gas Price Tool
**Purpose:** Get current gas prices for different transaction speeds

**Commands:**
- "What's the current gas price?"
- "Is it expensive to send now?"
- "Should I wait for lower gas fees?"

**Implementation Details:**
```typescript
export const getGasPriceTool = createTool({
  description: "Get current gas prices (slow, standard, fast)",
  parameters: z.object({}),
  execute: async () => {
    const gasPrice = await publicClient.getGasPrice();
    const block = await publicClient.getBlock({ blockTag: 'latest' });
    
    // Calculate different speeds
    const slow = gasPrice * 90n / 100n; // 90%
    const standard = gasPrice;
    const fast = gasPrice * 110n / 100n; // 110%
    
    return {
      slow: formatGwei(slow),
      standard: formatGwei(standard),
      fast: formatGwei(fast),
      baseFee: block.baseFeePerGas ? formatGwei(block.baseFeePerGas) : null,
    };
  },
});
```

**Dependencies:**
- None (uses existing viem publicClient)

---

#### 1.3 Gas Estimation Tool
**Purpose:** Estimate transaction cost before sending

**Commands:**
- "How much will it cost to send 0.1 ETH?"
- "Estimate gas for my transaction"
- "Calculate transaction fee"

**Implementation Details:**
```typescript
export const estimateTransactionCostTool = createTool({
  description: "Estimate the total cost (gas + value) for a transaction",
  parameters: z.object({
    from: z.string().describe("Sender address"),
    to: z.string().describe("Recipient address"),
    value: z.string().describe("Amount in ETH"),
  }),
  execute: async ({ from, to, value }) => {
    const gasEstimate = await publicClient.estimateGas({
      account: from as `0x${string}`,
      to: to as `0x${string}`,
      value: parseEther(value),
    });
    
    const gasPrice = await publicClient.getGasPrice();
    const gasCost = gasEstimate * gasPrice;
    const totalCost = gasCost + parseEther(value);
    
    return {
      gasEstimate: gasEstimate.toString(),
      gasCostGwei: formatGwei(gasPrice),
      gasCostEth: formatEther(gasCost),
      totalCostEth: formatEther(totalCost),
    };
  },
});
```

**Dependencies:**
- None (uses existing viem publicClient)

---

### Phase 2: Token Support (Priority: HIGH)

#### 2.1 ERC-20 Token Balance Tool
**Purpose:** Check balance of any ERC-20 token

**Commands:**
- "What's my USDC balance?"
- "How many LINK tokens do I have?"
- "Check my token balances"

**Implementation Details:**
```typescript
import { erc20Abi } from 'viem';

export const getTokenBalanceTool = createTool({
  description: "Get ERC-20 token balance for user's wallet",
  parameters: z.object({
    address: z.string().describe("User's wallet address"),
    tokenAddress: z.string().describe("ERC-20 token contract address"),
    tokenSymbol: z.string().optional().describe("Token symbol (e.g., USDC)"),
  }),
  execute: async ({ address, tokenAddress, tokenSymbol }) => {
    const [balance, decimals, symbol] = await Promise.all([
      publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [address as `0x${string}`],
      }),
      publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: 'decimals',
      }),
      publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: 'symbol',
      }),
    ]);
    
    return {
      balance: formatUnits(balance as bigint, decimals as number),
      symbol: symbol as string,
      tokenAddress,
    };
  },
});
```

**Dependencies:**
- None (viem includes erc20Abi)
- Token address registry (hardcode popular tokens or use API)

**Popular Token Addresses for Linea Sepolia:**
```typescript
const KNOWN_TOKENS = {
  'USDC': '0x...',  // Add actual testnet addresses
  'USDT': '0x...',
  'DAI': '0x...',
};
```

---

#### 2.2 Send Token Tool
**Purpose:** Transfer ERC-20 tokens

**Commands:**
- "Send 100 USDC to 0x..."
- "Transfer 50 DAI"

**Implementation Details:**
```typescript
export const sendTokenTool = createTool({
  description: "Prepare ERC-20 token transfer (user must confirm)",
  parameters: z.object({
    tokenAddress: z.string(),
    to: z.string(),
    amount: z.string(),
    decimals: z.number().default(18),
  }),
  execute: async ({ tokenAddress, to, amount, decimals }) => {
    // Return data for UI to create transaction
    return {
      type: 'erc20-transfer',
      tokenAddress,
      to,
      amount,
      decimals,
    };
  },
});
```

**UI Component Update Required:**
- Add handler in `Chat.tsx` for ERC-20 transfers
- Use `writeContract` from wagmi instead of `sendTransaction`

---

### Phase 3: Price & Market Data (Priority: MEDIUM)

#### 3.1 Cryptocurrency Price Tool
**Purpose:** Get real-time crypto prices

**Commands:**
- "What's the price of ETH?"
- "How much is Bitcoin worth?"
- "ETH to USD"

**Implementation Details:**
```typescript
export const getCryptoPriceTool = createTool({
  description: "Get current cryptocurrency price in USD",
  parameters: z.object({
    symbol: z.string().describe("Crypto symbol (ETH, BTC, etc.)"),
    vsCurrency: z.string().optional().default("usd"),
  }),
  execute: async ({ symbol, vsCurrency }) => {
    const coinId = symbolToCoinId(symbol); // Map symbol to CoinGecko ID
    
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=${vsCurrency}&include_24hr_change=true`
    );
    const data = await response.json();
    
    return {
      symbol: symbol.toUpperCase(),
      price: data[coinId][vsCurrency],
      change24h: data[coinId][`${vsCurrency}_24h_change`],
    };
  },
});
```

**Dependencies:**
- CoinGecko API (free tier: 50 calls/minute)
- API Key: `npm install coingecko-api-v3`

**Alternative:**
- CryptoCompare API
- Binance API (higher rate limits)

---

#### 3.2 Portfolio Value Tool
**Purpose:** Calculate total portfolio value in USD

**Commands:**
- "What's my portfolio worth?"
- "Total value of my wallet"
- "Show my net worth"

**Implementation Details:**
```typescript
export const getPortfolioValueTool = createTool({
  description: "Calculate total portfolio value in USD",
  parameters: z.object({
    address: z.string(),
  }),
  execute: async ({ address }) => {
    // Get ETH balance
    const ethBalance = await publicClient.getBalance({
      address: address as `0x${string}`,
    });
    
    // Get ETH price
    const ethPrice = await getCryptoPrice('ETH', 'usd');
    
    // Calculate ETH value
    const ethValue = parseFloat(formatEther(ethBalance)) * ethPrice.price;
    
    // TODO: Add token balances
    
    return {
      totalValueUsd: ethValue,
      breakdown: {
        eth: {
          balance: formatEther(ethBalance),
          valueUsd: ethValue,
        },
      },
    };
  },
});
```

**Dependencies:**
- Price tool from 3.1
- Token balance tool from 2.1 (for complete portfolio)

---

### Phase 4: Advanced Features (Priority: MEDIUM)

#### 4.1 ENS Name Resolution Tool
**Purpose:** Resolve ENS names to addresses and vice versa

**Commands:**
- "Send to vitalik.eth"
- "What's the address of vitalik.eth?"
- "Resolve my ENS name"

**Implementation Details:**
```typescript
export const resolveENSTool = createTool({
  description: "Resolve ENS name to address or address to ENS name",
  parameters: z.object({
    input: z.string().describe("ENS name or Ethereum address"),
  }),
  execute: async ({ input }) => {
    if (input.endsWith('.eth')) {
      // ENS to address
      const address = await publicClient.getEnsAddress({
        name: normalize(input),
      });
      return { ensName: input, address };
    } else {
      // Address to ENS
      const ensName = await publicClient.getEnsName({
        address: input as `0x${string}`,
      });
      return { address: input, ensName };
    }
  },
});
```

**Dependencies:**
- viem ENS functions (already available)
- Note: ENS only works on Ethereum mainnet, not testnets

**Alternative for Linea:**
- Use Linea-specific name service if available
- Skip ENS on testnet

---

#### 4.2 Transaction Status Tool
**Purpose:** Check if transaction is confirmed

**Commands:**
- "Is my transaction confirmed?"
- "Check status of 0x123..."
- "Transaction status"

**Implementation Details:**
```typescript
export const getTransactionStatusTool = createTool({
  description: "Get transaction status and details by hash",
  parameters: z.object({
    hash: z.string().describe("Transaction hash"),
  }),
  execute: async ({ hash }) => {
    const [tx, receipt] = await Promise.all([
      publicClient.getTransaction({ hash: hash as `0x${string}` }),
      publicClient.getTransactionReceipt({ hash: hash as `0x${string}` }).catch(() => null),
    ]);
    
    if (!receipt) {
      return {
        status: 'pending',
        from: tx.from,
        to: tx.to,
        value: formatEther(tx.value),
      };
    }
    
    return {
      status: receipt.status === 'success' ? 'confirmed' : 'failed',
      blockNumber: receipt.blockNumber.toString(),
      gasUsed: receipt.gasUsed.toString(),
      from: tx.from,
      to: tx.to,
      value: formatEther(tx.value),
    };
  },
});
```

**Dependencies:**
- None (uses existing viem publicClient)

---

#### 4.3 Block Information Tool
**Purpose:** Get current block information

**Commands:**
- "What's the current block number?"
- "Latest block info"
- "Block details"

**Implementation Details:**
```typescript
export const getBlockInfoTool = createTool({
  description: "Get information about the latest or specific block",
  parameters: z.object({
    blockNumber: z.number().optional().describe("Specific block number, or latest if not provided"),
  }),
  execute: async ({ blockNumber }) => {
    const block = await publicClient.getBlock({
      blockNumber: blockNumber ? BigInt(blockNumber) : undefined,
      blockTag: blockNumber ? undefined : 'latest',
    });
    
    return {
      number: block.number.toString(),
      timestamp: new Date(Number(block.timestamp) * 1000).toISOString(),
      transactions: block.transactions.length,
      gasUsed: block.gasUsed.toString(),
      baseFeePerGas: block.baseFeePerGas ? formatGwei(block.baseFeePerGas) : null,
    };
  },
});
```

**Dependencies:**
- None (uses existing viem publicClient)

---

### Phase 5: Smart Features (Priority: LOW)

#### 5.1 Gas Price Recommendation Tool
**Purpose:** Suggest best time to send transaction

**Commands:**
- "Should I send now or wait?"
- "When is the best time to send?"
- "Gas price recommendations"

**Implementation:**
- Track gas prices over time
- Calculate average and recommend based on current vs average
- Store in localStorage or Redis

---

#### 5.2 Transaction Simulation Tool
**Purpose:** Simulate transaction before sending

**Commands:**
- "Simulate my transaction"
- "What will happen if I send?"

**Implementation:**
- Use Tenderly API or Alchemy simulation
- Requires external API

---

#### 5.3 Multi-Send Tool
**Purpose:** Send to multiple addresses at once

**Commands:**
- "Send 0.1 ETH to these addresses: ..."
- "Batch transfer"

**Implementation:**
- Create multicall contract or sequential transactions
- More complex UX required

---

## 🏗️ Implementation Steps

### Step 1: Setup & Dependencies

```bash
# Install required packages
npm install alchemy-sdk coingecko-api-v3

# Add to .env.local
ETHERSCAN_API_KEY=your_key_here
ALCHEMY_API_KEY=your_key_here
COINGECKO_API_KEY=your_key_here  # Optional, free tier works
```

### Step 2: Create New Tools File Structure

```
ai/
├── tools/
│   ├── index.ts           # Export all tools
│   ├── balance.ts         # Existing balance tool
│   ├── transactions.ts    # Transaction-related tools
│   ├── tokens.ts          # ERC-20 token tools
│   ├── prices.ts          # Price data tools
│   ├── gas.ts             # Gas-related tools
│   └── ens.ts             # ENS tools
└── utils/
    ├── constants.ts       # Token addresses, chain configs
    └── helpers.ts         # Shared utilities
```

### Step 3: Implement Phase 1 (Essential)

**Week 1:**
- ✅ Transaction History Tool
- ✅ Gas Price Tool
- ✅ Gas Estimation Tool
- ✅ Update Chat.tsx to handle new tools
- ✅ Add loading states

**Testing:**
- Test with real wallet on Linea Sepolia
- Verify API responses
- Check error handling

### Step 4: Implement Phase 2 (Tokens)

**Week 2:**
- ✅ ERC-20 Balance Tool
- ✅ Send Token Tool
- ✅ Update Chat.tsx for token transfers
- ✅ Add token registry
- ✅ Add token selection UI

**Testing:**
- Test with USDC/USDT on testnet
- Verify decimal handling
- Test transfer functionality

### Step 5: Implement Phase 3 (Prices)

**Week 3:**
- ✅ Crypto Price Tool
- ✅ Portfolio Value Tool
- ✅ Add price caching (localStorage)
- ✅ Add UI for price display

**Testing:**
- Test price accuracy
- Verify cache expiration
- Test with multiple currencies

### Step 6: Implement Phase 4 (Advanced)

**Week 4:**
- ✅ ENS Resolution Tool (mainnet only)
- ✅ Transaction Status Tool
- ✅ Block Info Tool

**Testing:**
- Test ENS on mainnet
- Test pending/confirmed transactions
- Verify block data

---

## 🧪 Testing Plan

### Unit Tests
Create tests for each tool:

```typescript
// __tests__/ai/tools/gas.test.ts
describe('getGasPriceTool', () => {
  it('should return gas prices', async () => {
    const result = await getGasPriceTool.execute({});
    expect(result).toHaveProperty('slow');
    expect(result).toHaveProperty('standard');
    expect(result).toHaveProperty('fast');
  });
});
```

### Integration Tests
Test AI responses:

```typescript
// Test AI can use tools correctly
const messages = [
  { role: 'user', content: 'What is my balance?' }
];
const response = await POST({ json: () => messages });
// Verify tool was called and result returned
```

### Manual Testing Checklist

- [ ] Test each tool individually
- [ ] Test tool combinations (e.g., check balance then send)
- [ ] Test error scenarios (invalid address, insufficient balance)
- [ ] Test on different networks
- [ ] Test with different wallet states
- [ ] Test streaming responses
- [ ] Test concurrent requests

---

## 📊 Priority Matrix

| Feature | Priority | Complexity | Value | Estimated Time |
|---------|----------|------------|-------|----------------|
| Transaction History | HIGH | Medium | High | 2 days |
| Gas Price | HIGH | Low | High | 1 day |
| Gas Estimation | HIGH | Low | High | 1 day |
| ERC-20 Balance | HIGH | Medium | High | 2 days |
| Send Tokens | HIGH | High | High | 3 days |
| Crypto Prices | MEDIUM | Low | Medium | 1 day |
| Portfolio Value | MEDIUM | Medium | High | 2 days |
| ENS Resolution | MEDIUM | Low | Medium | 1 day |
| Transaction Status | MEDIUM | Low | Medium | 1 day |
| Block Info | LOW | Low | Low | 1 day |

**Total Estimated Time: 15 days (3 weeks)**

---

## 🔒 Security Considerations

### API Key Management
- Never expose API keys in client-side code
- Use environment variables
- Implement rate limiting
- Consider using API proxy

### Input Validation
- Validate all addresses with `isAddress()` from viem
- Validate amounts (positive numbers, max decimals)
- Sanitize user inputs
- Prevent injection attacks

### Transaction Safety
- Always require user confirmation via MetaMask
- Show full transaction details before confirmation
- Implement spending limits (optional)
- Add transaction simulation preview

### Error Handling
- Graceful degradation when APIs are down
- Clear error messages to users
- Log errors for debugging
- Implement retry logic

---

## 📈 Success Metrics

### User Experience
- Average response time < 2 seconds
- Tool success rate > 95%
- User satisfaction score > 4/5

### Technical
- API uptime > 99%
- Error rate < 1%
- Cache hit rate > 80% (for prices)

### Business
- Increased user engagement
- More transactions through AI
- Reduced support tickets

---

## 🔄 Future Enhancements

### Phase 6: DeFi Integration
- DEX price comparison
- Swap functionality
- Liquidity pool info
- Yield farming recommendations

### Phase 7: NFT Support
- NFT balance check
- NFT transfers
- Floor price tracking
- Collection analytics

### Phase 8: Advanced Analytics
- Profit/Loss tracking
- Tax reporting
- Custom alerts
- Portfolio rebalancing suggestions

### Phase 9: Multi-Chain Support
- Cross-chain balance checking
- Bridge recommendations
- Multi-chain transaction history

---

## 📝 Notes

### API Rate Limits
- **Etherscan**: 5 calls/sec (free), 100 calls/sec (paid)
- **CoinGecko**: 50 calls/min (free), unlimited (paid)
- **Alchemy**: 300 CU/sec (free tier)

### Cost Estimates
- **Free Tier**: Sufficient for MVP (< 100 users)
- **Paid Tier**: Required for production (> 1000 users)
  - Etherscan Pro: $99/month
  - CoinGecko Pro: $129/month
  - Alchemy Growth: $49/month

### Alternative APIs
- **Blockscout** (open-source, self-hosted)
- **The Graph** (decentralized indexing)
- **Moralis** (all-in-one Web3 API)

---

## ✅ Implementation Checklist

### Phase 1: Essential Features
- [ ] Setup API keys and environment
- [ ] Create tools file structure
- [ ] Implement Transaction History Tool
- [ ] Implement Gas Price Tool
- [ ] Implement Gas Estimation Tool
- [ ] Update Chat component
- [ ] Add error handling
- [ ] Write tests
- [ ] Update documentation

### Phase 2: Token Support
- [ ] Create token registry
- [ ] Implement ERC-20 Balance Tool
- [ ] Implement Send Token Tool
- [ ] Update UI for token operations
- [ ] Add token validation
- [ ] Write tests
- [ ] Update documentation

### Phase 3: Market Data
- [ ] Setup CoinGecko API
- [ ] Implement Crypto Price Tool
- [ ] Implement Portfolio Value Tool
- [ ] Add price caching
- [ ] Create price display UI
- [ ] Write tests
- [ ] Update documentation

### Phase 4: Advanced Features
- [ ] Implement ENS Resolution Tool
- [ ] Implement Transaction Status Tool
- [ ] Implement Block Info Tool
- [ ] Add advanced UI components
- [ ] Write tests
- [ ] Update documentation

---

## 🎓 Learning Resources

### Documentation
- [Viem Documentation](https://viem.sh/)
- [OpenAI Function Calling](https://platform.openai.com/docs/guides/function-calling)
- [Vercel AI SDK](https://sdk.vercel.ai/docs)
- [Ethereum JSON-RPC](https://ethereum.org/en/developers/docs/apis/json-rpc/)

### Examples
- [AI SDK Examples](https://github.com/vercel/ai/tree/main/examples)
- [Wagmi Examples](https://wagmi.sh/examples)

---

## 📞 Support & Maintenance

### Monitoring
- Setup error tracking (Sentry)
- API usage monitoring
- Response time tracking
- User analytics

### Updates
- Weekly dependency updates
- Monthly API compatibility checks
- Quarterly feature reviews

---

**Last Updated:** December 2, 2025  
**Version:** 1.0  
**Status:** Ready for Implementation

