// External imports
// bull v4.10.0
import { QueueOptions } from 'bull';
// ioredis v5.0.0
import { Redis } from 'ioredis';

// Internal imports
import { QueueConfig } from '../interfaces/config.interface';

// Constants for queue configuration
const DEFAULT_JOB_ATTEMPTS = 3;
const DEFAULT_BACKOFF = 5000;
const DEFAULT_REMOVE_ON_COMPLETE = 100;
const DEFAULT_REMOVE_ON_FAIL = 1000;
const DEFAULT_TIMEOUT = 300000; // 5 minutes
const MAX_CONCURRENCY = 5;
const RATE_LIMIT_WINDOW = 60000; // 1 minute

/**
 * Enhanced Redis connection configuration interface
 */
interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  tls?: boolean;
  options: {
    maxRetriesPerRequest: number;
    enableReadyCheck: boolean;
    connectTimeout: number;
    retryStrategy: (times: number) => number;
    keepAlive: number;
  };
}

/**
 * Optimized default job options interface
 */
interface QueueJobOptions {
  attempts: number;
  backoff: {
    type: 'exponential' | 'fixed';
    delay: number;
  };
  removeOnComplete: number;
  removeOnFail: number;
  timeout: number;
  priority: number;
}

/**
 * Enhanced queue settings interface with monitoring
 */
interface QueueSettings {
  name: string;
  concurrency: number;
  rateLimit: {
    max: number;
    window: number;
  };
  jobOptions: Partial<QueueJobOptions>;
  monitoring: {
    metrics: boolean;
    alertThreshold: number;
  };
}

/**
 * Retrieves optimized queue configuration with enhanced reliability settings
 * @returns Complete queue configuration object
 */
function getQueueConfig(): QueueConfig {
  // Redis configuration with improved reliability
  const redisConfig: RedisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    tls: process.env.REDIS_TLS === 'true',
    options: {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      connectTimeout: 10000,
      retryStrategy: (times: number) => Math.min(times * 1000, 30000),
      keepAlive: 30000,
    },
  };

  // Default job options with intelligent backoff
  const defaultJobOptions: QueueJobOptions = {
    attempts: DEFAULT_JOB_ATTEMPTS,
    backoff: {
      type: 'exponential',
      delay: DEFAULT_BACKOFF,
    },
    removeOnComplete: DEFAULT_REMOVE_ON_COMPLETE,
    removeOnFail: DEFAULT_REMOVE_ON_FAIL,
    timeout: DEFAULT_TIMEOUT,
    priority: 0,
  };

  // Queue-specific configurations with performance optimizations
  const queues: Record<string, QueueSettings> = {
    benchmarkImport: {
      name: 'benchmark-import',
      concurrency: MAX_CONCURRENCY,
      rateLimit: {
        max: 1000,
        window: RATE_LIMIT_WINDOW,
      },
      jobOptions: {
        attempts: DEFAULT_JOB_ATTEMPTS,
        timeout: 600000, // 10 minutes for imports
        priority: 1,
      },
      monitoring: {
        metrics: true,
        alertThreshold: 0.1, // 10% error threshold
      },
    },
    metricsCalculation: {
      name: 'metrics-queue',
      concurrency: MAX_CONCURRENCY,
      rateLimit: {
        max: 2000,
        window: RATE_LIMIT_WINDOW,
      },
      jobOptions: {
        attempts: DEFAULT_JOB_ATTEMPTS,
        timeout: DEFAULT_TIMEOUT,
        priority: 2,
      },
      monitoring: {
        metrics: true,
        alertThreshold: 0.05, // 5% error threshold
      },
    },
  };

  return {
    redis: redisConfig,
    defaultJobOptions,
    queues,
  };
}

// Export the optimized queue configuration
export const queueConfig = getQueueConfig();

/**
 * Helper function to create Redis client with optimized settings
 * @returns Configured Redis client
 */
export function createRedisClient(): Redis {
  const config = queueConfig.redis;
  return new Redis({
    host: config.host,
    port: config.port,
    password: config.password,
    tls: config.tls ? {} : undefined,
    maxRetriesPerRequest: config.options.maxRetriesPerRequest,
    enableReadyCheck: config.options.enableReadyCheck,
    connectTimeout: config.options.connectTimeout,
    retryStrategy: config.options.retryStrategy,
    keepAlive: config.options.keepAlive,
  });
}

// Export queue names as constants for type safety
export const QueueNames = {
  BENCHMARK_IMPORT: 'benchmark-import',
  METRICS_CALCULATION: 'metrics-queue',
} as const;