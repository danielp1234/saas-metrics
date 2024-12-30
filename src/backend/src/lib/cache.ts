// External imports
import Redis from 'ioredis'; // v5.0.0
import CircuitBreaker from 'opossum'; // v6.0.0

// Internal imports
import { cacheConfig } from '../config/cache.config';
import { logger } from '../lib/logger';

/**
 * @version 1.0.0
 * @description Enterprise-grade Redis cache client implementation providing secure,
 * highly available caching functionality with comprehensive monitoring, connection
 * management, and automatic failover support.
 */

// Global client instance
let redisClient: Redis.Redis | null = null;

// Circuit breaker for Redis operations
let circuitBreaker: CircuitBreaker | null = null;

// Operation timing tracking
const operationTimers: Map<string, [number, number]> = new Map();

/**
 * Creates and configures a new Redis client instance with enhanced security,
 * monitoring, and high availability features
 * @returns Configured Redis client instance
 */
export const createRedisClient = (): Redis.Redis => {
  const clientOptions: Redis.RedisOptions = {
    ...cacheConfig.options,
    host: cacheConfig.host,
    port: cacheConfig.port,
    password: cacheConfig.password,
    
    // Enhanced security settings
    tls: cacheConfig.options.tls,
    username: process.env.REDIS_USERNAME,
    
    // Connection pool settings
    connectionName: 'saas-metrics-cache',
    maxRetriesPerRequest: 3,
    
    // Event handlers for comprehensive monitoring
    retryStrategy: (times: number) => {
      if (times > cacheConfig.options.maxRetriesPerRequest) {
        logger.error('Redis retry limit exceeded', { times });
        return null;
      }
      return Math.min(times * 1000, 5000);
    },
    
    // Sentinel configuration for high availability
    sentinels: cacheConfig.sentinels,
    name: 'mymaster',
    sentinelRetryStrategy: (times: number) => {
      return Math.min(times * 1000, 5000);
    }
  };

  const client = new Redis(clientOptions);

  // Configure event handlers
  client.on('connect', () => {
    logger.info('Redis client connected');
  });

  client.on('error', (error) => {
    logger.error('Redis client error', { error });
  });

  client.on('ready', () => {
    logger.info('Redis client ready');
  });

  client.on('close', () => {
    logger.warn('Redis client connection closed');
  });

  client.on('reconnecting', () => {
    logger.info('Redis client reconnecting');
  });

  return client;
};

/**
 * Establishes secure connection to Redis server with comprehensive error handling
 * and monitoring
 * @returns Promise<Redis.Redis> Connected Redis client
 */
export const connect = async (): Promise<Redis.Redis> => {
  try {
    if (!redisClient) {
      redisClient = createRedisClient();

      // Initialize circuit breaker
      circuitBreaker = new CircuitBreaker(async (operation: Function) => {
        return operation();
      }, {
        timeout: 5000,
        errorThresholdPercentage: 50,
        resetTimeout: 30000
      });

      circuitBreaker.on('open', () => {
        logger.warn('Redis circuit breaker opened');
      });

      circuitBreaker.on('halfOpen', () => {
        logger.info('Redis circuit breaker half-opened');
      });

      circuitBreaker.on('close', () => {
        logger.info('Redis circuit breaker closed');
      });
    }

    // Verify connection
    await redisClient.ping();
    logger.info('Redis connection verified');

    return redisClient;
  } catch (error) {
    logger.error('Redis connection error', { error });
    throw error;
  }
};

/**
 * Gracefully disconnects Redis client with proper resource cleanup
 * @returns Promise<void>
 */
export const disconnect = async (): Promise<void> => {
  try {
    if (redisClient) {
      // Log final performance metrics
      const metrics = Array.from(operationTimers.entries()).map(([op, [start, end]]) => ({
        operation: op,
        duration: end - start
      }));
      logger.performance('Redis operations summary', { metrics });

      // Cleanup resources
      await redisClient.quit();
      redisClient = null;
      circuitBreaker = null;
      operationTimers.clear();

      logger.info('Redis client disconnected successfully');
    }
  } catch (error) {
    logger.error('Redis disconnection error', { error });
    throw error;
  }
};

/**
 * Retrieves or creates Redis client with health checking and automatic recovery
 * @returns Promise<Redis.Redis> Healthy Redis client instance
 */
export const getClient = async (): Promise<Redis.Redis> => {
  try {
    if (!redisClient) {
      await connect();
    }

    // Verify client health
    if (redisClient && !redisClient.status.includes('ready')) {
      logger.warn('Redis client not ready, reconnecting');
      await disconnect();
      await connect();
    }

    if (!redisClient) {
      throw new Error('Failed to initialize Redis client');
    }

    return redisClient;
  } catch (error) {
    logger.error('Error getting Redis client', { error });
    throw error;
  }
};

/**
 * Measures and logs Redis operation execution time for performance monitoring
 * @param operationName Name of the Redis operation being measured
 */
const measureOperationTime = (operationName: string): void => {
  const startTime = process.hrtime();
  operationTimers.set(operationName, [startTime[0] * 1e9 + startTime[1], 0]);

  // Schedule end time recording
  process.nextTick(() => {
    const endTime = process.hrtime();
    const [start] = operationTimers.get(operationName) || [0, 0];
    operationTimers.set(operationName, [start, endTime[0] * 1e9 + endTime[1]]);

    // Log performance metrics
    logger.performance('Redis operation timing', {
      operation: operationName,
      duration: (endTime[0] * 1e9 + endTime[1] - start) / 1e6, // Convert to milliseconds
      timestamp: new Date().toISOString()
    });
  });
};