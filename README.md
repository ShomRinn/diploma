# AI Bank - AI-Powered Cryptocurrency Management

A modern, AI-powered cryptocurrency wallet interface built with Next.js, MetaMask SDK, and OpenAI.

## 🌟 Features

### 🏠 **Home Dashboard**
- Real-time balance tracking
- 24-hour performance metrics
- Quick actions (Send, Receive, Buy)
- Portfolio preview
- Recent transactions

### 🤖 **AI Assistant**
- Natural language crypto management
- Check ETH and ERC-20 token balances
- Execute transactions with AI help
- Transaction history and status checking
- Real-time gas price monitoring
- Gas cost estimation
- Cryptocurrency price tracking
- Portfolio value calculation
- Block information queries
- Smart recommendations

### 💬 **Chats & Contacts**
- Private messaging with contacts
- Payment requests
- Quick send functionality
- Add contacts by wallet address, ENS name, or QR code
- Message history

### 📊 **Portfolio Analytics** (Enhanced!)
- Comprehensive real-time analytics powered by CoinGecko
- Auto-refresh every 30 minutes with smart caching
- Market cap, volume, and rankings
- Price performance tracking (24h, 7d, 30d, 1y)
- Supply information and fully diluted valuation
- Market sentiment indicators
- All-time high/low data
- Manual refresh capability

### ⚙️ **Settings**
- Profile management
- Currency preferences
- Language selection
- Theme customization (Light/Dark)
- Network switching
- Security and connected dApps management

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- MetaMask installed
- OpenAI API key
- Linea Sepolia testnet ETH ([Get from faucet](https://docs.metamask.io/developer-tools/faucet/))

### Installation

1. Clone the repository:
```bash
git clone https://github.com/ShomRinn/my-wallet-ai-agent.git
cd my-wallet-ai-agent
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env.local` file:
```bash
# Required
OPENAI_API_KEY=your-openai-api-key-here

# Optional (for enhanced features)
ETHERSCAN_API_KEY=your-etherscan-api-key-here  # For transaction history
NEXT_PUBLIC_COINGECKO_API_KEY=your-coingecko-api-key-here  # For authenticated CoinGecko API calls
# OR use COINGECKO_API_KEY=your-key (both work)
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
ai-bank/
├── app/
│   ├── welcome/          # Login/Welcome screen
│   ├── dashboard/        # Main app (requires auth)
│   │   ├── page.tsx      # Home dashboard
│   │   ├── ai/           # AI Assistant page
│   │   ├── chats/        # Chats & Contacts
│   │   ├── portfolio/    # Portfolio analytics
│   │   ├── settings/     # Settings page
│   │   └── layout.tsx    # Dashboard layout with sidebar
│   ├── api/chat/         # AI chat API route
│   └── page.tsx          # Root redirect
├── components/
│   ├── Sidebar.tsx       # Navigation sidebar
│   ├── Chat.tsx          # AI chat component with markdown
│   ├── ChatHistory.tsx   # Chat history sidebar
│   └── ui/               # Reusable UI components
├── lib/
│   ├── analytics/        # Analytics module ⭐ NEW
│   │   ├── api/          # CoinGecko API integration
│   │   ├── hooks/        # Custom analytics hooks
│   │   ├── utils/        # Cache & formatters
│   │   └── constants.ts  # Analytics configuration
│   ├── authContext.tsx   # Authentication state
│   ├── types.ts          # TypeScript types
│   ├── chatHistory.ts    # Chat history storage
│   └── useChatSession.ts # Chat session hook
├── ai/
│   ├── tools/            # AI tool modules
│   │   ├── index.ts      # Tool collection
│   │   ├── balance.ts    # Balance checking
│   │   ├── transactions.ts  # Transaction tools
│   │   ├── gas.ts        # Gas price & estimation
│   │   ├── tokens.ts     # ERC-20 token tools
│   │   ├── prices.ts     # Crypto price data & analytics
│   │   └── blockchain.ts # Block information
│   └── utils/            # Utilities
│       ├── constants.ts  # Token addresses, configs
│       └── helpers.ts    # Helper functions
├── docs/                 # Documentation
│   ├── ai/               # AI features documentation
│   │   ├── AI_FEATURES_IMPLEMENTATION_PLAN.md
│   │   ├── AI_TOOLS_DOCUMENTATION.md
│   │   ├── EXAMPLE_CONVERSATIONS.md
│   │   ├── IMPLEMENTATION_SUMMARY.md
│   │   └── QUICK_START.md
│   └── analytics/        # Real-time analytics documentation
│       ├── README.md
│       ├── PORTFOLIO_ANALYTICS.md
│       └── PORTFOLIO_UPDATE_SUMMARY.md
└── wagmi.config.ts       # Wagmi & Viem configuration
```

## 🛠️ Technology Stack

- **Framework**: Next.js 15 with App Router
- **Styling**: Tailwind CSS
- **Wallet**: MetaMask SDK + Wagmi
- **Blockchain**: Viem (Ethereum interactions)
- **AI**: OpenAI GPT-4o via Vercel AI SDK
- **Network**: Linea Sepolia (testnet)
- **Storage**: Browser localStorage
- **Icons**: Lucide React

## 🎨 Application Flow

### Not Authorized
1. **Welcome Screen** → Connect Wallet → Select Provider (MetaMask/WalletConnect) → **Dashboard**

### Authorized (Sidebar Navigation)
```
├── Home (Dashboard)
├── AI Assistant
├── Chats
├── Portfolio
└── Settings
    └── Disconnect → Back to Welcome
```

## 🔐 Security Features

- Non-custodial: Your keys, your crypto
- MetaMask transaction confirmation required
- No private keys stored
- Local data storage only
- Secure dApp connection management

## 🌐 Supported Networks

- Linea Sepolia (Testnet) - Default
- Ethereum Mainnet
- Linea Mainnet

*Switch networks via MetaMask extension*

## 📊 Data Sources

- **Blockchain Data**: Viem Public Client
- **Price Data**: CoinGecko API (coming soon)
- **Transaction History**: On-chain data

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - see LICENSE file for details

## 🔗 Links

- [MetaMask SDK Documentation](https://docs.metamask.io/developer-tools/wallet-sdk/)
- [Vercel AI SDK](https://sdk.vercel.ai/)
- [Wagmi Documentation](https://wagmi.sh/)
- [Linea Network](https://linea.build/)

## 🐛 Known Issues

- 7-day price chart visualization not yet implemented
- ENS resolution only works on mainnet
- Multi-coin portfolio tracking (coming soon)

## 🎯 Roadmap

- [x] Add transaction history fetching
- [x] Implement CoinGecko price feeds
- [x] Gas price monitoring and estimation
- [x] ERC-20 token support
- [x] Portfolio value calculation
- [x] Comprehensive market analytics
- [x] 30-minute auto-refresh with caching
- [x] Market sentiment indicators
- [x] Supply information dashboard
- [ ] 7-day price charts
- [ ] Multi-coin portfolio tracking
- [ ] Mobile app version
- [ ] Multi-chain support
- [ ] Token swap functionality
- [ ] NFT portfolio view
- [ ] Export transaction history
- [ ] ENS name resolution (mainnet)
- [ ] Price alerts

---

Made with ❤️ by the AI Bank Team
