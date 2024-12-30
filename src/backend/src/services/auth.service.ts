// @package google-auth-library ^8.0.0
// @package jsonwebtoken ^9.0.0
// @package ioredis ^5.0.0
import { OAuth2Client, TokenPayload } from 'google-auth-library';
import { sign, verify } from 'jsonwebtoken';
import Redis from 'ioredis';
import crypto from 'crypto';
import {
  AuthenticatedUser,
  SessionData,
  UserRole,
  GoogleProfile,
  AuthTokens,
  JWTCustomPayload
} from '../interfaces/auth.interface';

/**
 * Configuration constants for authentication service
 */
const AUTH_CONFIG = {
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID!,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET!,
  GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI!,
  JWT_SECRET: process.env.JWT_SECRET!,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET!,
  ACCESS_TOKEN_EXPIRY: 30 * 60, // 30 minutes
  REFRESH_TOKEN_EXPIRY: 7 * 24 * 60 * 60, // 7 days
  MAX_CONCURRENT_SESSIONS: 3,
  RATE_LIMIT_WINDOW: 15 * 60, // 15 minutes
  RATE_LIMIT_MAX_ATTEMPTS: 5
};

/**
 * Enhanced authentication service implementing secure Google OAuth flow,
 * JWT token management, and session handling with security monitoring
 */
export class AuthService {
  private oauth2Client: OAuth2Client;
  private redisClient: Redis;
  private sessionPrefix = 'session:';
  private rateLimitPrefix = 'ratelimit:';

  constructor() {
    // Initialize Google OAuth2 client with secure configuration
    this.oauth2Client = new OAuth2Client({
      clientId: AUTH_CONFIG.GOOGLE_CLIENT_ID,
      clientSecret: AUTH_CONFIG.GOOGLE_CLIENT_SECRET,
      redirectUri: AUTH_CONFIG.GOOGLE_REDIRECT_URI
    });

    // Initialize Redis with connection pooling
    this.redisClient = new Redis({
      host: process.env.REDIS_HOST,
      port: Number(process.env.REDIS_PORT),
      password: process.env.REDIS_PASSWORD,
      tls: process.env.NODE_ENV === 'production' ? {} : undefined,
      maxRetriesPerRequest: 3,
      enableReadyCheck: true
    });
  }

  /**
   * Authenticate user with Google OAuth and enforce security policies
   * @param code - OAuth authorization code
   * @param ipAddress - Client IP address
   * @param fingerprint - Client fingerprint
   */
  async authenticateWithGoogle(
    code: string,
    ipAddress: string,
    fingerprint: string
  ): Promise<AuthenticatedUser> {
    // Check rate limiting
    await this.checkRateLimit(ipAddress);

    try {
      // Exchange code for tokens
      const { tokens } = await this.oauth2Client.getToken(code);
      const ticket = await this.oauth2Client.verifyIdToken({
        idToken: tokens.id_token!,
        audience: AUTH_CONFIG.GOOGLE_CLIENT_ID
      });

      const payload = ticket.getPayload() as TokenPayload;
      
      // Validate email domain if required
      if (!payload.email_verified) {
        throw new Error('Email not verified');
      }

      // Create or update user profile
      const user: AuthenticatedUser = {
        id: payload.sub,
        email: payload.email!,
        role: await this.determineUserRole(payload.email!),
        lastLogin: new Date(),
        isActive: true
      };

      // Store user session with security context
      await this.storeUserSession(user, ipAddress, fingerprint);

      return user;
    } catch (error) {
      console.error('Google authentication error:', error);
      throw new Error('Authentication failed');
    }
  }

  /**
   * Generate secure JWT tokens with enhanced claims
   * @param user - Authenticated user
   * @param sessionContext - Session security context
   */
  async generateTokens(
    user: AuthenticatedUser,
    sessionContext: { ipAddress: string; fingerprint: string }
  ): Promise<AuthTokens> {
    // Check concurrent session limit
    await this.enforceSessionLimit(user.id);

    // Generate session ID
    const sessionId = crypto.randomBytes(32).toString('hex');

    // Create JWT payload with security context
    const payload: JWTCustomPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId,
      iat: Math.floor(Date.now() / 1000)
    };

    // Generate tokens with different expiry times
    const accessToken = sign(
      { ...payload, exp: Math.floor(Date.now() / 1000) + AUTH_CONFIG.ACCESS_TOKEN_EXPIRY },
      AUTH_CONFIG.JWT_SECRET
    );

    const refreshToken = sign(
      { ...payload, exp: Math.floor(Date.now() / 1000) + AUTH_CONFIG.REFRESH_TOKEN_EXPIRY },
      AUTH_CONFIG.JWT_REFRESH_SECRET
    );

