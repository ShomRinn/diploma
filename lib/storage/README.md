# IndexedDB Storage Module

A comprehensive client-side NoSQL database implementation for the wallet-agent application, providing secure data persistence, authentication, and encryption.

## Overview

This module implements IndexedDB (a modern browser-based database) with:

- **8 Object Stores**: Users, Chat Sessions, Contacts, Transaction Labels, Settings, Portfolio Snapshots, Custom Tokens, Auth Sessions
- **Complete Authentication**: Email/password registration, login, session management
- **Data Security**: Bcrypt password hashing, AES-256-GCM encryption, SHA-256 token hashing
- **Data Integrity**: Zod schema validation, referential integrity with userId foreign keys
- **Export/Import**: Full data backup and restoration
- **React Hooks**: Easy integration with React components
- **Type Safety**: Full TypeScript support

## Project Structure

```
lib/storage/
├── types.ts                 # TypeScript interfaces for all data models
├── schemas.ts               # Zod validation schemas
├── auth.ts                  # Authentication & session management
├── encryption.ts            # Encryption, hashing, and cryptographic utilities
├── export-import.ts         # Data export/import functionality
├── hooks.ts                 # React hooks for database operations
├── index.ts                 # Main exports and initialization
├── indexeddb/
│   ├── db.ts                # Database initialization and schema setup
│   └── service.ts           # CRUD operations and query helpers
└── README.md                # This file
```

## Quick Start

### 1. Initialize the Storage Module

```typescript
import { initializeStorage, checkStorageHealth } from '@/lib/storage';

// Call this on app startup
useEffect(() => {
  initializeStorage()
    .then(() => console.log('Storage ready'))
    .catch(err => console.error('Storage initialization failed', err));
}, []);

// Check storage health
const health = await checkStorageHealth();
console.log(`Storage usage: ${health.usagePercent}% of ${health.quota} bytes`);
```

### 2. Register a User

```typescript
import { registerUser } from '@/lib/storage';

const result = await registerUser({
  email: 'user@example.com',
  password: 'SecurePass123!',
  confirmPassword: 'SecurePass123!',
  name: 'John Doe'
});

console.log('User registered:', result.userId);
```

### 3. Login User

```typescript
import { loginUser } from '@/lib/storage';

const session = await loginUser({
  email: 'user@example.com',
  password: 'SecurePass123!'
});

// Store token for API calls
localStorage.setItem('token', session.token);
localStorage.setItem('userId', session.userId);
```

### 4. Use React Hooks

```typescript
'use client';
import { useAuth, useChatSessions } from '@/lib/storage/hooks';

export function ChatComponent() {
  const { user, login, logout } = useAuth();
  const { sessions, createSession, deleteSession } = useChatSessions(user?.id);

  return (
    <div>
      {user ? (
        <>
          <p>Logged in as: {user.email}</p>
          <button onClick={logout}>Logout</button>
          <ul>
            {sessions.map(s => (
              <li key={s.id}>
                {s.title}
                <button onClick={() => deleteSession(s.id)}>Delete</button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <button onClick={() => login('email@example.com', 'password')}>Login</button>
      )}
    </div>
  );
}
```

## Database Schema

### Users Store

Primary authentication and user information.

```typescript
interface User {
  id: string;                        // UUID (Primary Key)
  email: string;                     // Unique, indexed
  passwordHash: string;              // Bcrypt hash
  walletAddress?: string;            // Optional Ethereum address
  name?: string;
  emailVerified: boolean;            // Indexed
  emailVerificationToken?: string;
  passwordResetToken?: string;
  passwordResetExpiry?: number;
  createdAt: number;                 // Indexed
  lastLogin?: number;                // Indexed
  loginCount: number;
  isActive: boolean;                 // Indexed
  role: 'user';                      // Only 'user' role
}
```

### Chat Sessions Store

AI chat conversation history.

```typescript
interface ChatSession {
  id: string;                        // UUID (Primary Key)
  userId: string;                    // Foreign Key → users.id (Indexed)
  walletAddress?: string;            // Optional (Indexed)
  title: string;                     // Chat title (Indexed)
  messages: Message[];               // Nested messages
  createdAt: number;                 // Indexed
  updatedAt: number;                 // Indexed
  tags?: string[];                   // Multi-entry index
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  toolCalls?: ToolCall[];
}
```

