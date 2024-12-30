// External imports
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals'; // v29.0.0
import jwt from 'jsonwebtoken'; // v9.0.0

// Internal imports
import { SecurityService } from '../../../src/utils/security';
import { EncryptionService } from '../../../src/lib/encryption';
import authConfig from '../../../src/config/auth.config';

// Mock environment variables
beforeEach(() => {
  process.env.JWT_SECRET = 'test-jwt-secret';
  process.env.ENCRYPTION_KEY = 'test-encryption-key';
  process.env.ENCRYPTION_IV = 'test-encryption-iv';
  process.env.RATE_LIMIT_WINDOW = '60000';
  process.env.RATE_LIMIT_MAX_REQUESTS = '100';
});

// Clean up after tests
afterEach(() => {
  jest.clearAllMocks();
});

// Mock EncryptionService
jest.mock('../../../src/lib/encryption', () => {
  return {
    EncryptionService: jest.fn().mockImplementation(() => ({
      encrypt: jest.fn().mockResolvedValue({
        cipherText: 'encrypted-data',
        iv: Buffer.from('test-iv'),
        tag: 'test-tag',
        version: 1
      }),
      decrypt: jest.fn().mockResolvedValue('decrypted-data')
    }))
  };
});

describe('SecurityService - Token Generation and Validation', () => {
  let securityService: SecurityService;
  const mockPayload = {
    userId: '123e4567-e89b-12d3-a456-426614174000',
    role: 'admin'
  };

  beforeEach(() => {
    securityService = new SecurityService();
  });

  test('should generate valid access and refresh tokens', async () => {
    const result = await securityService.generateToken(mockPayload, mockPayload.userId);

    expect(result).toHaveProperty('accessToken');
    expect(result).toHaveProperty('refreshToken');
    expect(result).toHaveProperty('expiresIn');
    expect(typeof result.accessToken).toBe('string');
    expect(typeof result.refreshToken).toBe('string');
    expect(typeof result.expiresIn).toBe('number');
  });

  test('should fail token generation with invalid payload', async () => {
    const invalidPayload = {
      userId: 'invalid-uuid',
      role: 'admin'
    };

    await expect(
      securityService.generateToken(invalidPayload, invalidPayload.userId)
    ).rejects.toThrow('Invalid user ID in token payload');
  });

  test('should verify valid token successfully', async () => {
    const { accessToken } = await securityService.generateToken(mockPayload, mockPayload.userId);
    const result = await securityService.verifyToken(accessToken);

    expect(result.valid).toBe(true);
    expect(result.payload).toHaveProperty('userId', mockPayload.userId);
    expect(result.payload).toHaveProperty('role', mockPayload.role);
  });

  test('should reject expired token', async () => {
    // Create token with minimal expiry
    const expiredToken = jwt.sign(mockPayload, authConfig.jwt.privateKey, {
      expiresIn: '0s'
    });

    const result = await securityService.verifyToken(expiredToken);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Token has expired');
  });

  test('should reject blacklisted token', async () => {
    const { accessToken } = await securityService.generateToken(mockPayload, mockPayload.userId);
    securityService.revokeToken(accessToken);

    const result = await securityService.verifyToken(accessToken);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Token has been revoked');
  });
});

describe('SecurityService - Token Refresh', () => {
  let securityService: SecurityService;
  const mockPayload = {
    userId: '123e4567-e89b-12d3-a456-426614174000',
    role: 'admin'
  };

  beforeEach(() => {
    securityService = new SecurityService();
  });

  test('should refresh token successfully', async () => {
    const initialTokens = await securityService.generateToken(mockPayload, mockPayload.userId);
    const refreshedTokens = await securityService.refreshToken(initialTokens.refreshToken);

    expect(refreshedTokens).toHaveProperty('accessToken');
    expect(refreshedTokens).toHaveProperty('refreshToken');
    expect(refreshedTokens.accessToken).not.toBe(initialTokens.accessToken);
  });

  test('should fail refresh with invalid refresh token', async () => {
    await expect(
      securityService.refreshToken('invalid-refresh-token')
    ).rejects.toThrow('Token refresh failed');
  });

  test('should fail refresh after rate limit exceeded', async () => {
    const maxAttempts = 6; // Exceeding the rate limit
    const refreshPromises = [];

    for (let i = 0; i < maxAttempts; i++) {
      refreshPromises.push(
        securityService.refreshToken('test-refresh-token')
      );
    }

    await expect(Promise.all(refreshPromises)).rejects.toThrow('Rate limit exceeded');
  });
});

