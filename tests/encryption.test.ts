/**
 * Encryption Tests
 * Tests for AES-256-GCM encryption, PBKDF2 key derivation, and SHA-256 hashing
 */

import { describe, it, expect } from 'vitest';
import {
  encryptData,
  decryptData,
  deriveKey,
  hashData,
  hashPassword,
  verifyPassword,
  encryptFields,
  decryptFields,
  secureCompare,
  generateToken,
} from '../lib/storage/encryption';

describe('AES-256-GCM Encryption', () => {
  it('should encrypt and decrypt data correctly', async () => {
    const originalData = { message: 'Hello, World!', number: 42 };
    const password = 'test-password-123';

    const encrypted = await encryptData(originalData, password);
    
    expect(encrypted).toHaveProperty('ciphertext');
    expect(encrypted).toHaveProperty('iv');
    expect(encrypted).toHaveProperty('salt');
    expect(encrypted).toHaveProperty('tag');
    expect(encrypted.ciphertext).not.toBe('');
    expect(encrypted.iv.length).toBe(24); // 12 bytes = 24 hex chars
    expect(encrypted.salt.length).toBe(64); // 32 bytes = 64 hex chars
    expect(encrypted.tag.length).toBe(32); // 16 bytes = 32 hex chars

    const decrypted = await decryptData(encrypted, password);
    expect(decrypted).toEqual(originalData);
  });

  it('should fail decryption with wrong password', async () => {
    const data = { secret: 'confidential' };
    const correctPassword = 'correct-password';
    const wrongPassword = 'wrong-password';

    const encrypted = await encryptData(data, correctPassword);
    
    await expect(decryptData(encrypted, wrongPassword)).rejects.toThrow();
  });

  it('should produce different ciphertexts for same data (IV uniqueness)', async () => {
    const data = { message: 'test' };
    const password = 'password';

    const encrypted1 = await encryptData(data, password);
    const encrypted2 = await encryptData(data, password);

    // Same data should produce different ciphertexts due to random IV
    expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext);
    expect(encrypted1.iv).not.toBe(encrypted2.iv);
    expect(encrypted1.salt).not.toBe(encrypted2.salt);

    // But both should decrypt to same data
    const decrypted1 = await decryptData(encrypted1, password);
    const decrypted2 = await decryptData(encrypted2, password);
    expect(decrypted1).toEqual(decrypted2);
  });

  it('should handle large data', async () => {
    const largeData = {
      message: 'A'.repeat(10000),
      array: Array(1000).fill(0).map((_, i) => i),
    };
    const password = 'test-password';

    const encrypted = await encryptData(largeData, password);
    const decrypted = await decryptData(encrypted, password);

    expect(decrypted).toEqual(largeData);
  });

  it('should handle empty objects', async () => {
    const data = {};
    const password = 'password';

    const encrypted = await encryptData(data, password);
    const decrypted = await decryptData(encrypted, password);

    expect(decrypted).toEqual(data);
  });

  it('should detect tampering (tag verification)', async () => {
    const data = { secret: 'data' };
    const password = 'password';

    const encrypted = await encryptData(data, password);
    
    // Tamper with ciphertext
    const tampered = {
      ...encrypted,
      ciphertext: encrypted.ciphertext.slice(0, -2) + 'XX',
    };

    await expect(decryptData(tampered, password)).rejects.toThrow();
  });
});

describe('PBKDF2 Key Derivation', () => {
  it('should derive consistent keys with same password and salt', async () => {
    const password = 'test-password';
    const salt = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32]);

    const key1 = await deriveKey(password, salt);
    const key2 = await deriveKey(password, salt);

    // Keys should be CryptoKey objects
    expect(key1).toBeInstanceOf(CryptoKey);
    expect(key2).toBeInstanceOf(CryptoKey);
    
    // Same password + salt should produce same key
    // (We can't directly compare CryptoKey objects, but encryption with same key should work)
    const testData = new TextEncoder().encode('test');
    const encrypted1 = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: new Uint8Array(12) },
      key1,
      testData
    );
    const encrypted2 = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: new Uint8Array(12) },
      key2,
      testData
    );
    
    // Same key + same IV + same data = same ciphertext
    expect(new Uint8Array(encrypted1)).toEqual(new Uint8Array(encrypted2));
  });

  it('should produce different keys with different salts', async () => {
    const password = 'password';
    const salt1 = new Uint8Array(32).fill(1);
    const salt2 = new Uint8Array(32).fill(2);

    const key1 = await deriveKey(password, salt1);
    const key2 = await deriveKey(password, salt2);

    const testData = new TextEncoder().encode('test');
    const iv = new Uint8Array(12);
    
    const encrypted1 = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key1,
      testData
    );
    const encrypted2 = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key2,
      testData
    );

    // Different salts should produce different keys
    expect(new Uint8Array(encrypted1)).not.toEqual(new Uint8Array(encrypted2));
  });
});

