/**
 * Encryption and Decryption Utilities
 * Implements AES-256-GCM encryption for sensitive data
 */

import type { EncryptedData } from './types';

/**
 * Encryption configuration
 */
const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits for GCM
const TAG_LENGTH = 128; // 128 bits (16 bytes)
const SALT_LENGTH = 32; // 32 bytes

/**
 * Derive encryption key from password/seed using PBKDF2
 */
export async function deriveKey(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  const baseKey = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: ALGORITHM, length: KEY_LENGTH },
    true, // Extractable for password hashing
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt data with AES-256-GCM
 */
export async function encryptData(
  data: unknown,
  password: string
): Promise<EncryptedData> {
  try {
    // Serialize data to JSON
    const json = JSON.stringify(data);
    const encoder = new TextEncoder();
    const plaintext = encoder.encode(json);

    // Generate random salt and IV
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

    // Derive encryption key
    const key = await deriveKey(password, salt);

    // Encrypt data
    const encrypted = await crypto.subtle.encrypt(
      { name: ALGORITHM, iv },
      key,
      plaintext
    );

    // Extract ciphertext and authentication tag
    const encryptedArray = new Uint8Array(encrypted);
    const ciphertext = encryptedArray.slice(0, encryptedArray.length - TAG_LENGTH / 8);
    const tag = encryptedArray.slice(encryptedArray.length - TAG_LENGTH / 8);

    // Return hex-encoded result
    return {
      ciphertext: bytesToHex(ciphertext),
      iv: bytesToHex(iv),
      salt: bytesToHex(salt),
      tag: bytesToHex(tag),
    };
  } catch (error) {
    throw new Error(
      `Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Decrypt data with AES-256-GCM
 */
export async function decryptData(
  encrypted: EncryptedData,
  password: string
): Promise<unknown> {
  try {
    // Convert hex strings back to bytes
    const salt = hexToBytes(encrypted.salt);
    const iv = hexToBytes(encrypted.iv);
    const ciphertext = hexToBytes(encrypted.ciphertext);
    const tag = hexToBytes(encrypted.tag);

    // Derive decryption key
    const key = await deriveKey(password, salt);

    // Combine ciphertext and tag
    const combined = new Uint8Array(ciphertext.length + tag.length);
    combined.set(ciphertext, 0);
    combined.set(tag, ciphertext.length);

    // Decrypt data
    const decrypted = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv },
      key,
      combined
    );

    // Parse JSON
    const decoder = new TextDecoder();
    const json = decoder.decode(decrypted);

    return JSON.parse(json);
  } catch (error) {
    throw new Error(
      `Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Hash data using SHA-256
 */
export async function hashData(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const buffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return bytesToHex(new Uint8Array(hashBuffer));
}

/**
 * Hash password with PBKDF2
 * Note: This is PBKDF2-based, not bcrypt, but provides good security
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const saltHex = bytesToHex(salt);

  // Use a simpler approach: derive the key and hash it
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  // Create PBKDF2 hash directly
  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    await crypto.subtle.importKey('raw', passwordBuffer, 'PBKDF2', false, ['deriveBits']),
    256 // 256 bits
  );

  const hashHex = bytesToHex(new Uint8Array(hashBuffer));

  // Return format: salt$hash
  return `${saltHex}$${hashHex}`;
}

/**
 * Verify password against hash
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  try {
    const parts = hash.split('$');
    if (parts.length !== 2) {
      return false;
    }

    const [saltHex, hashHex] = parts;

    if (!saltHex || !hashHex) {
      return false;
    }

    const salt = hexToBytes(saltHex);
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);

    // Derive the same key
    const hashBuffer = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      await crypto.subtle.importKey('raw', passwordBuffer, 'PBKDF2', false, ['deriveBits']),
      256 // 256 bits
    );

    const derivedHex = bytesToHex(new Uint8Array(hashBuffer));

    return derivedHex === hashHex;
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
}

/**
 * Generate a random token
 */
export function generateToken(length: number = 32): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return bytesToHex(bytes);
}

/**
 * Generate UUID v4
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Convert bytes to hex string
 */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert hex string to bytes
 */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

/**
 * Encrypt individual fields in an object
 */
export async function encryptFields(
  obj: Record<string, any>,
  fields: string[],
  password: string
): Promise<Record<string, any>> {
  const result = { ...obj };

  for (const field of fields) {
    if (field in result && result[field] !== null && result[field] !== undefined) {
      result[`${field}_encrypted`] = await encryptData(result[field], password);
      delete result[field];
    }
  }

  return result;
}

/**
 * Decrypt individual fields in an object
 */
export async function decryptFields(
  obj: Record<string, any>,
  fields: string[],
  password: string
): Promise<Record<string, any>> {
  const result = { ...obj };

  for (const field of fields) {
    const encryptedField = `${field}_encrypted`;
    if (encryptedField in result && result[encryptedField]) {
      try {
        result[field] = await decryptData(result[encryptedField], password);
        delete result[encryptedField];
      } catch (error) {
        console.error(`Failed to decrypt field: ${field}`, error);
        // Keep encrypted field if decryption fails
      }
    }
  }

  return result;
}

/**
 * Secure string comparison (timing-safe)
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Secure memory clearing (best-effort)
 */
export function secureWipe(data: Uint8Array): void {
  crypto.getRandomValues(data);
}
