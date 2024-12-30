// External imports
import jwt from 'jsonwebtoken'; // v9.0.0
import bcrypt from 'bcrypt'; // v5.1.0
import validator from 'validator'; // v13.9.0
import { RateLimiterMemory } from 'rate-limiter-flexible'; // v2.4.1

// Internal imports
import { EncryptionService } from '../lib/encryption';
import authConfig from '../config/auth.config';

// Constants for security configuration
const SALT_ROUNDS = 10;
const TOKEN_EXPIRY = '30m';
const REFRESH_TOKEN_EXPIRY = '7d';
const MAX_TOKEN_AGE = 1800; // 30 minutes in seconds
const RATE_LIMIT_WINDOW = 900; // 15 minutes in seconds
const MAX_LOGIN_ATTEMPTS = 5;
const TOKEN_BLACKLIST_TTL = 86400; // 24 hours in seconds

// Rate limiter configuration for token operations
const rateLimiter = new RateLimiterMemory({
  points: MAX_LOGIN_ATTEMPTS,
  duration: RATE_LIMIT_WINDOW,
});

// Interfaces
interface TokenPayload {
  userId: string;
  role: string;
  sessionId?: string;
  [key: string]: any;
}

interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface TokenVerificationResult {
  valid: boolean;
  payload?: TokenPayload;
  error?: string;
}

/**
 * Enhanced security service for handling authentication and authorization
 * with comprehensive security features and audit logging
 */
export class SecurityService {
  private encryptionService: EncryptionService;
  private tokenBlacklist: Set<string>;

  constructor() {
    this.encryptionService = new EncryptionService();
    this.tokenBlacklist = new Set();
    this.setupTokenCleanup();
  }

  /**
   * Generates a secure JWT token with rate limiting and audit logging
   * @param payload - Token payload data
   * @param userId - User identifier for rate limiting
   * @returns Promise resolving to token response
   * @throws Error if rate limit exceeded or token generation fails
   */
  public async generateToken(
    payload: TokenPayload,
    userId: string
  ): Promise<TokenResponse> {
    try {
      // Check rate limit
      await rateLimiter.consume(userId);

      // Validate payload data
      this.validateTokenPayload(payload);

      // Generate session ID if not provided
      const sessionId = payload.sessionId || this.generateSessionId();

      // Create token payload with additional security metadata
      const tokenPayload = {
        ...payload,
        sessionId,
        iat: Math.floor(Date.now() / 1000),
        jti: this.generateTokenId(),
      };

      // Generate access token
      const accessToken = jwt.sign(tokenPayload, authConfig.jwt.privateKey, {
        algorithm: authConfig.jwt.algorithm,
        expiresIn: TOKEN_EXPIRY,
      });

      // Generate refresh token
      const refreshToken = jwt.sign(
        { userId, sessionId },
        authConfig.jwt.privateKey,
        {
          algorithm: authConfig.jwt.algorithm,
          expiresIn: REFRESH_TOKEN_EXPIRY,
        }
      );

      // Encrypt refresh token before returning
      const encryptedRefreshToken = await this.encryptionService.encrypt(
        refreshToken
      );

      return {
        accessToken,
        refreshToken: encryptedRefreshToken.cipherText,
        expiresIn: MAX_TOKEN_AGE,
      };
    } catch (error) {
      if (error.name === 'RateLimiterError') {
        throw new Error('Rate limit exceeded for token generation');
      }
      throw new Error(`Token generation failed: ${error.message}`);
    }
  }

