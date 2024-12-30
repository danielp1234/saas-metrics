// @version jest ^29.0.0
// @version @testing-library/react ^14.0.0

import { describe, beforeEach, afterEach, it, expect, jest } from '@jest/globals';
import MetricsService from '../../src/services/metrics.service';
import { MetricType, MetricData } from '../../src/interfaces/metrics.interface';
import ApiService from '../../src/services/api.service';
import metricsConfig from '../../src/config/metrics.config';

// Constants for testing
const TEST_TIMEOUT = 5000;
const MOCK_METRICS_COUNT = 14;
const PERFORMANCE_THRESHOLD_MS = 2000;
const CACHE_TTL_SECONDS = 300;

/**
 * Creates a mock metric data object for testing
 * @param type - Type of metric to mock
 * @param isValid - Whether to create valid or invalid data
 */
const createMockMetric = (type: MetricType, isValid: boolean = true): MetricData => {
  const config = metricsConfig[type];
  const value = isValid 
    ? (config.validationRules.maxValue + config.validationRules.minValue) / 2
    : config.validationRules.maxValue + 1;

  return {
    id: `test-${type}-${Date.now()}`,
    name: config.name,
    type,
    value,
    percentiles: {
      p5: value * 0.5,
      p25: value * 0.75,
      p50: value,
      p75: value * 1.25,
      p90: value * 1.5
    },
    metadata: {
      source: 'test-source',
      arrRange: '$1M - $5M',
      updatedAt: new Date().toISOString(),
      dataPoints: 100,
      confidenceLevel: 0.95,
      calculationMethod: config.calculationMethod
    },
    validation: {
      isValid,
      errors: [],
      dataQuality: 'high',
      lastValidated: new Date().toISOString(),
      validationRules: []
    },
    trend: {
      direction: 'up',
      percentage: 10,
      period: '30d',
      significance: 0.95,
      comparisonBasis: 'previous_period'
    },
    description: config.description,
    unit: config.unit
  };
};

/**
 * Creates an array of mock metrics for testing
 * @param count - Number of metrics to create
 * @param includeInvalid - Whether to include invalid metrics
 */
const createMockMetricsList = (count: number, includeInvalid: boolean = false): MetricData[] => {
  const metrics: MetricData[] = [];
  const metricTypes = Object.values(MetricType);
  
  for (let i = 0; i < count; i++) {
    const type = metricTypes[i % metricTypes.length];
    metrics.push(createMockMetric(type, !includeInvalid || i % 2 === 0));
  }
  
  return metrics;
};

