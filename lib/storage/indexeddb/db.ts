/**
 * IndexedDB Database Initialization and Setup
 * Manages database creation, versioning, and store initialization
 */

import type {
  User,
  ChatSession,
  Contact,
  TransactionLabel,
  UserSettings,
  PortfolioSnapshot,
  CustomToken,
  AuthSession,
  IndexedDBConfig,
  StoreConfig,
} from '../types';

// Database configuration
const DB_NAME = 'wallet-agent-db';
const DB_VERSION = 1;

/**
 * Store configurations defining keyPath and indexes
 */
const STORES_CONFIG: Record<string, StoreConfig> = {
  users: {
    keyPath: 'id',
    indexes: [
      { name: 'email', keyPath: 'email', options: { unique: true } },
      { name: 'walletAddress', keyPath: 'walletAddress' },
      { name: 'emailVerified', keyPath: 'emailVerified' },
      { name: 'lastLogin', keyPath: 'lastLogin' },
      { name: 'role', keyPath: 'role' },
      { name: 'isActive', keyPath: 'isActive' },
      { name: 'createdAt', keyPath: 'createdAt' },
    ],
  },
  chat_sessions: {
    keyPath: 'id',
    indexes: [
      { name: 'userId', keyPath: 'userId' },
      { name: 'walletAddress', keyPath: 'walletAddress' },
      { name: 'createdAt', keyPath: 'createdAt' },
      { name: 'updatedAt', keyPath: 'updatedAt' },
      { name: 'title', keyPath: 'title' },
      { name: 'tags', keyPath: 'tags', options: { multiEntry: true } },
      { name: 'userId_createdAt', keyPath: ['userId', 'createdAt'] },
    ],
  },
  contacts: {
    keyPath: 'id',
    indexes: [
      { name: 'userId', keyPath: 'userId' },
      { name: 'name', keyPath: 'name' },
      { name: 'address', keyPath: 'address' },
      { name: 'ensName', keyPath: 'ensName' },
      { name: 'tags', keyPath: 'tags', options: { multiEntry: true } },
      { name: 'createdAt', keyPath: 'createdAt' },
      { name: 'lastUsed', keyPath: 'lastUsed' },
      { name: 'userId_name', keyPath: ['userId', 'name'] },
    ],
  },
  transaction_labels: {
    keyPath: 'id',
    indexes: [
      { name: 'userId', keyPath: 'userId' },
      { name: 'txHash', keyPath: 'txHash' },
      { name: 'label', keyPath: 'label' },
      { name: 'category', keyPath: 'category' },
      { name: 'createdAt', keyPath: 'createdAt' },
      { name: 'userId_category', keyPath: ['userId', 'category'] },
      { name: 'userId_txHash', keyPath: ['userId', 'txHash'] },
    ],
  },
  user_settings: {
    keyPath: 'userId',
    indexes: [
      { name: 'updatedAt', keyPath: 'updatedAt' },
    ],
  },
  portfolio_snapshots: {
    keyPath: 'id',
    indexes: [
      { name: 'userId', keyPath: 'userId' },
      { name: 'timestamp', keyPath: 'timestamp' },
      { name: 'network', keyPath: 'network' },
      { name: 'userId_timestamp', keyPath: ['userId', 'timestamp'] },
    ],
  },
  custom_tokens: {
    keyPath: 'id',
    indexes: [
      { name: 'userId', keyPath: 'userId' },
      { name: 'address', keyPath: 'address' },
      { name: 'symbol', keyPath: 'symbol' },
      { name: 'network', keyPath: 'network' },
      { name: 'addedAt', keyPath: 'addedAt' },
      { name: 'userId_network', keyPath: ['userId', 'network'] },
    ],
  },
  auth_sessions: {
    keyPath: 'id',
    indexes: [
      { name: 'userId', keyPath: 'userId' },
      { name: 'expiresAt', keyPath: 'expiresAt' },
      { name: 'isActive', keyPath: 'isActive' },
      { name: 'createdAt', keyPath: 'createdAt' },
      { name: 'lastActivity', keyPath: 'lastActivity' },
      { name: 'ipAddress', keyPath: 'ipAddress' },
      { name: 'userId_isActive', keyPath: ['userId', 'isActive'] },
    ],
  },
};

/**
 * Type-safe object store reference
 */
