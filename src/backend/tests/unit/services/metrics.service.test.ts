// External imports with versions
import { jest } from '@jest/globals'; // ^29.0.0
import RedisMock from 'ioredis-mock'; // ^8.0.0
import CircuitBreaker from 'opossum'; // ^6.0.0

// Internal imports
import { MetricsService } from '../../src/services/metrics.service';
import { MetricModel } from '../../src/models/metric.model';
import { MetricType, Metric } from '../../src/interfaces/metrics.interface';

// Mock implementations
jest.mock('../../src/models/metric.model');
jest.mock('ioredis');
jest.mock('opossum');

describe('MetricsService', () => {
  let metricsService: MetricsService;
  let mockRedisClient: jest.Mocked<RedisMock>;
  let mockMetricModel: jest.Mocked<MetricModel>;
  let mockCircuitBreaker: jest.Mocked<CircuitBreaker>;

  // Test data
  const mockMetricData = {
    id: '123',
    name: 'Revenue Growth Rate',
    value: 25.5,
    percentiles: {
      p5: 5,
      p25: 15,
      p50: 25,
      p75: 35,
      p90: 45
    },
    metadata: {
      source: 'test-source',
      arr_range: '$1M-$5M',
      updated_at: new Date().toISOString()
    }
  };

  beforeAll(() => {
    jest.useFakeTimers();
  });

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Initialize mocks
    mockRedisClient = new RedisMock() as jest.Mocked<RedisMock>;
    mockMetricModel = new MetricModel() as jest.Mocked<MetricModel>;
    mockCircuitBreaker = new CircuitBreaker(() => {}) as jest.Mocked<CircuitBreaker>;

    // Setup MetricsService with mocks
    metricsService = new MetricsService(
      mockMetricModel,
      { host: 'localhost', port: 6379 },
      { timeout: 5000 }
    );
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('getMetric', () => {
    it('should return cached metric if available', async () => {
      // Arrange
      const metricId = '123';
      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockMetricData));

      // Act
      const result = await metricsService.getMetric(metricId);

      // Assert
      expect(result).toEqual(mockMetricData);
      expect(mockRedisClient.get).toHaveBeenCalledWith(`metrics:${metricId}`);
      expect(mockMetricModel.findById).not.toHaveBeenCalled();
    });

    it('should fetch from database and cache if not in cache', async () => {
      // Arrange
      const metricId = '123';
      mockRedisClient.get.mockResolvedValue(null);
      mockMetricModel.findById.mockResolvedValue(mockMetricData);

      // Act
      const result = await metricsService.getMetric(metricId);

      // Assert
      expect(result).toEqual(mockMetricData);
      expect(mockRedisClient.get).toHaveBeenCalledWith(`metrics:${metricId}`);
      expect(mockMetricModel.findById).toHaveBeenCalledWith(metricId);
      expect(mockRedisClient.setex).toHaveBeenCalled();
    });

    it('should handle metric not found error', async () => {
      // Arrange
      const metricId = 'non-existent';
      mockRedisClient.get.mockResolvedValue(null);
      mockMetricModel.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(metricsService.getMetric(metricId))
        .rejects
        .toThrow(`Metric not found: ${metricId}`);
    });
  });

  describe('calculateMetricWithRetry', () => {
    const mockData = {
      currentARR: 1000000,
      previousARR: 800000
    };

    it('should calculate revenue growth rate successfully', async () => {
      // Arrange
      mockCircuitBreaker.fire.mockImplementation(async (fn) => {
        return await fn();
      });

      // Act
      const result = await metricsService.calculateMetricWithRetry(
        MetricType.REVENUE_GROWTH,
        mockData
      );

      // Assert
      expect(result).toBe(25); // ((1000000 - 800000) / 800000) * 100
      expect(mockCircuitBreaker.fire).toHaveBeenCalled();
    });

    it('should retry on failure and succeed within attempts', async () => {
      // Arrange
      let attempts = 0;
      mockCircuitBreaker.fire.mockImplementation(async () => {
        if (attempts++ < 2) {
          throw new Error('Temporary failure');
        }
        return 25;
      });

      // Act
      const result = await metricsService.calculateMetricWithRetry(
        MetricType.REVENUE_GROWTH,
        mockData,
        { attempts: 3, delay: 100, backoff: true }
      );

      // Assert
      expect(result).toBe(25);
      expect(mockCircuitBreaker.fire).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retry attempts', async () => {
      // Arrange
      mockCircuitBreaker.fire.mockRejectedValue(new Error('Calculation failed'));

      // Act & Assert
      await expect(metricsService.calculateMetricWithRetry(
        MetricType.REVENUE_GROWTH,
        mockData,
        { attempts: 3, delay: 100, backoff: true }
      )).rejects.toThrow('Calculation failed');
      
      expect(mockCircuitBreaker.fire).toHaveBeenCalledTimes(3);
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status when all systems are operational', async () => {
      // Arrange
      mockRedisClient.ping.mockResolvedValue('PONG');
      mockCircuitBreaker.stats.mockResolvedValue({ failures: 0 });
      mockCircuitBreaker.opened = false;

      // Act
      const health = await metricsService.healthCheck();

      // Assert
      expect(health).toEqual({
        isHealthy: true,
        cache: {
          connected: true,
          hitRate: expect.any(Number)
        },
        circuitBreaker: {
          state: 'CLOSED',
          failures: 0
        }
      });
    });

    it('should return unhealthy status when cache is down', async () => {
      // Arrange
      mockRedisClient.ping.mockRejectedValue(new Error('Redis connection failed'));
      mockCircuitBreaker.stats.mockResolvedValue({ failures: 0 });
      mockCircuitBreaker.opened = false;

      // Act
      const health = await metricsService.healthCheck();

      // Assert
      expect(health.isHealthy).toBe(false);
      expect(health.cache.connected).toBe(false);
    });
  });

  describe('calculateMetric', () => {
    it('should calculate NDR correctly', async () => {
      // Arrange
      const ndrData = {
        beginningARR: 1000000,
        expansion: 200000,
        contraction: 50000,
        churn: 100000
      };

      // Act
      const result = await metricsService['calculateMetric'](
        MetricType.NDR,
        ndrData
      );

      // Assert
      expect(result).toBe(105); // ((1000000 + 200000 - 50000 - 100000) / 1000000) * 100
    });

    it('should throw error for unsupported metric type', async () => {
      // Act & Assert
      await expect(metricsService['calculateMetric'](
        'invalid_metric' as MetricType,
        {}
      )).rejects.toThrow('Unsupported metric type: invalid_metric');
    });
  });
});