describe('MetricsService', () => {
  let metricsService: MetricsService;
  let apiSpy: jest.SpyInstance;
  let cacheSpy: jest.SpyInstance;
  let performanceNow: jest.SpyInstance;

  beforeEach(() => {
    // Reset all mocks and spies
    jest.clearAllMocks();
    
    // Initialize service instance
    metricsService = MetricsService.getInstance();
    
    // Setup API spy
    apiSpy = jest.spyOn(ApiService.prototype, 'get');
    
    // Setup cache spy
    cacheSpy = jest.spyOn(Map.prototype, 'get');
    
    // Setup performance monitoring
    performanceNow = jest.spyOn(performance, 'now');
    
    // Clear cache
    metricsService['metricsCache'].clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should create a singleton instance', () => {
      const instance1 = MetricsService.getInstance();
      const instance2 = MetricsService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should initialize with empty cache', () => {
      expect(metricsService['metricsCache'].size).toBe(0);
    });
  });

  describe('getMetrics', () => {
    it('should fetch and cache metrics data', async () => {
      const mockMetrics = createMockMetricsList(MOCK_METRICS_COUNT);
      apiSpy.mockResolvedValueOnce({ data: mockMetrics });

      const result = await metricsService.getMetrics();
      
      expect(result).toHaveLength(MOCK_METRICS_COUNT);
      expect(apiSpy).toHaveBeenCalledTimes(1);
      expect(metricsService['metricsCache'].size).toBe(1);
    }, TEST_TIMEOUT);

    it('should return cached data when available', async () => {
      const mockMetrics = createMockMetricsList(MOCK_METRICS_COUNT);
      apiSpy.mockResolvedValueOnce({ data: mockMetrics });

      // First call to populate cache
      await metricsService.getMetrics();
      
      // Second call should use cache
      const result = await metricsService.getMetrics();
      
      expect(result).toHaveLength(MOCK_METRICS_COUNT);
      expect(apiSpy).toHaveBeenCalledTimes(1);
      expect(cacheSpy).toHaveBeenCalled();
    });

    it('should handle filtering by metric type', async () => {
      const mockMetrics = createMockMetricsList(MOCK_METRICS_COUNT);
      apiSpy.mockResolvedValueOnce({ data: mockMetrics });

      const result = await metricsService.getMetrics({ 
        type: MetricType.REVENUE_GROWTH 
      });

      expect(result.every(m => m.type === MetricType.REVENUE_GROWTH)).toBe(true);
    });

    it('should validate metrics data', async () => {
      const mockMetrics = createMockMetricsList(MOCK_METRICS_COUNT, true);
      apiSpy.mockResolvedValueOnce({ data: mockMetrics });

      const result = await metricsService.getMetrics();
      
      expect(result.length).toBeLessThan(mockMetrics.length);
      expect(result.every(m => m.validation.isValid)).toBe(true);
    });

    it('should meet performance requirements', async () => {
      const mockMetrics = createMockMetricsList(MOCK_METRICS_COUNT);
      apiSpy.mockResolvedValueOnce({ data: mockMetrics });

      const startTime = performance.now();
      await metricsService.getMetrics();
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
    });
  });

  describe('getMetricByType', () => {
    it('should fetch specific metric type', async () => {
      const mockMetrics = createMockMetricsList(MOCK_METRICS_COUNT);
      apiSpy.mockResolvedValueOnce({ data: mockMetrics });

      const result = await metricsService.getMetricByType(MetricType.NDR);
      
      expect(result.type).toBe(MetricType.NDR);
    });

    it('should throw error for non-existent metric type', async () => {
      const mockMetrics = createMockMetricsList(MOCK_METRICS_COUNT);
      apiSpy.mockResolvedValueOnce({ data: mockMetrics });

      await expect(
        metricsService.getMetricByType('invalid_type' as MetricType)
      ).rejects.toThrow();
    });
  });

  describe('refreshMetrics', () => {
    it('should clear cache and fetch fresh data', async () => {
      const mockMetrics = createMockMetricsList(MOCK_METRICS_COUNT);
      apiSpy.mockResolvedValueOnce({ data: mockMetrics });

      // Populate cache
      await metricsService.getMetrics();
      
      // Refresh metrics
      await metricsService.refreshMetrics();
      
      expect(metricsService['metricsCache'].size).toBe(0);
      expect(apiSpy).toHaveBeenCalledTimes(2);
    });

    it('should refresh specific metric types', async () => {
      const mockMetrics = createMockMetricsList(MOCK_METRICS_COUNT);
      apiSpy.mockResolvedValueOnce({ data: mockMetrics });

      await metricsService.getMetrics();
      await metricsService.refreshMetrics([MetricType.REVENUE_GROWTH]);

      const cacheKeys = Array.from(metricsService['metricsCache'].keys());
      expect(cacheKeys.some(key => key.includes(MetricType.REVENUE_GROWTH))).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      apiSpy.mockRejectedValueOnce(new Error('API Error'));

      await expect(metricsService.getMetrics()).rejects.toThrow('API Error');
    });

    it('should handle validation errors', async () => {
      const invalidMetrics = createMockMetricsList(MOCK_METRICS_COUNT).map(m => ({
        ...m,
        value: Number.POSITIVE_INFINITY
      }));
      apiSpy.mockResolvedValueOnce({ data: invalidMetrics });

      const result = await metricsService.getMetrics();
      expect(result).toHaveLength(0);
    });
  });

  describe('Cache Management', () => {
    it('should respect cache TTL', async () => {
      const mockMetrics = createMockMetricsList(MOCK_METRICS_COUNT);
      apiSpy.mockResolvedValueOnce({ data: mockMetrics });

      await metricsService.getMetrics();
      
      // Fast-forward time
      jest.advanceTimersByTime(CACHE_TTL_SECONDS * 1000 + 1000);
      
      await metricsService.getMetrics();
      expect(apiSpy).toHaveBeenCalledTimes(2);
    });

    it('should handle concurrent requests', async () => {
      const mockMetrics = createMockMetricsList(MOCK_METRICS_COUNT);
      apiSpy.mockResolvedValueOnce({ data: mockMetrics });

      const requests = Array(5).fill(null).map(() => metricsService.getMetrics());
      const results = await Promise.all(requests);

      expect(apiSpy).toHaveBeenCalledTimes(1);
      results.forEach(result => {
        expect(result).toHaveLength(MOCK_METRICS_COUNT);
      });
    });
  });
});