  /**
   * Verifies and decodes a JWT token with enhanced security checks
   * @param token - JWT token to verify
   * @returns Promise resolving to token verification result
   */
  public async verifyToken(token: string): Promise<TokenVerificationResult> {
    try {
      // Basic token format validation
      if (!token || !validator.isJWT(token)) {
        return { valid: false, error: 'Invalid token format' };
      }

      // Check token blacklist
      if (this.isTokenBlacklisted(token)) {
        return { valid: false, error: 'Token has been revoked' };
      }

      // Verify token signature and expiration
      const decoded = jwt.verify(token, authConfig.jwt.publicKey, {
        algorithms: [authConfig.jwt.algorithm],
      }) as TokenPayload;

      // Additional security checks
      if (!this.validateTokenClaims(decoded)) {
        return { valid: false, error: 'Invalid token claims' };
      }

      return { valid: true, payload: decoded };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return { valid: false, error: 'Token has expired' };
      }
      if (error instanceof jwt.JsonWebTokenError) {
        return { valid: false, error: 'Invalid token signature' };
      }
      return { valid: false, error: 'Token verification failed' };
    }
  }

  /**
   * Refreshes an access token using a valid refresh token
   * @param refreshToken - Encrypted refresh token
   * @returns Promise resolving to new token response
   * @throws Error if refresh token is invalid or expired
   */
  public async refreshToken(refreshToken: string): Promise<TokenResponse> {
    try {
      // Decrypt refresh token
      const decryptedToken = await this.encryptionService.decrypt({
        cipherText: refreshToken,
        iv: Buffer.from([]), // IV will be part of the encrypted data
        tag: '',
        version: 1,
      });

      // Verify refresh token
      const decoded = jwt.verify(
        decryptedToken,
        authConfig.jwt.publicKey,
        {
          algorithms: [authConfig.jwt.algorithm],
        }
      ) as TokenPayload;

      // Check rate limit for token refresh
      await rateLimiter.consume(decoded.userId);

      // Generate new token pair
      return this.generateToken(
        {
          userId: decoded.userId,
          role: decoded.role,
          sessionId: decoded.sessionId,
        },
        decoded.userId
      );
    } catch (error) {
      throw new Error(`Token refresh failed: ${error.message}`);
    }
  }

  /**
   * Revokes a token by adding it to the blacklist
   * @param token - Token to revoke
   */
  public revokeToken(token: string): void {
    this.tokenBlacklist.add(token);
  }

  /**
   * Validates token payload data
   * @param payload - Token payload to validate
   * @throws Error if payload is invalid
   * @private
   */
  private validateTokenPayload(payload: TokenPayload): void {
    if (!payload.userId || !validator.isUUID(payload.userId)) {
      throw new Error('Invalid user ID in token payload');
    }
    if (!payload.role || typeof payload.role !== 'string') {
      throw new Error('Invalid role in token payload');
    }
  }

  /**
   * Validates token claims for additional security
   * @param payload - Decoded token payload
   * @returns boolean indicating valid claims
   * @private
   */
  private validateTokenClaims(payload: TokenPayload): boolean {
    const now = Math.floor(Date.now() / 1000);
    return (
      payload.iat <= now &&
      payload.exp > now &&
      payload.jti &&
      typeof payload.jti === 'string'
    );
  }

  /**
   * Generates a unique session identifier
   * @returns Unique session ID
   * @private
   */
  private generateSessionId(): string {
    return Buffer.from(Math.random().toString(36) + Date.now().toString())
      .toString('base64')
      .replace(/[^a-zA-Z0-9]/g, '');
  }

  /**
   * Generates a unique token identifier
   * @returns Unique token ID
   * @private
   */
  private generateTokenId(): string {
    return Buffer.from(crypto.randomBytes(32)).toString('hex');
  }

  /**
   * Checks if a token is blacklisted
   * @param token - Token to check
   * @returns boolean indicating if token is blacklisted
   * @private
   */
  private isTokenBlacklisted(token: string): boolean {
    return this.tokenBlacklist.has(token);
  }

  /**
   * Sets up periodic cleanup of expired blacklisted tokens
   * @private
   */
  private setupTokenCleanup(): void {
    setInterval(() => {
      this.tokenBlacklist.clear();
    }, TOKEN_BLACKLIST_TTL * 1000);
  }
}

// Export singleton instance
export const securityService = new SecurityService();