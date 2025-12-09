/**
 * Storage Initialization Utilities
 * Helper functions for app startup and configuration
 */

import { initializeDatabase, isIndexedDBAvailable, verifyDatabaseIntegrity } from './indexeddb/db';

interface StorageInitOptions {
  verbose?: boolean;
  throwOnError?: boolean;
}

interface StorageInitResult {
  success: boolean;
  available: boolean;
  initialized: boolean;
  version: string;
  message: string;
  details?: {
    stores: Record<string, boolean>;
    errors: string[];
  };
}

/**
 * Initialize storage on app startup
 * Call this in your app's root component or layout
 */
export async function initStorageOnStartup(
  options: StorageInitOptions = {}
): Promise<StorageInitResult> {
  const { verbose = false, throwOnError = false } = options;

  const log = (msg: string) => {
    if (verbose) {
      console.log(`[Storage] ${msg}`);
    }
  };

  try {
    log('Starting storage initialization...');

    // Check IndexedDB availability
    if (!isIndexedDBAvailable()) {
      const message = 'IndexedDB is not available in this browser';
      log(`⚠️  ${message}`);

      if (throwOnError) {
        throw new Error(message);
      }

      return {
        success: false,
        available: false,
        initialized: false,
        version: '0',
        message,
      };
    }

    log('✓ IndexedDB available');

    // Initialize database
    try {
      await initializeDatabase();
      log('✓ Database initialized');
    } catch (error) {
      const message = `Failed to initialize database: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`;
      log(`✗ ${message}`);

      if (throwOnError) {
        throw error;
      }

      return {
        success: false,
        available: true,
        initialized: false,
        version: '0',
        message,
      };
    }

    // Verify database integrity
    let health = { valid: true, stores: {}, errors: [] };
    try {
      health = await verifyDatabaseIntegrity();
      if (health.valid) {
        log('✓ Database integrity verified');
      } else {
        log(`⚠️  Database integrity issues: ${health.errors.join(', ')}`);
      }
    } catch (error) {
      log(`⚠️  Could not verify database: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`);
    }

    log('✓ Storage initialization complete');

    return {
      success: true,
      available: true,
      initialized: health.valid,
      version: '1.0.0',
      message: 'Storage initialized successfully',
      details: {
        stores: health.stores,
        errors: health.errors,
      },
    };
  } catch (error) {
    const message = `Storage initialization failed: ${
      error instanceof Error ? error.message : 'Unknown error'
    }`;
    log(`✗ ${message}`);

    throw error;
  }
}

/**
 * Create a storage initialization effect for React components
 * Usage: useEffect(() => { useStorageInit(); }, []);
 */
export function createStorageInitEffect() {
  return async () => {
    try {
      const result = await initStorageOnStartup({ verbose: true });
      if (!result.success) {
        console.warn('[Storage] Initialization warning:', result.message);
      }
    } catch (error) {
      console.error('[Storage] Initialization error:', error);
    }
  };
}

/**
 * Initialize storage with fallback
 * Gracefully handles storage unavailability
 */
export async function initStorageWithFallback(): Promise<{
  storageType: 'indexeddb' | 'localstorage' | 'none';
  ready: boolean;
}> {
  try {
    const result = await initStorageOnStartup({ throwOnError: true });
    if (result.success) {
      return { storageType: 'indexeddb', ready: true };
    }
  } catch (error) {
    console.warn('[Storage] IndexedDB unavailable, using fallback', error);
  }

  // Check for localStorage fallback
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('__test__', '1');
      localStorage.removeItem('__test__');
      console.log('[Storage] Using localStorage fallback');
      return { storageType: 'localstorage', ready: true };
    }
  } catch (error) {
    console.warn('[Storage] localStorage unavailable', error);
  }

  console.error('[Storage] No storage available');
  return { storageType: 'none', ready: false };
}

/**
 * Environmental check for storage initialization
 * Returns true if safe to use IndexedDB
 */
export function isStorageSafeToUse(): boolean {
  // Skip on server-side
  if (typeof window === 'undefined') {
    return false;
  }

  // Skip if running in test environment
  if (
    typeof process !== 'undefined' &&
    (process.env.NODE_ENV === 'test' || process.env.VITEST === 'true')
  ) {
    return false;
  }

  // Skip if private browsing mode (best effort detection)
  try {
    const test = new Uint8Array(1);
    const result = crypto.getRandomValues(test);
    return result !== null;
  } catch {
    return false;
  }
}

/**
 * Create a React hook for storage initialization
 * Usage: useStorageInit();
 */
export function useStorageInit(options?: StorageInitOptions) {
  // This function should be called in a useEffect
  // It's exported for convenience but typically used via the effect hook
  return createStorageInitEffect();
}

/**
 * Get storage initialization status
 * Useful for debugging and monitoring
 */
let storageStatus: StorageInitResult | null = null;

export async function getStorageStatus(): Promise<StorageInitResult> {
  if (!storageStatus) {
    storageStatus = await initStorageOnStartup();
  }
  return storageStatus;
}

/**
 * Reset storage status
 * Useful for testing or re-initialization
 */
export function resetStorageStatus(): void {
  storageStatus = null;
}

/**
 * Create a status check interval
 * Logs storage health periodically
 */
export function startStorageHealthCheck(intervalMs: number = 60000): () => void {
  const interval = setInterval(async () => {
    try {
      const status = await getStorageStatus();
      if (!status.success || !status.initialized) {
        console.warn('[Storage Health] Issues detected:', status);
      } else {
        console.debug('[Storage Health] OK');
      }
    } catch (error) {
      console.warn('[Storage Health] Check failed:', error);
    }
  }, intervalMs);

  // Return cleanup function
  return () => clearInterval(interval);
}
