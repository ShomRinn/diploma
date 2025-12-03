/**
 * Data Formatting Utilities for Analytics
 */

/**
 * Format large numbers to human-readable format (K, M, B, T)
 */
export function formatLargeNumber(num: number, prefix: string = '$'): string {
  if (num >= 1e12) return `${prefix}${(num / 1e12).toFixed(2)}T`;
  if (num >= 1e9) return `${prefix}${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `${prefix}${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `${prefix}${(num / 1e3).toFixed(2)}K`;
  return `${prefix}${num.toFixed(2)}`;
}

/**
 * Format supply numbers (without dollar sign)
 */
export function formatSupply(num: number, suffix: string = ''): string {
  if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B${suffix}`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M${suffix}`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K${suffix}`;
  return `${num.toFixed(0)}${suffix}`;
}

/**
 * Format percentage change with sign and color class
 */
export function formatPercentageChange(value: number): {
  formatted: string;
  colorClass: string;
  isPositive: boolean;
} {
  const isPositive = value >= 0;
  return {
    formatted: `${isPositive ? '+' : ''}${value.toFixed(2)}%`,
    colorClass: isPositive ? 'text-green-600' : 'text-red-600',
    isPositive,
  };
}

/**
 * Format price with appropriate decimals
 */
export function formatPrice(price: number): string {
  if (price >= 1000) return `$${price.toFixed(2)}`;
  if (price >= 1) return `$${price.toFixed(4)}`;
  if (price >= 0.01) return `$${price.toFixed(6)}`;
  return `$${price.toFixed(8)}`;
}

/**
 * Format date to readable string
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format time until next update
 */
export function formatTimeUntilUpdate(nextUpdate: Date | null): string {
  if (!nextUpdate) return '';

  const diff = nextUpdate.getTime() - Date.now();
  if (diff <= 0) return 'Updating...';

  const minutes = Math.floor(diff / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);

  if (minutes > 0) {
    return `${minutes} min`;
  }
  return `${seconds} sec`;
}

/**
 * Format volume to market cap ratio
 */
export function formatVolumeRatio(volume: number, marketCap: number): string {
  if (!volume || !marketCap) return '0.00%';
  return ((volume / marketCap) * 100).toFixed(2) + '%';
}

/**
 * Get trend direction based on change percentage
 */
export function getTrendDirection(change: number): 'up' | 'down' | 'neutral' {
  if (change > 0) return 'up';
  if (change < 0) return 'down';
  return 'neutral';
}

/**
 * Format market cap rank
 */
export function formatRank(rank: number): string {
  return `#${rank}`;
}