export interface StoreNames {
  users: 'users';
  chat_sessions: 'chat_sessions';
  contacts: 'contacts';
  transaction_labels: 'transaction_labels';
  user_settings: 'user_settings';
  portfolio_snapshots: 'portfolio_snapshots';
  custom_tokens: 'custom_tokens';
  auth_sessions: 'auth_sessions';
}

export const STORE_NAMES = {
  USERS: 'users' as const,
  CHAT_SESSIONS: 'chat_sessions' as const,
  CONTACTS: 'contacts' as const,
  TRANSACTION_LABELS: 'transaction_labels' as const,
  USER_SETTINGS: 'user_settings' as const,
  PORTFOLIO_SNAPSHOTS: 'portfolio_snapshots' as const,
  CUSTOM_TOKENS: 'custom_tokens' as const,
  AUTH_SESSIONS: 'auth_sessions' as const,
} as const;

/**
 * Initialize or open the IndexedDB database
 * @returns Promise<IDBDatabase>
 */
export async function initializeDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error(`Failed to open IndexedDB: ${request.error}`));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const oldVersion = event.oldVersion;
      const newVersion = event.newVersion || DB_VERSION;

      console.log(
        `[IndexedDB] Upgrading database from version ${oldVersion} to ${newVersion}`
      );

      // Create or upgrade each store
      createStores(db, oldVersion);
    };
  });
}

/**
 * Create or upgrade object stores in the database
 */
function createStores(db: IDBDatabase, oldVersion: number): void {
  // Create all stores in version 1
  if (oldVersion < 1) {
    Object.entries(STORES_CONFIG).forEach(([storeName, config]) => {
      if (!db.objectStoreNames.contains(storeName)) {
        const store = db.createObjectStore(storeName, {
          keyPath: config.keyPath,
        });

        // Create indexes for this store
        config.indexes.forEach((indexConfig) => {
          store.createIndex(
            indexConfig.name,
            indexConfig.keyPath,
            indexConfig.options
          );
        });

        console.log(`[IndexedDB] Created store: ${storeName}`);
      }
    });
  }

  // Future migrations go here
  // if (oldVersion < 2) { ... }
}

/**
 * Delete the entire database (for testing/debugging)
 */
export async function deleteDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);

    request.onerror = () => {
      reject(new Error(`Failed to delete IndexedDB: ${request.error}`));
    };

    request.onsuccess = () => {
      console.log('[IndexedDB] Database deleted successfully');
      resolve();
    };
  });
}

/**
 * Get database configuration
 */
export function getDatabaseConfig(): IndexedDBConfig {
  return {
    dbName: DB_NAME,
    version: DB_VERSION,
    stores: STORES_CONFIG as any,
  };
}

/**
 * Check if IndexedDB is available in the browser
 */
export function isIndexedDBAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(
    window.indexedDB ||
    (window as any).mozIndexedDB ||
    (window as any).webkitIndexedDB
  );
}

/**
 * Get current database size
 */
export async function getDatabaseSize(): Promise<number> {
  if (!navigator.storage?.estimate) {
    return -1;
  }

  const estimate = await navigator.storage.estimate();
  return estimate.usage ?? 0;
}

/**
 * Get available storage quota
 */
export async function getStorageQuota(): Promise<number> {
  if (!navigator.storage?.estimate) {
    return -1;
  }

  const estimate = await navigator.storage.estimate();
  return estimate.quota ?? 0;
}

/**
 * Request persistent storage permission
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) {
    return false;
  }

  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

/**
 * Verify database integrity
 */
export async function verifyDatabaseIntegrity(): Promise<{
  valid: boolean;
  stores: Record<string, boolean>;
  errors: string[];
}> {
  try {
    const db = await initializeDatabase();

    const result = {
      valid: true,
      stores: {} as Record<string, boolean>,
      errors: [] as string[],
    };

    // Check each store
    Object.keys(STORES_CONFIG).forEach((storeName) => {
      const storeExists = db.objectStoreNames.contains(storeName);
      result.stores[storeName] = storeExists;

      if (!storeExists) {
        result.valid = false;
        result.errors.push(`Store '${storeName}' not found`);
      }
    });

    db.close();
    return result;
  } catch (error) {
    return {
      valid: false,
      stores: {},
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}
