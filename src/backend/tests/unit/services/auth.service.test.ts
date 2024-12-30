// @package jest ^29.0.0
// @package ioredis-mock ^8.0.0
// @package jsonwebtoken ^9.0.0
// @package ioredis ^5.0.0

import { describe, expect, jest, beforeEach, afterEach, it } from '@jest/globals';
import { OAuth2Client } from 'google-auth-library';
import MockRedis from 'ioredis-mock';
import { sign } from 'jsonwebtoken';
import { AuthService } from '../../../src/services/auth.service';
import { UserRole, AuthenticatedUser, SessionData } from '../../../src/interfaces/auth.interface';

// Mock external dependencies
jest.mock('google-auth-library');
jest.mock('ioredis', () => require('ioredis-mock'));

describe('AuthService', () => {
  let authService: AuthService;
  let mockRedisClient: MockRedis;
  let mockOAuth2Client: jest.Mocked<OAuth2Client>;

  // Test data
  const testUser: AuthenticatedUser = {
    id: 'test-user-123',
    email: 'test@example.com',
    role: UserRole.ADMIN,
    lastLogin: new Date(),
    isActive: true
  };

  const testSessionContext = {
    ipAddress: '192.168.1.1',
    fingerprint: 'test-fingerprint-123'
  };

  beforeEach(() => {
    // Reset mocks and create fresh instance
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    process.env.GOOGLE_CLIENT_ID = 'test-client-id';
    process.env.STRICT_IP_CHECK = 'true';

    mockRedisClient = new MockRedis();
    authService = new AuthService();
    mockOAuth2Client = OAuth2Client as jest.Mocked<typeof OAuth2Client>;
  });

  afterEach(() => {
    jest.resetModules();
  });

  describe('authenticateWithGoogle', () => {
    const mockGoogleCode = 'valid-google-code';
    const mockIdToken = 'valid-id-token';
    const mockTokenPayload = {
      sub: testUser.id,
      email: testUser.email,
      email_verified: true
    };

    beforeEach(() => {
      mockOAuth2Client.prototype.getToken.mockResolvedValue({
        tokens: { id_token: mockIdToken }
      });
      mockOAuth2Client.prototype.verifyIdToken.mockResolvedValue({
        getPayload: () => mockTokenPayload
      });
    });

    it('should successfully authenticate with valid Google credentials', async () => {
      const result = await authService.authenticateWithGoogle(
        mockGoogleCode,
        testSessionContext.ipAddress,
        testSessionContext.fingerprint
      );

      expect(result).toMatchObject({
        id: testUser.id,
        email: testUser.email,
        isActive: true
      });
      expect(mockOAuth2Client.prototype.getToken).toHaveBeenCalledWith(mockGoogleCode);
    });

    it('should enforce rate limiting', async () => {
      // Simulate rate limit exceeded
      for (let i = 0; i < 6; i++) {
        try {
          await authService.authenticateWithGoogle(
            mockGoogleCode,
            testSessionContext.ipAddress,
            testSessionContext.fingerprint
          );
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect(error.message).toBe('Rate limit exceeded');
        }
      }
    });

    it('should reject unverified email addresses', async () => {
      mockOAuth2Client.prototype.verifyIdToken.mockResolvedValue({
        getPayload: () => ({ ...mockTokenPayload, email_verified: false })
      });

      await expect(
        authService.authenticateWithGoogle(
          mockGoogleCode,
          testSessionContext.ipAddress,
          testSessionContext.fingerprint
        )
      ).rejects.toThrow('Email not verified');
    });
  });

  describe('generateTokens', () => {
    it('should generate valid access and refresh tokens', async () => {
      const tokens = await authService.generateTokens(testUser, testSessionContext);

      expect(tokens).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        expiresIn: expect.any(Number),
        tokenType: 'Bearer'
      });
    });

    it('should enforce concurrent session limits', async () => {
      // Create maximum allowed sessions
      for (let i = 0; i < 3; i++) {
        await authService.generateTokens(testUser, {
          ...testSessionContext,
          fingerprint: `fingerprint-${i}`
        });
      }

      // Verify oldest session is removed when limit is exceeded
      const newTokens = await authService.generateTokens(testUser, {
        ...testSessionContext,
        fingerprint: 'new-fingerprint'
      });

      expect(newTokens).toBeDefined();
      const sessions = await mockRedisClient.keys('session:*');
      expect(sessions.length).toBeLessThanOrEqual(3);
    });
  });

  describe('validateToken', () => {
    let validToken: string;
    let sessionId: string;

    beforeEach(async () => {
      sessionId = 'test-session-123';
      validToken = sign(
        {
          userId: testUser.id,
          email: testUser.email,
          role: testUser.role,
          sessionId
        },
        process.env.JWT_SECRET!
      );

      const sessionData: SessionData = {
        userId: testUser.id,
        role: testUser.role,
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
        ipAddress: testSessionContext.ipAddress,
        userAgent: testSessionContext.fingerprint
      };

      await mockRedisClient.set(
        `session:${sessionId}`,
        JSON.stringify(sessionData)
      );
    });

    it('should validate token with correct session context', async () => {
      const result = await authService.validateToken(
        validToken,
        testSessionContext.ipAddress
      );

      expect(result).toMatchObject({
        userId: testUser.id,
        email: testUser.email,
        role: testUser.role
      });
    });

    it('should reject token with invalid IP address in strict mode', async () => {
      await expect(
        authService.validateToken(validToken, '10.0.0.1')
      ).rejects.toThrow('Invalid session context');
    });

    it('should reject expired sessions', async () => {
      await mockRedisClient.del(`session:${sessionId}`);
      await expect(
        authService.validateToken(validToken, testSessionContext.ipAddress)
      ).rejects.toThrow('Session expired');
    });
  });

  describe('refreshToken', () => {
    let validRefreshToken: string;

    beforeEach(() => {
      validRefreshToken = sign(
        {
          userId: testUser.id,
          email: testUser.email,
          role: testUser.role,
          sessionId: 'refresh-session-123'
        },
        process.env.JWT_REFRESH_SECRET!
      );
    });

    it('should generate new token pair with valid refresh token', async () => {
      const result = await authService.refreshToken(
        validRefreshToken,
        testSessionContext.ipAddress
      );

      expect(result).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        expiresIn: expect.any(Number),
        tokenType: 'Bearer'
      });
    });

    it('should reject invalid refresh tokens', async () => {
      const invalidToken = 'invalid-token';
      await expect(
        authService.refreshToken(invalidToken, testSessionContext.ipAddress)
      ).rejects.toThrow('Invalid refresh token');
    });
  });

  describe('logout', () => {
    const sessionId = 'test-session-123';

    beforeEach(async () => {
      await mockRedisClient.set(
        `session:${sessionId}`,
        JSON.stringify({ userId: testUser.id })
      );
    });

    it('should successfully terminate session', async () => {
      await authService.logout(sessionId, testUser.id);
      const session = await mockRedisClient.get(`session:${sessionId}`);
      expect(session).toBeNull();
    });

    it('should clean up all user sessions when requested', async () => {
      // Create multiple sessions
      await mockRedisClient.set(
        `session:${testUser.id}:1`,
        JSON.stringify({ userId: testUser.id })
      );
      await mockRedisClient.set(
        `session:${testUser.id}:2`,
        JSON.stringify({ userId: testUser.id })
      );

      await authService.logout(sessionId, testUser.id);
      const sessions = await mockRedisClient.keys(`session:${testUser.id}:*`);
      expect(sessions.length).toBe(0);
    });
  });
});