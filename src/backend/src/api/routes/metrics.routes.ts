/**
 * @fileoverview Express router configuration for SaaS metrics API endpoints
 * Implements RESTful routes with comprehensive middleware chains for authentication,
 * caching, validation, monitoring, and error handling.
 * @version 1.0.0
 */

// External imports with versions
import { Router } from 'express'; // ^4.18.x
import compression from 'compression'; // ^1.7.x
import rateLimit from 'express-rate-limit'; // ^6.x.x

// Internal imports
import { MetricsController } from '../controllers/metrics.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { cacheMiddleware } from '../middleware/cache.middleware';
import { validateMetricsRequest } from '../validators/metrics.validator';
import { errorHandler } from '../middleware/error.middleware';
import { requestLogger } from '../middleware/logging.middleware';
import { UserRole } from '../../interfaces/auth.interface';

// Constants
const CACHE_TTL = 900; // 15 minutes in seconds
const RATE_LIMIT_WINDOW = 60000; // 1 minute in milliseconds
const RATE_LIMIT_MAX = 100; // Maximum requests per window
const COMPRESSION_THRESHOLD = 1024; // Compression threshold in bytes

/**
 * Initialize and configure metrics routes with comprehensive middleware chains
 */
const router = Router();

// Initialize metrics controller
const metricsController = new MetricsController();

// Apply global middleware
router.use(compression({
  threshold: COMPRESSION_THRESHOLD,
  level: 6, // Compression level (0-9)
  memLevel: 8 // Memory level (1-9)
}));
router.use(requestLogger);

// Configure rate limiting
const rateLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW,
  max: RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests, please try again later.'
});

/**
 * Health check endpoint for monitoring
 * @route GET /api/metrics/health
 * @access Public
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

/**
 * Retrieve all metrics with filtering and pagination
 * @route GET /api/metrics
 * @access Public
 */
router.get('/',
  rateLimiter,
  cacheMiddleware({ ttl: CACHE_TTL }),
  validateMetricsRequest,
  metricsController.getMetrics
);

/**
 * Retrieve specific metric by ID
 * @route GET /api/metrics/:id
 * @access Public
 */
router.get('/:id',
  rateLimiter,
  cacheMiddleware({ ttl: CACHE_TTL }),
  validateMetricsRequest,
  metricsController.getMetricById
);

/**
 * Create new metric
 * @route POST /api/metrics
 * @access Admin only
 */
router.post('/',
  rateLimiter,
  authenticate,
  authorize([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  validateMetricsRequest,
  metricsController.createMetric
);

/**
 * Update existing metric
 * @route PUT /api/metrics/:id
 * @access Admin only
 */
router.put('/:id',
  rateLimiter,
  authenticate,
  authorize([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  validateMetricsRequest,
  metricsController.updateMetric
);

/**
 * Delete existing metric
 * @route DELETE /api/metrics/:id
 * @access Admin only
 */
router.delete('/:id',
  rateLimiter,
  authenticate,
  authorize([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  metricsController.deleteMetric
);

// Apply error handling middleware last
router.use(errorHandler);

export default router;