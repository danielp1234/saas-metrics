// External imports
// ioredis v5.0.0
import Redis from 'ioredis';

// Internal imports
import { CacheConfig } from '../interfaces/config.interface';

// Constants
const DEFAULT_TTL = 900; // 15 minutes in seconds
const DEFAULT_PORT = 6379;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY_MS = 1000;
const CONNECTION_TIMEOUT_MS = 10000;

/**
 * Validates Redis configuration object for required properties and correct types
 * @param config - Redis configuration object to validate
 * @returns boolean indicating if configuration is valid
 * @throws Error if configuration is invalid
 */
const validateConfig = (config: CacheConfig): boolean => {
  if (!config.host || typeof config.host !== 'string') {
    throw new Error('Invalid Redis host configuration');
  }

  if (!config.port || typeof config.port !== 'number' || config.port < 1 || config.port > 65535) {
    throw new Error('Invalid Redis port configuration');
  }

  if (config.password && typeof config.password !== 'string') {
    throw new Error('Invalid Redis password configuration');
  }

  if (!config.ttl || typeof config.ttl !== 'number' || config.ttl < 0) {
    throw new Error('Invalid Redis TTL configuration');
  }

  if (!config.options || typeof config.options !== 'object') {
    throw new Error('Invalid Redis options configuration');
  }

  return true;
};

/**
 * Retrieves and validates Redis configuration from environment variables
 * with secure defaults and enhanced error handling
 * @returns Validated Redis cache configuration object
 */
const getRedisConfig = (): CacheConfig => {
  const config: CacheConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || DEFAULT_PORT.toString(), 10),
    password: process.env.REDIS_PASSWORD,
    ttl: parseInt(process.env.REDIS_TTL || DEFAULT_TTL.toString(), 10),
    options: {
      // Connection settings
      connectTimeout: CONNECTION_TIMEOUT_MS,
      commandTimeout: 5000,
      keepAlive: 30000,
      noDelay: true,
      
      // Retry strategy configuration
      retryStrategy: (times: number) => {
        if (times > MAX_RECONNECT_ATTEMPTS) {
          return null; // Stop retrying
        }
        return Math.min(times * RECONNECT_DELAY_MS, 5000);
      },

      // Reconnection settings
      reconnectOnError: (err: Error) => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          return true; // Reconnect for READONLY error
        }
        return false;
      },

      // Security settings
      tls: process.env.REDIS_TLS_ENABLED === 'true' ? {
        rejectUnauthorized: true,
      } : undefined,

      // Performance settings
      maxRetriesPerRequest: 3,
      enableOfflineQueue: true,
      enableReadyCheck: true,

      // Monitoring and logging
      showFriendlyErrorStack: process.env.NODE_ENV !== 'production',
      keyPrefix: 'saas-metrics:',

      // Connection name for monitoring
      connectionName: 'saas-metrics-service',
    },
    cluster: false,
    sentinels: [],
  };

  // Validate the configuration before returning
  validateConfig(config);

  return config;
};

/**
 * Exported Redis cache configuration with security and performance optimizations
 * Used for initializing Redis client instances across the application
 */
export const cacheConfig = getRedisConfig();

/**
 * Export individual configuration properties for selective imports
 */
export const {
  host,
  port,
  password,
  ttl,
  options,
} = cacheConfig;

/**
 * Export configuration validation utility
 */
export { validateConfig };