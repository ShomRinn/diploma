/**
 * Caching Utilities for Analytics
 * Provides localStorage-based caching with expiry
 */

export interface CacheEntry<T> {
  data: T;
  expiry: number;
}

/**
 * Get cached data from localStorage
 */
export function getCachedData<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;

  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;

    const { data, expiry } = JSON.parse(cached) as CacheEntry<T>;

    if (Date.now() > expiry) {
      localStorage.removeItem(key);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error reading cache:', error);
    localStorage.removeItem(key);
    return null;
  }
}

/**
 * Set data in cache with expiry duration
 */
export function setCachedData<T>(
  key: string,
  data: T,
  duration: number = 30 * 60 * 1000 // Default: 30 minutes
): void {
  if (typeof window === 'undefined') return;

  try {
    const expiry = Date.now() + duration;
    const cacheEntry: CacheEntry<T> = { data, expiry };
    localStorage.setItem(key, JSON.stringify(cacheEntry));
  } catch (error) {
    console.error('Error setting cache:', error);
  }
}

/**
 * Clear specific cache entry
 */
export function clearCache(key: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(key);
}

/**
 * Clear all analytics caches
 */
export function clearAllAnalyticsCache(): void {
  if (typeof window === 'undefined') return;

  const keys = Object.keys(localStorage);
  keys.forEach((key) => {
    if (key.startsWith('portfolio-analytics-') || key.startsWith('market-analytics-')) {
      localStorage.removeItem(key);
    }
  });
}

/**
 * Get time until cache expires
 */
export function getTimeUntilExpiry(key: string): number | null {
  if (typeof window === 'undefined') return null;

  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;

    const { expiry } = JSON.parse(cached);
    const remaining = expiry - Date.now();

    return remaining > 0 ? remaining : null;
  } catch (error) {
    return null;
  }
}

/**
 * Check if cache exists and is valid
 */
export function isCacheValid(key: string): boolean {
  return getCachedData(key) !== null;
}

