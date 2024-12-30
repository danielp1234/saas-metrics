// External imports
import { Request, Response, NextFunction } from 'express'; // v4.18.x

// Internal imports
import { CacheService } from '../../services/cache.service';
import { cacheConfig } from '../../config/cache.config';
import { logger } from '../../lib/logger';

/**
 * Interface defining cache middleware configuration options
 */
interface CacheOptions {
  ttl: number;                  // Cache TTL in seconds
  enabled: boolean;             // Enable/disable caching
  excludePaths: string[];       // Paths to exclude from caching
  compression: boolean;         // Enable response compression
  version: number;              // Cache version for invalidation
  monitoring: {
    enabled: boolean;          // Enable performance monitoring
    sampleRate: number;        // Monitoring sample rate (0-1)
  };
}

/**
 * Default cache configuration with production-ready settings
 */
const DEFAULT_CACHE_OPTIONS: CacheOptions = {
  ttl: 900, // 15 minutes
  enabled: true,
  excludePaths: [],
  compression: true,
  version: 1,
  monitoring: {
    enabled: true,
    sampleRate: 0.1 // 10% sampling rate
  }
};

/**
 * Generates a unique cache key from request parameters
 * @param req - Express request object
 * @param version - Cache version for key generation
 * @returns Unique cache key incorporating method, path, query params and version
 */
const generateCacheKey = (req: Request, version: number): string => {
  const { method, path } = req;
  const queryParams = req.query ? new URLSearchParams(req.query as any).toString() : '';
  const baseKey = `${method}:${path}${queryParams ? `?${queryParams}` : ''}`;
  return `v${version}:${baseKey}`;
};

/**
 * Express middleware for caching API responses using Redis
 * Implements intelligent caching with monitoring, compression and error handling
 * @param options - Cache configuration options
 */
export const cacheMiddleware = (options: Partial<CacheOptions> = {}) => {
  // Merge provided options with defaults
  const config: CacheOptions = {
    ...DEFAULT_CACHE_OPTIONS,
    ...options
  };

  // Initialize cache service instance
  const cacheService = new CacheService();

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Skip caching if disabled or path is excluded
      if (!config.enabled || config.excludePaths.includes(req.path)) {
        return next();
      }

      // Check cache service initialization
      if (!cacheService.isInitialized()) {
        logger.warn('Cache service not initialized, bypassing cache');
        return next();
      }

      // Generate cache key
      const cacheKey = generateCacheKey(req, config.version);

      // Attempt to retrieve from cache
      const cachedResponse = await cacheService.get<any>(cacheKey);

      if (cachedResponse) {
        // Log cache hit if monitoring enabled
        if (config.monitoring.enabled && Math.random() < config.monitoring.sampleRate) {
          logger.performance('Cache hit', {
            path: req.path,
            method: req.method,
            key: cacheKey
          });
        }

        // Return cached response
        return res.status(200).json(cachedResponse);
      }

      // Cache miss - capture original response
      const originalSend = res.json;
      res.json = function (body: any): Response {
        // Restore original json method
        res.json = originalSend;

        // Store response in cache
        if (res.statusCode === 200) {
          cacheService.set(cacheKey, body, config.ttl)
            .catch(error => {
              logger.error('Cache storage error', { error, key: cacheKey });
            });

          // Log cache miss if monitoring enabled
          if (config.monitoring.enabled && Math.random() < config.monitoring.sampleRate) {
            logger.performance('Cache miss', {
              path: req.path,
              method: req.method,
              key: cacheKey
            });
          }
        }

        // Return response
        return originalSend.call(res, body);
      };

      next();
    } catch (error) {
      // Log error and continue without caching
      logger.error('Cache middleware error', { 
        error,
        path: req.path,
        method: req.method 
      });
      next();
    }
  };
};