### Contacts Store

User's address book.

```typescript
interface Contact {
  id: string;                        // UUID (Primary Key)
  userId: string;                    // Foreign Key → users.id (Indexed)
  name: string;                      // Contact name (Indexed)
  address: string;                   // Ethereum address (Indexed)
  ensName?: string;                  // ENS name (Indexed)
  tags?: string[];                   // Multi-entry index
  notes?: string;
  createdAt: number;                 // Indexed
  lastUsed?: number;                 // Indexed
}
```

### Transaction Labels Store

User's transaction notes and categorization.

```typescript
interface TransactionLabel {
  id: string;                        // UUID (Primary Key)
  userId: string;                    // Foreign Key → users.id (Indexed)
  txHash: string;                    // Transaction hash (Indexed)
  label: string;                     // User's label (Indexed)
  notes?: string;
  category?: string;                 // Category (Indexed)
  amount?: string;
  createdAt: number;                 // Indexed
}
```

### User Settings Store

User preferences and profile.

```typescript
interface UserSettings {
  userId: string;                    // Primary Key (Foreign Key → users.id)
  profile: {
    name: string;
    email: string;
    avatar?: string;
  };
  preferences: {
    currency: string;                // "USD", "EUR", etc.
    language: string;                // "en", "ru", etc.
    theme: 'light' | 'dark';
    notifications: boolean;
    autoLock: number;                // minutes
  };
  updatedAt: number;                 // Indexed
}
```

### Portfolio Snapshots Store

Historical portfolio tracking.

```typescript
interface PortfolioSnapshot {
  id: string;                        // UUID (Primary Key)
  userId: string;                    // Foreign Key → users.id (Indexed)
  timestamp: number;                 // Snapshot time (Indexed, TTL: 90 days)
  totalValue: number;
  assets: Asset[];                   // Nested assets
  network: string;                   // Network name (Indexed)
}
```

### Custom Tokens Store

User-added custom token tracking.

```typescript
interface CustomToken {
  id: string;                        // UUID (Primary Key)
  userId: string;                    // Foreign Key → users.id (Indexed)
  address: string;                   // Token contract address (Indexed)
  symbol: string;                    // Token symbol (Indexed)
  name: string;
  decimals: number;
  network: string;                   // Network ID (Indexed)
  addedAt: number;                   // Indexed
}
```

### Auth Sessions Store

Active authentication sessions.

```typescript
interface AuthSession {
  id: string;                        // Session ID (Primary Key)
  userId: string;                    // Foreign Key → users.id (Indexed)
  tokenHash: string;                 // Hashed JWT token
  refreshToken: string;              // Hashed refresh token
  ipAddress?: string;                // Client IP (Indexed)
  userAgent?: string;
  createdAt: number;                 // Indexed
  expiresAt: number;                 // Indexed (TTL cleanup)
  lastActivity: number;              // Indexed
  isActive: boolean;                 // Indexed
}
```

## Authentication Flow

### Registration

```
1. User submits email, password, name
2. Validate input (email format, password strength)
3. Check if email already exists
4. Hash password using PBKDF2 (100,000 iterations)
5. Create user record in IndexedDB
6. Generate email verification token
7. Return userId
8. (Send verification email)
```

### Login

```
1. User submits email, password
2. Find user by email
3. Verify password using bcrypt comparison
4. Create JWT token (15 min expiry)
5. Create refresh token (7 day expiry)
6. Create session record in auth_sessions
7. Update lastLogin and loginCount
8. Return token and userId
```

### Session Verification

```
1. Receive JWT token from client
2. Find active session by tokenHash
3. Verify session not expired
4. Verify user is active
5. Update lastActivity
6. Return user data
```

## Security Features

### Password Security

- **Hashing**: PBKDF2 with 100,000 iterations
- **Salt**: 32 bytes of random salt per password
- **Key Derivation**: SHA-256 hash function
- **Never**: Passwords stored in plain text

### Token Security

- **JWT Tokens**: 15 minute expiry
- **Refresh Tokens**: 7 day expiry, hashed before storage
- **Hashing**: SHA-256 for token hashing
- **Storage**: Hashes only, never plain tokens in database

### Data Encryption

