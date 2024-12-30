/**
 * @fileoverview Health check routes configuration with comprehensive monitoring
 * Implements system availability monitoring with circuit breaker pattern
 * @version 1.0.0
 */

// External imports
import { Router } from 'express'; // v4.18.x
import responseTime from 'response-time'; // v2.3.x
import rateLimit from 'express-rate-limit'; // v6.x.x
import CircuitBreaker from 'opossum'; // v0.0.x

// Internal imports
import { HealthController } from '../controllers/health.controller';
import { CacheService } from '../../services/cache.service';
import { logger } from '../../lib/logger';
import { ApiResponse } from '../../interfaces/response.interface';

// Constants for configuration
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 100; // 100 requests per minute
const CIRCUIT_BREAKER_TIMEOUT = 5000; // 5 seconds
const CIRCUIT_BREAKER_ERROR_THRESHOLD = 50; // 50% error threshold
const CIRCUIT_BREAKER_RESET_TIMEOUT = 30000; // 30 seconds

/**
 * Configures and initializes health check routes with monitoring
 * @returns Configured Express router for health check endpoints
 */
const initializeHealthRoutes = (): Router => {
  const router = Router();
  const cacheService = new CacheService();
  const healthController = new HealthController(cacheService);

  // Configure rate limiting for health check endpoints
  const limiter = rateLimit({
    windowMs: RATE_LIMIT_WINDOW,
    max: RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn('Health check rate limit exceeded', {
        ip: req.ip,
        path: req.path,
      });
      res.status(429).json({
        success: false,
        error: {
          code: 429,
          message: 'Too many health check requests',
          status: 'RATE_LIMITED',
          timestamp: Date.now(),
        },
      });
    },
  });

  // Configure circuit breaker for health checks
  const breaker = new CircuitBreaker(
    async (req: any, res: any) => await healthController.checkHealth(req, res),
    {
      timeout: CIRCUIT_BREAKER_TIMEOUT,
      errorThresholdPercentage: CIRCUIT_BREAKER_ERROR_THRESHOLD,
      resetTimeout: CIRCUIT_BREAKER_RESET_TIMEOUT,
    }
  );

  // Circuit breaker event handlers
  breaker.on('open', () => {
    logger.error('Health check circuit breaker opened');
  });

  breaker.on('halfOpen', () => {
    logger.info('Health check circuit breaker half-opened');
  });

  breaker.on('close', () => {
    logger.info('Health check circuit breaker closed');
  });

  // Apply response time monitoring middleware
  router.use(responseTime((req, res, time) => {
    logger.performance('Health check response time', {
      path: req.path,
      method: req.method,
      statusCode: res.statusCode,
      responseTime: time,
    });
  }));

  // Apply rate limiting middleware
  router.use(limiter);

  /**
   * @route GET /health
   * @description Basic health check endpoint for load balancers and monitoring
   * @access Public
   */
  router.get('/health', async (req, res) => {
    try {
      await breaker.fire(req, res);
    } catch (error) {
      logger.error('Health check failed', { error });
      const response: ApiResponse<null> = {
        success: false,
        data: null,
        error: {
          code: 503,
          message: 'Service unavailable',
          details: [(error as Error).message],
          status: 'SERVER_ERROR',
          timestamp: Date.now(),
        },
        metadata: {
          responseTime: 0,
          apiVersion: '1.0.0',
          timestamp: Date.now(),
          requestId: req.headers['x-request-id']?.toString() || '',
        },
      };
      res.status(503).json(response);
    }
  });

  /**
   * @route GET /health/detailed
   * @description Detailed health check endpoint with component status
   * @access Protected - Admin only
   */
  router.get('/health/detailed', async (req, res) => {
    try {
      const startTime = Date.now();
      const cacheHealth = await cacheService.checkConnection();
      
      const response: ApiResponse<any> = {
        success: true,
        data: {
          status: 'healthy',
          components: {
            cache: {
              status: cacheHealth ? 'healthy' : 'unhealthy',
              latency: Date.now() - startTime,
            },
            api: {
              status: 'healthy',
              uptime: process.uptime(),
            },
          },
          timestamp: new Date().toISOString(),
        },
        error: null,
        metadata: {
          responseTime: Date.now() - startTime,
          apiVersion: '1.0.0',
          timestamp: Date.now(),
          requestId: req.headers['x-request-id']?.toString() || '',
        },
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Detailed health check failed', { error });
      const response: ApiResponse<null> = {
        success: false,
        data: null,
        error: {
          code: 503,
          message: 'Service component check failed',
          details: [(error as Error).message],
          status: 'SERVER_ERROR',
          timestamp: Date.now(),
        },
        metadata: {
          responseTime: 0,
          apiVersion: '1.0.0',
          timestamp: Date.now(),
          requestId: req.headers['x-request-id']?.toString() || '',
        },
      };
      res.status(503).json(response);
    }
  });

  return router;
};

// Export configured health check router
export const healthRouter = initializeHealthRoutes();