    // Store session data
    const sessionData: SessionData = {
      userId: user.id,
      role: user.role,
      expiresAt: Math.floor(Date.now() / 1000) + AUTH_CONFIG.ACCESS_TOKEN_EXPIRY,
      ipAddress: sessionContext.ipAddress,
      userAgent: sessionContext.fingerprint
    };

    await this.redisClient.setex(
      `${this.sessionPrefix}${sessionId}`,
      AUTH_CONFIG.ACCESS_TOKEN_EXPIRY,
      JSON.stringify(sessionData)
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: AUTH_CONFIG.ACCESS_TOKEN_EXPIRY,
      tokenType: 'Bearer'
    };
  }

  /**
   * Validate JWT token and security context
   * @param token - JWT token to validate
   * @param ipAddress - Client IP address
   */
  async validateToken(token: string, ipAddress: string): Promise<JWTCustomPayload> {
    try {
      const decoded = verify(token, AUTH_CONFIG.JWT_SECRET) as JWTCustomPayload;
      
      // Validate session existence and context
      const sessionData = await this.redisClient.get(
        `${this.sessionPrefix}${decoded.sessionId}`
      );

      if (!sessionData) {
        throw new Error('Session expired');
      }

      const session: SessionData = JSON.parse(sessionData);
      
      // Validate IP address if strict mode
      if (process.env.STRICT_IP_CHECK === 'true' && session.ipAddress !== ipAddress) {
        throw new Error('Invalid session context');
      }

      return decoded;
    } catch (error) {
      console.error('Token validation error:', error);
      throw new Error('Invalid token');
    }
  }

  /**
   * Refresh access token with security validation
   * @param refreshToken - Valid refresh token
   * @param ipAddress - Client IP address
   */
  async refreshToken(
    refreshToken: string,
    ipAddress: string
  ): Promise<AuthTokens> {
    try {
      const decoded = verify(
        refreshToken,
        AUTH_CONFIG.JWT_REFRESH_SECRET
      ) as JWTCustomPayload;

      const user: AuthenticatedUser = {
        id: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        lastLogin: new Date(),
        isActive: true
      };

      return this.generateTokens(user, { ipAddress, fingerprint: decoded.sessionId });
    } catch (error) {
      console.error('Token refresh error:', error);
      throw new Error('Invalid refresh token');
    }
  }

  /**
   * Securely terminate user session
   * @param sessionId - Session identifier
   * @param userId - User identifier
   */
  async logout(sessionId: string, userId: string): Promise<void> {
    await this.redisClient.del(`${this.sessionPrefix}${sessionId}`);
    // Optionally invalidate all sessions for user
    const userSessions = await this.redisClient.keys(`${this.sessionPrefix}${userId}:*`);
    if (userSessions.length > 0) {
      await this.redisClient.del(userSessions);
    }
  }

  /**
   * Private helper methods
   */

  private async checkRateLimit(ipAddress: string): Promise<void> {
    const attempts = await this.redisClient.incr(`${this.rateLimitPrefix}${ipAddress}`);
    if (attempts === 1) {
      await this.redisClient.expire(
        `${this.rateLimitPrefix}${ipAddress}`,
        AUTH_CONFIG.RATE_LIMIT_WINDOW
      );
    }
    if (attempts > AUTH_CONFIG.RATE_LIMIT_MAX_ATTEMPTS) {
      throw new Error('Rate limit exceeded');
    }
  }

  private async enforceSessionLimit(userId: string): Promise<void> {
    const sessions = await this.redisClient.keys(`${this.sessionPrefix}${userId}:*`);
    if (sessions.length >= AUTH_CONFIG.MAX_CONCURRENT_SESSIONS) {
      // Remove oldest session
      const oldestSession = sessions[0];
      await this.redisClient.del(oldestSession);
    }
  }

  private async determineUserRole(email: string): Promise<UserRole> {
    // Implement role determination logic based on email domain or database lookup
    if (email.endsWith('@admin.com')) {
      return UserRole.ADMIN;
    }
    if (email.endsWith('@superadmin.com')) {
      return UserRole.SUPER_ADMIN;
    }
    return UserRole.PUBLIC;
  }

  private async storeUserSession(
    user: AuthenticatedUser,
    ipAddress: string,
    fingerprint: string
  ): Promise<void> {
    const sessionData: SessionData = {
      userId: user.id,
      role: user.role,
      expiresAt: Math.floor(Date.now() / 1000) + AUTH_CONFIG.ACCESS_TOKEN_EXPIRY,
      ipAddress,
      userAgent: fingerprint
    };

    await this.redisClient.setex(
      `${this.sessionPrefix}${user.id}:${fingerprint}`,
      AUTH_CONFIG.ACCESS_TOKEN_EXPIRY,
      JSON.stringify(sessionData)
    );
  }
}