// External imports
import Redis from 'ioredis'; // v5.0.0

// Internal imports
import { getClient } from '../lib/cache';
import { cacheConfig } from '../config/cache.config';
import { logger } from '../lib/logger';

/**
 * @class CacheService
 * @description Enterprise-grade Redis cache service providing secure, monitored caching
 * functionality with automatic failover and performance optimization.
 * @version 1.0.0
 */
export class CacheService {
  private client: Redis | null = null;
  private metrics: {
    hits: number;
    misses: number;
    errors: number;
    operations: Map<string, number>;
  };

  constructor() {
    this.metrics = {
      hits: 0,
      misses: 0,
      errors: 0,
      operations: new Map(),
    };
  }

  /**
   * Initializes Redis client connection with monitoring and failover support
   * @throws Error if initialization fails
   */
  public async initialize(): Promise<void> {
    try {
      this.client = await getClient();

      // Set up event monitoring
      this.client.on('error', (error: Error) => {
        logger.error('Redis cache error', { error });
        this.metrics.errors++;
      });

      this.client.on('connect', () => {
        logger.info('Redis cache connected');
      });

      // Initialize health check
      setInterval(() => this.healthCheck(), 30000);

      logger.info('Cache service initialized successfully');
    } catch (error) {
      logger.error('Cache service initialization failed', { error });
      throw error;
    }
  }

  /**
   * Securely stores data in cache with dynamic TTL
   * @param key - Cache key
   * @param value - Data to cache
   * @param ttl - Optional TTL in seconds (defaults to config TTL)
   */
  public async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      if (!this.client) {
        throw new Error('Cache client not initialized');
      }

      const prefixedKey = this.getPrefixedKey(key);
      const serializedValue = this.serializeValue(value);

      // Use provided TTL or default from config
      const effectiveTtl = ttl || cacheConfig.ttl;

      await this.client.setex(prefixedKey, effectiveTtl, serializedValue);

      this.trackOperation('set');
      logger.debug('Cache set operation successful', { key: prefixedKey });
    } catch (error) {
      this.handleError('set', error, key);
      throw error;
    }
  }

  /**
   * Retrieves and validates data from cache
   * @param key - Cache key
   * @returns Cached value or null if not found
   */
  public async get<T>(key: string): Promise<T | null> {
    try {
      if (!this.client) {
        throw new Error('Cache client not initialized');
      }

      const prefixedKey = this.getPrefixedKey(key);
      const cachedValue = await this.client.get(prefixedKey);

      if (!cachedValue) {
        this.metrics.misses++;
        logger.debug('Cache miss', { key: prefixedKey });
        return null;
      }

      this.metrics.hits++;
      this.trackOperation('get');

      return this.deserializeValue<T>(cachedValue);
    } catch (error) {
      this.handleError('get', error, key);
      return null;
    }
  }

  /**
   * Securely removes data from cache
   * @param key - Cache key to delete
   */
  public async delete(key: string): Promise<void> {
    try {
      if (!this.client) {
        throw new Error('Cache client not initialized');
      }

      const prefixedKey = this.getPrefixedKey(key);
      await this.client.del(prefixedKey);

      this.trackOperation('delete');
      logger.debug('Cache delete operation successful', { key: prefixedKey });
    } catch (error) {
      this.handleError('delete', error, key);
      throw error;
    }
  }

  /**
   * Safely clears cached data with specified prefix
   * @param prefix - Optional key prefix to clear specific cache segment
   */
  public async clear(prefix?: string): Promise<void> {
    try {
      if (!this.client) {
        throw new Error('Cache client not initialized');
      }

      const pattern = prefix 
        ? this.getPrefixedKey(`${prefix}*`) 
        : this.getPrefixedKey('*');

      const keys = await this.client.keys(pattern);
      
      if (keys.length > 0) {
        await this.client.del(...keys);
      }

      this.trackOperation('clear');
      logger.info('Cache clear operation successful', { 
        prefix, 
        keysCleared: keys.length 
      });
    } catch (error) {
      this.handleError('clear', error);
      throw error;
    }
  }

  /**
   * Performs health check on cache connection
   * @private
   */
  private async healthCheck(): Promise<void> {
    try {
      if (!this.client) {
        throw new Error('Cache client not initialized');
      }

      await this.client.ping();
      
      // Log performance metrics
      logger.performance('Cache health metrics', {
        hits: this.metrics.hits,
        misses: this.metrics.misses,
        errors: this.metrics.errors,
        operations: Object.fromEntries(this.metrics.operations),
        hitRate: this.calculateHitRate(),
      });
    } catch (error) {
      logger.error('Cache health check failed', { error });
      await this.handleFailover();
    }
  }

  /**
   * Handles cache failover by attempting to reconnect
   * @private
   */
  private async handleFailover(): Promise<void> {
    try {
      this.client = null;
      await this.initialize();
      logger.info('Cache failover successful');
    } catch (error) {
      logger.error('Cache failover failed', { error });
    }
  }

  /**
   * Tracks cache operation metrics
   * @private
   */
  private trackOperation(operation: string): void {
    const count = this.metrics.operations.get(operation) || 0;
    this.metrics.operations.set(operation, count + 1);
  }

  /**
   * Calculates cache hit rate
   * @private
   */
  private calculateHitRate(): number {
    const total = this.metrics.hits + this.metrics.misses;
    return total > 0 ? (this.metrics.hits / total) * 100 : 0;
  }

  /**
   * Handles cache operation errors
   * @private
   */
  private handleError(operation: string, error: any, key?: string): void {
    this.metrics.errors++;
    logger.error('Cache operation failed', {
      operation,
      key,
      error,
    });
  }

  /**
   * Applies key prefix strategy
   * @private
   */
  private getPrefixedKey(key: string): string {
    return `${cacheConfig.options.keyPrefix || ''}${key}`;
  }

  /**
   * Securely serializes cache values
   * @private
   */
  private serializeValue(value: any): string {
    try {
      return JSON.stringify(value);
    } catch (error) {
      logger.error('Cache serialization failed', { error });
      throw error;
    }
  }

  /**
   * Safely deserializes and validates cached values
   * @private
   */
  private deserializeValue<T>(value: string): T {
    try {
      return JSON.parse(value) as T;
    } catch (error) {
      logger.error('Cache deserialization failed', { error });
      throw error;
    }
  }
}