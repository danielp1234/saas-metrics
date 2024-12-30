/**
 * @fileoverview Authentication routes configuration with comprehensive security,
 * monitoring, and error handling for Google OAuth flow and session management.
 * @version 1.0.0
 */

// @package express ^4.18.0
// @package helmet ^7.0.0
// @package cors ^2.8.5
// @package compression ^1.7.4
// @package express-rate-limit ^6.7.0
import express, { Router } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { errorHandler } from '../middleware/error.middleware';
import { LoginRequestDTO, TokenValidationDTO } from '../validators/auth.validator';
import { logger } from '../../lib/logger';

/**
 * Rate limiting configuration for authentication endpoints
 * Implements requirements from Technical Specification section 7.3.1
 */
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: {
    error: 'Too many authentication attempts, please try again later',
    code: 429
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || req.headers['x-forwarded-for'] as string;
  }
});

/**
 * CORS configuration for authentication endpoints
 */
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGINS?.split(',') 
    : '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-Request-Id'],
  credentials: true,
  maxAge: 600 // 10 minutes
};

/**
 * Security headers configuration using helmet
 */
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: "same-site" },
  dnsPrefetchControl: true,
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: true,
  ieNoOpen: true,
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true
});

/**
 * Initializes authentication routes with comprehensive security measures
 * and monitoring capabilities
 */
export function initializeAuthRoutes(): Router {
  const router = express.Router();
  const authController = new AuthController();

  // Apply security middleware
  router.use(securityHeaders);
  router.use(cors(corsOptions));
  router.use(compression());
  router.use(authRateLimiter);
  router.use(express.json({ limit: '10kb' })); // Request size limit

  // Health check endpoint for monitoring
  router.get('/health', (req, res) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString()
    });
  });

  /**
   * @route POST /auth/login
   * @description Handle Google OAuth login with enhanced security
   */
  router.post('/login',
    LoginRequestDTO.validate,
    async (req, res, next) => {
      try {
        logger.info('Login attempt', {
          ip: req.ip,
          userAgent: req.headers['user-agent']
        });
        await authController.login(req, res, next);
      } catch (error) {
        logger.error('Login error', {
          error: error.message,
          ip: req.ip
        });
        next(error);
      }
    }
  );

  /**
   * @route POST /auth/refresh
   * @description Refresh access token with security validation
   */
  router.post('/refresh',
    TokenValidationDTO.validate,
    async (req, res, next) => {
      try {
        logger.info('Token refresh attempt', {
          ip: req.ip,
          userAgent: req.headers['user-agent']
        });
        await authController.refreshToken(req, res, next);
      } catch (error) {
        logger.error('Token refresh error', {
          error: error.message,
          ip: req.ip
        });
        next(error);
      }
    }
  );

  /**
   * @route POST /auth/logout
   * @description Handle user logout with session cleanup
   */
  router.post('/logout',
    authenticate,
    async (req, res, next) => {
      try {
        logger.info('Logout attempt', {
          userId: req.user?.id,
          ip: req.ip
        });
        await authController.logout(req, res, next);
      } catch (error) {
        logger.error('Logout error', {
          error: error.message,
          ip: req.ip
        });
        next(error);
      }
    }
  );

  // Apply error handling middleware
  router.use(errorHandler);

  return router;
}

// Export configured router
export default initializeAuthRoutes();