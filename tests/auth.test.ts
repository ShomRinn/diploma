/**
 * Authentication Tests
 * Tests for JWT tokens, session management, and authentication flows
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createSignedJWT, verifyJWT } from '../lib/jwt';
import { hashData, generateToken } from '../lib/storage/encryption';

describe('JWT Token Creation and Verification', () => {
  const originalSecret = process.env.JWT_SECRET;

  beforeEach(() => {
    // Reset JWT_SECRET for consistent testing
    process.env.JWT_SECRET = 'test-secret-key';
  });

  it('should create valid JWT tokens', () => {
    const payload = {
      userId: 'user-123',
      email: 'test@example.com',
      role: 'user',
    };

    const token = createSignedJWT(payload, 15 * 60 * 1000);

    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    
    // JWT should have 3 parts separated by dots
    const parts = token.split('.');
    expect(parts.length).toBe(3);
  });

  it('should verify valid JWT tokens', () => {
    const payload = {
      userId: 'user-123',
      email: 'test@example.com',
      role: 'user',
    };

    const token = createSignedJWT(payload, 15 * 60 * 1000);
    const verified = verifyJWT(token);

    expect(verified).not.toBeNull();
    expect(verified?.userId).toBe(payload.userId);
    expect(verified?.email).toBe(payload.email);
    expect(verified?.role).toBe(payload.role);
    expect(verified?.iat).toBeDefined();
    expect(verified?.exp).toBeDefined();
  });

  it('should reject tokens with invalid signature', () => {
    const payload = {
      userId: 'user-123',
      email: 'test@example.com',
      role: 'user',
    };

    const token = createSignedJWT(payload, 15 * 60 * 1000);
    
    // Tamper with the signature by modifying the token
    const parts = token.split('.');
    const tamperedToken = `${parts[0]}.${parts[1]}.tampered-signature-${Date.now()}`;
    const verified = verifyJWT(tamperedToken);

    expect(verified).toBeNull();
  });

  it('should reject expired tokens', () => {
    const payload = {
      userId: 'user-123',
      email: 'test@example.com',
      role: 'user',
    };

    // Create token with negative expiry (already expired)
    const token = createSignedJWT(payload, -1000);
    
    // Wait a bit to ensure it's expired
    const verified = verifyJWT(token);

    expect(verified).toBeNull();
  });

  it('should reject malformed tokens', () => {
    expect(verifyJWT('not-a-jwt')).toBeNull();
    expect(verifyJWT('header.payload')).toBeNull(); // Missing signature
    expect(verifyJWT('header.payload.signature.extra')).toBeNull(); // Too many parts
  });

  it('should include expiration time', () => {
    const payload = {
      userId: 'user-123',
      email: 'test@example.com',
      role: 'user',
    };

    const expiresIn = 15 * 60 * 1000; // 15 minutes
    const token = createSignedJWT(payload, expiresIn);
    const verified = verifyJWT(token);

    expect(verified).not.toBeNull();
    if (verified) {
      const now = Date.now();
      const expectedExp = now + expiresIn;
      
      // Allow 1 second tolerance
      expect(Math.abs(verified.exp - expectedExp)).toBeLessThan(1000);
    }
  });

  it('should include issued at time', () => {
    const payload = {
      userId: 'user-123',
      email: 'test@example.com',
      role: 'user',
    };

    const before = Date.now();
    const token = createSignedJWT(payload, 15 * 60 * 1000);
    const after = Date.now();
    const verified = verifyJWT(token);

    expect(verified).not.toBeNull();
    if (verified) {
      expect(verified.iat).toBeGreaterThanOrEqual(before);
      expect(verified.iat).toBeLessThanOrEqual(after);
    }
  });
});

describe('Token Hashing', () => {
  it('should hash tokens consistently', async () => {
    const token = 'test-token-123';

    const hash1 = await hashData(token);
    const hash2 = await hashData(token);

    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64); // SHA-256 = 64 hex chars
  });

  it('should produce different hashes for different tokens', async () => {
    const token1 = 'token-1';
    const token2 = 'token-2';

    const hash1 = await hashData(token1);
    const hash2 = await hashData(token2);

    expect(hash1).not.toBe(hash2);
  });

  it('should be one-way (cannot reverse)', async () => {
    const token = 'original-token';
    const hash = await hashData(token);

    // Hash should not contain original token
    expect(hash).not.toContain(token);
    
    // Different tokens should produce different hashes
    const hash2 = await hashData('different-token');
    expect(hash).not.toBe(hash2);
  });
});

describe('Session Token Management', () => {
  it('should generate unique refresh tokens', () => {
    const token1 = generateToken(64);
    const token2 = generateToken(64);

    expect(token1).not.toBe(token2);
    expect(token1.length).toBe(128); // 64 bytes = 128 hex chars
    expect(token2.length).toBe(128);
  });

  it('should hash tokens before storage', async () => {
    const token = generateToken(64);
    const tokenHash = await hashData(token);

    // Hash should be different from original
    expect(tokenHash).not.toBe(token);
    
    // Hash should be consistent
    const hashAgain = await hashData(token);
    expect(tokenHash).toBe(hashAgain);
  });

  it('should verify tokens by comparing hashes', async () => {
    const originalToken = generateToken(64);
    const storedHash = await hashData(originalToken);

    // When verifying, hash the provided token and compare
    const providedToken = originalToken;
    const providedHash = await hashData(providedToken);

    expect(providedHash).toBe(storedHash);

    // Wrong token should produce different hash
    const wrongToken = generateToken(64);
    const wrongHash = await hashData(wrongToken);
    expect(wrongHash).not.toBe(storedHash);
  });
});

describe('Authentication Flow Integration', () => {
  it('should create and verify complete authentication flow', async () => {
    // 1. Create JWT token
    const payload = {
      userId: 'user-123',
      email: 'test@example.com',
      role: 'user',
    };
    const jwtToken = createSignedJWT(payload, 15 * 60 * 1000);

    // 2. Hash JWT token for storage
    const tokenHash = await hashData(jwtToken);

    // 3. Create refresh token
    const refreshToken = generateToken(64);
    const refreshTokenHash = await hashData(refreshToken);

    // 4. Verify JWT is valid
    const verified = verifyJWT(jwtToken);
    expect(verified).not.toBeNull();

    // 5. Verify token hash matches
    const rehashed = await hashData(jwtToken);
    expect(rehashed).toBe(tokenHash);

    // 6. Verify refresh token hash matches
    const refreshRehashed = await hashData(refreshToken);
    expect(refreshRehashed).toBe(refreshTokenHash);
  });

  it('should handle token expiration correctly', () => {
    const payload = {
      userId: 'user-123',
      email: 'test@example.com',
      role: 'user',
    };

    // Create token with very short expiry
    const shortExpiry = 100; // 100ms
    const token = createSignedJWT(payload, shortExpiry);
    
    // Should be valid immediately
    expect(verifyJWT(token)).not.toBeNull();

    // Wait for expiration
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(verifyJWT(token)).toBeNull();
        resolve();
      }, 200);
    });
  });
});

