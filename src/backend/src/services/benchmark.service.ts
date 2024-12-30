/**
 * @fileoverview Enterprise-grade service implementation for SaaS metrics benchmark data operations
 * Provides comprehensive benchmark data management with advanced caching, monitoring, and validation
 * @version 1.0.0
 */

// External imports
import Redis from 'ioredis'; // v5.0.0
import { Logger } from 'winston'; // v3.8.0

// Internal imports
import { BenchmarkModel } from '../models/benchmark.model';
import { 
  BenchmarkData, 
  BenchmarkFilter, 
  PercentileDistribution,
  ValidationStatus 
} from '../interfaces/benchmark.interface';
import { CacheManager } from '../lib/cache';
import { logger } from '../lib/logger';

/**
 * Service class for handling benchmark data operations with enhanced caching and monitoring
 */
export class BenchmarkService {
  private readonly CACHE_TTL = 3600; // 1 hour cache TTL
  private readonly CACHE_PREFIX = 'benchmark:';
  private readonly PERFORMANCE_THRESHOLD_MS = 500;

  /**
   * Initializes the benchmark service with required dependencies
   * @param benchmarkModel - Instance of BenchmarkModel for data operations
   * @param cacheManager - Instance of CacheManager for caching operations
   * @param logger - Instance of Logger for monitoring and tracking
   */
  constructor(
    private readonly benchmarkModel: BenchmarkModel,
    private readonly cacheManager: CacheManager,
    private readonly logger: Logger = logger
  ) {
    this.validateDependencies();
  }

  /**
   * Validates service dependencies on initialization
   * @throws Error if any required dependency is missing or invalid
   */
  private validateDependencies(): void {
    if (!this.benchmarkModel) {
      throw new Error('BenchmarkModel is required');
    }
    if (!this.cacheManager) {
      throw new Error('CacheManager is required');
    }
  }

  /**
   * Creates a new benchmark data entry with comprehensive validation
   * @param data - Benchmark data to create
   * @returns Promise resolving to created benchmark data
   */
  public async createBenchmark(data: Omit<BenchmarkData, 'id' | 'createdAt' | 'updatedAt'>): Promise<BenchmarkData> {
    const startTime = process.hrtime();

    try {
      // Validate input data
      this.validateBenchmarkData(data);

      // Create benchmark
      const benchmark = await this.benchmarkModel.create(data);

      // Invalidate related caches
      await this.invalidateRelatedCaches(data.metricId);

      // Log performance metrics
      this.logPerformanceMetrics('createBenchmark', startTime);

      return benchmark;
    } catch (error) {
      this.logger.error('Failed to create benchmark', { error, data });
      throw error;
    }
  }

  /**
   * Retrieves benchmark data by ID with caching
   * @param id - Benchmark ID to retrieve
   * @returns Promise resolving to benchmark data
   */
  public async getBenchmarkById(id: string): Promise<BenchmarkData> {
    const startTime = process.hrtime();
    const cacheKey = `${this.CACHE_PREFIX}id:${id}`;

    try {
      // Check cache first
      const cachedData = await this.cacheManager.getClient().get(cacheKey);
      if (cachedData) {
        return JSON.parse(cachedData);
      }

      // Retrieve from database
      const benchmark = await this.benchmarkModel.findById(id);
      if (!benchmark) {
        throw new Error('Benchmark not found');
      }

      // Cache the result
      await this.cacheManager.getClient().set(
        cacheKey,
        JSON.stringify(benchmark),
        'EX',
        this.CACHE_TTL
      );

      this.logPerformanceMetrics('getBenchmarkById', startTime);
      return benchmark;
    } catch (error) {
      this.logger.error('Failed to retrieve benchmark', { error, id });
      throw error;
    }
  }

  /**
   * Retrieves benchmarks based on filter criteria with caching
   * @param filter - Filter criteria for benchmark query
   * @returns Promise resolving to filtered benchmark data
   */
  public async getBenchmarksByFilter(filter: BenchmarkFilter): Promise<BenchmarkData[]> {
    const startTime = process.hrtime();
    const cacheKey = this.generateFilterCacheKey(filter);

    try {
      // Check cache first
      const cachedData = await this.cacheManager.getClient().get(cacheKey);
      if (cachedData) {
        return JSON.parse(cachedData);
      }

      // Retrieve from database
      const benchmarks = await this.benchmarkModel.findByFilter(filter);

      // Cache the results
      await this.cacheManager.getClient().set(
        cacheKey,
        JSON.stringify(benchmarks),
        'EX',
        this.CACHE_TTL
      );

      this.logPerformanceMetrics('getBenchmarksByFilter', startTime);
      return benchmarks;
    } catch (error) {
      this.logger.error('Failed to retrieve benchmarks by filter', { error, filter });
      throw error;
    }
  }

