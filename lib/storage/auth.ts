/**
 * Authentication Service
 * Handles user registration, login, and session management
 */

import { generateUUID, hashPassword, verifyPassword, hashData, generateToken } from './encryption';
import { createSignedJWT } from '../jwt';
import * as db from './indexeddb/service';
import type { User, AuthSession, RegistrationRequest, LoginRequest } from './types';
import {
  RegistrationRequestSchema,
  LoginRequestSchema,
  UserSchema,
  AuthSessionSchema,
} from './schemas';

// JWT token expiry times
const JWT_EXPIRY = 15 * 60 * 1000; // 15 minutes
const REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days
const EMAIL_TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
const PASSWORD_RESET_EXPIRY = 1 * 60 * 60 * 1000; // 1 hour

/**
 * Create JWT token with proper signing
 */
function createJWTToken(userId: string, email: string): {
  token: string;
  expiresAt: number;
} {
  const expiresAt = Date.now() + JWT_EXPIRY;
  const token = createSignedJWT({ userId, email, role: 'user' }, JWT_EXPIRY);

  return { token, expiresAt };
}

/**
 * Register a new user
 */
export async function registerUser(input: unknown): Promise<{
  userId: string;
  email: string;
}> {
  // Validate input
  const validationResult = RegistrationRequestSchema.safeParse(input);
  if (!validationResult.success) {
    throw new Error(
      `Validation failed: ${validationResult.error.errors.map((e) => e.message).join(', ')}`
    );
  }

  const { email, password, name } = validationResult.data;

  // Check if email already exists
  const existingUser = await db.getUserByEmail(email);
  if (existingUser) {
    throw new Error('Email already registered');
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Create user
  const userId = generateUUID();
  const user: User = {
    id: userId,
    email,
    passwordHash,
    name,
    emailVerified: false,
    emailVerificationToken: generateToken(),
    createdAt: Date.now(),
    loginCount: 0,
    isActive: true,
    role: 'user',
  };

  // Validate user against schema
  const userValidation = UserSchema.safeParse(user);
  if (!userValidation.success) {
    throw new Error(
      `User validation failed: ${userValidation.error.errors.map((e) => e.message).join(', ')}`
    );
  }

  // Save to database
  await db.createUser(user);

  return { userId, email };
}

/**
 * Login user with email and password
 */
export async function loginUser(
  input: unknown,
  ipAddress?: string,
  userAgent?: string
): Promise<{
  userId: string;
  email: string;
  token: string;
  refreshToken: string;
  expiresAt: number;
}> {
  // Validate input
  const validationResult = LoginRequestSchema.safeParse(input);
  if (!validationResult.success) {
    throw new Error(
      `Validation failed: ${validationResult.error.errors.map((e) => e.message).join(', ')}`
    );
  }

  const { email, password } = validationResult.data;

  // Find user by email
  const user = await db.getUserByEmail(email);
  if (!user) {
    throw new Error('Invalid email or password');
  }

  // Check if user is active
  if (!user.isActive) {
    throw new Error('Account is disabled');
  }

  // Verify password
  const isPasswordValid = await verifyPassword(password, user.passwordHash);
  if (!isPasswordValid) {
    throw new Error('Invalid email or password');
  }

  // Create JWT token
  const { token, expiresAt } = createJWTToken(user.id, user.email);

  // Create refresh token
  const refreshToken = generateToken(64);
  const refreshTokenHash = await hashData(refreshToken);

  // Create auth session
  const sessionId = generateUUID();
  const session: AuthSession = {
    id: sessionId,
    userId: user.id,
    tokenHash: await hashData(token),
    refreshToken: refreshTokenHash,
    ipAddress,
    userAgent,
    createdAt: Date.now(),
    expiresAt,
    lastActivity: Date.now(),
    isActive: true,
  };

  // Validate session
  const sessionValidation = AuthSessionSchema.safeParse(session);
  if (!sessionValidation.success) {
    throw new Error(
      `Session validation failed: ${sessionValidation.error.errors.map((e) => e.message).join(', ')}`
    );
  }

  // Save session to database
  await db.createAuthSession(session);

  // Update last login
  user.lastLogin = Date.now();
  user.loginCount = (user.loginCount || 0) + 1;
  await db.updateUser(user);

  return {
    userId: user.id,
    email: user.email,
    token,
    refreshToken,
    expiresAt,
  };
}

/**
 * Verify session and get user
 */
export async function verifySession(userId: string, tokenHash: string): Promise<User> {
  const user = await db.getUserById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  if (!user.isActive) {
    throw new Error('Account is disabled');
  }

  // Get active sessions
  const sessions = await db.getActiveSessionsByUserId(userId);
  const validSession = sessions.find(
    (s) => s.tokenHash === tokenHash && s.expiresAt > Date.now()
  );

  if (!validSession) {
    throw new Error('Invalid or expired session');
  }

  // Update last activity
  validSession.lastActivity = Date.now();
  await db.updateAuthSession(validSession);

  return user;
}

/**
 * Logout user
 */
export async function logoutUser(sessionId: string): Promise<void> {
  const session = await db.getAuthSessionById(sessionId);
  if (session) {
    session.isActive = false;
    await db.updateAuthSession(session);
  }
}

/**
 * Logout all sessions for a user
 */
export async function logoutAllSessions(userId: string): Promise<void> {
  const sessions = await db.getActiveSessionsByUserId(userId);
  for (const session of sessions) {
    session.isActive = false;
    await db.updateAuthSession(session);
  }
}

/**
 * Request email verification
 */
export async function requestEmailVerification(userId: string): Promise<{
  token: string;
}> {
  const user = await db.getUserById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  if (user.emailVerified) {
    throw new Error('Email already verified');
  }

  const token = generateToken();
  user.emailVerificationToken = token;
  await db.updateUser(user);

  return { token };
}

/**
 * Verify email with token
 */
export async function verifyEmail(userId: string, token: string): Promise<void> {
  const user = await db.getUserById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  if (user.emailVerificationToken !== token) {
    throw new Error('Invalid verification token');
  }

  user.emailVerified = true;
  user.emailVerificationToken = undefined;
  await db.updateUser(user);
}

/**
 * Request password reset
 */
export async function requestPasswordReset(email: string): Promise<{
  userId: string;
  token: string;
}> {
  const user = await db.getUserByEmail(email);
  if (!user) {
    // Don't reveal if email exists for security
    return {
      userId: '',
      token: generateToken(),
    };
  }

  const token = generateToken();
  user.passwordResetToken = token;
  user.passwordResetExpiry = Date.now() + PASSWORD_RESET_EXPIRY;
  await db.updateUser(user);

  return { userId: user.id, token };
}

/**
 * Reset password with token
 */
export async function resetPassword(
  userId: string,
  token: string,
  newPassword: string
): Promise<void> {
  const user = await db.getUserById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  if (user.passwordResetToken !== token) {
    throw new Error('Invalid reset token');
  }

  if (!user.passwordResetExpiry || user.passwordResetExpiry < Date.now()) {
    throw new Error('Reset token expired');
  }

  // Validate password
  if (newPassword.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  const passwordHash = await hashPassword(newPassword);
  user.passwordHash = passwordHash;
  user.passwordResetToken = undefined;
  user.passwordResetExpiry = undefined;

  // Logout all sessions
  await logoutAllSessions(userId);

  await db.updateUser(user);
}

/**
 * Update password
 */
export async function updatePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const user = await db.getUserById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Verify current password
  const isValid = await verifyPassword(currentPassword, user.passwordHash);
  if (!isValid) {
    throw new Error('Current password is incorrect');
  }

  // Validate new password
  if (newPassword.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  const passwordHash = await hashPassword(newPassword);
  user.passwordHash = passwordHash;

  // Logout all sessions
  await logoutAllSessions(userId);

  await db.updateUser(user);
}

/**
 * Link wallet to user account
 */
export async function linkWallet(
  userId: string,
  walletAddress: string
): Promise<void> {
  const user = await db.getUserById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Validate wallet address
  if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    throw new Error('Invalid Ethereum address');
  }

  // Check if wallet already linked to another user
  const existingUser = await db.getUserByWallet(walletAddress);
  if (existingUser && existingUser.id !== userId) {
    throw new Error('Wallet already linked to another account');
  }

  user.walletAddress = walletAddress;
  await db.updateUser(user);
}

/**
 * Unlink wallet from user account
 */
export async function unlinkWallet(userId: string): Promise<void> {
  const user = await db.getUserById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  user.walletAddress = undefined;
  await db.updateUser(user);
}

/**
 * Cleanup expired sessions and tokens
 */
export async function cleanupExpiredData(): Promise<{
  deletedSessions: number;
  deletedSnapshots: number;
}> {
  const deletedSessions = await db.deleteExpiredSessions();
  const deletedSnapshots = await db.deleteOldPortfolioSnapshots(
    90 * 24 * 60 * 60 * 1000 // 90 days
  );

  return { deletedSessions, deletedSnapshots };
}
