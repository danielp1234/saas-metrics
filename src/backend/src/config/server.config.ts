/**
 * @fileoverview Server configuration module for the SaaS Metrics Platform.
 * Provides comprehensive server settings including security, performance, and environment-specific optimizations.
 * @version 1.0.0
 */

import cors from 'cors'; // v2.8.5
import helmet from 'helmet'; // v7.0.0
import rateLimit from 'express-rate-limit'; // v6.9.0
import compression from 'compression'; // v1.7.4
import { ProcessEnv } from '../types/environment';
import { HTTP_STATUS } from '../utils/constants';

/**
 * Interface defining the comprehensive server configuration structure
 */
interface ServerConfig {
  port: number;
  host: string;
  cors: cors.CorsOptions;
  rateLimit: {
    public: rateLimit.Options;
    admin: rateLimit.Options;
    export: rateLimit.Options;
  };
  helmet: helmet.HelmetOptions;
  compression: compression.CompressionOptions;
}

// Default configuration values
const DEFAULT_PORT = 3000;
const DEFAULT_HOST = '0.0.0.0';

/**
 * Custom key generator for rate limiting based on IP and route
 * @param req - Express request object
 * @returns string - Unique identifier for rate limiting
 */
const customKeyGenerator = (req: any): string => {
  return `${req.ip}-${req.path}`;
};

/**
 * Custom rate limit exceeded handler with error logging
 * @param req - Express request object
 * @param res - Express response object
 */
const customRateLimitHandler = (_req: any, res: any): void => {
  res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
    status: HTTP_STATUS.TOO_MANY_REQUESTS,
    message: 'Too many requests, please try again later.'
  });
};

/**
 * Response compression filter
 * @param req - Express request object
 * @param res - Express response object
 * @returns boolean - Whether to compress the response
 */
const shouldCompress = (req: any, res: any): boolean => {
  if (req.headers['x-no-compression']) return false;
  return compression.filter(req, res);
};

/**
 * Retrieves environment-specific server configuration
 * @returns ServerConfig - Configured server settings
 */
const getServerConfig = (): ServerConfig => {
  // Environment-specific configurations
  const isProduction = process.env.NODE_ENV === 'production';
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];

  // CORS Configuration
  const corsOptions: cors.CorsOptions = {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining'],
    credentials: true,
    maxAge: 86400,
    preflightContinue: false,
    optionsSuccessStatus: 204
  };

  // Rate Limiting Configuration
  const baseRateLimitOptions: rateLimit.Options = {
    windowMs: 60 * 1000, // 1 minute
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: customKeyGenerator,
    handler: customRateLimitHandler,
    skipFailedRequests: false
  };

  // Helmet Security Configuration
  const helmetOptions: helmet.HelmetOptions = {
    contentSecurityPolicy: {
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'", "'unsafe-inline'"],
        'style-src': ["'self'", "'unsafe-inline'"],
        'img-src': ["'self'", 'data:', 'https:'],
        'connect-src': ["'self'", 'https://api.saas-metrics.replit.app']
      }
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    frameguard: {
      action: 'deny'
    },
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin'
    }
  };

  // Compression Configuration
  const compressionOptions: compression.CompressionOptions = {
    level: 6,
    threshold: '1kb',
    filter: shouldCompress
  };

  return {
    port: parseInt(process.env.PORT || DEFAULT_PORT.toString(), 10),
    host: DEFAULT_HOST,
    cors: corsOptions,
    rateLimit: {
      public: {
        ...baseRateLimitOptions,
        max: 100 // 100 requests per minute for public routes
      },
      admin: {
        ...baseRateLimitOptions,
        max: 1000 // 1000 requests per minute for admin routes
      },
      export: {
        ...baseRateLimitOptions,
        max: 10 // 10 requests per minute for export routes
      }
    },
    helmet: isProduction ? helmetOptions : {},
    compression: compressionOptions
  };
};

// Export the configured server settings
export const serverConfig = getServerConfig();

// Export individual configurations for selective imports
export const {
  port,
  host,
  cors: corsConfig,
  rateLimit: rateLimitConfig,
  helmet: helmetConfig,
  compression: compressionConfig
} = serverConfig;