```typescript
// Encrypt sensitive data
const encrypted = await encryptData(sensitiveData, userPassword);

// Decrypt when needed
const decrypted = await decryptData(encrypted, userPassword);

// Encrypt specific fields
const result = await encryptFields(obj, ['notes', 'personalInfo'], password);

// Decrypt specific fields
const result = await decryptFields(encrypted, ['notes', 'personalInfo'], password);
```

### Access Control

- All queries filtered by `userId` (foreign key)
- Session tokens required for authentication
- Email verification for new accounts
- Password reset tokens with expiry
- Account can be disabled

## API Reference

### Authentication

```typescript
// Register new user
registerUser({
  email: string;
  password: string;
  confirmPassword: string;
  name?: string;
})

// Login user
loginUser({
  email: string;
  password: string;
}, ipAddress?, userAgent?)

// Verify session
verifySession(userId: string, tokenHash: string): Promise<User>

// Logout current session
logoutUser(sessionId: string)

// Logout all sessions
logoutAllSessions(userId: string)

// Update password
updatePassword(userId: string, currentPassword: string, newPassword: string)

// Link wallet to account
linkWallet(userId: string, walletAddress: string)

// Unlink wallet
unlinkWallet(userId: string)
```

### Chat Sessions

```typescript
// Create chat session
createChatSession(session: ChatSession): Promise<string>

// Get session by ID
getChatSessionById(sessionId: string): Promise<ChatSession | undefined>

// Get all sessions for user
getChatSessionsByUserId(userId: string): Promise<ChatSession[]>

// Update session
updateChatSession(session: ChatSession)

// Delete session
deleteChatSession(sessionId: string)
```

### Contacts

```typescript
// Create contact
createContact(contact: Contact): Promise<string>

// Get contacts for user
getContactsByUserId(userId: string): Promise<Contact[]>

// Get contact by address
getContactByAddress(address: string): Promise<Contact | undefined>

// Update contact
updateContact(contact: Contact)

// Delete contact
deleteContact(contactId: string)
```

### Export/Import

```typescript
// Export all user data
exportUserData(userId: string): Promise<ExportData>

// Download as file
downloadUserData(userId: string, filename?: string)

// Import from file
importUserDataFromFile(file: File)

// Get data statistics
getUserDataStats(userId: string)

// Generate GDPR privacy summary
generatePrivacySummary(userId: string): Promise<string>
```

### Encryption

```typescript
// Hash password
hashPassword(password: string): Promise<string>

// Verify password
verifyPassword(password: string, hash: string): Promise<boolean>

// Hash data (SHA-256)
hashData(data: string): Promise<string>

// Encrypt data (AES-256-GCM)
encryptData(data: unknown, password: string): Promise<EncryptedData>

// Decrypt data
decryptData(encrypted: EncryptedData, password: string): Promise<unknown>

// Generate random token
generateToken(length?: number): string

// Generate UUID v4
generateUUID(): string
```

## React Hooks

### useAuth()

```typescript
const {
  user,           // Current user or null
  token,          // JWT token or null
  isLoading,      // Loading state
  error,          // Error message or null
  register,       // (email, password, name) => Promise
  login,          // (email, password) => Promise
  logout,         // () => Promise
  updatePassword, // (current, new) => Promise
} = useAuth();
```

### useChatSessions(userId?)

```typescript
const {
  sessions,       // ChatSession[]
  isLoading,      // boolean
  error,          // string | null
  loadSessions,   // (userId) => Promise
  createSession,  // (session) => Promise<string>
  updateSession,  // (session) => Promise
  deleteSession,  // (sessionId) => Promise
} = useChatSessions(userId);
```

### useContacts(userId?)

```typescript
const {
  contacts,       // Contact[]
  isLoading,      // boolean
  error,          // string | null
  loadContacts,   // (userId) => Promise
  createContact,  // (contact) => Promise<string>
  updateContact,  // (contact) => Promise
  deleteContact,  // (contactId) => Promise
} = useContacts(userId);
```

### useDataExportImport(userId?)

```typescript
const {
  isExporting,    // boolean
  isImporting,    // boolean
  error,          // string | null
  exportData,     // () => Promise<ExportData>
  downloadData,   // (filename?) => Promise
  importData,     // (file) => Promise
  getStats,       // () => Promise<Stats>
} = useDataExportImport(userId);
```

### useUserSettings(userId?)

