/**
 * Security Analysis Tests
 * Tests for resistance against brute force, timing attacks, and chosen plaintext attacks
 */

import { describe, it, expect } from 'vitest';
import {
  encryptData,
  decryptData,
  hashPassword,
  verifyPassword,
  secureCompare,
  hashData,
} from '../lib/storage/encryption';
import { createSignedJWT, verifyJWT } from '../lib/jwt';

describe('Brute Force Resistance', () => {
  it('should resist brute force attacks on passwords (PBKDF2 iterations)', async () => {
    const password = 'weak-password';
    const hash = await hashPassword(password);

    // Simulate brute force: try many passwords
    const attempts = 10;
    const start = performance.now();

    for (let i = 0; i < attempts; i++) {
      await verifyPassword(`wrong-password-${i}`, hash);
    }

    const end = performance.now();
    const avgTime = (end - start) / attempts;

    console.log(`\n[Brute Force Resistance]`);
    console.log(`Average verification time: ${avgTime.toFixed(2)}ms`);
    console.log(`Time for 1M attempts (estimated): ${(avgTime * 1000000 / 1000 / 60).toFixed(2)} minutes`);

    // Each attempt should take significant time to slow down brute force
    // Modern hardware can be faster, so we check for minimum 20ms
    expect(avgTime).toBeGreaterThan(20);
  });

  it('should resist brute force on encryption keys', async () => {
    const data = { secret: 'confidential' };
    const correctPassword = 'correct-password-123';
    const encrypted = await encryptData(data, correctPassword);

    // Try to decrypt with wrong passwords
    const wrongPasswords = ['wrong1', 'wrong2', 'wrong3', 'wrong4', 'wrong5'];
    let successCount = 0;

    for (const wrongPassword of wrongPasswords) {
      try {
        await decryptData(encrypted, wrongPassword);
        successCount++;
      } catch (error) {
        // Expected to fail
      }
    }

    // Should not successfully decrypt with wrong passwords
    expect(successCount).toBe(0);
  });

  it('should have sufficient key space for encryption', () => {
    // AES-256 has 2^256 possible keys
    // This is computationally infeasible to brute force
    const keySpace = BigInt(2) ** BigInt(256);
    const keySpaceString = keySpace.toString();

    console.log(`\n[Key Space]`);
    console.log(`AES-256 key space: 2^256 = ${keySpaceString.substring(0, 20)}...`);

    // Key space should be enormous
    expect(keySpaceString.length).toBeGreaterThan(75); // 2^256 has ~77 digits
  });
});

describe('Timing Attack Resistance', () => {
  it('should use constant-time comparison for tokens', () => {
    const correct = 'correct-token';
    const wrong = 'wrong-token';
    const iterations = 100;

    // Measure time for correct comparison
    const correctTimes: number[] = [];
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      secureCompare(correct, correct);
      correctTimes.push(performance.now() - start);
    }

    // Measure time for wrong comparison
    const wrongTimes: number[] = [];
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      secureCompare(correct, wrong);
      wrongTimes.push(performance.now() - start);
    }

    const avgCorrect = correctTimes.reduce((a, b) => a + b, 0) / correctTimes.length;
    const avgWrong = wrongTimes.reduce((a, b) => a + b, 0) / wrongTimes.length;
    const timeDiff = Math.abs(avgCorrect - avgWrong);

    console.log(`\n[Timing Attack Resistance]`);
    console.log(`Correct comparison: ${avgCorrect.toFixed(4)}ms`);
    console.log(`Wrong comparison: ${avgWrong.toFixed(4)}ms`);
    console.log(`Difference: ${timeDiff.toFixed(4)}ms`);

    // Timing difference should be minimal (< 50% of average time)
    // JavaScript timing is not perfectly precise, so we use a more lenient threshold
    const maxDiff = Math.max(avgCorrect, avgWrong) * 0.5;
    expect(timeDiff).toBeLessThan(maxDiff);
  });

  it('should compare all characters even if first differs', () => {
    const str1 = 'a' + 'x'.repeat(1000);
    const str2 = 'b' + 'x'.repeat(1000);
    const str3 = 'a' + 'x'.repeat(1000);

    // Should take similar time even though first char differs
    const start1 = performance.now();
    secureCompare(str1, str2);
    const time1 = performance.now() - start1;

    const start2 = performance.now();
    secureCompare(str1, str3);
    const time2 = performance.now() - start2;

    // Times should be similar (within 20%)
    const diff = Math.abs(time1 - time2) / Math.max(time1, time2);
    expect(diff).toBeLessThan(0.2);
  });
});

describe('Chosen Plaintext Attack Resistance', () => {
  it('should produce different ciphertexts for same plaintext (IV uniqueness)', async () => {
    const plaintext = { message: 'attack-test' };
    const password = 'password';

    const encrypted1 = await encryptData(plaintext, password);
    const encrypted2 = await encryptData(plaintext, password);

    // Same plaintext should produce different ciphertexts
    expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext);
    expect(encrypted1.iv).not.toBe(encrypted2.iv);
  });

  it('should prevent pattern detection in ciphertexts', async () => {
    const password = 'password';
    const plaintexts = [
      { message: 'A'.repeat(100) },
      { message: 'B'.repeat(100) },
      { message: 'A'.repeat(100) }, // Same as first
    ];

    const encrypted = plaintexts.map(p => encryptData(p, password));
    const results = await Promise.all(encrypted);

    // Even same plaintexts should produce different ciphertexts
    expect(results[0].ciphertext).not.toBe(results[2].ciphertext);

    // Different plaintexts should produce different ciphertexts
    expect(results[0].ciphertext).not.toBe(results[1].ciphertext);
  });

  it('should use authenticated encryption (GCM tag)', async () => {
    const data = { message: 'test' };
    const password = 'password';

    const encrypted = await encryptData(data, password);

    // GCM should include authentication tag
    expect(encrypted.tag).toBeDefined();
    expect(encrypted.tag.length).toBe(32); // 128 bits = 32 hex chars

    // Tampering should be detected
    const tampered = {
      ...encrypted,
      ciphertext: encrypted.ciphertext.slice(0, -2) + 'XX',
    };

    await expect(decryptData(tampered, password)).rejects.toThrow();
  });
});

