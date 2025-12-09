/**
 * IndexedDB Database Service
 * Provides CRUD operations and query helpers for all stores
 */

import { initializeDatabase, STORE_NAMES } from './db';
import type {
  User,
  ChatSession,
  Contact,
  TransactionLabel,
  UserSettings,
  PortfolioSnapshot,
  CustomToken,
  AuthSession,
  RangeQuery,
} from '../types';

// Database singleton
let dbInstance: IDBDatabase | null = null;
let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Get or initialize the database instance
 */
export async function getDatabase(): Promise<IDBDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  // If already initializing, wait for that promise
  if (dbPromise) {
    dbInstance = await dbPromise;
    return dbInstance;
  }

  // Start initialization
  dbPromise = initializeDatabase();
  try {
    dbInstance = await dbPromise;
    return dbInstance;
  } catch (error) {
    dbPromise = null;
    throw error;
  }
}

/**
 * Close the database connection
 */
export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
  dbPromise = null;
}

// ============================================================================
// TRANSACTION HELPERS
// ============================================================================

type TransactionMode = 'readonly' | 'readwrite';

async function executeInTransaction<T>(
  stores: string[],
  mode: TransactionMode,
  callback: (transaction: IDBTransaction) => Promise<T>
): Promise<T> {
  const db = await getDatabase();
  const transaction = db.transaction(stores, mode);
  return callback(transaction);
}

async function queryStore<T>(
  storeName: string,
  mode: TransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    try {
      // Ensure database is initialized
      const db = await getDatabase();

      const transaction = db.transaction(storeName, mode);
      const store = transaction.objectStore(storeName);
      const request = callback(store);

      request.onerror = () => {
        reject(new Error(`Query failed: ${request.error}`));
      };

      request.onsuccess = () => {
        resolve(request.result);
      };
    } catch (error) {
      reject(error);
    }
  });
}

// ============================================================================
// USERS STORE
// ============================================================================

export async function createUser(user: User): Promise<string> {
  return queryStore(STORE_NAMES.USERS, 'readwrite', (store) =>
    store.add(user)
  );
}

export async function getUserById(userId: string): Promise<User | undefined> {
  return queryStore(STORE_NAMES.USERS, 'readonly', (store) =>
    store.get(userId)
  );
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  return queryStore(STORE_NAMES.USERS, 'readonly', (store) =>
    store.index('email').get(email)
  );
}

export async function getUserByWallet(
  walletAddress: string
): Promise<User | undefined> {
  return queryStore(STORE_NAMES.USERS, 'readonly', (store) =>
    store.index('walletAddress').get(walletAddress)
  );
}

export async function updateUser(user: User): Promise<void> {
  return queryStore(STORE_NAMES.USERS, 'readwrite', (store) =>
    store.put(user)
  ).then();
}

export async function deleteUser(userId: string): Promise<void> {
  return queryStore(STORE_NAMES.USERS, 'readwrite', (store) =>
    store.delete(userId)
  ).then();
}

export async function getAllUsers(): Promise<User[]> {
  return queryStore(STORE_NAMES.USERS, 'readonly', (store) =>
    store.getAll()
  );
}

// ============================================================================
// AUTH_SESSIONS STORE
// ============================================================================

export async function createAuthSession(session: AuthSession): Promise<string> {
  return queryStore(STORE_NAMES.AUTH_SESSIONS, 'readwrite', (store) =>
    store.add(session)
  );
}

export async function getAuthSessionById(
  sessionId: string
): Promise<AuthSession | undefined> {
  return queryStore(STORE_NAMES.AUTH_SESSIONS, 'readonly', (store) =>
    store.get(sessionId)
  );
}

export async function getActiveSessionsByUserId(
  userId: string
): Promise<AuthSession[]> {
  return queryStore(STORE_NAMES.AUTH_SESSIONS, 'readonly', (store) => {
    const index = store.index('userId_isActive');
    return index.getAll(IDBKeyRange.bound([userId, true], [userId, true]));
  });
}

export async function updateAuthSession(session: AuthSession): Promise<void> {
  return queryStore(STORE_NAMES.AUTH_SESSIONS, 'readwrite', (store) =>
    store.put(session)
  ).then();
}

