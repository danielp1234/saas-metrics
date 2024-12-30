/**
 * @fileoverview Unit tests for data formatting utility functions
 * Tests cover metric values, percentages, currencies, and dates with comprehensive validation
 * @version 1.0.0
 */

import { describe, it, expect } from '@jest/globals';
import {
  formatMetricValue,
  formatPercentage,
  formatCurrency,
  formatDate
} from '../../src/utils/formatters';
import { MetricType } from '../../src/interfaces/metrics.interface';

describe('formatMetricValue', () => {
  // Revenue Growth Tests
  describe('Revenue Growth formatting', () => {
    it('should format positive revenue growth correctly', () => {
      expect(formatMetricValue(25.5, MetricType.REVENUE_GROWTH))
        .toBe('25.5 %');
    });

    it('should format negative revenue growth correctly', () => {
      expect(formatMetricValue(-15.7, MetricType.REVENUE_GROWTH))
        .toBe('-15.7 %');
    });

    it('should throw error for revenue growth above maximum', () => {
      expect(() => formatMetricValue(1001, MetricType.REVENUE_GROWTH))
        .toThrow('Value 1001 outside valid range [-100, 1000]');
    });

    it('should throw error for revenue growth below minimum', () => {
      expect(() => formatMetricValue(-101, MetricType.REVENUE_GROWTH))
        .toThrow('Value -101 outside valid range [-100, 1000]');
    });
  });

  // NDR Tests
  describe('NDR formatting', () => {
    it('should format NDR within normal range', () => {
      expect(formatMetricValue(110.5, MetricType.NDR))
        .toBe('110.5 %');
    });

    it('should format NDR at minimum bound', () => {
      expect(formatMetricValue(0, MetricType.NDR))
        .toBe('0.0 %');
    });

    it('should throw error for NDR above maximum', () => {
      expect(() => formatMetricValue(201, MetricType.NDR))
        .toThrow('Value 201 outside valid range [0, 200]');
    });

    it('should throw error for negative NDR', () => {
      expect(() => formatMetricValue(-1, MetricType.NDR))
        .toThrow('Value -1 outside valid range [0, 200]');
    });
  });

  // Magic Number Tests
  describe('Magic Number formatting', () => {
    it('should format positive magic number correctly', () => {
      expect(formatMetricValue(1.25, MetricType.MAGIC_NUMBER))
        .toBe('1.25');
    });

    it('should format negative magic number correctly', () => {
      expect(formatMetricValue(-2.5, MetricType.MAGIC_NUMBER))
        .toBe('-2.50');
    });

    it('should format zero magic number correctly', () => {
      expect(formatMetricValue(0, MetricType.MAGIC_NUMBER))
        .toBe('0.00');
    });

    it('should throw error for magic number outside bounds', () => {
      expect(() => formatMetricValue(11, MetricType.MAGIC_NUMBER))
        .toThrow('Value 11 outside valid range [-10, 10]');
    });
  });

  // EBITDA Margin Tests
  describe('EBITDA Margin formatting', () => {
    it('should format positive EBITDA margin correctly', () => {
      expect(formatMetricValue(15.7, MetricType.EBITDA_MARGIN))
        .toBe('15.7 %');
    });

    it('should format negative EBITDA margin correctly', () => {
      expect(formatMetricValue(-25.3, MetricType.EBITDA_MARGIN))
        .toBe('-25.3 %');
    });

    it('should format zero EBITDA margin correctly', () => {
      expect(formatMetricValue(0, MetricType.EBITDA_MARGIN))
        .toBe('0.0 %');
    });

    it('should throw error for EBITDA margin outside bounds', () => {
      expect(() => formatMetricValue(101, MetricType.EBITDA_MARGIN))
        .toThrow('Value 101 outside valid range [-100, 100]');
    });
  });

  // ARR per Employee Tests
  describe('ARR per Employee formatting', () => {
    it('should format ARR per employee with currency symbol', () => {
      expect(formatMetricValue(250000, MetricType.ARR_PER_EMPLOYEE))
        .toBe('$250,000');
    });

    it('should format zero ARR per employee correctly', () => {
      expect(formatMetricValue(0, MetricType.ARR_PER_EMPLOYEE))
        .toBe('$0');
    });

    it('should throw error for negative ARR per employee', () => {
      expect(() => formatMetricValue(-1, MetricType.ARR_PER_EMPLOYEE))
        .toThrow('Value -1 outside valid range [0, 1000000]');
    });

    it('should throw error for ARR per employee above maximum', () => {
      expect(() => formatMetricValue(1000001, MetricType.ARR_PER_EMPLOYEE))
        .toThrow('Value 1000001 outside valid range [0, 1000000]');
    });
  });

  // Error Cases
  describe('Error handling', () => {
    it('should throw error for invalid numeric input', () => {
      expect(() => formatMetricValue(NaN, MetricType.REVENUE_GROWTH))
        .toThrow('Invalid numeric value');
    });

    it('should throw error for undefined metric type', () => {
      expect(() => formatMetricValue(100, 'invalid_type' as MetricType))
        .toThrow('Unknown metric type: invalid_type');
    });
  });
});

