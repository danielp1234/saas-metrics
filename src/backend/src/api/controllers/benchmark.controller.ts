/**
 * @fileoverview Enterprise-grade controller for SaaS metrics benchmark data operations
 * Implements secure REST API endpoints with comprehensive validation, caching,
 * and performance monitoring.
 * @version 1.0.0
 */

// External imports
import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit'; // v6.x
import sanitize from 'express-sanitizer'; // v1.x
import { validate as uuidValidate } from 'uuid';

// Internal imports
import { BenchmarkService } from '../../services/benchmark.service';
import { CacheService } from '../../services/cache.service';
import { logger } from '../../lib/logger';
import { BenchmarkData, BenchmarkFilter } from '../../interfaces/benchmark.interface';

/**
 * Rate limiting configuration for API endpoints
 */
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Enhanced controller class for benchmark data operations with security,
 * caching, and monitoring capabilities
 */
export class BenchmarkController {
  private readonly CACHE_TTL = 900; // 15 minutes
  private readonly CACHE_PREFIX = 'benchmark:';
  private readonly PERFORMANCE_THRESHOLD_MS = 2000;

  /**
   * Initializes controller with required services and middleware
   * @param benchmarkService - Service for benchmark data operations
   * @param cacheService - Service for caching operations
   */
  constructor(
    private readonly benchmarkService: BenchmarkService,
    private readonly cacheService: CacheService
  ) {
    this.validateDependencies();
  }

  /**
   * Validates controller dependencies
   * @private
   */
  private validateDependencies(): void {
    if (!this.benchmarkService || !this.cacheService) {
      throw new Error('Required services not provided');
    }
  }

  /**
   * Creates new benchmark data with validation and sanitization
   * @route POST /api/v1/benchmarks
   */
  public createBenchmark = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const startTime = process.hrtime();

