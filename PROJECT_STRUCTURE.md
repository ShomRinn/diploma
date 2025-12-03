# Project Structure

## 📁 Complete Directory Structure

```
wallet-agent/
├── app/                          # Next.js App Router
│   ├── welcome/                  # Login/Welcome screen
│   ├── dashboard/                # Main dashboard (auth required)
│   │   ├── ai/                   # AI Assistant page
│   │   ├── chats/                # Chats & Contacts
│   │   ├── portfolio/            # Portfolio Analytics
│   │   ├── settings/             # Settings page
│   │   ├── layout.tsx            # Dashboard layout
│   │   └── page.tsx              # Home dashboard
│   ├── api/
│   │   └── chat/                 # AI chat API route
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Root redirect
│
├── components/                   # React components
│   ├── modals/                   # Modal components
│   │   ├── ReceiveModal.tsx
│   │   ├── SendModal.tsx
│   │   └── TransactionDetailsModal.tsx
│   ├── ui/                       # UI components
│   │   ├── button.tsx
│   │   └── input.tsx
│   ├── Chat.tsx                  # AI chat with markdown
│   ├── ChatHistory.tsx           # Chat history sidebar
│   ├── Message.tsx               # Message component
│   └── Sidebar.tsx               # Navigation sidebar
│
├── ai/                           # AI Tools & Logic
│   ├── tools/                    # AI tool modules
│   │   ├── balance.ts            # Balance checking
│   │   ├── transactions.ts       # Transaction tools (3 tools)
│   │   ├── gas.ts                # Gas tools (2 tools)
│   │   ├── tokens.ts             # ERC-20 tools (2 tools)
│   │   ├── prices.ts             # Price & analytics tools (3 tools)
│   │   ├── blockchain.ts         # Block info tool
│   │   └── index.ts              # Tool collection export
│   └── utils/                    # AI utilities
│       ├── constants.ts          # Token addresses, configs
│       └── helpers.ts            # Helper functions
│
├── lib/                          # Shared utilities & modules
│   ├── analytics/                # ⭐ Analytics Module
│   │   ├── api/                  # CoinGecko API integration
│   │   │   └── coingecko.ts
│   │   ├── hooks/                # Custom React hooks
│   │   │   └── usePortfolioAnalytics.ts
│   │   ├── utils/                # Utilities
│   │   │   ├── cache.ts          # Caching system
│   │   │   └── formatters.ts     # Data formatters
│   │   ├── constants.ts          # Analytics constants
│   │   ├── index.ts              # Main exports
│   │   └── README.md             # Module documentation
│   ├── authContext.tsx           # Authentication context
│   ├── chatHistory.ts            # Chat history storage
│   ├── Provider.tsx              # Providers wrapper
│   ├── types.ts                  # TypeScript types
│   ├── useChatSession.ts         # Chat session hook
│   └── utils.ts                  # General utilities
│
├── docs/                         # 📚 Documentation
│   ├── ai/                       # AI features docs
│   │   ├── AI_FEATURES_IMPLEMENTATION_PLAN.md
│   │   ├── AI_TOOLS_DOCUMENTATION.md
│   │   ├── EXAMPLE_CONVERSATIONS.md
│   │   ├── IMPLEMENTATION_SUMMARY.md
│   │   └── QUICK_START.md
│   ├── analytics/                # ⭐ Analytics docs
│   │   ├── PORTFOLIO_ANALYTICS.md
│   │   ├── PORTFOLIO_UPDATE_SUMMARY.md
│   │   └── README.md
│   └── README.md                 # Documentation index
│
├── public/                       # Static files
│   └── *.svg                     # Icons and images
│
├── node_modules/                 # Dependencies
├── .env.local                    # Environment variables (gitignored)
├── .env.local.example            # Environment template
├── .gitignore                    # Git ignore rules
├── components.json               # shadcn/ui config
├── eslint.config.mjs             # ESLint configuration
├── next-env.d.ts                 # Next.js types
├── next.config.ts                # Next.js configuration
├── package.json                  # Dependencies & scripts
├── postcss.config.mjs            # PostCSS configuration
├── README.md                     # Main project README
├── tailwind.config.ts            # Tailwind CSS configuration
├── tsconfig.json                 # TypeScript configuration
└── wagmi.config.ts               # Wagmi & blockchain config
```

## 🗂️ Module Breakdown

### `/app` - Application Routes
Next.js 15 App Router structure with:
- **Authentication flow**: welcome → dashboard
- **Dashboard pages**: ai, chats, portfolio, settings
- **API routes**: `/api/chat` for AI interactions

