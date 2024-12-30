// @package jest ^29.0.0
// @package supertest ^6.3.0
// @package @types/express ^4.17.0
// @package redis ^4.0.0

import { describe, expect, jest, beforeEach, afterEach, it } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import { AuthController } from '../../../src/api/controllers/auth.controller';
import { AuthService } from '../../../src/services/auth.service';
import { UserRole } from '../../../src/interfaces/auth.interface';
import { ResponseStatus } from '../../../src/interfaces/response.interface';
import { Logger } from 'winston';

// Mock dependencies
jest.mock('../../../src/services/auth.service');
jest.mock('winston');

describe('AuthController', () => {
  let authController: AuthController;
  let mockAuthService: jest.Mocked<AuthService>;
  let mockLogger: jest.Mocked<Logger>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    // Reset mocks
    mockAuthService = {
      authenticateWithGoogle: jest.fn(),
      generateTokens: jest.fn(),
      validateToken: jest.fn(),
      refreshToken: jest.fn(),
      logout: jest.fn(),
      validateSession: jest.fn(),
      trackLoginAttempt: jest.fn(),
      checkRateLimit: jest.fn()
    } as unknown as jest.Mocked<AuthService>;

    mockLogger = {
      info: jest.fn(),
      error: jest.fn()
    } as unknown as jest.Mocked<Logger>;

    // Initialize controller
    authController = new AuthController(mockAuthService, mockLogger);

    // Setup request/response mocks
    mockRequest = {
      body: {},
      cookies: {},
      ip: '127.0.0.1',
      headers: {},
      startTime: Date.now(),
      id: 'test-request-id'
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      cookie: jest.fn(),
      clearCookie: jest.fn()
    };

    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    const validLoginPayload = {
      code: 'valid-oauth-code',
      fingerprint: 'device-fingerprint'
    };

    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      role: UserRole.ADMIN,
      lastLogin: new Date(),
      isActive: true
    };

    const mockTokens = {
      accessToken: 'access-token-123',
      refreshToken: 'refresh-token-123',
      expiresIn: 1800,
      tokenType: 'Bearer'
    };

    it('should successfully authenticate with Google OAuth and set secure session', async () => {
      // Setup test data
      mockRequest.body = validLoginPayload;
      mockAuthService.authenticateWithGoogle.mockResolvedValue(mockUser);
      mockAuthService.generateTokens.mockResolvedValue(mockTokens);

      // Execute test
      await authController.login(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Verify authentication flow
      expect(mockAuthService.trackLoginAttempt).toHaveBeenCalledWith('127.0.0.1');
      expect(mockAuthService.authenticateWithGoogle).toHaveBeenCalledWith(
        validLoginPayload.code,
        '127.0.0.1',
        validLoginPayload.fingerprint
      );

      // Verify token generation
      expect(mockAuthService.generateTokens).toHaveBeenCalledWith(
        mockUser,
        {
          ipAddress: '127.0.0.1',
          fingerprint: validLoginPayload.fingerprint
        }
      );

      // Verify response
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refreshToken',
        mockTokens.refreshToken,
        expect.objectContaining({
          httpOnly: true,
          secure: expect.any(Boolean),
          sameSite: 'strict'
        })
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            user: expect.objectContaining({
              id: mockUser.id,
              email: mockUser.email,
              role: mockUser.role
            }),
            accessToken: mockTokens.accessToken
          })
        })
      );
    });

    it('should handle missing required parameters', async () => {
      // Setup test with missing parameters
      mockRequest.body = {};

      // Execute test
      await authController.login(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Verify error response
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 400,
            message: 'Missing required parameters',
            status: ResponseStatus.VALIDATION_ERROR
          })
        })
      );
    });

    it('should handle rate limiting', async () => {
      // Setup rate limit exceeded scenario
      mockRequest.body = validLoginPayload;
      mockAuthService.trackLoginAttempt.mockRejectedValue(new Error('Rate limit exceeded'));

      // Execute test
      await authController.login(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Verify error handling
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Authentication error',
        expect.objectContaining({
          error: 'Rate limit exceeded'
        })
      );
    });
  });

  describe('refreshToken', () => {
    const mockRefreshToken = 'valid-refresh-token';
    const mockNewTokens = {
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      expiresIn: 1800,
      tokenType: 'Bearer'
    };

    it('should successfully refresh tokens with valid refresh token', async () => {
      // Setup test data
      mockRequest.cookies = { refreshToken: mockRefreshToken };
      mockAuthService.refreshToken.mockResolvedValue(mockNewTokens);

      // Execute test
      await authController.refreshToken(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Verify token refresh
      expect(mockAuthService.refreshToken).toHaveBeenCalledWith(
        mockRefreshToken,
        '127.0.0.1'
      );

      // Verify response
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refreshToken',
        mockNewTokens.refreshToken,
        expect.any(Object)
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            accessToken: mockNewTokens.accessToken,
            expiresIn: mockNewTokens.expiresIn
          })
        })
      );
    });

    it('should handle missing refresh token', async () => {
      // Setup test with missing refresh token
      mockRequest.cookies = {};

      // Execute test
      await authController.refreshToken(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Verify error response
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 401,
            message: 'Refresh token required',
            status: ResponseStatus.UNAUTHORIZED
          })
        })
      );
    });
  });

  describe('logout', () => {
    const mockSessionData = {
      userId: 'user-123',
      sessionId: 'session-123'
    };

    it('should successfully logout and clear session', async () => {
      // Setup test data
      mockRequest.user = mockSessionData;

      // Execute test
      await authController.logout(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Verify session cleanup
      expect(mockAuthService.validateSession).toHaveBeenCalledWith(mockSessionData.sessionId);
      expect(mockAuthService.logout).toHaveBeenCalledWith(
        mockSessionData.sessionId,
        mockSessionData.userId
      );

      // Verify cookie clearing
      expect(mockResponse.clearCookie).toHaveBeenCalledWith(
        'refreshToken',
        expect.any(Object)
      );

      // Verify response
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: null
        })
      );
    });

    it('should handle invalid session during logout', async () => {
      // Setup test with invalid session
      mockRequest.user = mockSessionData;
      mockAuthService.validateSession.mockRejectedValue(new Error('Invalid session'));

      // Execute test
      await authController.logout(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Verify error handling
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Logout error',
        expect.objectContaining({
          error: 'Invalid session'
        })
      );
    });
  });
});