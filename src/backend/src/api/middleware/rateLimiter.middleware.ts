// External imports
import rateLimit from 'express-rate-limit'; // v6.9.0
import RedisStore from 'rate-limit-redis'; // v3.0.0
import { Request, Response, NextFunction } from 'express'; // v4.18.0

// Internal imports
import { getClient } from '../../lib/cache';
import { serverConfig } from '../../config/server.config';
import { AuthenticatedRequest } from '../../interfaces/request.interface';
import { logger } from '../../lib/logger';

// Constants
const DEFAULT_MESSAGE = 'Too many requests. Please try again later.';
const WINDOW_MS = 60000; // 1 minute in milliseconds
const PUBLIC_MAX_REQUESTS = 100;
const AUTHENTICATED_MAX_REQUESTS = 1000;
const EXPORT_MAX_REQUESTS = 10;
const REDIS_RETRY_ATTEMPTS = 3;
const REDIS_RETRY_DELAY = 1000;
const MONITORING_INTERVAL = 5000;

/**
 * Interface for enhanced rate limiter options
 */
interface RateLimiterOptions extends rateLimit.Options {
  requestTracker?: (req: Request) => void;
  validationRules?: Record<string, unknown>;
}

/**
 * Creates a rate limiter middleware instance with Redis store and enhanced monitoring
 * @param options - Configuration options for the rate limiter
 * @returns Configured rate limiter middleware
 */
const createRateLimiter = async (options: RateLimiterOptions) => {
  const redisClient = await getClient();

  // Configure Redis store with failover
  const store = new RedisStore({
    sendCommand: (...args: string[]) => redisClient.call(...args),
    prefix: 'rl:',
    resetExpiryOnChange: true,
    retryStrategy: (times: number) => {
      if (times > REDIS_RETRY_ATTEMPTS) {
        logger.error('Redis rate limiter retry limit exceeded', { times });
        return null;
      }
      return Math.min(times * REDIS_RETRY_DELAY, 5000);
    }
  });

  // Configure monitoring
  const monitorRateLimits = () => {
    const metrics = {
      timestamp: new Date().toISOString(),
      totalRequests: 0,
      blockedRequests: 0,
    };

    logger.performance('Rate limiter metrics', metrics);
  };

  // Start monitoring interval
  setInterval(monitorRateLimits, MONITORING_INTERVAL);

  // Configure custom request tracking
  const trackRequest = (req: Request) => {
    const clientIp = req.ip;
    const path = req.path;
    const userAgent = req.headers['user-agent'];

    logger.info('Rate limit request tracked', {
      clientIp,
      path,
      userAgent,
      timestamp: new Date().toISOString()
    });

    if (options.requestTracker) {
      options.requestTracker(req);
    }
  };

  return rateLimit({
    windowMs: options.windowMs || WINDOW_MS,
    max: options.max,
    message: options.message || DEFAULT_MESSAGE,
    store,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request): string => {
      const authReq = req as AuthenticatedRequest;
      return authReq.user?.id 
        ? `${authReq.user.id}:${req.path}`
        : `${req.ip}:${req.path}`;
    },
    handler: (req: Request, res: Response) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        path: req.path,
        timestamp: new Date().toISOString()
      });
      
      res.status(429).json({
        error: options.message || DEFAULT_MESSAGE,
        retryAfter: Math.ceil(WINDOW_MS / 1000)
      });
    },
    skip: (req: Request) => {
      // Skip health check endpoints
      return req.path === '/health' || req.path === '/metrics';
    },
    requestWasSuccessful: (req: Request) => {
      trackRequest(req);
      return true;
    }
  });
};

/**
 * Rate limiter for public API endpoints
 * Implements 100 requests per minute limit
 */
export const publicEndpointLimiter = async () => createRateLimiter({
  windowMs: WINDOW_MS,
  max: PUBLIC_MAX_REQUESTS,
  message: 'Public API rate limit exceeded. Please try again later.',
});

/**
 * Rate limiter for authenticated API endpoints
 * Implements 1000 requests per minute limit
 */
export const authenticatedEndpointLimiter = async () => createRateLimiter({
  windowMs: WINDOW_MS,
  max: AUTHENTICATED_MAX_REQUESTS,
  message: 'Authenticated API rate limit exceeded. Please try again later.',
});

/**
 * Rate limiter for export API endpoints
 * Implements 10 requests per minute limit
 */
export const exportEndpointLimiter = async () => createRateLimiter({
  windowMs: WINDOW_MS,
  max: EXPORT_MAX_REQUESTS,
  message: 'Export API rate limit exceeded. Please try again later.',
});

/**
 * Error handler middleware for rate limiter failures
 */
export const rateLimitErrorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error('Rate limiter error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    ip: req.ip
  });

  res.status(500).json({
    error: 'Internal rate limiting error occurred'
  });
};