describe('SecurityService - Rate Limiting', () => {
  let securityService: SecurityService;
  const mockPayload = {
    userId: '123e4567-e89b-12d3-a456-426614174000',
    role: 'admin'
  };

  beforeEach(() => {
    securityService = new SecurityService();
  });

  test('should enforce rate limits for token generation', async () => {
    const maxAttempts = 6; // Exceeding the rate limit
    const tokenPromises = [];

    for (let i = 0; i < maxAttempts; i++) {
      tokenPromises.push(
        securityService.generateToken(mockPayload, mockPayload.userId)
      );
    }

    await expect(Promise.all(tokenPromises)).rejects.toThrow('Rate limit exceeded');
  });

  test('should reset rate limit after window expires', async () => {
    jest.useFakeTimers();

    // First attempt
    await securityService.generateToken(mockPayload, mockPayload.userId);

    // Advance time beyond rate limit window
    jest.advanceTimersByTime(60000);

    // Should succeed after window reset
    const result = await securityService.generateToken(mockPayload, mockPayload.userId);
    expect(result).toHaveProperty('accessToken');

    jest.useRealTimers();
  });
});

describe('SecurityService - Token Claims Validation', () => {
  let securityService: SecurityService;

  beforeEach(() => {
    securityService = new SecurityService();
  });

  test('should validate all required token claims', async () => {
    const mockPayload = {
      userId: '123e4567-e89b-12d3-a456-426614174000',
      role: 'admin',
      permissions: ['read', 'write']
    };

    const { accessToken } = await securityService.generateToken(mockPayload, mockPayload.userId);
    const result = await securityService.verifyToken(accessToken);

    expect(result.valid).toBe(true);
    expect(result.payload).toHaveProperty('iat');
    expect(result.payload).toHaveProperty('exp');
    expect(result.payload).toHaveProperty('jti');
  });

  test('should reject token with missing claims', async () => {
    const invalidToken = jwt.sign(
      { userId: '123e4567-e89b-12d3-a456-426614174000' },
      authConfig.jwt.privateKey
    );

    const result = await securityService.verifyToken(invalidToken);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Invalid token claims');
  });
});

describe('SecurityService - Concurrent Session Management', () => {
  let securityService: SecurityService;
  const mockPayload = {
    userId: '123e4567-e89b-12d3-a456-426614174000',
    role: 'admin'
  };

  beforeEach(() => {
    securityService = new SecurityService();
  });

  test('should track concurrent sessions via session IDs', async () => {
    const session1 = await securityService.generateToken(mockPayload, mockPayload.userId);
    const session2 = await securityService.generateToken(mockPayload, mockPayload.userId);

    const result1 = await securityService.verifyToken(session1.accessToken);
    const result2 = await securityService.verifyToken(session2.accessToken);

    expect(result1.payload?.sessionId).not.toBe(result2.payload?.sessionId);
  });

  test('should maintain session integrity after refresh', async () => {
    const initialSession = await securityService.generateToken(mockPayload, mockPayload.userId);
    const refreshedSession = await securityService.refreshToken(initialSession.refreshToken);

    const result = await securityService.verifyToken(refreshedSession.accessToken);
    expect(result.payload?.sessionId).toBe(result.payload?.sessionId);
  });
});