describe('formatPercentage', () => {
  describe('Basic formatting', () => {
    it('should format percentage with default precision', () => {
      expect(formatPercentage(25.567)).toBe('25.6 %');
    });

    it('should format percentage with custom precision', () => {
      expect(formatPercentage(25.567, 2)).toBe('25.57 %');
    });

    it('should format zero correctly', () => {
      expect(formatPercentage(0)).toBe('0.0 %');
    });
  });

  describe('Negative values', () => {
    it('should format negative percentage with minus sign', () => {
      expect(formatPercentage(-15.7)).toBe('-15.7 %');
    });

    it('should format negative percentage with parentheses', () => {
      expect(formatPercentage(-15.7, 1, { negativeFormat: 'parentheses' }))
        .toBe('(15.7 %)');
    });
  });

  describe('Precision handling', () => {
    it('should handle zero precision', () => {
      expect(formatPercentage(25.567, 0)).toBe('26 %');
    });

    it('should handle high precision', () => {
      expect(formatPercentage(25.567891, 4)).toBe('25.5679 %');
    });
  });

  describe('Symbol spacing', () => {
    it('should format with no space before symbol', () => {
      expect(formatPercentage(25.5, 1, { spaceBeforeSymbol: false }))
        .toBe('25.5%');
    });
  });

  describe('Error handling', () => {
    it('should throw error for invalid numeric input', () => {
      expect(() => formatPercentage(NaN)).toThrow('Invalid numeric value');
    });
  });
});

describe('formatCurrency', () => {
  describe('Basic formatting', () => {
    it('should format currency with default options', () => {
      expect(formatCurrency(1234.56)).toBe('$1,235');
    });

    it('should format currency with custom precision', () => {
      expect(formatCurrency(1234.56, { precision: 2 })).toBe('$1,234.56');
    });

    it('should format zero correctly', () => {
      expect(formatCurrency(0)).toBe('$0');
    });
  });

  describe('Symbol handling', () => {
    it('should format with custom symbol', () => {
      expect(formatCurrency(1234.56, { symbol: '€' })).toBe('€1,235');
    });

    it('should format with suffix symbol position', () => {
      expect(formatCurrency(1234.56, { symbol: '€', symbolPosition: 'suffix' }))
        .toBe('1,235€');
    });
  });

  describe('Thousands separator', () => {
    it('should format without thousands separator', () => {
      expect(formatCurrency(1234567, { thousandsSeparator: false }))
        .toBe('$1234567');
    });
  });

  describe('Error handling', () => {
    it('should throw error for invalid numeric input', () => {
      expect(() => formatCurrency(NaN)).toThrow('Invalid numeric value');
    });
  });
});

describe('formatDate', () => {
  describe('Basic formatting', () => {
    it('should format date with default options', () => {
      const date = new Date('2023-01-15T12:00:00Z');
      expect(formatDate(date, 'yyyy-MM-dd')).toBe('2023-01-15');
    });

    it('should format date with time', () => {
      const date = new Date('2023-01-15T12:30:45Z');
      expect(formatDate(date, 'yyyy-MM-dd HH:mm:ss'))
        .toBe('2023-01-15 12:30:45');
    });
  });

  describe('Timezone handling', () => {
    it('should format date with timezone offset', () => {
      const date = new Date('2023-01-15T12:00:00Z');
      expect(formatDate(date, 'yyyy-MM-dd HH:mm', { timezone: 60 }))
        .toBe('2023-01-15 13:00');
    });

    it('should include timezone in output', () => {
      const date = new Date('2023-01-15T12:00:00Z');
      expect(formatDate(date, 'yyyy-MM-dd HH:mm', { includeTimezone: true }))
        .toMatch(/2023-01-15 12:00 [+-]\d{2}:\d{2}/);
    });
  });

  describe('Error handling', () => {
    it('should throw error for invalid date', () => {
      expect(() => formatDate(new Date('invalid'), 'yyyy-MM-dd'))
        .toThrow('Invalid date value');
    });

    it('should throw error for invalid format string', () => {
      expect(() => formatDate(new Date(), 'invalid'))
        .toThrow('Date formatting failed');
    });
  });
});