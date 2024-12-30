/**
 * @fileoverview Main router configuration aggregating all API routes with comprehensive
 * security, monitoring, and error handling for the SaaS Metrics Platform.
 * @version 1.0.0
 */

// External imports with versions
import express, { Router } from 'express'; // ^4.18.x
import cors from 'cors'; // ^2.8.x
import helmet from 'helmet'; // ^7.0.x
import compression from 'compression'; // ^1.7.x
import rateLimit from 'express-rate-limit'; // ^6.x.x
import swaggerUi from 'swagger-ui-express'; // ^5.0.x

// Internal imports
import healthRouter from './health.routes';
import authRouter from './auth.routes';
import metricsRouter from './metrics.routes';
import benchmarkRouter from './benchmark.routes';
import adminRouter from './admin.routes';
import errorHandler from '../middleware/error.middleware';
import { logger } from '../../lib/logger';

// Constants
const API_VERSION = 'v1';
const API_PREFIX = '/api';
const CORS_ORIGINS = process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'];
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 100; // requests per window

/**
 * Initializes and configures all application routes with comprehensive middleware
 * @returns Configured Express router
 */
function initializeRoutes(): Router {
  const router = Router();

  // Apply security middleware
  router.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
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
  }));

  // Configure CORS
  router.use(cors({
    origin: CORS_ORIGINS,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 600 // 10 minutes
  }));

  // Apply compression
  router.use(compression({
    threshold: 1024, // only compress responses > 1KB
    level: 6, // compression level
    memLevel: 8 // memory usage level
  }));

  // Add request correlation ID
  router.use((req, res, next) => {
    req.id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    res.setHeader('X-Request-Id', req.id);
    next();
  });

  // Mount health check routes
  router.use('/health', healthRouter);

  // Configure rate limiting for API routes
  const apiLimiter = rateLimit({
    windowMs: RATE_LIMIT_WINDOW,
    max: RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: 'Too many requests, please try again later',
      code: 429
    }
  });

  // Mount API documentation
  router.use('/api/docs', swaggerUi.serve);
  router.get('/api/docs', swaggerUi.setup(null, {
    swaggerOptions: {
      url: '/api/swagger.json'
    }
  }));

  // Mount versioned API routes with rate limiting
  router.use(
    `${API_PREFIX}/${API_VERSION}`,
    apiLimiter,
    express.json({ limit: '10kb' }), // request size limit
    (req, res, next) => {
      // Log API request
      logger.info('API Request', {
        method: req.method,
        path: req.path,
        requestId: req.id,
        ip: req.ip
      });
      next();
    }
  );

  // Mount feature routes
  router.use(`${API_PREFIX}/${API_VERSION}/auth`, authRouter);
  router.use(`${API_PREFIX}/${API_VERSION}/metrics`, metricsRouter);
  router.use(`${API_PREFIX}/${API_VERSION}/benchmarks`, benchmarkRouter);
  router.use(`${API_PREFIX}/${API_VERSION}/admin`, adminRouter);

  // Handle 404 errors
  router.use((req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: 404,
        message: 'Resource not found',
        status: 'NOT_FOUND',
        timestamp: Date.now()
      },
      data: null,
      metadata: {
        requestId: req.id,
        timestamp: Date.now()
      }
    });
  });

  // Apply error handling middleware
  router.use(errorHandler);

  return router;
}

// Export configured router
export default initializeRoutes();