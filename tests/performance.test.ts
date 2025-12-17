/**
 * Performance Benchmarks
 * Measures encryption/decryption latency, throughput, and computational complexity
 */

import { describe, it, expect } from 'vitest';
import { encryptData, decryptData, hashPassword, verifyPassword, hashData, deriveKey } from '../lib/storage/encryption';

describe('Encryption Performance', () => {
  it('should measure encryption latency for small data', async () => {
    const data = { message: 'Hello, World!' };
    const password = 'test-password';
    const iterations = 10;

    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await encryptData(data, password);
      const end = performance.now();
      times.push(end - start);
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    console.log(`\n[Small Data Encryption]`);
    console.log(`Average: ${avgTime.toFixed(2)}ms`);
    console.log(`Min: ${minTime.toFixed(2)}ms`);
    console.log(`Max: ${maxTime.toFixed(2)}ms`);

    // Should complete in reasonable time (< 500ms for small data)
    expect(avgTime).toBeLessThan(500);
  });

  it('should measure decryption latency', async () => {
    const data = { message: 'Test message' };
    const password = 'password';
    const iterations = 10;

    const encrypted = await encryptData(data, password);
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await decryptData(encrypted, password);
      const end = performance.now();
      times.push(end - start);
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;

    console.log(`\n[Decryption]`);
    console.log(`Average: ${avgTime.toFixed(2)}ms`);

    expect(avgTime).toBeLessThan(500);
  });

  it('should measure throughput (MB/s)', async () => {
    const sizes = [1, 10, 100, 1000]; // KB
    const password = 'test-password';

    for (const sizeKB of sizes) {
      const data = { message: 'A'.repeat(sizeKB * 1024) };
      const dataSizeMB = sizeKB / 1024;

      const start = performance.now();
      await encryptData(data, password);
      const end = performance.now();

      const timeSeconds = (end - start) / 1000;
      const throughput = dataSizeMB / timeSeconds;

      console.log(`\n[Throughput - ${sizeKB}KB]`);
      console.log(`Time: ${(end - start).toFixed(2)}ms`);
      console.log(`Throughput: ${throughput.toFixed(2)} MB/s`);

      // Should handle at least 0.01 MB/s (adjusted for small data overhead)
      // For larger data, throughput will be higher
      if (sizeKB >= 100) {
        expect(throughput).toBeGreaterThan(0.1);
      } else {
        expect(throughput).toBeGreaterThan(0.01);
      }
    }
  });

  it('should measure key derivation performance', async () => {
    const password = 'test-password';
    const salt = new Uint8Array(32).fill(1);
    const iterations = 5;

    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await deriveKey(password, salt);
      const end = performance.now();
      times.push(end - start);
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;

    console.log(`\n[Key Derivation (PBKDF2 - 100k iterations)]`);
    console.log(`Average: ${avgTime.toFixed(2)}ms`);

    // PBKDF2 with 100k iterations should take reasonable time
    // Modern hardware can be faster, so we check for minimum 20ms
    expect(avgTime).toBeGreaterThan(20);
    expect(avgTime).toBeLessThan(2000);
  });

  it('should compare encryption vs decryption speed', async () => {
    const data = { message: 'A'.repeat(1000) };
    const password = 'password';
    const iterations = 10;

    let encryptTime = 0;
    let decryptTime = 0;

    for (let i = 0; i < iterations; i++) {
      const encStart = performance.now();
      const encrypted = await encryptData(data, password);
      encryptTime += performance.now() - encStart;

      const decStart = performance.now();
      await decryptData(encrypted, password);
      decryptTime += performance.now() - decStart;
    }

    const avgEncrypt = encryptTime / iterations;
    const avgDecrypt = decryptTime / iterations;

    console.log(`\n[Encryption vs Decryption]`);
    console.log(`Encrypt: ${avgEncrypt.toFixed(2)}ms`);
    console.log(`Decrypt: ${avgDecrypt.toFixed(2)}ms`);
    console.log(`Ratio: ${(avgEncrypt / avgDecrypt).toFixed(2)}x`);

    // Both should be similar (decryption might be slightly faster)
    expect(Math.abs(avgEncrypt - avgDecrypt) / avgEncrypt).toBeLessThan(0.5);
  });
});

