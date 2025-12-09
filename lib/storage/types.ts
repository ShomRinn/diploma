/**
 * IndexedDB Storage Types and Interfaces
 * Defines all data structures for the wallet-agent-db database
 */

// ============================================================================
// USER & AUTHENTICATION
// ============================================================================

export interface User {
  id: string; // UUID
  email: string;
  passwordHash: string; // Bcrypt hash
  walletAddress?: string; // Optional linked wallet (Ethereum address)
  name?: string;
  emailVerified: boolean;
  emailVerificationToken?: string;
  passwordResetToken?: string;
  passwordResetExpiry?: number;
  createdAt: number;
  lastLogin?: number;
  loginCount: number;
  isActive: boolean;
  role: 'user'; // Only 'user' role for non-custodial wallet
}

export interface AuthSession {
  id: string; // Session/JWT token ID
  userId: string; // Foreign key to users.id
  tokenHash: string; // Hashed JWT token (SHA-256)
  refreshToken: string; // Hashed refresh token
  ipAddress?: string;
  userAgent?: string;
  createdAt: number;
  expiresAt: number;
  lastActivity: number;
  isActive: boolean;
}

// ============================================================================
// CHAT & MESSAGING
// ============================================================================

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result?: unknown;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  toolCalls?: ToolCall[];
}

export interface ChatSession {
  id: string; // UUID
  userId: string; // Foreign key to users.id
  walletAddress?: string; // Optional linked wallet
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  tags?: string[];
}

// ============================================================================
// CONTACTS & ADDRESS BOOK
// ============================================================================

export interface Contact {
  id: string; // UUID
  userId: string; // Foreign key to users.id
  name: string;
  address: string; // Ethereum address
  ensName?: string;
  tags?: string[];
  notes?: string;
  createdAt: number;
  lastUsed?: number;
}

// ============================================================================
// TRANSACTIONS & LABELS
// ============================================================================

export interface TransactionLabel {
  id: string; // UUID
  userId: string; // Foreign key to users.id
  txHash: string; // Transaction hash
  label: string;
  notes?: string;
  category?: string; // e.g., "expense", "income"
  amount?: string;
  createdAt: number;
}

// ============================================================================
// SETTINGS & PREFERENCES
// ============================================================================

export interface Profile {
  name: string;
  email: string;
  avatar?: string;
}

export interface Preferences {
  currency: string; // "USD", "EUR"
  language: string; // "en", "ru"
  theme: 'light' | 'dark';
  notifications: boolean;
  autoLock: number; // minutes
}

export interface UserSettings {
  userId: string; // Foreign key to users.id
  profile: Profile;
  preferences: Preferences;
  updatedAt: number;
}

// ============================================================================
// PORTFOLIO & ASSETS
// ============================================================================

export interface Asset {
  symbol: string;
  balance: string;
  value: number;
  price: number;
}

export interface PortfolioSnapshot {
  id: string; // UUID
  userId: string; // Foreign key to users.id
  timestamp: number;
  totalValue: number;
  assets: Asset[];
  network: string; // e.g., "ethereum"
}

// ============================================================================
// CUSTOM TOKENS
// ============================================================================

export interface CustomToken {
  id: string; // UUID
  userId: string; // Foreign key to users.id
  address: string; // Token contract address
  symbol: string;
  name: string;
  decimals: number;
  network: string; // Network ID
  addedAt: number;
}

// ============================================================================
// DATABASE CONFIGURATION
// ============================================================================

export interface IndexedDBConfig {
  dbName: string;
  version: number;
  stores: {
    users: StoreConfig;
    chat_sessions: StoreConfig;
    contacts: StoreConfig;
    transaction_labels: StoreConfig;
    user_settings: StoreConfig;
    portfolio_snapshots: StoreConfig;
    custom_tokens: StoreConfig;
    auth_sessions: StoreConfig;
  };
}

export interface StoreConfig {
  keyPath: string;
  autoIncrement?: boolean;
  indexes: IndexConfig[];
}

export interface IndexConfig {
  name: string;
  keyPath: string | string[];
  options?: {
    unique?: boolean;
    multiEntry?: boolean;
  };
}

// ============================================================================
// EXPORT/IMPORT
// ============================================================================

export interface ExportData {
  version: number;
  exportedAt: number;
  userId: string;
  data: {
    chat_sessions: ChatSession[];
    contacts: Contact[];
    transaction_labels: TransactionLabel[];
    user_settings: UserSettings;
    portfolio_snapshots: PortfolioSnapshot[];
    custom_tokens: CustomToken[];
  };
}

// ============================================================================
// ENCRYPTION
// ============================================================================

export interface EncryptedData {
  ciphertext: string;
  iv: string;
  salt: string;
  tag: string;
}

// ============================================================================
// QUERY OPTIONS
// ============================================================================

export interface QueryOptions {
  filter?: Record<string, unknown>;
  sort?: {
    field: string;
    order: 'asc' | 'desc';
  };
  limit?: number;
  offset?: number;
}

export interface RangeQuery {
  field: string;
  min?: number | string;
  max?: number | string;
  includeMin?: boolean;
  includeMax?: boolean;
}
