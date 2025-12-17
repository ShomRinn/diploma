# Testing Documentation

## Overview

This directory contains comprehensive tests for the cryptographic implementation in the wallet-agent application. The tests cover functionality, performance, and security analysis.

## Test Structure

```
tests/
├── encryption.test.ts    # AES-256-GCM, PBKDF2, SHA-256 tests
├── auth.test.ts          # JWT, password hashing, token hashing tests
├── performance.test.ts   # Performance benchmarks and metrics
└── security.test.ts       # Security analysis and attack resistance tests
```

## Running Tests

### Install Dependencies

```bash
npm install
```

### Run All Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

### Run Tests with UI

```bash
npm run test:ui
```

## Test Categories

### 1. Encryption Tests (`encryption.test.ts`)

Tests for AES-256-GCM encryption and decryption:
- ✅ Encryption/decryption correctness
- ✅ Wrong password rejection
- ✅ IV uniqueness (different ciphertexts for same data)
- ✅ Large data handling
- ✅ Tampering detection (authentication tag)

Tests for PBKDF2 key derivation:
- ✅ Consistent key derivation
- ✅ Different salts produce different keys

Tests for SHA-256 hashing:
- ✅ Consistent hashing
- ✅ Deterministic output

Tests for password hashing:
- ✅ Password hashing and verification
- ✅ Unique salts per password
- ✅ Empty and long password handling

### 2. Authentication Tests (`auth.test.ts`)

Tests for JWT tokens:
- ✅ Token creation and verification
- ✅ Invalid signature rejection
- ✅ Expiration handling
- ✅ Malformed token rejection

Tests for token hashing:
- ✅ Consistent token hashing
- ✅ One-way property

Tests for session management:
- ✅ Unique token generation
- ✅ Token hash verification

### 3. Performance Tests (`performance.test.ts`)

Benchmarks for:
- ✅ Encryption/decryption latency
- ✅ Throughput measurements (MB/s)
- ✅ Key derivation performance
- ✅ Password hashing performance
- ✅ SHA-256 hashing performance
- ✅ Scalability with increasing data sizes
- ✅ Concurrent operations
- ✅ Memory usage

### 4. Security Tests (`security.test.ts`)

Attack resistance tests:
- ✅ Brute force resistance (PBKDF2 iterations)
- ✅ Timing attack resistance (constant-time comparison)
- ✅ Chosen plaintext attack resistance (IV uniqueness)
- ✅ Chosen ciphertext attack resistance (authentication tag)
- ✅ Replay attack resistance (JWT expiration)
- ✅ Rainbow table resistance (unique salts)
- ✅ Key derivation security
- ✅ Hash function security

## Test Results

### Expected Results

All tests should pass with the following performance characteristics:

**Encryption Performance**:
- Small data (< 1KB): 50-100ms
- Medium data (1-100KB): 100-500ms
- Throughput: 1-5 MB/s

**Password Hashing**:
- Time: 100-200ms (PBKDF2 with 100k iterations)
- Purpose: Slow down brute force attacks

**SHA-256 Hashing**:
- Time: < 0.1ms (small data)
- Throughput: > 100 MB/s

**Security**:
- Brute force resistance: ✅ Strong
- Timing attack resistance: ✅ Good
- Chosen plaintext resistance: ✅ Strong
- Chosen ciphertext resistance: ✅ Strong

## Coverage

Run coverage report:

```bash
npm run test:coverage
```

Target coverage: **> 80%** for cryptographic modules.

## Continuous Integration

Tests are designed to run in CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Run tests
  run: npm test

- name: Generate coverage
  run: npm run test:coverage
```

## Debugging

### Run Specific Test File

```bash
npm test encryption.test.ts
```

### Run Specific Test

```bash
npm test -t "should encrypt and decrypt data correctly"
```

### Verbose Output

```bash
npm test -- --reporter=verbose
```

## Performance Benchmarks

Performance tests output metrics to console:

```
[Small Data Encryption]
Average: 75.23ms
Min: 68.45ms
Max: 82.10ms

[Throughput - 100KB]
Time: 234.56ms
Throughput: 0.43 MB/s
```

## Security Analysis

Security tests verify resistance to:
- Brute force attacks
- Timing attacks
- Chosen plaintext attacks
- Chosen ciphertext attacks
- Replay attacks
- Rainbow table attacks

See `docs/SECURITY_ANALYSIS.md` for detailed security analysis.

## Contributing

When adding new cryptographic features:

1. Add tests to appropriate test file
2. Ensure all tests pass
3. Update coverage if needed
4. Document new tests in this README

## References

- [Vitest Documentation](https://vitest.dev/)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [NIST Cryptographic Standards](https://csrc.nist.gov/publications)