```typescript
const {
  settings,       // UserSettings | null
  isLoading,      // boolean
  error,          // string | null
  loadSettings,   // (userId) => Promise
  updateSettings, // (settings) => Promise
} = useUserSettings(userId);
```

### usePortfolioSnapshots(userId?)

```typescript
const {
  snapshots,      // PortfolioSnapshot[]
  isLoading,      // boolean
  error,          // string | null
  loadSnapshots,  // (userId) => Promise
  createSnapshot, // (snapshot) => Promise<string>
} = usePortfolioSnapshots(userId);
```

## Data Validation

All data is validated using Zod schemas:

```typescript
import {
  UserSchema,
  ChatSessionSchema,
  ContactSchema,
  safeParseUser,
  safeParseChatSession,
} from '@/lib/storage';

// Safe parsing
const result = safeParseUser(userData);
if (result.success) {
  console.log('Valid user:', result.data);
} else {
  console.error('Validation errors:', result.error);
}
```

## Error Handling

All operations return Promise and may throw:

```typescript
try {
  const session = await loginUser({ email, password });
} catch (error) {
  if (error instanceof Error) {
    console.error('Login failed:', error.message);
  }
}
```

Common errors:
- `'Invalid email or password'` - Authentication failed
- `'Email already registered'` - Duplicate email
- `'User not found'` - User doesn't exist
- `'Invalid session'` - Token expired or invalid
- `'Validation failed'` - Schema validation error

## Browser Support

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support (12+)
- Mobile: Full support

IndexedDB requires:
- 50+ MB storage available
- Browser not in private mode (usually)

Check availability:

```typescript
import { isIndexedDBAvailable } from '@/lib/storage';

if (!isIndexedDBAvailable()) {
  console.warn('IndexedDB not available, falling back to localStorage');
}
```

## Storage Limits

- **Per Origin**: 50-100+ MB (browser dependent, can request persistent)
- **Quota**: Check with `getStorageQuota()`
- **Usage**: Check with `getDatabaseSize()`

Request persistent storage:

```typescript
import { requestPersistentStorage } from '@/lib/storage';

const isPersistent = await requestPersistentStorage();
console.log('Storage persistent:', isPersistent);
```

## Data Cleanup

### Automatic Cleanup

- Expired auth sessions: Deleted when `deleteExpiredSessions()` called
- Old portfolio snapshots: Deleted when > 90 days old
- Email tokens: Expire in 24 hours
- Password reset tokens: Expire in 1 hour

### Manual Cleanup

```typescript
import { cleanupExpiredData, clearAllData } from '@/lib/storage';

// Remove expired sessions and old snapshots
const { deletedSessions, deletedSnapshots } = await cleanupExpiredData();

// Clear all data (for development/testing)
await clearAllData();
```

## Migration

Future schema versions handled via version management:

```typescript
// Database version increments automatically
// Migrations defined in indexeddb/db.ts
// onupgradeneeded handles schema changes
```

## Testing

All functionality tested with real IndexedDB in browser:

```typescript
// Unit test example
test('create user', async () => {
  const result = await registerUser({
    email: 'test@example.com',
    password: 'Test123!@#',
    confirmPassword: 'Test123!@#'
  });
  expect(result.userId).toBeDefined();
});

// Cleanup after tests
await clearAllData();
```

## Performance

- **Indexes**: Optimized for common queries
- **Compound Indexes**: `[userId, timestamp]`, `[userId, isActive]`
- **TTL**: Auto-delete with background jobs
- **Caching**: In-memory cache for active sessions

## Troubleshooting

### IndexedDB not available

```typescript
if (!isIndexedDBAvailable()) {
  console.error('IndexedDB not available');
  // Fallback to localStorage or server
}
```

### Storage quota exceeded

```typescript
const quota = await getStorageQuota();
const used = await getDatabaseSize();
console.log(`${used}/${quota} bytes used`);

// Request persistent storage
await requestPersistentStorage();
```

### Verification failed

```typescript
const health = await verifyDatabaseIntegrity();
if (!health.valid) {
  console.error('Database errors:', health.errors);
}
```

## License

MIT

## Related Files

- Database plan: `/docs/INDEXEDDB_PLAN.md`
- Type definitions: `/lib/storage/types.ts`
- Current chat storage: `/lib/chatHistory.ts` (will be migrated to this module)
- Analytics cache: `/lib/analytics/utils/cache.ts`
