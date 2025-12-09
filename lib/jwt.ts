/**
 * JWT Verification Utility
 * Handles JWT token validation, expiration checks, and signature verification
 */

import { createHmac } from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

/**
 * Verify and decode JWT token
 * Checks:
 * 1. Token format (3 parts separated by dots)
 * 2. Token signature validity
 * 3. Token expiration
 */
export function verifyJWT(token: string): JWTPayload | null {
  try {
    // Split token into parts
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.warn('[JWT] Invalid token format: expected 3 parts, got', parts.length);
      return null;
    }

    const [headerEncoded, payloadEncoded, signatureEncoded] = parts;

    // Decode payload
    const payloadJson = Buffer.from(payloadEncoded, 'base64').toString('utf-8');
    const payload: JWTPayload = JSON.parse(payloadJson);

    // Verify signature
    const expectedSignature = createHmac('sha256', JWT_SECRET)
      .update(`${headerEncoded}.${payloadEncoded}`)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    if (signatureEncoded !== expectedSignature) {
      console.warn('[JWT] Invalid signature');
      return null;
    }

    // Check expiration
    if (payload.exp < Date.now()) {
      console.warn('[JWT] Token expired at', new Date(payload.exp).toISOString());
      return null;
    }

    return payload;
  } catch (error) {
    console.error('[JWT] Verification failed:', error);
    return null;
  }
}

/**
 * Create a properly signed JWT token
 */
export function createSignedJWT(payload: Omit<JWTPayload, 'iat' | 'exp'>, expiresIn: number = 15 * 60 * 1000): string {
  const now = Date.now();
  const exp = now + expiresIn;

  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const fullPayload: JWTPayload = {
    ...payload,
    iat: now,
    exp,
  };

  // Encode header and payload
  const headerEncoded = Buffer.from(JSON.stringify(header)).toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  const payloadEncoded = Buffer.from(JSON.stringify(fullPayload)).toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  // Create signature
  const signature = createHmac('sha256', JWT_SECRET)
    .update(`${headerEncoded}.${payloadEncoded}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return `${headerEncoded}.${payloadEncoded}.${signature}`;
}

/**
 * Extract token from Authorization header or cookies
 */
export function extractToken(request: Request): string | null {
  // Try Authorization header first
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Try cookies
  const cookieHeader = request.headers.get('Cookie');
  if (cookieHeader) {
    const tokenMatch = cookieHeader.match(/token=([^;]+)/);
    if (tokenMatch) {
      return tokenMatch[1];
    }
  }

  return null;
}
