/**
 * @fileoverview Health Controller for system monitoring and health checks
 * Implements comprehensive health monitoring for critical system components
 * with detailed metrics tracking and uptime calculation.
 * @version 1.0.0
 */

// External imports
import { Request, Response } from 'express'; // v4.18.x
import { cpus, freemem, totalmem, loadavg } from 'os'; // node:os

// Internal imports
import { ApiResponse } from '../../interfaces/response.interface';
import { CacheService } from '../../services/cache.service';
import { logger } from '../../lib/logger';

/**
 * Interface for component health status
 */
interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency: number;
  message?: string;
}

/**
 * Interface for system metrics
 */
interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  loadAverage: number[];
  uptime: number;
}

/**
 * Interface for comprehensive health check response
 */
interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  components: {
    cache: ComponentHealth;
    api: ComponentHealth;
  };
  metrics: SystemMetrics;
  timestamp: string;
}

/**
 * Controller class for handling system health check endpoints
 * Monitors critical system components and tracks performance metrics
 */
export class HealthController {
  private readonly _startTime: number;
  private _lastCheckTime: number;
  private readonly _cacheService: CacheService;
  private readonly _healthyThresholds = {
    memory: 85, // 85% max memory usage
    cpu: 90, // 90% max CPU usage
    latency: 2000, // 2000ms max latency
  };

  /**
   * Initializes the health controller with system start time and required services
   * @param cacheService - Instance of CacheService for cache health checks
   */
  constructor(cacheService: CacheService) {
    this._startTime = Date.now();
    this._lastCheckTime = Date.now();
    this._cacheService = cacheService;

    // Log controller initialization
    logger.info('Health controller initialized', {
      startTime: new Date(this._startTime).toISOString(),
    });
  }

  /**
   * Handles GET /health endpoint to check system components status
   * @param req - Express request object
   * @param res - Express response object
   * @returns Promise<Response> Health check response with component statuses
   */
  public async checkHealth(req: Request, res: Response): Promise<Response> {
    const requestStartTime = Date.now();
    this._lastCheckTime = Date.now();

    try {
      // Check cache health
      const cacheHealth = await this.checkCacheHealth();

      // Check API health and calculate request latency
      const apiLatency = Date.now() - requestStartTime;
      const apiHealth = this.checkApiHealth(apiLatency);

      // Get system metrics
      const systemMetrics = this.getSystemMetrics();

      // Determine overall system health
      const overallStatus = this.determineOverallHealth(
        cacheHealth,
        apiHealth,
        systemMetrics
      );

      // Prepare health check response
      const healthResponse: ApiResponse<HealthCheckResponse> = {
        success: true,
        data: {
          status: overallStatus,
          components: {
            cache: cacheHealth,
            api: apiHealth,
          },
          metrics: systemMetrics,
          timestamp: new Date().toISOString(),
        },
        error: null,
        metadata: {
          responseTime: Date.now() - requestStartTime,
          apiVersion: '1.0.0',
          timestamp: Date.now(),
          requestId: req.headers['x-request-id']?.toString() || '',
        },
      };

      // Log health check results
      logger.performance('Health check completed', {
        status: overallStatus,
        responseTime: healthResponse.metadata.responseTime,
        metrics: systemMetrics,
      });

      return res.status(overallStatus === 'healthy' ? 200 : 503).json(healthResponse);
    } catch (error) {
      logger.error('Health check failed', { error });
      return res.status(500).json({
        success: false,
        data: null,
        error: {
          code: 500,
          message: 'Health check failed',
          details: [(error as Error).message],
          status: 'SERVER_ERROR',
          timestamp: Date.now(),
        },
        metadata: {
          responseTime: Date.now() - requestStartTime,
          apiVersion: '1.0.0',
          timestamp: Date.now(),
          requestId: req.headers['x-request-id']?.toString() || '',
        },
      });
    }
  }

  /**
   * Checks cache component health status
   * @private
   * @returns Promise<ComponentHealth> Cache health status
   */
  private async checkCacheHealth(): Promise<ComponentHealth> {
    const startTime = Date.now();
    try {
      await this._cacheService.checkConnection();
      const latency = Date.now() - startTime;

      return {
        status: latency < this._healthyThresholds.latency ? 'healthy' : 'degraded',
        latency,
        message: 'Cache connection successful',
      };
    } catch (error) {
      logger.error('Cache health check failed', { error });
      return {
        status: 'unhealthy',
        latency: Date.now() - startTime,
        message: (error as Error).message,
      };
    }
  }

  /**
   * Checks API component health status
   * @private
   * @param latency - Request latency in milliseconds
   * @returns ComponentHealth API health status
   */
  private checkApiHealth(latency: number): ComponentHealth {
    return {
      status: latency < this._healthyThresholds.latency ? 'healthy' : 'degraded',
      latency,
      message: `API responding in ${latency}ms`,
    };
  }

  /**
   * Gathers system metrics including CPU, memory, and load
   * @private
   * @returns SystemMetrics System performance metrics
   */
  private getSystemMetrics(): SystemMetrics {
    const totalMem = totalmem();
    const freeMem = freemem();
    const memoryUsage = ((totalMem - freeMem) / totalMem) * 100;

    const cpuUsage = cpus().reduce((acc, cpu) => {
      const total = Object.values(cpu.times).reduce((a, b) => a + b);
      const idle = cpu.times.idle;
      return acc + ((total - idle) / total) * 100;
    }, 0) / cpus().length;

    return {
      cpuUsage: Number(cpuUsage.toFixed(2)),
      memoryUsage: Number(memoryUsage.toFixed(2)),
      loadAverage: loadavg(),
      uptime: Date.now() - this._startTime,
    };
  }

  /**
   * Determines overall system health status based on component health
   * @private
   * @param cacheHealth - Cache component health
   * @param apiHealth - API component health
   * @param metrics - System metrics
   * @returns 'healthy' | 'degraded' | 'unhealthy' Overall system status
   */
  private determineOverallHealth(
    cacheHealth: ComponentHealth,
    apiHealth: ComponentHealth,
    metrics: SystemMetrics
  ): 'healthy' | 'degraded' | 'unhealthy' {
    // Check for any unhealthy components
    if (cacheHealth.status === 'unhealthy' || apiHealth.status === 'unhealthy') {
      return 'unhealthy';
    }

    // Check system metrics against thresholds
    if (
      metrics.cpuUsage > this._healthyThresholds.cpu ||
      metrics.memoryUsage > this._healthyThresholds.memory ||
      cacheHealth.status === 'degraded' ||
      apiHealth.status === 'degraded'
    ) {
      return 'degraded';
    }

    return 'healthy';
  }
}