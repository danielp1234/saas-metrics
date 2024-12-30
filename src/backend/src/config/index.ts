/**
 * @fileoverview Central configuration module for SaaS Metrics Platform
 * Consolidates and exports all configuration settings with enhanced security,
 * validation, and monitoring capabilities.
 * @version 1.0.0
 */

// External imports
import { config as dotenvConfig } from 'dotenv'; // ^16.0.0
import { createLogger, format, transports } from 'winston'; // ^3.8.0

// Internal imports
import { authConfig } from './auth.config';
import { cacheConfig } from './cache.config';
import { databaseConfig } from './database.config';
import { metricsConfig } from './metrics.config';
import { HTTP_STATUS, CACHE_TTL, API_RATE_LIMITS } from '../utils/constants';

// Initialize environment variables
dotenvConfig();

// Configure logger for configuration monitoring
const logger = createLogger({
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'logs/config.log' })
  ]
});

// Configuration version for tracking changes
export const CONFIG_VERSION = '1.0.0';

/**
 * Validation rules for configuration settings
 */
export const VALIDATION_RULES = {
  auth: {
    requiredFields: ['google', 'jwt', 'session'],
    minJwtLength: 32,
    maxConcurrentSessions: 5
  },
  cache: {
    minTtl: 60,
    maxTtl: 86400,
    maxPoolSize: 100
  },
  database: {
    minPoolSize: 5,
    maxPoolSize: 50,
    minTimeout: 1000
  },
  metrics: {
    minSampleRate: 0.1,
    maxBatchSize: 10000
  }
};

/**
 * Configuration monitoring interface
 */
interface ConfigMonitor {
  lastValidated: Date;
  validationErrors: string[];
  performanceMetrics: {
    loadTime: number;
    cacheHitRate: number;
    validationTime: number;
  };
}

/**
 * Configuration manager class with enhanced security and monitoring
 */
class ConfigurationManager {
  private static instance: ConfigurationManager;
  private monitor: ConfigMonitor;

  private constructor() {
    this.monitor = {
      lastValidated: new Date(),
      validationErrors: [],
      performanceMetrics: {
        loadTime: 0,
        cacheHitRate: 0,
        validationTime: 0
      }
    };
  }

  /**
   * Get singleton instance of configuration manager
   */
  public static getInstance(): ConfigurationManager {
    if (!ConfigurationManager.instance) {
      ConfigurationManager.instance = new ConfigurationManager();
    }
    return ConfigurationManager.instance;
  }

  /**
   * Comprehensive validation of all configuration settings
   */
  @logValidation
  public validateConfigurations(): boolean {
    const startTime = Date.now();
    let isValid = true;
    this.monitor.validationErrors = [];

    try {
      // Validate authentication configuration
      if (!authConfig.jwt.secret || authConfig.jwt.secret.length < VALIDATION_RULES.auth.minJwtLength) {
        this.monitor.validationErrors.push('Invalid JWT configuration');
        isValid = false;
      }

      // Validate cache configuration
      if (cacheConfig.ttl < VALIDATION_RULES.cache.minTtl || cacheConfig.ttl > VALIDATION_RULES.cache.maxTtl) {
        this.monitor.validationErrors.push('Invalid cache TTL configuration');
        isValid = false;
      }

      // Validate database configuration
      if (!databaseConfig.poolConfig || 
          databaseConfig.poolConfig.min < VALIDATION_RULES.database.minPoolSize ||
          databaseConfig.poolConfig.max > VALIDATION_RULES.database.maxPoolSize) {
        this.monitor.validationErrors.push('Invalid database pool configuration');
        isValid = false;
      }

      // Validate metrics configuration
      if (!metricsConfig.validation.enabled || 
          metricsConfig.performance.sampleRate < VALIDATION_RULES.metrics.minSampleRate) {
        this.monitor.validationErrors.push('Invalid metrics configuration');
        isValid = false;
      }

      this.monitor.validationTime = Date.now() - startTime;
      this.monitor.lastValidated = new Date();

      logger.info('Configuration validation completed', {
        isValid,
        errors: this.monitor.validationErrors,
        validationTime: this.monitor.validationTime
      });

      return isValid;
    } catch (error) {
      logger.error('Configuration validation failed', { error });
      return false;
    }
  }

  /**
   * Monitor configuration health and performance
   */
  @monitor
  public monitorConfigurations(): ConfigMonitor {
    return this.monitor;
  }

  /**
   * Get consolidated configuration object
   */
  public getConfig() {
    return {
      version: CONFIG_VERSION,
      auth: authConfig,
      cache: cacheConfig,
      database: databaseConfig,
      metrics: metricsConfig,
      constants: {
        http: HTTP_STATUS,
        cache: CACHE_TTL,
        rateLimits: API_RATE_LIMITS
      }
    };
  }
}

/**
 * Logging decorator for validation functions
 */
function logValidation(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;

  descriptor.value = function(...args: any[]) {
    logger.info(`Starting configuration validation`, { method: propertyKey });
    const result = originalMethod.apply(this, args);
    logger.info(`Completed configuration validation`, { 
      method: propertyKey,
      result,
      timestamp: new Date()
    });
    return result;
  };

  return descriptor;
}

/**
 * Monitoring decorator for performance tracking
 */
function monitor(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;

  descriptor.value = function(...args: any[]) {
    const startTime = Date.now();
    const result = originalMethod.apply(this, args);
    const endTime = Date.now();

    logger.info(`Configuration monitoring metrics`, {
      method: propertyKey,
      executionTime: endTime - startTime,
      timestamp: new Date()
    });

    return result;
  };

  return descriptor;
}

// Initialize and validate configuration
const configManager = ConfigurationManager.getInstance();
if (!configManager.validateConfigurations()) {
  throw new Error('Invalid configuration detected');
}

// Export configuration instance
export const config = configManager.getConfig();

// Export individual configurations for selective imports
export {
  authConfig,
  cacheConfig,
  databaseConfig,
  metricsConfig
};

// Export monitoring interface
export type { ConfigMonitor };