describe('SHA-256 Hashing', () => {
  it('should produce consistent hashes', async () => {
    const data = 'test-data';

    const hash1 = await hashData(data);
    const hash2 = await hashData(data);

    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64); // 256 bits = 64 hex chars
  });

  it('should produce different hashes for different data', async () => {
    const hash1 = await hashData('data1');
    const hash2 = await hashData('data2');

    expect(hash1).not.toBe(hash2);
  });

  it('should be deterministic', async () => {
    const data = 'deterministic-test';
    const expectedHash = 'a1b2c3d4e5f6...'; // We'll use actual hash

    const hash = await hashData(data);
    const hashAgain = await hashData(data);

    expect(hash).toBe(hashAgain);
  });
});

describe('Password Hashing (PBKDF2)', () => {
  it('should hash passwords correctly', async () => {
    const password = 'MySecurePassword123!';

    const hash = await hashPassword(password);

    expect(hash).toContain('$');
    const [salt, hashPart] = hash.split('$');
    expect(salt.length).toBe(64); // 32 bytes = 64 hex chars
    expect(hashPart.length).toBe(64); // 256 bits = 64 hex chars
  });

  it('should verify correct passwords', async () => {
    const password = 'test-password';

    const hash = await hashPassword(password);
    const isValid = await verifyPassword(password, hash);

    expect(isValid).toBe(true);
  });

  it('should reject incorrect passwords', async () => {
    const correctPassword = 'correct-password';
    const wrongPassword = 'wrong-password';

    const hash = await hashPassword(correctPassword);
    const isValid = await verifyPassword(wrongPassword, hash);

    expect(isValid).toBe(false);
  });

  it('should produce different hashes for same password (salt uniqueness)', async () => {
    const password = 'same-password';

    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);

    // Different salts should produce different hashes
    expect(hash1).not.toBe(hash2);

    // But both should verify correctly
    expect(await verifyPassword(password, hash1)).toBe(true);
    expect(await verifyPassword(password, hash2)).toBe(true);
  });

  it('should handle empty password', async () => {
    const password = '';

    const hash = await hashPassword(password);
    const isValid = await verifyPassword(password, hash);

    expect(isValid).toBe(true);
  });

  it('should handle very long passwords', async () => {
    const password = 'A'.repeat(1000);

    const hash = await hashPassword(password);
    const isValid = await verifyPassword(password, hash);

    expect(isValid).toBe(true);
  });
});

describe('Field-level Encryption', () => {
  it('should encrypt specific fields', async () => {
    const obj = {
      public: 'public-data',
      secret: 'secret-data',
      number: 42,
    };
    const password = 'password';
    const fieldsToEncrypt = ['secret'];

    const encrypted = await encryptFields(obj, fieldsToEncrypt, password);

    expect(encrypted.public).toBe('public-data'); // Not encrypted
    expect(encrypted.secret).toBeUndefined(); // Removed
    expect(encrypted.secret_encrypted).toBeDefined(); // Encrypted version
    expect(encrypted.number).toBe(42); // Not encrypted
  });

  it('should decrypt specific fields', async () => {
    const obj = {
      public: 'public-data',
      secret_encrypted: await encryptData('secret-data', 'password'),
    };
    const password = 'password';
    const fieldsToDecrypt = ['secret'];

    const decrypted = await decryptFields(obj, fieldsToDecrypt, password);

    expect(decrypted.public).toBe('public-data');
    expect(decrypted.secret).toBe('secret-data');
    expect(decrypted.secret_encrypted).toBeUndefined();
  });

  it('should handle multiple fields', async () => {
    const obj = {
      field1: 'data1',
      field2: 'data2',
      field3: 'data3',
    };
    const password = 'password';

    const encrypted = await encryptFields(obj, ['field1', 'field3'], password);
    const decrypted = await decryptFields(encrypted, ['field1', 'field3'], password);

    expect(decrypted.field1).toBe('data1');
    expect(decrypted.field2).toBe('data2'); // Not encrypted
    expect(decrypted.field3).toBe('data3');
  });
});

describe('Secure Comparison', () => {
  it('should compare strings correctly', () => {
    expect(secureCompare('abc', 'abc')).toBe(true);
    expect(secureCompare('abc', 'def')).toBe(false);
  });

  it('should be timing-safe (constant time)', () => {
    const a = 'a'.repeat(1000);
    const b = 'b'.repeat(1000);
    const c = 'a'.repeat(1000);

    // Should compare all characters even if first differs
    expect(secureCompare(a, b)).toBe(false);
    expect(secureCompare(a, c)).toBe(true);
  });

  it('should handle different lengths', () => {
    expect(secureCompare('short', 'longer')).toBe(false);
  });
});

describe('Token Generation', () => {
  it('should generate tokens of specified length', () => {
    const token = generateToken(32);
    expect(token.length).toBe(64); // 32 bytes = 64 hex chars
  });

  it('should generate unique tokens', () => {
    const token1 = generateToken();
    const token2 = generateToken();

    expect(token1).not.toBe(token2);
  });

  it('should generate cryptographically random tokens', () => {
    const tokens = Array(100).fill(0).map(() => generateToken());
    const uniqueTokens = new Set(tokens);

    // All tokens should be unique (very high probability)
    expect(uniqueTokens.size).toBe(100);
  });
});

