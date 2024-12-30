/**
 * @fileoverview Comprehensive unit test suite for MetricsController
 * Tests HTTP request handling, data validation, caching, performance, and security
 * @version 1.0.0
 */

// External imports with versions
import { Request, Response } from 'express'; // ^4.18.x
import { faker } from '@faker-js/faker'; // ^8.0.0
import { jest } from '@jest/globals'; // ^29.0.0

// Internal imports
import { MetricsController } from '../../../src/api/controllers/metrics.controller';
import { MetricsService } from '../../../src/services/metrics.service';
import { CacheService } from '../../../src/services/cache.service';
import { ValidationError, NotFoundError } from '../../../src/utils/errors';
import { MetricType } from '../../../src/interfaces/metrics.interface';
import { logger } from '../../../src/lib/logger';

// Test constants
const TEST_TIMEOUT = 5000;
const RESPONSE_TIME_THRESHOLD = 2000; // 2 seconds max response time
const CACHE_TTL = 900; // 15 minutes in seconds

describe('MetricsController', () => {
  // Mock services
  let metricsService: jest.Mocked<MetricsService>;
  let cacheService: jest.Mocked<CacheService>;
  let controller: MetricsController;
  let req: Partial<Request>;
  let res: Partial<Response>;

  // Mock data generators
  const generateMetric = () => ({
    id: faker.string.uuid(),
    name: faker.word.words(2),
    type: MetricType.REVENUE_GROWTH,
    value: faker.number.float({ min: 0, max: 100 }),
    percentiles: {
      p5: faker.number.float({ min: 0, max: 20 }),
      p25: faker.number.float({ min: 20, max: 40 }),
      p50: faker.number.float({ min: 40, max: 60 }),
      p75: faker.number.float({ min: 60, max: 80 }),
      p90: faker.number.float({ min: 80, max: 100 })
    },
    metadata: {
      source: faker.company.name(),
      arr_range: '$1M-$5M',
      updated_at: faker.date.recent().toISOString()
    }
  });

  beforeAll(() => {
    jest.setTimeout(TEST_TIMEOUT);
  });

  beforeEach(() => {
    // Initialize mocks
    metricsService = {
      getMetrics: jest.fn(),
      getMetricById: jest.fn(),
      createMetric: jest.fn(),
      updateMetric: jest.fn(),
      deleteMetric: jest.fn(),
      calculateMetric: jest.fn(),
      validateMetricData: jest.fn()
    } as any;

    cacheService = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn()
    } as any;

    // Initialize controller
    controller = new MetricsController(metricsService, cacheService, logger);

    // Initialize request/response mocks
    req = {
      params: {},
      query: {},
      body: {},
      headers: {
        'x-request-id': faker.string.uuid()
      }
    };

    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn()
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Performance Tests', () => {
    it('should respond within 2 seconds under load', async () => {
      // Arrange
      const metrics = Array(100).fill(null).map(generateMetric);
      metricsService.getMetrics.mockResolvedValue({ data: metrics, pagination: {} });
      
      // Act
      const startTime = Date.now();
      await controller.getMetrics(req as Request, res as Response);
      const responseTime = Date.now() - startTime;

      // Assert
      expect(responseTime).toBeLessThan(RESPONSE_TIME_THRESHOLD);
      expect(res.json).toHaveBeenCalled();
    });

    it('should maintain performance with concurrent requests', async () => {
      // Arrange
      const requests = Array(10).fill(null).map(() => 
        controller.getMetrics(req as Request, res as Response)
      );

      // Act
      const startTime = Date.now();
      await Promise.all(requests);
      const totalTime = Date.now() - startTime;

      // Assert
      expect(totalTime / requests.length).toBeLessThan(RESPONSE_TIME_THRESHOLD);
    });
  });

  describe('Cache Tests', () => {
    it('should return cached data when available', async () => {
      // Arrange
      const cachedData = {
        data: [generateMetric()],
        pagination: {}
      };
      cacheService.get.mockResolvedValue(cachedData);

      // Act
      await controller.getMetrics(req as Request, res as Response);

      // Assert
      expect(cacheService.get).toHaveBeenCalled();
      expect(metricsService.getMetrics).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        data: cachedData,
        metadata: expect.objectContaining({ cacheStatus: 'hit' })
      }));
    });

    it('should cache response for 15 minutes', async () => {
      // Arrange
      const metrics = [generateMetric()];
      metricsService.getMetrics.mockResolvedValue({ data: metrics, pagination: {} });

      // Act
      await controller.getMetrics(req as Request, res as Response);

      // Assert
      expect(cacheService.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        CACHE_TTL
      );
    });

    it('should invalidate cache on updates', async () => {
      // Arrange
      const metricId = faker.string.uuid();
      req.params = { id: metricId };
      req.body = generateMetric();

      // Act
      await controller.updateMetric(req as Request, res as Response);

      // Assert
      expect(cacheService.delete).toHaveBeenCalledWith(`metric:${metricId}`);
      expect(cacheService.clear).toHaveBeenCalledWith('metrics:');
    });
  });

  describe('Validation Tests', () => {
    it('should validate required fields', async () => {
      // Arrange
      req.body = {};

      // Act & Assert
      await expect(controller.createMetric(req as Request, res as Response))
        .rejects
        .toThrow(ValidationError);
    });

    it('should validate metric type', async () => {
      // Arrange
      req.body = {
        ...generateMetric(),
        type: 'INVALID_TYPE'
      };

      // Act & Assert
      await expect(controller.createMetric(req as Request, res as Response))
        .rejects
        .toThrow(ValidationError);
    });

    it('should sanitize input data', async () => {
      // Arrange
      const maliciousInput = {
        ...generateMetric(),
        name: '<script>alert("xss")</script>Metric'
      };
      req.body = maliciousInput;

      // Act
      await controller.createMetric(req as Request, res as Response);

      // Assert
      expect(metricsService.createMetric).toHaveBeenCalledWith(
        expect.objectContaining({
          name: expect.not.stringContaining('<script>')
        })
      );
    });
  });

  describe('Security Tests', () => {
    it('should handle SQL injection attempts', async () => {
      // Arrange
      req.query = {
        metricType: "REVENUE_GROWTH'; DROP TABLE metrics;--"
      };

      // Act & Assert
      await expect(controller.getMetrics(req as Request, res as Response))
        .rejects
        .toThrow(ValidationError);
    });

    it('should validate authentication for protected endpoints', async () => {
      // Arrange
      req.user = undefined;

      // Act & Assert
      await expect(controller.createMetric(req as Request, res as Response))
        .rejects
        .toThrow(expect.objectContaining({
          code: 401
        }));
    });

    it('should prevent unauthorized access', async () => {
      // Arrange
      req.user = { role: 'USER' };

      // Act & Assert
      await expect(controller.deleteMetric(req as Request, res as Response))
        .rejects
        .toThrow(expect.objectContaining({
          code: 403
        }));
    });
  });

  describe('Error Handling Tests', () => {
    it('should handle not found errors', async () => {
      // Arrange
      const metricId = faker.string.uuid();
      req.params = { id: metricId };
      metricsService.getMetricById.mockRejectedValue(
        new NotFoundError(`Metric with ID ${metricId} not found`)
      );

      // Act
      await controller.getMetricById(req as Request, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 404,
          message: expect.stringContaining('not found')
        })
      }));
    });

    it('should handle validation errors', async () => {
      // Arrange
      metricsService.validateMetricData.mockRejectedValue(
        new ValidationError('Invalid metric data')
      );

      // Act
      await controller.createMetric(req as Request, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 422
        })
      }));
    });

    it('should handle unexpected errors', async () => {
      // Arrange
      metricsService.getMetrics.mockRejectedValue(new Error('Unexpected error'));

      // Act
      await controller.getMetrics(req as Request, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 500
        })
      }));
    });
  });
});