    try {
      // Apply rate limiting
      await new Promise((resolve) => rateLimiter(req, res, resolve));

      // Sanitize input data
      const sanitizedData = this.sanitizeInput(req.body);

      // Validate benchmark data
      this.validateBenchmarkData(sanitizedData);

      // Create benchmark
      const benchmark = await this.benchmarkService.createBenchmark(sanitizedData);

      // Invalidate related caches
      await this.cacheService.delete(`${this.CACHE_PREFIX}*`);

      // Log performance metrics
      this.logPerformanceMetrics('createBenchmark', startTime);

      res.status(201).json({
        success: true,
        data: benchmark,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Retrieves benchmark by ID with caching
   * @route GET /api/v1/benchmarks/:id
   */
  public getBenchmarkById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const startTime = process.hrtime();

    try {
      const { id } = req.params;

      // Validate UUID
      if (!uuidValidate(id)) {
        throw new Error('Invalid benchmark ID');
      }

      // Check cache
      const cacheKey = `${this.CACHE_PREFIX}${id}`;
      const cachedData = await this.cacheService.get<BenchmarkData>(cacheKey);

      if (cachedData) {
        this.logPerformanceMetrics('getBenchmarkById-cache', startTime);
        res.json({
          success: true,
          data: cachedData,
          source: 'cache',
        });
        return;
      }

      // Retrieve from service
      const benchmark = await this.benchmarkService.getBenchmarkById(id);

      // Cache the result
      await this.cacheService.set(cacheKey, benchmark, this.CACHE_TTL);

      this.logPerformanceMetrics('getBenchmarkById-db', startTime);
      res.json({
        success: true,
        data: benchmark,
        source: 'database',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Retrieves benchmarks based on filter criteria with caching
   * @route GET /api/v1/benchmarks
   */
  public getBenchmarksByFilter = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const startTime = process.hrtime();

    try {
      // Sanitize and validate filter parameters
      const filter = this.sanitizeAndValidateFilter(req.query);

      // Generate cache key based on filter
      const cacheKey = `${this.CACHE_PREFIX}filter:${this.generateFilterCacheKey(filter)}`;
      const cachedData = await this.cacheService.get<BenchmarkData[]>(cacheKey);

      if (cachedData) {
        this.logPerformanceMetrics('getBenchmarksByFilter-cache', startTime);
        res.json({
          success: true,
          data: cachedData,
          source: 'cache',
        });
        return;
      }

      // Retrieve from service
      const benchmarks = await this.benchmarkService.getBenchmarksByFilter(filter);

      // Cache the results
      await this.cacheService.set(cacheKey, benchmarks, this.CACHE_TTL);

      this.logPerformanceMetrics('getBenchmarksByFilter-db', startTime);
      res.json({
        success: true,
        data: benchmarks,
        source: 'database',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Retrieves percentile distribution for benchmarks
   * @route GET /api/v1/benchmarks/percentiles
   */
  public getPercentileDistribution = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const startTime = process.hrtime();

    try {
      // Sanitize and validate filter parameters
      const filter = this.sanitizeAndValidateFilter(req.query);

      // Generate cache key for percentiles
      const cacheKey = `${this.CACHE_PREFIX}percentiles:${this.generateFilterCacheKey(filter)}`;
      const cachedData = await this.cacheService.get(cacheKey);

      if (cachedData) {
        this.logPerformanceMetrics('getPercentileDistribution-cache', startTime);
        res.json({
          success: true,
          data: cachedData,
          source: 'cache',
        });
        return;
      }

      // Calculate percentiles
      const distribution = await this.benchmarkService.getPercentileDistribution(filter);

      // Cache the results
      await this.cacheService.set(cacheKey, distribution, this.CACHE_TTL);

      this.logPerformanceMetrics('getPercentileDistribution-db', startTime);
      res.json({
        success: true,
        data: distribution,
        source: 'database',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Updates existing benchmark data
   * @route PUT /api/v1/benchmarks/:id
   */
  public updateBenchmark = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const startTime = process.hrtime();

    try {
      const { id } = req.params;

      // Validate UUID
      if (!uuidValidate(id)) {
        throw new Error('Invalid benchmark ID');
      }

      // Sanitize input data
      const sanitizedData = this.sanitizeInput(req.body);

      // Update benchmark
      const benchmark = await this.benchmarkService.updateBenchmark(id, sanitizedData);

      // Invalidate related caches
      await this.cacheService.delete(`${this.CACHE_PREFIX}*`);

      this.logPerformanceMetrics('updateBenchmark', startTime);
      res.json({
        success: true,
        data: benchmark,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Deletes benchmark data
   * @route DELETE /api/v1/benchmarks/:id
   */
  public deleteBenchmark = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const startTime = process.hrtime();

    try {
      const { id } = req.params;

      // Validate UUID
      if (!uuidValidate(id)) {
        throw new Error('Invalid benchmark ID');
      }

      // Delete benchmark
      await this.benchmarkService.deleteBenchmark(id);

      // Invalidate related caches
      await this.cacheService.delete(`${this.CACHE_PREFIX}*`);

      this.logPerformanceMetrics('deleteBenchmark', startTime);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  /**
   * Sanitizes input data to prevent XSS and injection attacks
   * @private
   */
  private sanitizeInput(data: any): any {
    if (typeof data === 'object' && data !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        sanitized[key] = typeof value === 'string' ? sanitize(value) : value;
      }
      return sanitized;
    }
    return data;
  }

  /**
   * Validates benchmark data against business rules
   * @private
   */
  private validateBenchmarkData(data: Partial<BenchmarkData>): void {
    if (!data.metricId || !data.sourceId || typeof data.value !== 'number') {
      throw new Error('Missing required fields: metricId, sourceId, value');
    }

    if (data.value < 0 || data.value > 1000000) {
      throw new Error('Value must be between 0 and 1,000,000');
    }

    if (data.percentile !== undefined && (data.percentile < 0 || data.percentile > 100)) {
      throw new Error('Percentile must be between 0 and 100');
    }
  }

  /**
   * Sanitizes and validates filter parameters
   * @private
   */
  private sanitizeAndValidateFilter(query: any): BenchmarkFilter {
    const filter: BenchmarkFilter = {};

    if (query.metricId) {
      filter.metricId = Array.isArray(query.metricId) ? query.metricId : [query.metricId];
    }

    if (query.arrRange) {
      filter.arrRange = Array.isArray(query.arrRange) ? query.arrRange : [query.arrRange];
    }

    if (query.sourceId) {
      filter.sourceId = Array.isArray(query.sourceId) ? query.sourceId : [query.sourceId];
    }

    if (query.startDate) {
      filter.startDate = new Date(query.startDate);
    }

    if (query.endDate) {
      filter.endDate = new Date(query.endDate);
    }

    return filter;
  }

  /**
   * Generates cache key for filter-based queries
   * @private
   */
  private generateFilterCacheKey(filter: BenchmarkFilter): string {
    return Buffer.from(JSON.stringify(filter)).toString('base64');
  }

  /**
   * Logs performance metrics for operations
   * @private
   */
  private logPerformanceMetrics(operation: string, startTime: [number, number]): void {
    const [seconds, nanoseconds] = process.hrtime(startTime);
    const duration = seconds * 1000 + nanoseconds / 1000000;

    logger.performance('Benchmark controller operation timing', {
      operation,
      duration,
      threshold: this.PERFORMANCE_THRESHOLD_MS,
    });

    if (duration > this.PERFORMANCE_THRESHOLD_MS) {
      logger.warn('Operation exceeded performance threshold', {
        operation,
        duration,
        threshold: this.PERFORMANCE_THRESHOLD_MS,
      });
    }
  }
}