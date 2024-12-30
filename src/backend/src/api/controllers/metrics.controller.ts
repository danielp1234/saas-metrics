/**
 * @fileoverview Controller handling HTTP requests for SaaS metrics operations
 * Implements comprehensive validation, caching, performance monitoring, and standardized error handling
 * @version 1.0.0
 */

// External imports with versions
import { Request, Response } from 'express'; // ^4.18.x
import { Counter, Histogram } from 'prom-client'; // ^14.x
import { Logger } from 'winston'; // ^3.x

// Internal imports
import { MetricsService } from '../../services/metrics.service';
import { CacheService } from '../../services/cache.service';
import { MetricValidators } from '../validators/metrics.validator';
import { ValidationError, NotFoundError } from '../../utils/errors';
import { MetricType } from '../../interfaces/metrics.interface';
import { ApiResponse, MetricResponse, PaginatedResponse } from '../../interfaces/response.interface';
import { MetricsQueryParams, AuthenticatedRequest } from '../../interfaces/request.interface';

// Constants
const CACHE_TTL = 900; // 15 minutes in seconds
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/**
 * Controller class handling HTTP requests for metrics operations with caching,
 * validation, and monitoring capabilities
 */
export class MetricsController {
  private readonly requestCounter: Counter;
  private readonly responseTime: Histogram;
  private readonly logger: Logger;

  constructor(
    private readonly metricsService: MetricsService,
    private readonly cacheService: CacheService,
    logger: Logger
  ) {
    this.logger = logger;

    // Initialize Prometheus metrics
    this.requestCounter = new Counter({
      name: 'metrics_requests_total',
      help: 'Total number of metrics requests',
      labelNames: ['endpoint', 'status']
    });

    this.responseTime = new Histogram({
      name: 'metrics_response_time_seconds',
      help: 'Response time for metrics requests',
      labelNames: ['endpoint'],
      buckets: [0.1, 0.5, 1, 2, 5]
    });
  }

  /**
   * Retrieves all metrics with filtering, pagination, and caching
   * @param req Express request object
   * @param res Express response object
   */
  public async getMetrics(req: Request, res: Response): Promise<void> {
    const timer = this.responseTime.startTimer();
    const requestId = req.headers['x-request-id'] as string;

    try {
      // Validate query parameters
      const queryParams = await MetricValidators.validateGetMetricsRequest(req.query as MetricsQueryParams);

      // Check cache first
      const cacheKey = `metrics:${JSON.stringify(queryParams)}`;
      const cachedData = await this.cacheService.get<PaginatedResponse<MetricResponse>>(cacheKey);

      if (cachedData) {
        this.requestCounter.inc({ endpoint: 'getMetrics', status: 'cache_hit' });
        res.json({
          success: true,
          data: cachedData,
          error: null,
          metadata: {
            responseTime: timer({ endpoint: 'getMetrics' }),
            apiVersion: '1.0',
            timestamp: Date.now(),
            requestId,
            cacheStatus: 'hit'
          }
        });
        return;
      }

      // Get metrics from service
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(
        parseInt(req.query.limit as string) || DEFAULT_PAGE_SIZE,
        MAX_PAGE_SIZE
      );

      const metrics = await this.metricsService.getAllMetrics(queryParams, { page, limit });
      
      // Calculate percentiles for each metric
      const metricsWithStats = await Promise.all(
        metrics.data.map(async (metric) => ({
          ...metric,
          percentiles: await this.metricsService.calculatePercentiles(metric.id)
        }))
      );

      const response: PaginatedResponse<MetricResponse> = {
        data: metricsWithStats,
        pagination: metrics.pagination,
        metadata: {
          responseTime: timer({ endpoint: 'getMetrics' }),
          apiVersion: '1.0',
          timestamp: Date.now(),
          requestId,
          cacheStatus: 'miss'
        }
      };

      // Cache the response
      await this.cacheService.set(cacheKey, response, CACHE_TTL);

      this.requestCounter.inc({ endpoint: 'getMetrics', status: 'success' });
      res.json({
        success: true,
        data: response,
        error: null,
        metadata: response.metadata
      });
    } catch (error) {
      this.handleError(error, res, timer, 'getMetrics', requestId);
    }
  }

