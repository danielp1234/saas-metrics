/**
 * @fileoverview Integration tests for authentication endpoints including Google OAuth flow,
 * token management, session handling, security validations, and performance monitoring.
 * @version 1.0.0
 */

import request from 'supertest'; // ^6.3.0
import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals'; // ^29.0.0
import { GenericContainer, StartedTestContainer } from 'testcontainers'; // ^9.0.0
import { createClient } from 'redis'; // ^4.0.0
import app from '../../src/app';
import { AuthService } from '../../src/services/auth.service';
import { UserRole } from '../../interfaces/auth.interface';

// Test constants
const TEST_TIMEOUT = 30000;
const REDIS_PORT = 6379;
const POSTGRES_PORT = 5432;

// Mock user data
const testUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  role: UserRole.ADMIN,
  lastLogin: new Date(),
  isActive: true
};

// Mock OAuth data
const mockOAuthCode = 'mock-oauth-code';
const mockFingerprint = 'mock-device-fingerprint';
const mockIpAddress = '127.0.0.1';

describe('Authentication Integration Tests', () => {
  let redisContainer: StartedTestContainer;
  let postgresContainer: StartedTestContainer;
  let redisClient: ReturnType<typeof createClient>;
  let authService: jest.Mocked<AuthService>;

  beforeAll(async () => {
    // Start Redis container
    redisContainer = await new GenericContainer('redis:6.2')
      .withExposedPorts(REDIS_PORT)
      .start();

    // Start PostgreSQL container
    postgresContainer = await new GenericContainer('postgres:14')
      .withExposedPorts(POSTGRES_PORT)
      .withEnvironment({
        POSTGRES_USER: 'test',
        POSTGRES_PASSWORD: 'test',
        POSTGRES_DB: 'test_db'
      })
      .start();

    // Initialize Redis client
    redisClient = createClient({
      url: `redis://${redisContainer.getHost()}:${redisContainer.getMappedPort(REDIS_PORT)}`
    });
    await redisClient.connect();

    // Mock AuthService
    authService = {
      authenticateWithGoogle: jest.fn(),
      generateTokens: jest.fn(),
      validateToken: jest.fn(),
      refreshToken: jest.fn(),
      logout: jest.fn(),
      checkRateLimit: jest.fn(),
      validateSession: jest.fn()
    };
  }, TEST_TIMEOUT);

  afterAll(async () => {
    await redisClient.quit();
    await redisContainer.stop();
    await postgresContainer.stop();
  });

  beforeEach(async () => {
    await redisClient.flushAll();
    jest.clearAllMocks();
  });

  describe('OAuth Authentication Flow', () => {
    test('should successfully authenticate with Google OAuth', async () => {
      // Mock successful authentication
      authService.authenticateWithGoogle.mockResolvedValue(testUser);
      authService.generateTokens.mockResolvedValue({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        expiresIn: 1800,
        tokenType: 'Bearer'
      });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          code: mockOAuthCode,
          fingerprint: mockFingerprint
        })
        .expect(200);

      // Verify response structure
      expect(response.body).toMatchObject({
        success: true,
        data: {
          user: {
            id: testUser.id,
            email: testUser.email,
            role: testUser.role
          },
          accessToken: expect.any(String),
          expiresIn: expect.any(Number),
          tokenType: 'Bearer'
        },
        error: null,
        metadata: {
          responseTime: expect.any(Number),
          apiVersion: expect.any(String),
          timestamp: expect.any(Number)
        }
      });

      // Verify refresh token cookie
      expect(response.headers['set-cookie']).toBeDefined();
      expect(response.headers['set-cookie'][0]).toMatch(/refreshToken=.+/);

      // Verify security headers
      expect(response.headers['strict-transport-security']).toBeDefined();
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
    });

    test('should handle invalid OAuth code', async () => {
      authService.authenticateWithGoogle.mockRejectedValue(
        new Error('Invalid OAuth code')
      );

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          code: 'invalid-code',
          fingerprint: mockFingerprint
        })
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        data: null,
        error: {
          code: 401,
          message: expect.any(String),
          status: 'UNAUTHORIZED'
        }
      });
    });

    test('should enforce rate limiting', async () => {
      // Mock rate limit exceeded
      authService.checkRateLimit.mockRejectedValue(
        new Error('Rate limit exceeded')
      );

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          code: mockOAuthCode,
          fingerprint: mockFingerprint
        })
        .expect(429);

      expect(response.body.error.message).toMatch(/rate limit exceeded/i);
    });
  });

  describe('Token Management', () => {
    test('should successfully refresh access token', async () => {
      const mockRefreshToken = 'valid-refresh-token';
      authService.refreshToken.mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 1800,
        tokenType: 'Bearer'
      });

      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', [`refreshToken=${mockRefreshToken}`])
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          accessToken: expect.any(String),
          expiresIn: expect.any(Number),
          tokenType: 'Bearer'
        }
      });

      // Verify new refresh token cookie
      expect(response.headers['set-cookie']).toBeDefined();
    });

    test('should handle invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', ['refreshToken=invalid-token'])
        .expect(401);

      expect(response.body.error.message).toMatch(/invalid.*token/i);
    });
  });

  describe('Session Management', () => {
    test('should successfully logout and clear session', async () => {
      const mockAccessToken = 'valid-access-token';
      authService.validateToken.mockResolvedValue({
        userId: testUser.id,
        sessionId: 'test-session'
      });

      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${mockAccessToken}`)
        .expect(200);

      // Verify session cleared
      expect(response.headers['set-cookie']).toBeDefined();
      expect(response.headers['set-cookie'][0]).toMatch(/refreshToken=;/);

      // Verify audit log
      expect(authService.logout).toHaveBeenCalledWith(
        expect.any(String),
        testUser.id
      );
    });

    test('should handle unauthorized logout attempt', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .expect(401);

      expect(response.body.error.message).toMatch(/unauthorized/i);
    });
  });

  describe('Security Validations', () => {
    test('should validate required security headers', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          code: mockOAuthCode,
          fingerprint: mockFingerprint
        });

      expect(response.headers).toMatchObject({
        'strict-transport-security': expect.any(String),
        'x-content-type-options': 'nosniff',
        'x-frame-options': 'DENY',
        'x-xss-protection': expect.any(String)
      });
    });

    test('should prevent CSRF attacks', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .set('Origin', 'http://malicious-site.com')
        .send({
          code: mockOAuthCode,
          fingerprint: mockFingerprint
        });

      expect(response.status).toBe(403);
      expect(response.body.error.message).toMatch(/csrf/i);
    });
  });
});