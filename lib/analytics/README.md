# Analytics Module

Real-time cryptocurrency analytics module powered by CoinGecko API.

## Structure

```
lib/analytics/
├── api/
│   └── coingecko.ts          # CoinGecko API integration
├── hooks/
│   └── usePortfolioAnalytics.ts  # React hooks for analytics
├── utils/
│   ├── cache.ts              # Caching utilities
│   └── formatters.ts         # Data formatting functions
├── constants.ts              # Configuration and constants
└── index.ts                  # Main exports
```

## Usage

### Basic Import
```typescript
import { usePortfolioAnalytics } from '@/lib/analytics';
```

### Using the Hook
```typescript
function MyComponent() {
  const { analytics, loading, error, refresh } = usePortfolioAnalytics('ethereum');

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>Price: ${analytics?.currentPrice}</h1>
      <button onClick={refresh}>Refresh</button>
    </div>
  );
}
```

### Direct API Usage
```typescript
import { fetchCoinMarketData } from '@/lib/analytics';

const data = await fetchCoinMarketData('ethereum');
console.log(data.market_data.current_price.usd);
```

### Using Formatters
```typescript
import { formatLargeNumber, formatPercentageChange } from '@/lib/analytics';

const marketCap = formatLargeNumber(420000000000); // "$420.00B"
const change = formatPercentageChange(2.5); 
// { formatted: "+2.50%", colorClass: "text-green-600", isPositive: true }
```

### Using Cache
```typescript
import { getCachedData, setCachedData } from '@/lib/analytics';

// Set cache
setCachedData('my-key', data, 30 * 60 * 1000); // 30 minutes

// Get cache
const cached = getCachedData('my-key');
```

## Features

### API Module (`api/`)
- **fetchCoinMarketData**: Get comprehensive market data for a coin
- **fetchSimplePrice**: Get lightweight price data
- **fetchMultipleCoinsData**: Get data for multiple coins

### Hooks Module (`hooks/`)
- **usePortfolioAnalytics**: Complete hook with auto-refresh and caching
  - Auto-refreshes every 30 minutes
  - Handles loading and error states
  - Provides manual refresh function
  - Tracks last and next update times

### Utils Module (`utils/`)
#### Cache (`cache.ts`)
- **getCachedData**: Retrieve cached data with auto-expiry
- **setCachedData**: Store data with custom duration
- **clearCache**: Remove specific cache entry
- **clearAllAnalyticsCache**: Clear all analytics caches
- **isCacheValid**: Check if cache exists and is valid

#### Formatters (`formatters.ts`)
- **formatLargeNumber**: Format numbers like $420.00B
- **formatSupply**: Format supply numbers (120.69M ETH)
- **formatPercentageChange**: Format % with color classes
- **formatPrice**: Format prices with appropriate decimals
- **formatDate**: Format dates to readable strings
- **formatTimeUntilUpdate**: Show countdown to next update
- **formatVolumeRatio**: Calculate volume/market cap ratio
- **getTrendIcon**: Get trend emoji based on change
- **formatRank**: Format market cap rank (#2)

### Constants Module
- **CACHE_DURATION**: Cache durations for different data types
- **REFRESH_INTERVALS**: Auto-refresh intervals
- **SUPPORTED_COINS**: List of supported cryptocurrencies
- **COINGECKO_CONFIG**: API configuration
- **CACHE_KEYS**: Standardized cache key prefixes
- **DEFAULTS**: Default values
- **UI_CONFIG**: UI configuration (colors, limits)
- **THRESHOLDS**: Analytics thresholds

## Data Types

### MarketAnalytics
```typescript
interface MarketAnalytics {
  currentPrice: number;
  marketCap: number;
  marketCapRank: number;
  volume24h: number;
  volumeMarketCapRatio: string;
  priceChange24h: number;
  priceChange7d: number;
  priceChange30d: number;
  priceChange1y: number;
  high24h: number;
  low24h: number;
  ath: number;
  athDate: string | null;
  athChangePercentage: number;
  atl: number;
  atlDate: string | null;
  atlChangePercentage: number;
  circulatingSupply: number;
  totalSupply: number;
  maxSupply: number | null;
  fullyDilutedValuation: number | null;
  sentiment: {
    votesUpPercentage: number;
    votesDownPercentage: number;
  };
  sparkline: number[];
  lastUpdated: string;
}
```

## Configuration

### Cache Duration
Default: 30 minutes for market data, 1 minute for prices

### Auto-Refresh
Default: Every 30 minutes

### Rate Limits
- Free tier: 50 calls/minute
- Pro tier: 500 calls/minute
- Our usage: ~2 calls per 30 minutes

## Development

### Adding a New Feature
1. Add API function in `api/coingecko.ts`
2. Create hook if needed in `hooks/`
3. Add formatters in `utils/formatters.ts`
4. Update `index.ts` exports
5. Document in this README

### Best Practices
- Always use caching for API calls
- Handle errors gracefully
- Provide loading states
- Use TypeScript types
- Format data before display
- Respect API rate limits

## Examples

### Complete Analytics Component
```typescript
import { usePortfolioAnalytics, formatLargeNumber, formatPercentageChange } from '@/lib/analytics';

export function AnalyticsDashboard() {
  const { analytics, loading, error, lastUpdate, nextUpdate, refresh } = 
    usePortfolioAnalytics('ethereum');

  if (loading) return <Loader />;
  if (error) return <Error message={error} />;
  if (!analytics) return null;

  const priceChange = formatPercentageChange(analytics.priceChange24h);

  return (
    <div>
      <h1>${analytics.currentPrice.toFixed(2)}</h1>
      <p className={priceChange.colorClass}>{priceChange.formatted}</p>
      <p>Market Cap: {formatLargeNumber(analytics.marketCap)}</p>
      <button onClick={refresh}>Refresh</button>
    </div>
  );
}
```

## Related

- [Portfolio Analytics Documentation](../../docs/analytics/PORTFOLIO_ANALYTICS.md)
- [Analytics Update Summary](../../docs/analytics/PORTFOLIO_UPDATE_SUMMARY.md)

---

**Last Updated**: December 2, 2025  
**Version**: 1.0.0  
**Status**: Production Ready

