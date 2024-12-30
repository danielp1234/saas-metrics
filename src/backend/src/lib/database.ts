// External imports with versions
import { Pool, QueryResult, PoolClient } from 'pg'; // ^8.11.0
import { Logger, createLogger, format, transports } from 'winston'; // ^3.8.0

// Internal imports
import { databaseConfig } from '../config/database.config';

// Constants for database operations
const DEFAULT_POOL_SIZE = 20;
const HEALTH_CHECK_QUERY = 'SELECT 1';
const DEFAULT_QUERY_TIMEOUT = 30000;
const MAX_CONNECTION_RETRIES = 3;
const CONNECTION_RETRY_DELAY = 1000;
const STATEMENT_TIMEOUT = 60000;

// Interfaces for database service
interface QueryOptions {
  timeout?: number;
  statementTimeout?: number;
  retryCount?: number;
}

interface TransactionOptions {
  isolationLevel?: 'READ COMMITTED' | 'REPEATABLE READ' | 'SERIALIZABLE';
  readOnly?: boolean;
  timeout?: number;
}

interface HealthCheckResult {
  isHealthy: boolean;
  poolSize: number;
  activeConnections: number;
  idleConnections: number;
  waitingConnections: number;
  latencyMs: number;
  sslEnabled: boolean;
  lastError?: string;
}

/**
 * Advanced database service providing secure connection management,
 * optimized query execution, transaction isolation, and comprehensive monitoring
 */
export class DatabaseService {
  private pool: Pool;
  private logger: Logger;
  private isInitialized: boolean = false;

  constructor() {
    this.initializeLogger();
    this.initializePool();
    this.setupPoolEventHandlers();
  }

  /**
   * Initializes Winston logger with structured logging
   */
  private initializeLogger(): void {
    this.logger = createLogger({
      format: format.combine(
        format.timestamp(),
        format.json()
      ),
      transports: [
        new transports.Console(),
        new transports.File({ filename: 'logs/database.log' })
      ]
    });
  }

  /**
   * Initializes PostgreSQL connection pool with advanced configuration
   */
  private initializePool(): void {
    try {
      this.pool = new Pool({
        host: databaseConfig.host,
        port: databaseConfig.port,
        database: databaseConfig.database,
        user: databaseConfig.username,
        password: databaseConfig.password,
        ssl: databaseConfig.ssl,
        max: databaseConfig.poolConfig.max || DEFAULT_POOL_SIZE,
        min: databaseConfig.poolConfig.min,
        idleTimeoutMillis: databaseConfig.poolConfig.idleTimeoutMillis,
        connectionTimeoutMillis: databaseConfig.poolConfig.acquireTimeoutMillis,
        statement_timeout: STATEMENT_TIMEOUT,
        query_timeout: DEFAULT_QUERY_TIMEOUT
      });

      this.isInitialized = true;
      this.logger.info('Database pool initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize database pool:', error);
      throw error;
    }
  }

  /**
   * Sets up event handlers for pool lifecycle events
   */
  private setupPoolEventHandlers(): void {
    this.pool.on('connect', (client) => {
      this.logger.info('New client connected to pool');
      client.query(`SET statement_timeout = ${STATEMENT_TIMEOUT}`);
    });

    this.pool.on('error', (err, client) => {
      this.logger.error('Unexpected error on idle client:', err);
    });

    this.pool.on('remove', () => {
      this.logger.info('Client removed from pool');
    });
  }

  /**
   * Executes a secure SQL query with parameters and monitoring
   */
  public async query<T = any>(
    sql: string,
    params: any[] = [],
    options: QueryOptions = {}
  ): Promise<QueryResult<T>> {
    if (!this.isInitialized) {
      throw new Error('Database service not initialized');
    }

    const startTime = Date.now();
    let client: PoolClient | null = null;
    let retryCount = 0;

    try {
      // Input validation
      if (!sql.trim()) {
        throw new Error('Empty SQL query');
      }

      // Get client from pool with retry logic
      while (!client && retryCount < (options.retryCount || MAX_CONNECTION_RETRIES)) {
        try {
          client = await this.pool.connect();
        } catch (error) {
          retryCount++;
          if (retryCount === MAX_CONNECTION_RETRIES) {
            throw error;
          }
          await new Promise(resolve => setTimeout(resolve, CONNECTION_RETRY_DELAY));
        }
      }

      if (!client) {
        throw new Error('Failed to acquire database connection');
      }

      // Execute query with timeout
      const queryConfig = {
        text: sql,
        values: params,
        timeout: options.timeout || DEFAULT_QUERY_TIMEOUT
      };

      const result = await client.query(queryConfig);

      this.logger.debug('Query executed successfully', {
        duration: Date.now() - startTime,
        rowCount: result.rowCount
      });

      return result;
    } catch (error) {
      this.logger.error('Query execution failed:', {
        error,
        sql,
        params,
        duration: Date.now() - startTime
      });
      throw error;
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  /**
   * Executes multiple queries in a transaction with isolation level support
   */
  public async transaction<T>(
    callback: (client: PoolClient) => Promise<T>,
    options: TransactionOptions = {}
  ): Promise<T> {
    const client = await this.pool.connect();
    let result: T;

    try {
      // Set isolation level if specified
      if (options.isolationLevel) {
        await client.query(`SET TRANSACTION ISOLATION LEVEL ${options.isolationLevel}`);
      }

      // Set read-only mode if specified
      if (options.readOnly) {
        await client.query('SET TRANSACTION READ ONLY');
      }

      await client.query('BEGIN');

      try {
        result = await callback(client);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }

      return result;
    } catch (error) {
      this.logger.error('Transaction failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Performs comprehensive database health check with diagnostics
   */
  public async healthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    try {
      await this.query(HEALTH_CHECK_QUERY);
      
      const poolStatus = {
        totalCount: this.pool.totalCount,
        idleCount: this.pool.idleCount,
        waitingCount: this.pool.waitingCount
      };

      return {
        isHealthy: true,
        poolSize: poolStatus.totalCount,
        activeConnections: poolStatus.totalCount - poolStatus.idleCount,
        idleConnections: poolStatus.idleCount,
        waitingConnections: poolStatus.waitingCount,
        latencyMs: Date.now() - startTime,
        sslEnabled: !!databaseConfig.ssl
      };
    } catch (error) {
      this.logger.error('Health check failed:', error);
      return {
        isHealthy: false,
        poolSize: 0,
        activeConnections: 0,
        idleConnections: 0,
        waitingConnections: 0,
        latencyMs: Date.now() - startTime,
        sslEnabled: !!databaseConfig.ssl,
        lastError: error.message
      };
    }
  }

  /**
   * Gracefully shuts down the database pool
   */
  public async shutdown(): Promise<void> {
    try {
      await this.pool.end();
      this.logger.info('Database pool shut down successfully');
    } catch (error) {
      this.logger.error('Error shutting down database pool:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const databaseService = new DatabaseService();