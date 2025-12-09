/**
 * Storage Module Exports
 * Main entry point for IndexedDB storage functionality
 */

// ============================================================================
// DATABASE EXPORTS
// ============================================================================

export {
  initializeDatabase,
  deleteDatabase,
  getDatabaseConfig,
  isIndexedDBAvailable,
  getDatabaseSize,
  getStorageQuota,
  requestPersistentStorage,
  verifyDatabaseIntegrity,
  STORE_NAMES,
  type StoreNames,
} from './indexeddb/db';

export { getDatabase, closeDatabase } from './indexeddb/service';

// ============================================================================
// SERVICE EXPORTS
// ============================================================================

export * as userService from './indexeddb/service';
export * as databaseService from './indexeddb/service';

// ============================================================================
// AUTHENTICATION EXPORTS
// ============================================================================

export {
  registerUser,
  loginUser,
  verifySession,
  logoutUser,
  logoutAllSessions,
  requestEmailVerification,
  verifyEmail,
  requestPasswordReset,
  resetPassword,
  updatePassword,
  linkWallet,
  unlinkWallet,
  cleanupExpiredData,
} from './auth';

// ============================================================================
// EXPORT/IMPORT EXPORTS
// ============================================================================

export {
  exportUserData,
  exportUserDataAsFile,
  downloadUserData,
  importUserData,
  importUserDataFromFile,
  clearUserData,
  deleteUserAccount,
  getUserDataStats,
  generatePrivacySummary,
} from './export-import';

// ============================================================================
// ENCRYPTION EXPORTS
// ============================================================================

export {
  deriveKey,
  encryptData,
  decryptData,
  hashData,
  hashPassword,
  verifyPassword,
  generateToken,
  generateUUID,
  encryptFields,
  decryptFields,
  secureCompare,
  secureWipe,
} from './encryption';

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type {
  User,
  AuthSession,
  Message,
  ToolCall,
  ChatSession,
  Contact,
  TransactionLabel,
  Profile,
  Preferences,
  UserSettings,
  Asset,
  PortfolioSnapshot,
  CustomToken,
  EncryptedData,
  ExportData,
  QueryOptions,
  RangeQuery,
} from './types';

// ============================================================================
// SCHEMA EXPORTS
// ============================================================================

export {
  UserSchema,
  AuthSessionSchema,
  MessageSchema,
  ChatSessionSchema,
  ContactSchema,
  TransactionLabelSchema,
  ProfileSchema,
  PreferencesSchema,
  UserSettingsSchema,
  PortfolioSnapshotSchema,
  CustomTokenSchema,
  RegistrationRequestSchema,
  LoginRequestSchema,
  UpdatePasswordSchema,
  ExportDataSchema,
  validateData,
  safeParseUser,
  safeParseChatSession,
  safeParseContact,
  safeParseTransactionLabel,
  safeParseUserSettings,
  safeParsePortfolioSnapshot,
  safeParseCustomToken,
  safeParseExportData,
} from './schemas';

// ============================================================================
// UTILS
// ============================================================================

/**
 * Initialize storage module (should be called on app startup)
 */
export async function initializeStorage(): Promise<void> {
  const { initializeDatabase, isIndexedDBAvailable } = await import(
    './indexeddb/db'
  );

  if (!isIndexedDBAvailable()) {
    throw new Error('IndexedDB is not available in this browser');
  }

  try {
    await initializeDatabase();
    console.log('[Storage] IndexedDB initialized successfully');
  } catch (error) {
    console.error('[Storage] Failed to initialize IndexedDB:', error);
    throw error;
  }
}

/**
 * Check storage health
 */
export async function checkStorageHealth(): Promise<{
  available: boolean;
  initialized: boolean;
  size: number;
  quota: number;
  usagePercent: number;
}> {
  const {
    isIndexedDBAvailable,
    verifyDatabaseIntegrity,
    getDatabaseSize,
    getStorageQuota,
  } = await import('./indexeddb/db');

  if (!isIndexedDBAvailable()) {
    return {
      available: false,
      initialized: false,
      size: 0,
      quota: 0,
      usagePercent: 0,
    };
  }

  const [integrity, size, quota] = await Promise.all([
    verifyDatabaseIntegrity(),
    getDatabaseSize(),
    getStorageQuota(),
  ]);

  return {
    available: true,
    initialized: integrity.valid,
    size,
    quota,
    usagePercent: quota > 0 ? (size / quota) * 100 : 0,
  };
}
