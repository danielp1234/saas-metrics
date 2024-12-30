/**
 * @fileoverview Express router configuration for benchmark data endpoints
 * Implements secure, validated routes with comprehensive middleware stack
 * @version 1.0.0
 */

// External imports
import { Router } from 'express'; // v4.18.x

// Internal imports
import { BenchmarkController } from '../controllers/benchmark.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { 
  validateBenchmarkImport, 
  validatePagination 
} from '../middleware/validation.middleware';
import { cacheMiddleware } from '../middleware/cache.middleware';
import { UserRole } from '../../interfaces/auth.interface';
import { logger } from '../../lib/logger';

/**
 * Initialize and configure benchmark routes with comprehensive middleware stack
 * Implements requirements from Technical Specification sections 3.3.2 and 7.3.1
 */
const router = Router();

// Initialize controller
const benchmarkController = new BenchmarkController();

/**
 * Cache configuration for public endpoints
 */
const CACHE_CONFIG = {
  ttl: 900, // 15 minutes
  enabled: true,
  excludePaths: [],
  compression: true,
  version: 1,
  monitoring: {
    enabled: true,
    sampleRate: 0.1
  }
};

/**
 * Public Routes - Implement caching and validation
 */

/**
 * @route GET /api/v1/benchmarks
 * @description Get benchmark data with filtering and pagination
 * @access Public
 */
router.get(
  '/',
  validatePagination,
  cacheMiddleware(CACHE_CONFIG),
  async (req, res, next) => {
    try {
      const startTime = process.hrtime();
      await benchmarkController.getBenchmarksByFilter(req, res, next);
      
      // Log performance metrics
      const [seconds, nanoseconds] = process.hrtime(startTime);
      const duration = seconds * 1000 + nanoseconds / 1000000;
      
      logger.performance('Benchmark list request', {
        duration,
        query: req.query,
        source: res.locals.cacheHit ? 'cache' : 'database'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/v1/benchmarks/percentiles
 * @description Get percentile distribution for benchmarks
 * @access Public
 */
router.get(
  '/percentiles',
  validatePagination,
  cacheMiddleware(CACHE_CONFIG),
  async (req, res, next) => {
    try {
      const startTime = process.hrtime();
      await benchmarkController.getPercentileDistribution(req, res, next);
      
      const [seconds, nanoseconds] = process.hrtime(startTime);
      const duration = seconds * 1000 + nanoseconds / 1000000;
      
      logger.performance('Percentile distribution request', {
        duration,
        query: req.query,
        source: res.locals.cacheHit ? 'cache' : 'database'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/v1/benchmarks/:id
 * @description Get specific benchmark by ID
 * @access Public
 */
router.get(
  '/:id',
  cacheMiddleware(CACHE_CONFIG),
  async (req, res, next) => {
    try {
      const startTime = process.hrtime();
      await benchmarkController.getBenchmarkById(req, res, next);
      
      const [seconds, nanoseconds] = process.hrtime(startTime);
      const duration = seconds * 1000 + nanoseconds / 1000000;
      
      logger.performance('Benchmark detail request', {
        duration,
        benchmarkId: req.params.id,
        source: res.locals.cacheHit ? 'cache' : 'database'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Protected Routes - Implement authentication, authorization, and validation
 */

/**
 * @route POST /api/v1/benchmarks
 * @description Create new benchmark data
 * @access Admin
 */
router.post(
  '/',
  authenticate,
  authorize([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  validateBenchmarkImport,
  async (req, res, next) => {
    try {
      const startTime = process.hrtime();
      await benchmarkController.createBenchmark(req, res, next);
      
      const [seconds, nanoseconds] = process.hrtime(startTime);
      const duration = seconds * 1000 + nanoseconds / 1000000;
      
      logger.performance('Benchmark creation', {
        duration,
        userId: req.user?.id,
        dataSize: req.body.data.length
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route PUT /api/v1/benchmarks/:id
 * @description Update existing benchmark data
 * @access Admin
 */
router.put(
  '/:id',
  authenticate,
  authorize([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  validateBenchmarkImport,
  async (req, res, next) => {
    try {
      const startTime = process.hrtime();
      await benchmarkController.updateBenchmark(req, res, next);
      
      const [seconds, nanoseconds] = process.hrtime(startTime);
      const duration = seconds * 1000 + nanoseconds / 1000000;
      
      logger.performance('Benchmark update', {
        duration,
        userId: req.user?.id,
        benchmarkId: req.params.id
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route DELETE /api/v1/benchmarks/:id
 * @description Delete benchmark data
 * @access Admin
 */
router.delete(
  '/:id',
  authenticate,
  authorize([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  async (req, res, next) => {
    try {
      const startTime = process.hrtime();
      await benchmarkController.deleteBenchmark(req, res, next);
      
      const [seconds, nanoseconds] = process.hrtime(startTime);
      const duration = seconds * 1000 + nanoseconds / 1000000;
      
      logger.performance('Benchmark deletion', {
        duration,
        userId: req.user?.id,
        benchmarkId: req.params.id
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;