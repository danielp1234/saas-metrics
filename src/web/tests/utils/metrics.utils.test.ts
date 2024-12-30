// @version jest ^29.5.0

import { describe, it, expect } from '@jest/globals';
import {
  calculateMetricValue,
  calculatePercentileScore,
  getMetricThresholdStatus,
  calculateMetricTrend
} from '../../src/utils/metrics.utils';
import { MetricType } from '../../src/interfaces/metrics.interface';

describe('calculateMetricValue', () => {
  // Revenue Growth Tests
  describe('Revenue Growth calculation', () => {
    it('should calculate revenue growth correctly with positive growth', () => {
      const result = calculateMetricValue(MetricType.REVENUE_GROWTH, {
        currentARR: 1200000,
        previousARR: 1000000
      });
      expect(result).toBe(20); // ((1200000 - 1000000) / 1000000) * 100 = 20%
    });

    it('should calculate revenue growth correctly with negative growth', () => {
      const result = calculateMetricValue(MetricType.REVENUE_GROWTH, {
        currentARR: 900000,
        previousARR: 1000000
      });
      expect(result).toBe(-10); // ((900000 - 1000000) / 1000000) * 100 = -10%
    });

    it('should handle zero previous ARR', () => {
      const result = calculateMetricValue(MetricType.REVENUE_GROWTH, {
        currentARR: 100000,
        previousARR: 0
      });
      expect(result).toBeNull(); // Division by zero should return null
    });
  });

  // Net Dollar Retention Tests
  describe('NDR calculation', () => {
    it('should calculate NDR correctly with all components', () => {
      const result = calculateMetricValue(MetricType.NDR, {
        beginningARR: 1000000,
        expansion: 200000,
        contraction: 50000,
        churn: 50000
      });
      expect(result).toBe(110); // ((1000000 + 200000 - 50000 - 50000) / 1000000) * 100 = 110%
    });

    it('should handle NDR with no expansion or churn', () => {
      const result = calculateMetricValue(MetricType.NDR, {
        beginningARR: 1000000,
        expansion: 0,
        contraction: 0,
        churn: 0
      });
      expect(result).toBe(100); // ((1000000 + 0 - 0 - 0) / 1000000) * 100 = 100%
    });

    it('should return null for invalid NDR inputs', () => {
      const result = calculateMetricValue(MetricType.NDR, {
        beginningARR: 0,
        expansion: 100000,
        contraction: 0,
        churn: 0
      });
      expect(result).toBeNull();
    });
  });

  // Magic Number Tests
  describe('Magic Number calculation', () => {
    it('should calculate Magic Number correctly', () => {
      const result = calculateMetricValue(MetricType.MAGIC_NUMBER, {
        netNewARR: 400000,
        salesMarketingSpend: 500000
      });
      expect(result).toBe(0.8); // 400000 / 500000 = 0.8
    });

    it('should handle zero sales and marketing spend', () => {
      const result = calculateMetricValue(MetricType.MAGIC_NUMBER, {
        netNewARR: 100000,
        salesMarketingSpend: 0
      });
      expect(result).toBeNull();
    });
  });

  // EBITDA Margin Tests
  describe('EBITDA Margin calculation', () => {
    it('should calculate EBITDA margin correctly with positive values', () => {
      const result = calculateMetricValue(MetricType.EBITDA_MARGIN, {
        ebitda: 150000,
        revenue: 1000000
      });
      expect(result).toBe(15); // (150000 / 1000000) * 100 = 15%
    });

    it('should calculate negative EBITDA margin correctly', () => {
      const result = calculateMetricValue(MetricType.EBITDA_MARGIN, {
        ebitda: -50000,
        revenue: 1000000
      });
      expect(result).toBe(-5); // (-50000 / 1000000) * 100 = -5%
    });
  });

  // Error Handling Tests
  describe('error handling', () => {
    it('should return null for invalid metric type', () => {
      const result = calculateMetricValue('INVALID_METRIC' as MetricType, {
        value: 100
      });
      expect(result).toBeNull();
    });

    it('should return null for missing required fields', () => {
      const result = calculateMetricValue(MetricType.REVENUE_GROWTH, {
        currentARR: 1000000
        // missing previousARR
      });
      expect(result).toBeNull();
    });
  });
});

