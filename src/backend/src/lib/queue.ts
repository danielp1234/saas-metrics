// External imports
// bull v4.10.0
import Queue, { QueueOptions, Job } from 'bull';
// ioredis v5.0.0
import Redis from 'ioredis';
// prom-client v14.0.0
import * as Prometheus from 'prom-client';

// Internal imports
import { queueConfig } from '../config/queue.config';
import { logger } from './logger';

// Constants
const QUEUE_EVENTS = [
  'completed',
  'failed',
  'error',
  'waiting',
  'active',
  'stalled',
  'progress',
  'cleaned',
  'drained',
  'removed',
] as const;

const METRICS_PREFIX = 'queue_manager';
const DEFAULT_TIMEOUT = 30000;

/**
 * Type-safe interface for job data with validation
 */
interface QueueJobData {
  type: 'import' | 'calculate' | 'export';
  payload: unknown;
  timestamp: Date;
  retryCount: number;
}

/**
 * Comprehensive job result interface with error handling
 */
interface QueueJobResult {
  success: boolean;
  data?: unknown;
  error: Error | null;
  processingTime: number;
  retryAttempt: number;
}

/**
 * Enhanced singleton class for managing Bull queues with monitoring and error handling
 */
class QueueManager {
  private static instance: QueueManager;
  private queues: Map<string, Queue>;
  private redisClient: Redis;
  private jobsProcessed: Prometheus.Counter;
  private jobsFailed: Prometheus.Counter;
  private queueSize: Prometheus.Gauge;
  private jobDuration: Prometheus.Histogram;

  /**
   * Private constructor implementing singleton pattern with monitoring setup
   */
  private constructor() {
    this.queues = new Map();
    this.initializeRedisClient();
    this.initializeMetrics();
    this.setupErrorHandlers();
  }

  /**
   * Initialize Redis client with cluster support and error handling
   */
  private initializeRedisClient(): void {
    this.redisClient = new Redis({
      host: queueConfig.redis.host,
      port: queueConfig.redis.port,
      password: queueConfig.redis.password,
      tls: queueConfig.redis.tls ? {} : undefined,
      maxRetriesPerRequest: queueConfig.redis.options.maxRetriesPerRequest,
      enableReadyCheck: queueConfig.redis.options.enableReadyCheck,
      connectTimeout: queueConfig.redis.options.connectTimeout,
      retryStrategy: queueConfig.redis.options.retryStrategy,
      keepAlive: queueConfig.redis.options.keepAlive,
    });

    this.redisClient.on('error', (error) => {
      logger.error('Redis connection error', { error });
    });

    this.redisClient.on('connect', () => {
      logger.info('Redis connected successfully');
    });
  }

  /**
   * Initialize Prometheus metrics for monitoring
   */
  private initializeMetrics(): void {
    this.jobsProcessed = new Prometheus.Counter({
      name: `${METRICS_PREFIX}_jobs_processed_total`,
      help: 'Total number of jobs processed',
      labelNames: ['queue', 'type'],
    });

    this.jobsFailed = new Prometheus.Counter({
      name: `${METRICS_PREFIX}_jobs_failed_total`,
      help: 'Total number of jobs failed',
      labelNames: ['queue', 'type', 'error'],
    });

    this.queueSize = new Prometheus.Gauge({
      name: `${METRICS_PREFIX}_queue_size`,
      help: 'Current size of the queue',
      labelNames: ['queue'],
    });

    this.jobDuration = new Prometheus.Histogram({
      name: `${METRICS_PREFIX}_job_duration_seconds`,
      help: 'Job processing duration in seconds',
      labelNames: ['queue', 'type'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
    });
  }

  /**
   * Configure global error handlers and monitoring
   */
  private setupErrorHandlers(): void {
    process.on('SIGTERM', async () => {
      await this.closeQueues();
      process.exit(0);
    });

    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled promise rejection in queue manager', { error: reason });
    });
  }

  /**
   * Gets singleton instance with lazy initialization
   */
  public static getInstance(): QueueManager {
    if (!QueueManager.instance) {
      QueueManager.instance = new QueueManager();
    }
    return QueueManager.instance;
  }

  /**
   * Gets or creates a Bull queue instance with monitoring
   */
  public getQueue(queueName: string, options?: QueueOptions): Queue {
    if (this.queues.has(queueName)) {
      return this.queues.get(queueName)!;
    }

    const queueSettings = queueConfig.queues[queueName];
    if (!queueSettings) {
      throw new Error(`Queue configuration not found for: ${queueName}`);
    }

    const queue = new Queue(queueSettings.name, {
      redis: {
        host: queueConfig.redis.host,
        port: queueConfig.redis.port,
        password: queueConfig.redis.password,
        tls: queueConfig.redis.tls ? {} : undefined,
      },
      defaultJobOptions: {
        ...queueConfig.defaultJobOptions,
        ...queueSettings.jobOptions,
      },
      ...options,
    });

    // Configure queue events and monitoring
    QUEUE_EVENTS.forEach((event) => {
      queue.on(event, (...args) => {
        logger.debug(`Queue ${queueName} event: ${event}`, { args });
        this.updateMetrics(queueName, event, args[0]);
      });
    });

    // Setup error handling and retries
    queue.on('failed', (job, error) => {
      logger.error(`Job failed in queue ${queueName}`, {
        jobId: job.id,
        error,
        attempts: job.attemptsMade,
      });
      this.jobsFailed.inc({ queue: queueName, type: job.data.type, error: error.name });
    });

    this.queues.set(queueName, queue);
    return queue;
  }

  /**
   * Update metrics based on queue events
   */
  private updateMetrics(queueName: string, event: string, job?: Job): void {
    if (event === 'completed') {
      this.jobsProcessed.inc({ queue: queueName, type: job?.data?.type });
    }

    // Update queue size metric
    this.queues.get(queueName)?.getJobCounts().then((counts) => {
      this.queueSize.set({ queue: queueName }, counts.waiting + counts.active);
    });
  }

  /**
   * Gracefully closes all queue connections with cleanup
   */
  public async closeQueues(): Promise<void> {
    logger.info('Gracefully shutting down queues');
    
    const closePromises = Array.from(this.queues.values()).map(async (queue) => {
      try {
        await queue.pause(true);
        await queue.close();
      } catch (error) {
        logger.error('Error closing queue', { error });
      }
    });

    await Promise.all(closePromises);
    await this.redisClient.quit();
    this.queues.clear();
  }

  /**
   * Retrieves queue performance metrics
   */
  public async getMetrics(): Promise<Record<string, any>> {
    const metrics: Record<string, any> = {};
    
    for (const [name, queue] of this.queues) {
      const counts = await queue.getJobCounts();
      metrics[name] = {
        ...counts,
        processed: await this.jobsProcessed.get(),
        failed: await this.jobsFailed.get(),
      };
    }

    return metrics;
  }
}

// Export enhanced queue management functionality with monitoring
export { QueueManager, QueueJobData, QueueJobResult };