export async function deleteExpiredSessions(): Promise<number> {
  const db = await getDatabase();
  const transaction = db.transaction(STORE_NAMES.AUTH_SESSIONS, 'readwrite');
  const store = transaction.objectStore(STORE_NAMES.AUTH_SESSIONS);
  const index = store.index('expiresAt');

  const now = Date.now();
  const range = IDBKeyRange.upperBound(now);
  const expiredSessions = await new Promise<AuthSession[]>((resolve, reject) => {
    const request = index.getAll(range);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  let deletedCount = 0;
  for (const session of expiredSessions) {
    store.delete(session.id);
    deletedCount++;
  }

  return deletedCount;
}

// ============================================================================
// CHAT_SESSIONS STORE
// ============================================================================

export async function createChatSession(session: ChatSession): Promise<string> {
  return queryStore(STORE_NAMES.CHAT_SESSIONS, 'readwrite', (store) =>
    store.add(session)
  );
}

export async function getChatSessionById(
  sessionId: string
): Promise<ChatSession | undefined> {
  return queryStore(STORE_NAMES.CHAT_SESSIONS, 'readonly', (store) =>
    store.get(sessionId)
  );
}

export async function getChatSessionsByUserId(userId: string): Promise<ChatSession[]> {
  return queryStore(STORE_NAMES.CHAT_SESSIONS, 'readonly', (store) =>
    store.index('userId').getAll(userId)
  );
}

export async function updateChatSession(session: ChatSession): Promise<void> {
  return queryStore(STORE_NAMES.CHAT_SESSIONS, 'readwrite', (store) =>
    store.put(session)
  ).then();
}

export async function deleteChatSession(sessionId: string): Promise<void> {
  return queryStore(STORE_NAMES.CHAT_SESSIONS, 'readwrite', (store) =>
    store.delete(sessionId)
  ).then();
}

// ============================================================================
// CONTACTS STORE
// ============================================================================

export async function createContact(contact: Contact): Promise<string> {
  return queryStore(STORE_NAMES.CONTACTS, 'readwrite', (store) =>
    store.add(contact)
  );
}

export async function getContactById(contactId: string): Promise<Contact | undefined> {
  return queryStore(STORE_NAMES.CONTACTS, 'readonly', (store) =>
    store.get(contactId)
  );
}

export async function getContactsByUserId(userId: string): Promise<Contact[]> {
  return queryStore(STORE_NAMES.CONTACTS, 'readonly', (store) =>
    store.index('userId').getAll(userId)
  );
}

export async function getContactByAddress(address: string): Promise<Contact | undefined> {
  return queryStore(STORE_NAMES.CONTACTS, 'readonly', (store) =>
    store.index('address').get(address)
  );
}

export async function updateContact(contact: Contact): Promise<void> {
  return queryStore(STORE_NAMES.CONTACTS, 'readwrite', (store) =>
    store.put(contact)
  ).then();
}

export async function deleteContact(contactId: string): Promise<void> {
  return queryStore(STORE_NAMES.CONTACTS, 'readwrite', (store) =>
    store.delete(contactId)
  ).then();
}

// ============================================================================
// TRANSACTION_LABELS STORE
// ============================================================================

export async function createTransactionLabel(
  label: TransactionLabel
): Promise<string> {
  return queryStore(STORE_NAMES.TRANSACTION_LABELS, 'readwrite', (store) =>
    store.add(label)
  );
}

export async function getTransactionLabelById(
  labelId: string
): Promise<TransactionLabel | undefined> {
  return queryStore(STORE_NAMES.TRANSACTION_LABELS, 'readonly', (store) =>
    store.get(labelId)
  );
}

export async function getTransactionLabelsByUserId(userId: string): Promise<TransactionLabel[]> {
  return queryStore(STORE_NAMES.TRANSACTION_LABELS, 'readonly', (store) =>
    store.index('userId').getAll(userId)
  );
}

export async function getTransactionLabelByHash(
  txHash: string
): Promise<TransactionLabel | undefined> {
  return queryStore(STORE_NAMES.TRANSACTION_LABELS, 'readonly', (store) =>
    store.index('txHash').get(txHash)
  );
}

export async function updateTransactionLabel(label: TransactionLabel): Promise<void> {
  return queryStore(STORE_NAMES.TRANSACTION_LABELS, 'readwrite', (store) =>
    store.put(label)
  ).then();
}

export async function deleteTransactionLabel(labelId: string): Promise<void> {
  return queryStore(STORE_NAMES.TRANSACTION_LABELS, 'readwrite', (store) =>
    store.delete(labelId)
  ).then();
}

// ============================================================================
// USER_SETTINGS STORE
// ============================================================================

export async function createOrUpdateUserSettings(
  settings: UserSettings
): Promise<void> {
  return queryStore(STORE_NAMES.USER_SETTINGS, 'readwrite', (store) =>
    store.put(settings)
  ).then();
}

export async function getUserSettings(userId: string): Promise<UserSettings | undefined> {
  return queryStore(STORE_NAMES.USER_SETTINGS, 'readonly', (store) =>
    store.get(userId)
  );
}

// ============================================================================
// PORTFOLIO_SNAPSHOTS STORE
// ============================================================================

export async function createPortfolioSnapshot(
  snapshot: PortfolioSnapshot
): Promise<string> {
  return queryStore(STORE_NAMES.PORTFOLIO_SNAPSHOTS, 'readwrite', (store) =>
    store.add(snapshot)
  );
}

export async function getPortfolioSnapshotById(
  snapshotId: string
): Promise<PortfolioSnapshot | undefined> {
  return queryStore(STORE_NAMES.PORTFOLIO_SNAPSHOTS, 'readonly', (store) =>
    store.get(snapshotId)
  );
}

export async function getPortfolioSnapshotsByUserId(
  userId: string
): Promise<PortfolioSnapshot[]> {
  return queryStore(STORE_NAMES.PORTFOLIO_SNAPSHOTS, 'readonly', (store) =>
    store.index('userId').getAll(userId)
  );
}

export async function getPortfolioSnapshotsByDateRange(
  userId: string,
  startTime: number,
  endTime: number
): Promise<PortfolioSnapshot[]> {
  return queryStore(STORE_NAMES.PORTFOLIO_SNAPSHOTS, 'readonly', (store) => {
    const index = store.index('userId_timestamp');
    const range = IDBKeyRange.bound(
      [userId, startTime],
      [userId, endTime],
      false,
      false
    );
    return index.getAll(range);
  });
}

export async function deleteOldPortfolioSnapshots(maxAge: number): Promise<number> {
  const db = await getDatabase();
  const transaction = db.transaction(STORE_NAMES.PORTFOLIO_SNAPSHOTS, 'readwrite');
  const store = transaction.objectStore(STORE_NAMES.PORTFOLIO_SNAPSHOTS);
  const index = store.index('timestamp');

  const cutoffTime = Date.now() - maxAge;
  const oldSnapshots = await new Promise<PortfolioSnapshot[]>((resolve, reject) => {
    const request = index.getAll(IDBKeyRange.upperBound(cutoffTime));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  let deletedCount = 0;
  for (const snapshot of oldSnapshots) {
    store.delete(snapshot.id);
    deletedCount++;
  }

  return deletedCount;
}

// ============================================================================
// CUSTOM_TOKENS STORE
// ============================================================================

export async function createCustomToken(token: CustomToken): Promise<string> {
  return queryStore(STORE_NAMES.CUSTOM_TOKENS, 'readwrite', (store) =>
    store.add(token)
  );
}

export async function getCustomTokenById(tokenId: string): Promise<CustomToken | undefined> {
  return queryStore(STORE_NAMES.CUSTOM_TOKENS, 'readonly', (store) =>
    store.get(tokenId)
  );
}

export async function getCustomTokensByUserId(userId: string): Promise<CustomToken[]> {
  return queryStore(STORE_NAMES.CUSTOM_TOKENS, 'readonly', (store) =>
    store.index('userId').getAll(userId)
  );
}

export async function getCustomTokensByNetwork(
  userId: string,
  network: string
): Promise<CustomToken[]> {
  return queryStore(STORE_NAMES.CUSTOM_TOKENS, 'readonly', (store) => {
    const index = store.index('userId_network');
    return index.getAll(IDBKeyRange.bound([userId, network], [userId, network]));
  });
}

export async function updateCustomToken(token: CustomToken): Promise<void> {
  return queryStore(STORE_NAMES.CUSTOM_TOKENS, 'readwrite', (store) =>
    store.put(token)
  ).then();
}

export async function deleteCustomToken(tokenId: string): Promise<void> {
  return queryStore(STORE_NAMES.CUSTOM_TOKENS, 'readwrite', (store) =>
    store.delete(tokenId)
  ).then();
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

export async function deleteAllUserData(userId: string): Promise<void> {
  const db = await getDatabase();
  const stores = [
    STORE_NAMES.CHAT_SESSIONS,
    STORE_NAMES.CONTACTS,
    STORE_NAMES.TRANSACTION_LABELS,
    STORE_NAMES.USER_SETTINGS,
    STORE_NAMES.PORTFOLIO_SNAPSHOTS,
    STORE_NAMES.CUSTOM_TOKENS,
    STORE_NAMES.AUTH_SESSIONS,
  ];

  const transaction = db.transaction(stores, 'readwrite');

  // Delete from chat_sessions
  let store = transaction.objectStore(STORE_NAMES.CHAT_SESSIONS);
  const chatSessions = await new Promise<ChatSession[]>((resolve, reject) => {
    const req = store.index('userId').getAll(userId);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  chatSessions.forEach((s) => store.delete(s.id));

  // Delete from contacts
  store = transaction.objectStore(STORE_NAMES.CONTACTS);
  const contacts = await new Promise<Contact[]>((resolve, reject) => {
    const req = store.index('userId').getAll(userId);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  contacts.forEach((c) => store.delete(c.id));

  // Delete from transaction_labels
  store = transaction.objectStore(STORE_NAMES.TRANSACTION_LABELS);
  const labels = await new Promise<TransactionLabel[]>((resolve, reject) => {
    const req = store.index('userId').getAll(userId);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  labels.forEach((l) => store.delete(l.id));

  // Delete from portfolio_snapshots
  store = transaction.objectStore(STORE_NAMES.PORTFOLIO_SNAPSHOTS);
  const snapshots = await new Promise<PortfolioSnapshot[]>((resolve, reject) => {
    const req = store.index('userId').getAll(userId);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  snapshots.forEach((s) => store.delete(s.id));

  // Delete from custom_tokens
  store = transaction.objectStore(STORE_NAMES.CUSTOM_TOKENS);
  const tokens = await new Promise<CustomToken[]>((resolve, reject) => {
    const req = store.index('userId').getAll(userId);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  tokens.forEach((t) => store.delete(t.id));

  // Delete from auth_sessions
  store = transaction.objectStore(STORE_NAMES.AUTH_SESSIONS);
  const sessions = await new Promise<AuthSession[]>((resolve, reject) => {
    const req = store.index('userId').getAll(userId);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  sessions.forEach((s) => store.delete(s.id));

  // Delete from user_settings
  store = transaction.objectStore(STORE_NAMES.USER_SETTINGS);
  store.delete(userId);
}

// ============================================================================
// CLEAR ALL DATA (for development/testing)
// ============================================================================

export async function clearAllData(): Promise<void> {
  const db = await getDatabase();
  const storeNames = [
    STORE_NAMES.USERS,
    STORE_NAMES.CHAT_SESSIONS,
    STORE_NAMES.CONTACTS,
    STORE_NAMES.TRANSACTION_LABELS,
    STORE_NAMES.USER_SETTINGS,
    STORE_NAMES.PORTFOLIO_SNAPSHOTS,
    STORE_NAMES.CUSTOM_TOKENS,
    STORE_NAMES.AUTH_SESSIONS,
  ];

  const transaction = db.transaction(storeNames, 'readwrite');

  storeNames.forEach((storeName) => {
    transaction.objectStore(storeName).clear();
  });

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}