### `/components` - React Components
Reusable UI components:
- **Chat components**: Chat, Message, ChatHistory
- **UI primitives**: Button, Input (shadcn/ui)
- **Modals**: Send, Receive, Transaction details
- **Navigation**: Sidebar

### `/ai` - AI System
Complete AI assistant implementation:
- **12 AI tools** across 6 categories
- **Tool utilities**: constants, helpers
- **Modular structure**: each tool in separate file

### `/lib` - Shared Code
#### `analytics/` 
- **API layer**: CoinGecko integration
- **Hooks**: usePortfolioAnalytics with auto-refresh
- **Utils**: Caching system, data formatters
- **Constants**: Configuration values
- **Complete documentation**: README included

#### Other utilities
- Authentication context
- Chat history management
- Type definitions
- General utilities

### `/docs` - Documentation
Comprehensive documentation:
- **ai/**: AI features, tools, examples
- **analytics/**: Portfolio analytics, updates
- **Index**: Quick navigation

## 🎯 Key Features by Module

### Analytics Module (`lib/analytics/`)
✅ CoinGecko API integration  
✅ 30-minute auto-refresh  
✅ Smart caching system  
✅ Data formatters  
✅ Custom React hooks  
✅ TypeScript types  
✅ Complete documentation

### AI Tools (`ai/tools/`)
✅ 12 powerful tools  
✅ Blockchain interactions  
✅ Price tracking  
✅ Market analytics  
✅ Transaction management  
✅ Gas estimation

### Components (`components/`)
✅ Modern UI with Tailwind  
✅ Markdown rendering  
✅ Responsive design  
✅ Modal system  
✅ Navigation

## 📦 Dependencies

### Core
- **Next.js 15**: React framework with App Router
- **React 19**: UI library
- **TypeScript**: Type safety

### Web3
- **Wagmi**: React hooks for Ethereum
- **Viem**: Ethereum interactions
- **MetaMask SDK**: Wallet connection

### AI
- **Vercel AI SDK**: AI integration
- **OpenAI**: GPT-4o model
- **Zod**: Schema validation

### UI
- **Tailwind CSS**: Styling
- **shadcn/ui**: UI components
- **Lucide React**: Icons
- **react-markdown**: Markdown rendering

## 🚀 Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Setup environment**
   ```bash
   cp .env.local.example .env.local
   # Add your API keys
   ```

3. **Run development server**
   ```bash
   npm run dev
   ```

## 📝 File Naming Conventions

- **React Components**: PascalCase (`Chat.tsx`, `Sidebar.tsx`)
- **Utilities**: camelCase (`chatHistory.ts`, `helpers.ts`)
- **Types**: PascalCase (`types.ts` with PascalCase interfaces)
- **Constants**: UPPER_SNAKE_CASE inside files
- **Documentation**: CAPS_WITH_UNDERSCORES.md

## 🔧 Configuration Files

- `next.config.ts` - Next.js configuration
- `tailwind.config.ts` - Tailwind CSS setup
- `tsconfig.json` - TypeScript compiler options
- `eslint.config.mjs` - Linting rules
- `wagmi.config.ts` - Blockchain configuration
- `components.json` - shadcn/ui setup

## 📖 Documentation Structure

```
docs/
├── README.md                    # Documentation index
├── ai/                          # AI features
│   ├── AI_FEATURES_IMPLEMENTATION_PLAN.md  # Full plan
│   ├── AI_TOOLS_DOCUMENTATION.md          # Tool reference
│   ├── EXAMPLE_CONVERSATIONS.md           # Usage examples
│   ├── IMPLEMENTATION_SUMMARY.md          # What was built
│   └── QUICK_START.md                     # Getting started
└── analytics/                   # Analytics
    ├── README.md                # Analytics overview
    ├── PORTFOLIO_ANALYTICS.md   # Complete docs
    └── PORTFOLIO_UPDATE_SUMMARY.md  # Update details
```

## 🎨 Design System

- **Colors**: Tailwind CSS default + custom gradients
- **Typography**: System fonts with responsive sizing
- **Spacing**: Tailwind's spacing scale
- **Components**: shadcn/ui primitives
- **Icons**: Lucide React

## 🔐 Security

- ✅ No private keys stored
- ✅ Environment variables for API keys
- ✅ MetaMask transaction confirmation
- ✅ Client-side only sensitive data
- ✅ Non-custodial wallet

---

**Last Updated**: December 2, 2025  
**Version**: 2.0.0  
**Complete**: ✅

