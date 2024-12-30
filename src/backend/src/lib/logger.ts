import { createLogger, Logger, format } from 'winston';
import { ElasticsearchTransport } from 'winston-elasticsearch';
import { loggerConfig } from '../config/logger.config';

/**
 * @version 1.0.0
 * @description Enhanced logging module implementing Winston logger with ELK Stack integration.
 * Provides secure, real-time logging with comprehensive monitoring, error tracking,
 * and performance metrics.
 */

// Custom log levels including security and performance monitoring
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
  security: 1, // Same priority as warn
  performance: 2, // Same priority as info
};

// Patterns for sensitive data masking
const SENSITIVE_PATTERNS = [
  /password/i,
  /token/i,
  /key/i,
  /secret/i,
  /credential/i,
  /authorization/i,
  /cookie/i,
];

/**
 * Masks sensitive data in log messages based on configured patterns
 * @param message - The log message or object to sanitize
 * @returns Sanitized message with sensitive data masked
 */
const maskSensitiveData = (message: any): any => {
  if (typeof message === 'string') {
    return SENSITIVE_PATTERNS.reduce(
      (msg, pattern) => msg.replace(pattern, '[REDACTED]'),
      message
    );
  }

  if (typeof message === 'object' && message !== null) {
    const maskedObj = { ...message };
    for (const key in maskedObj) {
      if (SENSITIVE_PATTERNS.some(pattern => pattern.test(key))) {
        maskedObj[key] = '[REDACTED]';
      } else if (typeof maskedObj[key] === 'object') {
        maskedObj[key] = maskSensitiveData(maskedObj[key]);
      }
    }
    return maskedObj;
  }

  return message;
};

/**
 * Creates and configures an enhanced Winston logger instance with ELK Stack integration,
 * security features, and performance monitoring
 */
const createLoggerInstance = (): Logger => {
  // Create base logger with imported configuration
  const logger = createLogger({
    ...loggerConfig,
    levels: LOG_LEVELS,
  });

  // Add custom security logging method
  logger.security = function(message: any, ...meta: any[]): Logger {
    return this.log('security', maskSensitiveData(message), ...meta);
  };

  // Add custom performance logging method
  logger.performance = function(message: any, ...meta: any[]): Logger {
    const perfData = {
      message,
      timestamp: new Date().toISOString(),
      ...meta[0],
    };
    return this.log('performance', perfData);
  };

  // Add error correlation
  const originalErrorLogger = logger.error;
  logger.error = function(message: any, ...meta: any[]): Logger {
    const errorMeta = {
      correlationId: meta[0]?.correlationId || Date.now().toString(),
      stack: meta[0]?.error?.stack,
      ...meta[0],
    };
    return originalErrorLogger.call(this, message, errorMeta);
  };

  return logger;
};

// Create and export the enhanced logger instance
export const logger: Logger & {
  security: (message: any, ...meta: any[]) => Logger;
  performance: (message: any, ...meta: any[]) => Logger;
} = createLoggerInstance();

// Export individual logging methods for convenience
export const {
  error,
  warn,
  info,
  http,
  debug,
  security,
  performance
} = logger;

/**
 * Example usage:
 * 
 * import { logger } from './lib/logger';
 * 
 * // Standard logging
 * logger.info('Application started');
 * logger.error('Error occurred', { error, correlationId });
 * 
 * // Security logging
 * logger.security('Failed login attempt', { username, ip });
 * 
 * // Performance logging
 * logger.performance('API Response Time', { 
 *   endpoint: '/api/metrics',
 *   duration: 235,
 *   statusCode: 200
 * });
 */