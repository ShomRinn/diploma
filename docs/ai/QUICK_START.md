# Quick Start Guide

## 🚀 Getting Started with New AI Features

Congratulations! Your AI wallet assistant now has 11 powerful tools. Here's how to get started.

## Step 1: Setup Environment Variables

Copy the example environment file and add your API keys:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add:

```bash
# Required
OPENAI_API_KEY=your-openai-api-key-here

# Optional (but recommended)
ETHERSCAN_API_KEY=your-etherscan-api-key-here
```

### Where to Get API Keys:

1. **OpenAI API Key** (Required)
   - Go to https://platform.openai.com/api-keys
   - Create new secret key
   - Copy and paste into `.env.local`

2. **Etherscan API Key** (Optional - for transaction history)
   - Go to https://lineascan.build/myapikey
   - Sign up and create free API key
   - Free tier: 5 calls/second (sufficient for testing)

3. **CoinGecko API** (Optional - works without key)
   - Free tier works without API key
   - 50 calls/minute rate limit
   - Get key at: https://www.coingecko.com/en/api

## Step 2: Install Dependencies (if needed)

The implementation uses existing dependencies, but verify:

```bash
npm install
```

## Step 3: Run the Development Server

```bash
npm run dev
```

Open http://localhost:3000

## Step 4: Test the AI Tools

### Basic Commands to Try:

#### 1. Check Balance
```
"What is my balance?"
"Check my wallet balance"
"How much ETH do I have?"
```

#### 2. Gas Prices
```
"What's the current gas price?"
"Is it expensive to send now?"
"Show me gas prices"
```

#### 3. Estimate Transaction Cost
```
"How much will it cost to send 0.1 ETH?"
"Estimate gas for sending 0.01 ETH to 0x..."
```

#### 4. Transaction History (requires ETHERSCAN_API_KEY)
```
"Show my last 10 transactions"
"What did I send recently?"
"Display my transaction history"
```

#### 5. Crypto Prices
```
"What's the price of ETH?"
"How much is Bitcoin worth?"
"Show me ETH price"
```

#### 6. Portfolio Value
```
"What's my portfolio worth?"
"Total value of my wallet"
"Show my net worth in USD"
```

#### 7. Send ETH
```
"Send 0.01 ETH to 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
"Transfer 0.001 ETH to [address]"
```

#### 8. Check Token Balance
```
"What's my USDC balance at 0x..."
"Check token balance at [token-address]"
```

#### 9. Transaction Status
```
"Check status of transaction 0x..."
"Is my transaction confirmed?"
```

#### 10. Block Information
```
"What's the current block number?"
"Show latest block info"
"Get block 12345"
```

## Features by Phase

### ✅ Phase 1: Essential Features (All Implemented)
- Transaction History
- Gas Price Monitoring
- Gas Cost Estimation

### ✅ Phase 2: Token Support (All Implemented)
- ERC-20 Token Balance
- ERC-20 Token Transfers

### ✅ Phase 3: Market Data (All Implemented)
- Cryptocurrency Prices
- Portfolio Value Calculation

### ✅ Phase 4: Advanced Features (All Implemented)
- Transaction Status Checking
- Block Information

## Architecture Overview

```
ai/
├── tools/
│   ├── index.ts          # All tools exported
│   ├── balance.ts        # ETH balance
│   ├── transactions.ts   # TX history, send, status
│   ├── gas.ts           # Gas prices & estimation
│   ├── tokens.ts        # ERC-20 operations
│   ├── prices.ts        # Crypto prices & portfolio
│   └── blockchain.ts    # Block information
└── utils/
    ├── constants.ts     # Token addresses, configs
    └── helpers.ts       # Helper functions
```

## Troubleshooting

### Issue: "Failed to fetch transaction history"
**Solution:** Add `ETHERSCAN_API_KEY` to `.env.local`

### Issue: "Failed to fetch cryptocurrency price"
**Solution:** 
- Check internet connection
- CoinGecko may have rate limits (wait a minute)
- Add `COINGECKO_API_KEY` for higher limits

### Issue: "Transaction not sending"
**Solution:**
- Make sure MetaMask is connected
- Check you have sufficient balance
- Approve the transaction in MetaMask popup

### Issue: AI not understanding commands
**Solution:**
- Be specific: mention addresses, amounts
- Use clear language: "Check balance", "Send ETH"
- Check OpenAI API key is valid

## API Rate Limits

### Free Tier Limits:
- **Etherscan**: 5 calls/second ✅ Good for development
- **CoinGecko**: 50 calls/minute ✅ Good for development
- **OpenAI**: Depends on your plan

### Optimization:
- Price data is cached for 60 seconds
- Gas prices cached for 30 seconds
- Reduces API calls automatically

## Security Best Practices

1. ✅ **Never commit `.env.local`** - Already in `.gitignore`
2. ✅ **All transactions require MetaMask** - Built-in
3. ✅ **No private keys stored** - Non-custodial
4. ✅ **Input validation** - All addresses validated
5. ✅ **API keys in environment variables** - Secure

## Next Steps

1. **Test all features** - Try each command above
2. **Add more tokens** - Update `ai/utils/constants.ts` with token addresses
3. **Customize responses** - Modify system prompts in `app/dashboard/ai/page.tsx`
4. **Add more tools** - Follow pattern in existing tools
5. **Deploy** - Use Vercel or similar platform

## Performance Tips

1. **Use caching** - Already implemented for prices and gas
2. **Batch requests** - AI can handle multiple questions
3. **Monitor API usage** - Check your API dashboards
4. **Upgrade if needed** - Consider paid tiers for production

## Example Conversation Flow

```
User: "What's my balance and how much is ETH worth?"

AI: 
1. Calls displayBalance tool → "0.5 ETH"
2. Calls getCryptoPrice tool → "$3,500"
3. Responds: "You have 0.5 ETH, which is worth $1,750 USD at 
   the current price of $3,500 per ETH."
```

## Need Help?

- 📖 Read `AI_TOOLS_DOCUMENTATION.md` for detailed tool docs
- 📋 Check `AI_FEATURES_IMPLEMENTATION_PLAN.md` for architecture
- 🐛 Check console logs for errors
- 💬 Ask AI: "How do I check my transaction status?"

## Ready to Go! 🎉

Your wallet agent now has:
- ✅ 11 AI tools
- ✅ Smart caching
- ✅ Error handling
- ✅ Security built-in
- ✅ Production-ready code

Start chatting with your AI assistant and enjoy! 🚀

