/**
 * @fileoverview Database configuration for the SaaS Metrics Platform
 * Implements database requirements from Section 2.3.2 with enhanced security,
 * performance optimization, and monitoring capabilities.
 * 
 * @version 1.0.0
 * @package dotenv ^16.3.1
 * @package winston ^3.10.0
 */

import { config } from 'dotenv'; // v16.3.1
import { createLogger, format, transports } from 'winston'; // v3.10.0
import { DatabaseConfig } from '../interfaces/config.interface';

// Load environment variables
config();

// Configure logger for database configuration issues
const logger = createLogger({
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'logs/database-config.log' })
  ]
});

// Database configuration constants
const DEFAULT_PORT = 5432;
const DEFAULT_POOL_MIN = 2;
const DEFAULT_POOL_MAX = 20;
const DEFAULT_IDLE_TIMEOUT = 10000;
const DEFAULT_CONNECTION_TIMEOUT = 5000;
const DEFAULT_STATEMENT_TIMEOUT = 30000;
const MAX_POOL_SIZE = 50;
const CONNECTION_RETRY_ATTEMPTS = 3;

/**
 * Validates database configuration parameters with enhanced security checks
 * @param config DatabaseConfig object to validate
 * @returns boolean indicating if configuration is valid
 * @throws Error with detailed message if validation fails
 */
export const validateDatabaseConfig = (config: DatabaseConfig): boolean => {
  // Validate host
  if (!config.host || !/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(config.host)) {
    throw new Error('Invalid database host configuration');
  }

  // Validate port
  if (!config.port || config.port < 1 || config.port > 65535) {
    throw new Error('Invalid database port configuration');
  }

  // Validate database name
  if (!config.database || !/^[a-zA-Z0-9_-]+$/.test(config.database)) {
    throw new Error('Invalid database name configuration');
  }

  // Validate credentials
  if (!config.username || !config.password) {
    throw new Error('Database credentials must be provided');
  }

  // Validate pool configuration
  if (config.poolConfig) {
    if (config.poolConfig.max && (config.poolConfig.max > MAX_POOL_SIZE || config.poolConfig.max < DEFAULT_POOL_MIN)) {
      throw new Error(`Pool size must be between ${DEFAULT_POOL_MIN} and ${MAX_POOL_SIZE}`);
    }
  }

  return true;
};

/**
 * Creates optimized connection pool configuration based on environment
 * @param env NodeJS.ProcessEnv
 * @returns Configured pool settings
 */
export const createPoolConfig = (env: NodeJS.ProcessEnv) => {
  const isProduction = env.NODE_ENV === 'production';
  
  return {
    min: parseInt(env.DB_POOL_MIN || String(DEFAULT_POOL_MIN)),
    max: parseInt(env.DB_POOL_MAX || String(isProduction ? DEFAULT_POOL_MAX : DEFAULT_POOL_MIN * 2)),
    idleTimeoutMillis: parseInt(env.DB_IDLE_TIMEOUT || String(DEFAULT_IDLE_TIMEOUT)),
    connectionTimeoutMillis: parseInt(env.DB_CONNECTION_TIMEOUT || String(DEFAULT_CONNECTION_TIMEOUT)),
    statement_timeout: parseInt(env.DB_STATEMENT_TIMEOUT || String(DEFAULT_STATEMENT_TIMEOUT)),
    allowExitOnIdle: !isProduction,
    retry_strategy: {
      retries: CONNECTION_RETRY_ATTEMPTS,
      factor: 2,
      minTimeout: 1000,
      maxTimeout: 5000
    }
  };
};

/**
 * Database configuration object implementing requirements from Section 2.3.2
 */
export const databaseConfig: DatabaseConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || String(DEFAULT_PORT)),
  database: process.env.DB_NAME || 'saas_metrics',
  username: process.env.DB_USER || '',
  password: process.env.DB_PASSWORD || '',
  ssl: process.env.DB_SSL === 'true',
  poolConfig: createPoolConfig(process.env),
  connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || String(DEFAULT_CONNECTION_TIMEOUT)),
  statementTimeout: parseInt(process.env.DB_STATEMENT_TIMEOUT || String(DEFAULT_STATEMENT_TIMEOUT)),
  enableQueryLogging: process.env.DB_QUERY_LOGGING === 'true'
};

// Validate configuration before export
try {
  validateDatabaseConfig(databaseConfig);
  logger.info('Database configuration validated successfully');
} catch (error) {
  logger.error('Database configuration validation failed', { error });
  throw error;
}

export default databaseConfig;