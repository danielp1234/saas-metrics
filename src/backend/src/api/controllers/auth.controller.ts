// @package winston ^3.8.0
import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../../services/auth.service';
import { ApiResponse } from '../../interfaces/response.interface';
import { AuthenticatedUser, UserRole } from '../../interfaces/auth.interface';
import { Logger } from 'winston';

/**
 * Enhanced authentication controller implementing secure Google OAuth flow,
 * session management, and comprehensive security measures
 */
export class AuthController {
  private readonly COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  };

  constructor(
    private readonly authService: AuthService,
    private readonly logger: Logger
  ) {}

  /**
   * Handle Google OAuth login with enhanced security measures
   * Implements IP tracking and rate limiting
   */
  public login = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Validate required parameters
      const { code, fingerprint } = req.body;
      if (!code || !fingerprint) {
        res.status(400).json({
          success: false,
          error: {
            code: 400,
            message: 'Missing required parameters',
            details: ['code and fingerprint are required'],
            status: 'VALIDATION_ERROR',
            timestamp: Date.now()
          },
          data: null,
          metadata: {
            responseTime: 0,
            apiVersion: '1.0',
            timestamp: Date.now(),
            requestId: req.id
          }
        } as ApiResponse<null>);
        return;
      }

      // Extract client IP with proxy support
      const ipAddress = req.ip || 
        req.headers['x-forwarded-for'] as string || 
        req.socket.remoteAddress || 
        'unknown';

      // Track login attempt for security monitoring
      await this.authService.trackLoginAttempt(ipAddress);

      // Authenticate with Google
      const user = await this.authService.authenticateWithGoogle(
        code,
        ipAddress,
        fingerprint
      );

      // Generate secure tokens
      const tokens = await this.authService.generateTokens(user, {
        ipAddress,
        fingerprint
      });

      // Set secure HTTP-only cookies
      res.cookie('refreshToken', tokens.refreshToken, this.COOKIE_OPTIONS);

      // Log successful authentication
      this.logger.info('Successful authentication', {
        userId: user.id,
        email: user.email,
        ipAddress,
        timestamp: new Date().toISOString()
      });

      // Return success response with user data
      res.status(200).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            lastLogin: user.lastLogin
          },
          accessToken: tokens.accessToken,
          expiresIn: tokens.expiresIn,
          tokenType: tokens.tokenType
        },
        error: null,
        metadata: {
          responseTime: Date.now() - req.startTime,
          apiVersion: '1.0',
          timestamp: Date.now(),
          requestId: req.id
        }
      } as ApiResponse<any>);
    } catch (error) {
      this.logger.error('Authentication error', {
        error: error.message,
        ipAddress: req.ip,
        timestamp: new Date().toISOString()
      });

      next(error);
    }
  };

  /**
   * Handle token refresh with enhanced session validation
   * Implements IP validation and session tracking
   */
  public refreshToken = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Extract refresh token from secure cookie
      const refreshToken = req.cookies.refreshToken;
      if (!refreshToken) {
        res.status(401).json({
          success: false,
          error: {
            code: 401,
            message: 'Refresh token required',
            details: ['No refresh token provided'],
            status: 'UNAUTHORIZED',
            timestamp: Date.now()
          },
          data: null,
          metadata: {
            responseTime: 0,
            apiVersion: '1.0',
            timestamp: Date.now(),
            requestId: req.id
          }
        } as ApiResponse<null>);
        return;
      }

      // Extract client IP
      const ipAddress = req.ip || 
        req.headers['x-forwarded-for'] as string || 
        req.socket.remoteAddress || 
        'unknown';

      // Validate session and generate new tokens
      const tokens = await this.authService.refreshToken(refreshToken, ipAddress);

      // Set new secure cookie
      res.cookie('refreshToken', tokens.refreshToken, this.COOKIE_OPTIONS);

      // Log token refresh
      this.logger.info('Token refresh successful', {
        ipAddress,
        timestamp: new Date().toISOString()
      });

      // Return new access token
      res.status(200).json({
        success: true,
        data: {
          accessToken: tokens.accessToken,
          expiresIn: tokens.expiresIn,
          tokenType: tokens.tokenType
        },
        error: null,
        metadata: {
          responseTime: Date.now() - req.startTime,
          apiVersion: '1.0',
          timestamp: Date.now(),
          requestId: req.id
        }
      } as ApiResponse<any>);
    } catch (error) {
      this.logger.error('Token refresh error', {
        error: error.message,
        ipAddress: req.ip,
        timestamp: new Date().toISOString()
      });

      next(error);
    }
  };

  /**
   * Handle logout with enhanced session cleanup
   * Implements comprehensive session termination
   */
  public logout = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Extract session data from authenticated request
      const { userId, sessionId } = req.user;

      // Validate session exists
      await this.authService.validateSession(sessionId);

      // Perform logout and session cleanup
      await this.authService.logout(sessionId, userId);

      // Clear auth cookies
      res.clearCookie('refreshToken', this.COOKIE_OPTIONS);

      // Log logout event
      this.logger.info('User logged out', {
        userId,
        sessionId,
        timestamp: new Date().toISOString()
      });

      // Return success response
      res.status(200).json({
        success: true,
        data: null,
        error: null,
        metadata: {
          responseTime: Date.now() - req.startTime,
          apiVersion: '1.0',
          timestamp: Date.now(),
          requestId: req.id
        }
      } as ApiResponse<null>);
    } catch (error) {
      this.logger.error('Logout error', {
        error: error.message,
        timestamp: new Date().toISOString()
      });

      next(error);
    }
  };
}