  /**
   * Retrieves a specific metric by ID with caching
   * @param req Express request object
   * @param res Express response object
   */
  public async getMetricById(req: Request, res: Response): Promise<void> {
    const timer = this.responseTime.startTimer();
    const requestId = req.headers['x-request-id'] as string;

    try {
      // Validate metric ID
      await MetricValidators.validateGetMetricByIdRequest(req);

      const { id } = req.params;
      const cacheKey = `metric:${id}`;
      
      // Check cache
      const cachedMetric = await this.cacheService.get<MetricResponse>(cacheKey);
      
      if (cachedMetric) {
        this.requestCounter.inc({ endpoint: 'getMetricById', status: 'cache_hit' });
        res.json({
          success: true,
          data: cachedMetric,
          error: null,
          metadata: {
            responseTime: timer({ endpoint: 'getMetricById' }),
            apiVersion: '1.0',
            timestamp: Date.now(),
            requestId,
            cacheStatus: 'hit'
          }
        });
        return;
      }

      // Get metric from service
      const metric = await this.metricsService.getMetric(id);
      
      if (!metric) {
        throw new NotFoundError(`Metric with ID ${id} not found`);
      }

      const percentiles = await this.metricsService.calculatePercentiles(id);
      
      const response: MetricResponse = {
        metric,
        value: await this.metricsService.calculateMetric(metric.type, metric),
        percentiles,
        metadata: {
          source: metric.metadata.source,
          arr_range: metric.metadata.arrRange,
          updated_at: metric.updatedAt.toISOString(),
          data_quality: 'high',
          sample_size: percentiles.sampleSize
        },
        confidenceLevel: 0.95
      };

      // Cache the response
      await this.cacheService.set(cacheKey, response, CACHE_TTL);

      this.requestCounter.inc({ endpoint: 'getMetricById', status: 'success' });
      res.json({
        success: true,
        data: response,
        error: null,
        metadata: {
          responseTime: timer({ endpoint: 'getMetricById' }),
          apiVersion: '1.0',
          timestamp: Date.now(),
          requestId,
          cacheStatus: 'miss'
        }
      });
    } catch (error) {
      this.handleError(error, res, timer, 'getMetricById', requestId);
    }
  }

  /**
   * Creates a new metric (admin only)
   * @param req Authenticated request object
   * @param res Express response object
   */
  public async createMetric(req: AuthenticatedRequest, res: Response): Promise<void> {
    const timer = this.responseTime.startTimer();
    const requestId = req.headers['x-request-id'] as string;

    try {
      // Validate request body
      await MetricValidators.validateCreateMetricRequest(req);

      const metric = await this.metricsService.createMetric(req.body);

      // Invalidate relevant cache entries
      await this.cacheService.clear('metrics:');

      this.requestCounter.inc({ endpoint: 'createMetric', status: 'success' });
      res.status(201).json({
        success: true,
        data: metric,
        error: null,
        metadata: {
          responseTime: timer({ endpoint: 'createMetric' }),
          apiVersion: '1.0',
          timestamp: Date.now(),
          requestId
        }
      });
    } catch (error) {
      this.handleError(error, res, timer, 'createMetric', requestId);
    }
  }

  /**
   * Updates an existing metric (admin only)
   * @param req Authenticated request object
   * @param res Express response object
   */
  public async updateMetric(req: AuthenticatedRequest, res: Response): Promise<void> {
    const timer = this.responseTime.startTimer();
    const requestId = req.headers['x-request-id'] as string;

    try {
      // Validate request
      await MetricValidators.validateUpdateMetricRequest(req);

      const { id } = req.params;
      const metric = await this.metricsService.updateMetric(id, req.body);

      // Invalidate relevant cache entries
      await this.cacheService.delete(`metric:${id}`);
      await this.cacheService.clear('metrics:');

      this.requestCounter.inc({ endpoint: 'updateMetric', status: 'success' });
      res.json({
        success: true,
        data: metric,
        error: null,
        metadata: {
          responseTime: timer({ endpoint: 'updateMetric' }),
          apiVersion: '1.0',
          timestamp: Date.now(),
          requestId
        }
      });
    } catch (error) {
      this.handleError(error, res, timer, 'updateMetric', requestId);
    }
  }

  /**
   * Deletes a metric (admin only)
   * @param req Authenticated request object
   * @param res Express response object
   */
  public async deleteMetric(req: AuthenticatedRequest, res: Response): Promise<void> {
    const timer = this.responseTime.startTimer();
    const requestId = req.headers['x-request-id'] as string;

    try {
      const { id } = req.params;
      await this.metricsService.deleteMetric(id);

      // Invalidate relevant cache entries
      await this.cacheService.delete(`metric:${id}`);
      await this.cacheService.clear('metrics:');

      this.requestCounter.inc({ endpoint: 'deleteMetric', status: 'success' });
      res.status(204).send();
    } catch (error) {
      this.handleError(error, res, timer, 'deleteMetric', requestId);
    }
  }

  /**
   * Handles errors and sends standardized error responses
   * @private
   */
  private handleError(
    error: any,
    res: Response,
    timer: (labels: { endpoint: string }) => number,
    endpoint: string,
    requestId: string
  ): void {
    this.logger.error('Metrics controller error:', { error, endpoint, requestId });
    this.requestCounter.inc({ endpoint, status: 'error' });

    const response: ApiResponse<null> = {
      success: false,
      data: null,
      error: {
        code: error.code || 500,
        message: error.message || 'Internal server error',
        details: error.details || [],
        status: error.status || 'ERROR',
        timestamp: Date.now(),
        requestId
      },
      metadata: {
        responseTime: timer({ endpoint }),
        apiVersion: '1.0',
        timestamp: Date.now(),
        requestId
      }
    };

    res.status(error.code || 500).json(response);
  }
}