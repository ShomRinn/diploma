/**
 * Zod Validation Schemas
 * Runtime validation for all IndexedDB data types
 */

import { z } from 'zod';

// ============================================================================
// EMAIL & PASSWORD VALIDATION
// ============================================================================

const emailSchema = z.string().email().max(255);

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character');

// ============================================================================
// ETHEREUM ADDRESS VALIDATION
// ============================================================================

const ethereumAddressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address');

// ============================================================================
// AUTHENTICATION SCHEMAS
// ============================================================================

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: emailSchema,
  passwordHash: z.string(), // Bcrypt hash
  walletAddress: ethereumAddressSchema.optional(),
  name: z.string().max(100).optional(),
  emailVerified: z.boolean(),
  emailVerificationToken: z.string().optional(),
  passwordResetToken: z.string().optional(),
  passwordResetExpiry: z.number().optional(),
  createdAt: z.number().positive(),
  lastLogin: z.number().optional(),
  loginCount: z.number().min(0),
  isActive: z.boolean(),
  role: z.literal('user'),
});

export type UserType = z.infer<typeof UserSchema>;

export const AuthSessionSchema = z.object({
  id: z.string(),
  userId: z.string().uuid(),
  tokenHash: z.string(),
  refreshToken: z.string(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  createdAt: z.number().positive(),
  expiresAt: z.number().positive(),
  lastActivity: z.number().positive(),
  isActive: z.boolean(),
});

export type AuthSessionType = z.infer<typeof AuthSessionSchema>;

// ============================================================================
// CHAT & MESSAGING SCHEMAS
// ============================================================================

export const ToolCallSchema = z.object({
  id: z.string(),
  name: z.string(),
  arguments: z.record(z.unknown()),
  result: z.unknown().optional(),
});

export type ToolCallType = z.infer<typeof ToolCallSchema>;

export const MessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().max(10000),
  timestamp: z.number().positive(),
  toolCalls: z.array(ToolCallSchema).optional(),
});

export type MessageType = z.infer<typeof MessageSchema>;

export const ChatSessionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  walletAddress: ethereumAddressSchema.optional(),
  title: z.string().min(1).max(200),
  messages: z.array(MessageSchema).min(1).max(1000),
  createdAt: z.number().positive(),
  updatedAt: z.number().positive(),
  tags: z.array(z.string()).max(10).optional(),
});

export type ChatSessionType = z.infer<typeof ChatSessionSchema>;

// ============================================================================
// CONTACT SCHEMAS
// ============================================================================

export const ContactSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string().min(1).max(100),
  address: ethereumAddressSchema,
  ensName: z.string().optional(),
  tags: z.array(z.string()).max(10).optional(),
  notes: z.string().max(5000).optional(),
  createdAt: z.number().positive(),
  lastUsed: z.number().optional(),
});

export type ContactType = z.infer<typeof ContactSchema>;

// ============================================================================
// TRANSACTION LABEL SCHEMAS
// ============================================================================

export const TransactionLabelSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid transaction hash'),
  label: z.string().min(1).max(200),
  notes: z.string().max(5000).optional(),
  category: z.string().optional(),
  amount: z.string().optional(),
  createdAt: z.number().positive(),
});

export type TransactionLabelType = z.infer<typeof TransactionLabelSchema>;

// ============================================================================
// SETTINGS SCHEMAS
// ============================================================================

export const ProfileSchema = z.object({
  name: z.string().max(100),
  email: emailSchema,
  avatar: z.string().optional(),
});

export type ProfileType = z.infer<typeof ProfileSchema>;

export const PreferencesSchema = z.object({
  currency: z.string().length(3), // USD, EUR, etc.
  language: z.string().length(2), // en, ru, etc.
  theme: z.enum(['light', 'dark']),
  notifications: z.boolean(),
  autoLock: z.number().min(0),
});

export type PreferencesType = z.infer<typeof PreferencesSchema>;

export const UserSettingsSchema = z.object({
  userId: z.string().uuid(),
  profile: ProfileSchema,
  preferences: PreferencesSchema,
  updatedAt: z.number().positive(),
});

export type UserSettingsType = z.infer<typeof UserSettingsSchema>;

// ============================================================================
// PORTFOLIO SCHEMAS
// ============================================================================

export const AssetSchema = z.object({
  symbol: z.string().min(1).max(20),
  balance: z.string(),
  value: z.number().min(0),
  price: z.number().min(0),
});

export type AssetType = z.infer<typeof AssetSchema>;

export const PortfolioSnapshotSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  timestamp: z.number().positive(),
  totalValue: z.number().min(0),
  assets: z.array(AssetSchema).min(1),
  network: z.string(),
});

export type PortfolioSnapshotType = z.infer<typeof PortfolioSnapshotSchema>;

// ============================================================================
// CUSTOM TOKEN SCHEMAS
// ============================================================================

export const CustomTokenSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  address: ethereumAddressSchema,
  symbol: z.string().min(1).max(20),
  name: z.string().min(1).max(100),
  decimals: z.number().int().min(0),
  network: z.string(),
  addedAt: z.number().positive(),
});

export type CustomTokenType = z.infer<typeof CustomTokenSchema>;

// ============================================================================
// REQUEST/RESPONSE SCHEMAS
// ============================================================================

export const RegistrationRequestSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  name: z.string().max(100).optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export type RegistrationRequest = z.infer<typeof RegistrationRequestSchema>;

export const LoginRequestSchema = z.object({
  email: emailSchema,
  password: z.string(),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const UpdatePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export type UpdatePassword = z.infer<typeof UpdatePasswordSchema>;

// ============================================================================
// EXPORT/IMPORT SCHEMAS
// ============================================================================

export const ExportDataSchema = z.object({
  version: z.number(),
  exportedAt: z.number().positive(),
  userId: z.string().uuid(),
  data: z.object({
    chat_sessions: z.array(ChatSessionSchema),
    contacts: z.array(ContactSchema),
    transaction_labels: z.array(TransactionLabelSchema),
    user_settings: UserSettingsSchema,
    portfolio_snapshots: z.array(PortfolioSnapshotSchema),
    custom_tokens: z.array(CustomTokenSchema),
  }),
});

export type ExportDataType = z.infer<typeof ExportDataSchema>;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Validate and parse data with error handling
 */
export function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(
        (e) => `${e.path.join('.')}: ${e.message}`
      );
      return { success: false, errors };
    }
    return { success: false, errors: ['Validation error'] };
  }
}

/**
 * Safely parse user input
 */
export function safeParseUser(data: unknown) {
  return UserSchema.safeParse(data);
}

/**
 * Safely parse chat session
 */
export function safeParseChatSession(data: unknown) {
  return ChatSessionSchema.safeParse(data);
}

/**
 * Safely parse contact
 */
export function safeParseContact(data: unknown) {
  return ContactSchema.safeParse(data);
}

/**
 * Safely parse transaction label
 */
export function safeParseTransactionLabel(data: unknown) {
  return TransactionLabelSchema.safeParse(data);
}

/**
 * Safely parse user settings
 */
export function safeParseUserSettings(data: unknown) {
  return UserSettingsSchema.safeParse(data);
}

/**
 * Safely parse portfolio snapshot
 */
export function safeParsePortfolioSnapshot(data: unknown) {
  return PortfolioSnapshotSchema.safeParse(data);
}

/**
 * Safely parse custom token
 */
export function safeParseCustomToken(data: unknown) {
  return CustomTokenSchema.safeParse(data);
}

/**
 * Safely parse export data
 */
export function safeParseExportData(data: unknown) {
  return ExportDataSchema.safeParse(data);
}