  /**
   * Calculates percentile distribution for benchmark data
   * @param filter - Filter criteria for percentile calculation
   * @returns Promise resolving to percentile distribution
   */
  public async getPercentileDistribution(filter: BenchmarkFilter): Promise<PercentileDistribution> {
    const startTime = process.hrtime();
    const cacheKey = `${this.CACHE_PREFIX}percentiles:${this.generateFilterCacheKey(filter)}`;

    try {
      // Check cache first
      const cachedData = await this.cacheManager.getClient().get(cacheKey);
      if (cachedData) {
        return JSON.parse(cachedData);
      }

      // Calculate percentiles
      const distribution = await this.benchmarkModel.calculatePercentiles(filter);

      // Cache the results
      await this.cacheManager.getClient().set(
        cacheKey,
        JSON.stringify(distribution),
        'EX',
        this.CACHE_TTL
      );

      this.logPerformanceMetrics('getPercentileDistribution', startTime);
      return distribution;
    } catch (error) {
      this.logger.error('Failed to calculate percentile distribution', { error, filter });
      throw error;
    }
  }

  /**
   * Updates existing benchmark data with validation
   * @param id - ID of benchmark to update
   * @param data - Updated benchmark data
   * @returns Promise resolving to updated benchmark data
   */
  public async updateBenchmark(id: string, data: Partial<BenchmarkData>): Promise<BenchmarkData> {
    const startTime = process.hrtime();

    try {
      // Validate update data
      this.validateBenchmarkData(data, true);

      // Update benchmark
      const benchmark = await this.benchmarkModel.update(id, data);

      // Invalidate related caches
      await this.invalidateRelatedCaches(benchmark.metricId);

      this.logPerformanceMetrics('updateBenchmark', startTime);
      return benchmark;
    } catch (error) {
      this.logger.error('Failed to update benchmark', { error, id, data });
      throw error;
    }
  }

  /**
   * Deletes benchmark data and invalidates cache
   * @param id - ID of benchmark to delete
   * @returns Promise resolving to void
   */
  public async deleteBenchmark(id: string): Promise<void> {
    const startTime = process.hrtime();

    try {
      const benchmark = await this.benchmarkModel.findById(id);
      if (!benchmark) {
        throw new Error('Benchmark not found');
      }

      await this.benchmarkModel.delete(id);
      await this.invalidateRelatedCaches(benchmark.metricId);

      this.logPerformanceMetrics('deleteBenchmark', startTime);
    } catch (error) {
      this.logger.error('Failed to delete benchmark', { error, id });
      throw error;
    }
  }

  /**
   * Validates benchmark data against business rules
   * @param data - Benchmark data to validate
   * @param isUpdate - Whether validation is for update operation
   * @throws Error if validation fails
   */
  private validateBenchmarkData(data: Partial<BenchmarkData>, isUpdate: boolean = false): void {
    if (!isUpdate) {
      if (!data.metricId || !data.sourceId || typeof data.value !== 'number') {
        throw new Error('Missing required fields: metricId, sourceId, value');
      }
    }

    if (data.value !== undefined && (data.value < 0 || data.value > 1000000)) {
      throw new Error('Value must be between 0 and 1,000,000');
    }

    if (data.percentile !== undefined && (data.percentile < 0 || data.percentile > 100)) {
      throw new Error('Percentile must be between 0 and 100');
    }
  }

  /**
   * Generates cache key for filter-based queries
   * @param filter - Benchmark filter criteria
   * @returns Generated cache key
   */
  private generateFilterCacheKey(filter: BenchmarkFilter): string {
    return `${this.CACHE_PREFIX}filter:${Buffer.from(JSON.stringify(filter)).toString('base64')}`;
  }

  /**
   * Invalidates related cache entries when data changes
   * @param metricId - ID of affected metric
   */
  private async invalidateRelatedCaches(metricId: string): Promise<void> {
    try {
      const patterns = [
        `${this.CACHE_PREFIX}*${metricId}*`,
        `${this.CACHE_PREFIX}percentiles:*`,
        `${this.CACHE_PREFIX}filter:*`
      ];

      await Promise.all(
        patterns.map(pattern => this.cacheManager.invalidatePattern(pattern))
      );
    } catch (error) {
      this.logger.error('Cache invalidation failed', { error, metricId });
    }
  }

  /**
   * Logs performance metrics for operations
   * @param operation - Name of the operation
   * @param startTime - Operation start time
   */
  private logPerformanceMetrics(operation: string, startTime: [number, number]): void {
    const [seconds, nanoseconds] = process.hrtime(startTime);
    const duration = seconds * 1000 + nanoseconds / 1000000;

    this.logger.performance('Benchmark operation timing', {
      operation,
      duration,
      threshold: this.PERFORMANCE_THRESHOLD_MS
    });

    if (duration > this.PERFORMANCE_THRESHOLD_MS) {
      this.logger.warn('Operation exceeded performance threshold', {
        operation,
        duration,
        threshold: this.PERFORMANCE_THRESHOLD_MS
      });
    }
  }
}