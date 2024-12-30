// External imports with versions
import Redis from 'ioredis'; // ^5.0.0
import CircuitBreaker from 'opossum'; // ^6.0.0
import { Counter, Histogram } from 'prom-client'; // ^14.0.0

// Internal imports
import { MetricModel } from '../models/metric.model';
import { Logger } from '../lib/logger';

// Constants
const CACHE_TTL = 900; // 15 minutes in seconds
const CACHE_KEY_PREFIX = 'metrics:';
const CIRCUIT_BREAKER_TIMEOUT = 5000;
const RETRY_ATTEMPTS = 3;
const HEALTH_CHECK_INTERVAL = 30000;

// Interfaces
interface MetricData {
  id: string;
  name: string;
  value: number;
  percentiles: {
    p5: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
  metadata: {
    source: string;
    arr_range: string;
    updated_at: string;
  };
}

interface HealthStatus {
  isHealthy: boolean;
  cache: {
    connected: boolean;
    hitRate: number;
  };
  circuitBreaker: {
    state: string;
    failures: number;
  };
}

interface RetryOptions {
  attempts: number;
  delay: number;
  backoff: boolean;
}

/**
 * Service class implementing business logic for metrics processing
 * with enhanced reliability features and monitoring
 */
export class MetricsService {
  private readonly metricModel: MetricModel;
  private readonly cacheClient: Redis.Redis;
  private readonly circuitBreaker: CircuitBreaker;
  private readonly logger: Logger;

  // Prometheus metrics
  private readonly cacheHits: Counter;
  private readonly cacheMisses: Counter;
  private readonly operationDuration: Histogram;

  constructor(
    metricModel: MetricModel,
    redisConfig: Redis.RedisOptions,
    circuitBreakerConfig: CircuitBreaker.Options = {}
  ) {
    this.metricModel = metricModel;
    this.logger = new Logger();

    // Initialize Redis with sentinel support
    this.cacheClient = new Redis({
      ...redisConfig,
      retryStrategy: (times: number) => Math.min(times * 50, 2000),
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
    });

    // Initialize circuit breaker
    this.circuitBreaker = new CircuitBreaker(
      async (operation: Function) => operation(),
      {
        timeout: CIRCUIT_BREAKER_TIMEOUT,
        errorThresholdPercentage: 50,
        resetTimeout: 30000,
        ...circuitBreakerConfig,
      }
    );

    // Initialize Prometheus metrics
    this.cacheHits = new Counter({
      name: 'metrics_cache_hits_total',
      help: 'Total number of cache hits',
    });

    this.cacheMisses = new Counter({
      name: 'metrics_cache_misses_total',
      help: 'Total number of cache misses',
    });

    this.operationDuration = new Histogram({
      name: 'metrics_operation_duration_seconds',
      help: 'Duration of metrics operations',
      buckets: [0.1, 0.5, 1, 2, 5],
    });

    this.setupErrorHandlers();
    this.startHealthCheck();
  }

  /**
   * Retrieves a metric by ID with caching and circuit breaker protection
   */
  public async getMetric(id: string): Promise<MetricData> {
    const timer = this.operationDuration.startTimer();

    try {
      const cacheKey = `${CACHE_KEY_PREFIX}${id}`;

      // Check cache first
      const cachedData = await this.cacheClient.get(cacheKey);
      if (cachedData) {
        this.cacheHits.inc();
        timer({ operation: 'get_metric_cached' });
        return JSON.parse(cachedData);
      }

      this.cacheMisses.inc();

      // Fetch from database with circuit breaker
      const metric = await this.circuitBreaker.fire(async () => {
        const data = await this.metricModel.findById(id);
        if (!data) {
          throw new Error(`Metric not found: ${id}`);
        }
        return data;
      });

      // Cache the result
      await this.cacheClient.setex(
        cacheKey,
        CACHE_TTL,
        JSON.stringify(metric)
      );

      timer({ operation: 'get_metric_db' });
      return metric;
    } catch (error) {
      this.logger.error('Error retrieving metric', { error, id });
      throw error;
    }
  }

  /**
   * Calculates metric with retry mechanism and validation
   */
  public async calculateMetricWithRetry(
    type: string,
    data: any,
    retryConfig: RetryOptions = { attempts: RETRY_ATTEMPTS, delay: 1000, backoff: true }
  ): Promise<number> {
    let attempt = 0;
    let lastError: Error;

    while (attempt < retryConfig.attempts) {
      try {
        const timer = this.operationDuration.startTimer();
        const result = await this.circuitBreaker.fire(async () => {
          return this.calculateMetric(type, data);
        });
        timer({ operation: 'calculate_metric' });
        return result;
      } catch (error) {
        lastError = error;
        attempt++;
        if (attempt < retryConfig.attempts) {
          const delay = retryConfig.backoff
            ? Math.min(1000 * Math.pow(2, attempt), 10000)
            : retryConfig.delay;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    this.logger.error('Max retry attempts reached', { type, attempts: attempt });
    throw lastError;
  }

  /**
   * Performs health check of service dependencies
   */
  public async healthCheck(): Promise<HealthStatus> {
    try {
      const [cacheHealth, circuitBreakerStats] = await Promise.all([
        this.checkCacheHealth(),
        this.circuitBreaker.stats(),
      ]);

      return {
        isHealthy: cacheHealth.connected && this.circuitBreaker.opened === false,
        cache: {
          connected: cacheHealth.connected,
          hitRate: this.calculateCacheHitRate(),
        },
        circuitBreaker: {
          state: this.circuitBreaker.opened ? 'OPEN' : 'CLOSED',
          failures: circuitBreakerStats.failures,
        },
      };
    } catch (error) {
      this.logger.error('Health check failed', { error });
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private async calculateMetric(type: string, data: any): Promise<number> {
    switch (type) {
      case 'revenue_growth_rate':
        return ((data.currentARR - data.previousARR) / data.previousARR) * 100;
      case 'net_dollar_retention':
        return ((data.beginningARR + data.expansion - data.contraction - data.churn) / data.beginningARR) * 100;
      case 'magic_number':
        return data.netNewARR / data.salesMarketingSpend;
      case 'ebitda_margin':
        return (data.ebitda / data.revenue) * 100;
      case 'arr_per_employee':
        return data.totalARR / data.employeeCount;
      default:
        throw new Error(`Unsupported metric type: ${type}`);
    }
  }

  private async checkCacheHealth(): Promise<{ connected: boolean }> {
    try {
      await this.cacheClient.ping();
      return { connected: true };
    } catch {
      return { connected: false };
    }
  }

  private calculateCacheHitRate(): number {
    const hits = this.cacheHits.get();
    const misses = this.cacheMisses.get();
    const total = hits + misses;
    return total > 0 ? (hits / total) * 100 : 0;
  }

  private setupErrorHandlers(): void {
    this.cacheClient.on('error', (error) => {
      this.logger.error('Redis cache error', { error });
    });

    this.circuitBreaker.on('open', () => {
      this.logger.warn('Circuit breaker opened');
    });

    this.circuitBreaker.on('halfOpen', () => {
      this.logger.info('Circuit breaker half-open');
    });

    this.circuitBreaker.on('close', () => {
      this.logger.info('Circuit breaker closed');
    });
  }

  private startHealthCheck(): void {
    setInterval(async () => {
      try {
        await this.healthCheck();
      } catch (error) {
        this.logger.error('Health check failed', { error });
      }
    }, HEALTH_CHECK_INTERVAL);
  }
}