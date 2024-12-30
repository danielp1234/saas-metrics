// External imports with versions
import { Job, DoneCallback } from 'bull'; // ^4.10.0
import CircuitBreaker from 'opossum'; // ^6.0.0

// Internal imports
import { MetricsService } from '../services/metrics.service';
import { QueueManager } from '../lib/queue';
import { logger } from '../lib/logger';
import { MetricType } from '../interfaces/metrics.interface';
import { PrometheusMetrics } from '../lib/metrics';

// Constants
const METRICS_QUEUE_NAME = 'metrics-calculation';
const METRICS_CONCURRENCY = 5;
const CIRCUIT_BREAKER_TIMEOUT = 5000;
const MAX_RETRIES = 3;
const RETRY_BACKOFF = 2000;
const HEALTH_CHECK_INTERVAL = 30000;

// Interfaces
interface MetricJobData {
  type: MetricType;
  data: {
    [key: string]: any;
  };
  includePercentiles: boolean;
  priority?: string;
}

interface MetricJobResult {
  value: number;
  percentiles?: {
    p5: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
  success: boolean;
  error?: string;
  processingTime: number;
  retryCount: number;
}

/**
 * Enhanced worker function that processes metric calculation jobs
 * with comprehensive error handling and monitoring
 */
async function processMetricCalculation(
  job: Job<MetricJobData>,
  done: DoneCallback
): Promise<void> {
  const startTime = Date.now();
  const metricsService = new MetricsService();
  const metrics = new PrometheusMetrics();

  logger.info('Starting metric calculation job', {
    jobId: job.id,
    type: job.data.type,
    attempt: job.attemptsMade + 1
  });

  try {
    // Input validation
    if (!job.data.type || !job.data.data) {
      throw new Error('Invalid job data: missing required fields');
    }

    // Initialize circuit breaker for external service calls
    const breaker = new CircuitBreaker(async () => {
      const result = await metricsService.calculateMetric(
        job.data.type,
        job.data.data
      );
      return result;
    }, {
      timeout: CIRCUIT_BREAKER_TIMEOUT,
      errorThresholdPercentage: 50,
      resetTimeout: 30000
    });

    // Calculate metric with circuit breaker protection
    const metricValue = await breaker.fire();

    // Calculate percentiles if requested
    let percentiles;
    if (job.data.includePercentiles) {
      percentiles = await metricsService.calculatePercentiles(
        job.data.type,
        job.data.data
      );
    }

    // Record processing metrics
    const processingTime = Date.now() - startTime;
    metrics.recordJobDuration(processingTime);
    metrics.incrementJobCount('success');

    // Prepare result
    const result: MetricJobResult = {
      value: metricValue,
      percentiles,
      success: true,
      processingTime,
      retryCount: job.attemptsMade
    };

    logger.info('Metric calculation completed successfully', {
      jobId: job.id,
      type: job.data.type,
      duration: processingTime
    });

    done(null, result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Metric calculation failed', {
      jobId: job.id,
      type: job.data.type,
      error: errorMessage,
      attempt: job.attemptsMade + 1
    });

    metrics.incrementJobCount('failure');

    // Handle retry logic
    if (job.attemptsMade < MAX_RETRIES) {
      const delay = RETRY_BACKOFF * Math.pow(2, job.attemptsMade);
      return done(new Error(errorMessage), {
        success: false,
        error: errorMessage,
        processingTime: Date.now() - startTime,
        retryCount: job.attemptsMade
      });
    }

    // Final failure
    done(null, {
      success: false,
      error: errorMessage,
      processingTime: Date.now() - startTime,
      retryCount: job.attemptsMade
    });
  }
}

/**
 * Sets up the metrics worker with comprehensive configuration
 * and monitoring capabilities
 */
export async function setupMetricsWorker(): Promise<void> {
  try {
    const queueManager = QueueManager.getInstance();
    const queue = queueManager.getQueue(METRICS_QUEUE_NAME);

    // Configure queue processing
    queue.process(METRICS_CONCURRENCY, processMetricCalculation);

    // Configure error handling
    queue.on('error', (error) => {
      logger.error('Queue error occurred', { error });
    });

    queue.on('failed', (job, error) => {
      logger.error('Job failed', {
        jobId: job.id,
        type: job.data.type,
        error,
        attempts: job.attemptsMade
      });
    });

    // Configure job completion handling
    queue.on('completed', (job, result) => {
      logger.info('Job completed', {
        jobId: job.id,
        type: job.data.type,
        success: result.success,
        duration: result.processingTime
      });
    });

    // Set up health check
    setInterval(async () => {
      try {
        const health = await queue.checkHealth();
        logger.info('Queue health check', { status: health });
      } catch (error) {
        logger.error('Health check failed', { error });
      }
    }, HEALTH_CHECK_INTERVAL);

    // Handle graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('Shutting down metrics worker');
      await queue.pause(true);
      await queue.close();
      process.exit(0);
    });

    logger.info('Metrics worker setup completed successfully');
  } catch (error) {
    logger.error('Failed to setup metrics worker', { error });
    throw error;
  }
}