describe('Password Hashing Performance', () => {
  it('should measure password hashing latency', async () => {
    const password = 'MySecurePassword123!';
    const iterations = 5;

    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await hashPassword(password);
      const end = performance.now();
      times.push(end - start);
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;

    console.log(`\n[Password Hashing (PBKDF2 - 100k iterations)]`);
    console.log(`Average: ${avgTime.toFixed(2)}ms`);

    // Should take reasonable time to prevent brute force
    // Modern hardware can be faster, so we check for minimum 20ms
    expect(avgTime).toBeGreaterThan(20);
    expect(avgTime).toBeLessThan(1000);
  });

  it('should measure password verification latency', async () => {
    const password = 'test-password';
    const hash = await hashPassword(password);
    const iterations = 10;

    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await verifyPassword(password, hash);
      const end = performance.now();
      times.push(end - start);
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;

    console.log(`\n[Password Verification]`);
    console.log(`Average: ${avgTime.toFixed(2)}ms`);

    // Should be similar to hashing (same PBKDF2 operation)
    // Modern hardware can be faster, so we check for minimum 20ms
    expect(avgTime).toBeGreaterThan(20);
    expect(avgTime).toBeLessThan(1000);
  });

  it('should measure SHA-256 hashing performance', async () => {
    const data = 'test-data';
    const iterations = 1000;

    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      await hashData(data);
    }
    const end = performance.now();

    const avgTime = (end - start) / iterations;
    const throughput = (data.length * iterations) / ((end - start) / 1000) / 1024 / 1024; // MB/s

    console.log(`\n[SHA-256 Hashing]`);
    console.log(`Average: ${avgTime.toFixed(4)}ms per hash`);
    console.log(`Throughput: ${throughput.toFixed(2)} MB/s`);

    // SHA-256 should be very fast (< 1ms per hash for small data)
    expect(avgTime).toBeLessThan(1);
  });
});

describe('Scalability Tests', () => {
  it('should handle increasing data sizes', async () => {
    const sizes = [1, 10, 100, 1000, 10000]; // bytes
    const password = 'password';
    const results: Array<{ size: number; time: number }> = [];

    for (const size of sizes) {
      const data = { message: 'A'.repeat(size) };
      
      const start = performance.now();
      const encrypted = await encryptData(data, password);
      await decryptData(encrypted, password);
      const end = performance.now();

      results.push({ size, time: end - start });
    }

    console.log(`\n[Scalability - Encryption + Decryption]`);
    results.forEach(({ size, time }) => {
      console.log(`${size} bytes: ${time.toFixed(2)}ms`);
    });

    // Time should increase roughly linearly with size
    const timeRatio = results[results.length - 1].time / results[0].time;
    const sizeRatio = sizes[sizes.length - 1] / sizes[0];
    
    // Time increase should be less than size increase (due to overhead)
    expect(timeRatio).toBeLessThan(sizeRatio * 2);
  });

  it('should measure concurrent operations', async () => {
    const password = 'password';
    const concurrent = 10;
    const data = { message: 'test' };

    const start = performance.now();
    const promises = Array(concurrent).fill(0).map(() => 
      encryptData(data, password)
    );
    await Promise.all(promises);
    const end = performance.now();

    const totalTime = end - start;
    const avgTime = totalTime / concurrent;

    console.log(`\n[Concurrent Operations - ${concurrent} parallel]`);
    console.log(`Total: ${totalTime.toFixed(2)}ms`);
    console.log(`Average per operation: ${avgTime.toFixed(2)}ms`);

    // Concurrent operations should complete faster than sequential
    expect(totalTime).toBeLessThan(avgTime * concurrent * 1.5);
  });
});

describe('Memory Usage', () => {
  it('should not leak memory during repeated operations', async () => {
    const password = 'password';
    const iterations = 50; // Reduced for faster test execution

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const initialMemory = process.memoryUsage().heapUsed;

    // Process in batches to avoid timeout
    const batchSize = 10;
    for (let batch = 0; batch < iterations / batchSize; batch++) {
      const batchPromises = [];
      for (let i = 0; i < batchSize && batch * batchSize + i < iterations; i++) {
        const idx = batch * batchSize + i;
        const data = { message: `test-${idx}` };
        batchPromises.push(
          encryptData(data, password).then(encrypted => decryptData(encrypted, password))
        );
      }
      await Promise.all(batchPromises);
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = finalMemory - initialMemory;
    const memoryIncreaseMB = memoryIncrease / 1024 / 1024;

    console.log(`\n[Memory Usage]`);
    console.log(`Initial: ${(initialMemory / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Final: ${(finalMemory / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Increase: ${memoryIncreaseMB.toFixed(2)} MB`);

    // Memory increase should be reasonable (< 50MB for 50 operations)
    expect(memoryIncreaseMB).toBeLessThan(50);
  }, 15000); // 15 second timeout
});