describe('calculatePercentileScore', () => {
  const benchmarkData = [10, 20, 30, 40, 50, 60, 70, 80, 90];

  it('should calculate median (50th percentile) correctly', () => {
    const result = calculatePercentileScore(50, benchmarkData);
    expect(result).toBe(50);
  });

  it('should handle minimum value', () => {
    const result = calculatePercentileScore(10, benchmarkData);
    expect(result).toBe(0);
  });

  it('should handle maximum value', () => {
    const result = calculatePercentileScore(90, benchmarkData);
    expect(result).toBe(100);
  });

  it('should handle interpolated values', () => {
    const result = calculatePercentileScore(35, benchmarkData);
    expect(result).toBeCloseTo(31.25, 2);
  });

  it('should handle empty benchmark data', () => {
    const result = calculatePercentileScore(50, []);
    expect(result).toBe(0);
  });

  it('should handle invalid inputs', () => {
    const result = calculatePercentileScore(NaN, benchmarkData);
    expect(result).toBe(0);
  });
});

describe('getMetricThresholdStatus', () => {
  // Revenue Growth Thresholds
  describe('Revenue Growth thresholds', () => {
    it('should return excellent for high growth', () => {
      const result = getMetricThresholdStatus(45, MetricType.REVENUE_GROWTH);
      expect(result).toBe('excellent');
    });

    it('should return good for moderate growth', () => {
      const result = getMetricThresholdStatus(25, MetricType.REVENUE_GROWTH);
      expect(result).toBe('good');
    });

    it('should return poor for low growth', () => {
      const result = getMetricThresholdStatus(5, MetricType.REVENUE_GROWTH);
      expect(result).toBe('poor');
    });
  });

  // NDR Thresholds
  describe('NDR thresholds', () => {
    it('should return excellent for high retention', () => {
      const result = getMetricThresholdStatus(125, MetricType.NDR);
      expect(result).toBe('excellent');
    });

    it('should return average for 100% retention', () => {
      const result = getMetricThresholdStatus(100, MetricType.NDR);
      expect(result).toBe('average');
    });
  });

  // Error Handling
  describe('threshold error handling', () => {
    it('should return invalid for NaN', () => {
      const result = getMetricThresholdStatus(NaN, MetricType.REVENUE_GROWTH);
      expect(result).toBe('invalid');
    });

    it('should return invalid for invalid metric type', () => {
      const result = getMetricThresholdStatus(50, 'INVALID_METRIC' as MetricType);
      expect(result).toBe('invalid');
    });
  });
});

describe('calculateMetricTrend', () => {
  it('should detect upward trend', () => {
    const result = calculateMetricTrend(120, 100, [90, 95, 100, 120]);
    expect(result).toEqual({
      direction: 'up',
      percentage: 20,
      significance: true,
      confidence: expect.any(Number)
    });
  });

  it('should detect downward trend', () => {
    const result = calculateMetricTrend(80, 100, [110, 105, 100, 80]);
    expect(result).toEqual({
      direction: 'down',
      percentage: -20,
      significance: true,
      confidence: expect.any(Number)
    });
  });

  it('should identify flat trend for minimal change', () => {
    const result = calculateMetricTrend(100.5, 100, [99, 100, 100.5]);
    expect(result).toEqual({
      direction: 'flat',
      percentage: expect.any(Number),
      significance: false,
      confidence: expect.any(Number)
    });
  });

  it('should handle insufficient historical data', () => {
    const result = calculateMetricTrend(120, 100, [100]);
    expect(result).toEqual({
      direction: 'up',
      percentage: 20,
      significance: false,
      confidence: 0
    });
  });

  it('should handle invalid inputs', () => {
    const result = calculateMetricTrend(NaN, 100, [100, 110, 120]);
    expect(result).toEqual({
      direction: 'flat',
      percentage: 0,
      significance: false,
      confidence: 0
    });
  });
});