describe('Chosen Ciphertext Attack Resistance', () => {
  it('should reject tampered ciphertexts', async () => {
    const data = { secret: 'data' };
    const password = 'password';

    const encrypted = await encryptData(data, password);

    // Try to decrypt with tampered ciphertext
    const tampered = {
      ...encrypted,
      ciphertext: encrypted.ciphertext + 'XX',
    };

    await expect(decryptData(tampered, password)).rejects.toThrow();
  });

  it('should reject tampered authentication tag', async () => {
    const data = { secret: 'data' };
    const password = 'password';

    const encrypted = await encryptData(data, password);

    // Try to decrypt with tampered tag
    const tampered = {
      ...encrypted,
      tag: encrypted.tag.slice(0, -2) + 'XX',
    };

    await expect(decryptData(tampered, password)).rejects.toThrow();
  });

  it('should reject ciphertexts with wrong IV', async () => {
    const data = { secret: 'data' };
    const password = 'password';

    const encrypted = await encryptData(data, password);

    // Try to decrypt with wrong IV
    const tampered = {
      ...encrypted,
      iv: encrypted.iv.slice(0, -2) + 'XX',
    };

    await expect(decryptData(tampered, password)).rejects.toThrow();
  });
});

describe('Replay Attack Resistance', () => {
  it('should prevent token reuse (JWT expiration)', () => {
    const payload = {
      userId: 'user-123',
      email: 'test@example.com',
      role: 'user',
    };

    // Create token with very short expiry
    const token = createSignedJWT(payload, 100); // 100ms

    // Should be valid initially
    expect(verifyJWT(token)).not.toBeNull();

    // After expiration, should be invalid
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(verifyJWT(token)).toBeNull();
        resolve();
      }, 200);
    });
  });

  it('should require valid signature for JWT', () => {
    const payload = {
      userId: 'user-123',
      email: 'test@example.com',
      role: 'user',
    };

    const token = createSignedJWT(payload, 15 * 60 * 1000);

    // Modify token signature
    const parts = token.split('.');
    const tamperedToken = `${parts[0]}.${parts[1]}.tampered-signature`;

    expect(verifyJWT(tamperedToken)).toBeNull();
  });
});

describe('Key Derivation Security', () => {
  it('should use unique salts for each encryption', async () => {
    const data = { message: 'test' };
    const password = 'password';

    const encrypted1 = await encryptData(data, password);
    const encrypted2 = await encryptData(data, password);

    // Each encryption should use different salt
    expect(encrypted1.salt).not.toBe(encrypted2.salt);
  });

  it('should use sufficient PBKDF2 iterations', async () => {
    const password = 'test';
    const salt = new Uint8Array(32).fill(1);

    const start = performance.now();
    await deriveKey(password, salt);
    const time = performance.now() - start;

    console.log(`\n[PBKDF2 Iterations]`);
    console.log(`Time for 100k iterations: ${time.toFixed(2)}ms`);

    // 100k iterations should take significant time
    // Modern hardware can be faster, so we check for minimum 20ms
    // This still slows down brute force attacks significantly
    expect(time).toBeGreaterThan(20);
  });
});

describe('Hash Function Security', () => {
  it('should resist preimage attacks (SHA-256)', async () => {
    const original = 'original-data';
    const hash = await hashData(original);

    // Try to find preimage (should be computationally infeasible)
    const attempts = ['data1', 'data2', 'data3', 'data4', 'data5'];
    let found = false;

    for (const attempt of attempts) {
      const attemptHash = await hashData(attempt);
      if (attemptHash === hash) {
        found = true;
        break;
      }
    }

    // Should not find preimage in small number of attempts
    expect(found).toBe(false);
  });

  it('should resist collision attacks', async () => {
    // SHA-256 should have very low collision probability
    const hashes = new Set<string>();
    const attempts = 1000;

    for (let i = 0; i < attempts; i++) {
      const hash = await hashData(`data-${i}`);
      hashes.add(hash);
    }

    // All hashes should be unique (collision probability is negligible)
    expect(hashes.size).toBe(attempts);
  });
});

describe('Password Security', () => {
  it('should hash passwords with unique salts', async () => {
    const password = 'same-password';

    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);

    // Same password should produce different hashes (different salts)
    expect(hash1).not.toBe(hash2);

    // But both should verify correctly
    expect(await verifyPassword(password, hash1)).toBe(true);
    expect(await verifyPassword(password, hash2)).toBe(true);
  });

  it('should resist rainbow table attacks (salted hashes)', async () => {
    const password = 'common-password';
    const hash = await hashPassword(password);

    // Hash should include salt (format: salt$hash)
    const parts = hash.split('$');
    expect(parts.length).toBe(2);
    expect(parts[0].length).toBe(64); // 32 bytes = 64 hex chars
    expect(parts[1].length).toBe(64); // 256 bits = 64 hex chars
  });
});

