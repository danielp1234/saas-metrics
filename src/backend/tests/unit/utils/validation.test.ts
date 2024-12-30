/**
 * @fileoverview Unit tests for validation utility functions
 * Implements comprehensive test coverage for data validation and sanitization
 * @version 1.0.0
 */

import {
  validateMetricId,
  validateMetricName,
  validateMetricType,
  validateARRRange,
  validateNumericValue,
  sanitizeInput
} from '../../../src/utils/validation';
import { MetricType } from '../../../src/interfaces/metrics.interface';

// Jest test suite for metric ID validation
describe('validateMetricId', () => {
  it('should validate correct alphanumeric IDs', () => {
    expect(validateMetricId('metric123')).toBe(true);
    expect(validateMetricId('METRIC_456')).toBe(true);
    expect(validateMetricId('metric-789')).toBe(true);
  });

  it('should reject IDs with special characters', () => {
    expect(validateMetricId('metric@123')).toBe(false);
    expect(validateMetricId('metric#456')).toBe(false);
    expect(validateMetricId('metric$789')).toBe(false);
  });

  it('should reject SQL injection patterns', () => {
    expect(validateMetricId("1' OR '1'='1")).toBe(false);
    expect(validateMetricId('DROP TABLE metrics;')).toBe(false);
  });

  it('should handle empty and null inputs', () => {
    expect(() => validateMetricId('')).toThrow('Metric ID is required');
    expect(() => validateMetricId(null as any)).toThrow('Metric ID is required');
    expect(() => validateMetricId(undefined as any)).toThrow('Metric ID is required');
  });

  it('should maintain performance with repeated validations', () => {
    const start = Date.now();
    for (let i = 0; i < 1000; i++) {
      validateMetricId('metric123');
    }
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(1000); // Should complete in under 1 second
  });
});

// Jest test suite for metric name validation
describe('validateMetricName', () => {
  it('should validate names within length limits', () => {
    expect(validateMetricName('Revenue Growth')).toBe(true);
    expect(validateMetricName('Net Dollar Retention')).toBe(true);
    expect(validateMetricName('Magic Number')).toBe(true);
  });

  it('should reject names exceeding maximum length', () => {
    const longName = 'A'.repeat(101);
    expect(validateMetricName(longName)).toBe(false);
  });

  it('should prevent XSS attack patterns', () => {
    expect(validateMetricName('<script>alert("xss")</script>')).toBe(false);
    expect(validateMetricName('javascript:alert(1)')).toBe(false);
    expect(validateMetricName('<img src=x onerror=alert(1)>')).toBe(false);
  });

  it('should handle empty and null inputs', () => {
    expect(() => validateMetricName('')).toThrow('Metric name is required');
    expect(() => validateMetricName(null as any)).toThrow('Metric name is required');
    expect(() => validateMetricName(undefined as any)).toThrow('Metric name is required');
  });

  it('should handle unicode characters appropriately', () => {
    expect(validateMetricName('Revenue Growth Rate €')).toBe(true);
    expect(validateMetricName('収益成長率')).toBe(true);
  });
});

// Jest test suite for metric type validation
describe('validateMetricType', () => {
  it('should validate all enum values', () => {
    expect(validateMetricType(MetricType.REVENUE_GROWTH)).toBe(true);
    expect(validateMetricType(MetricType.NDR)).toBe(true);
    expect(validateMetricType(MetricType.MAGIC_NUMBER)).toBe(true);
  });

  it('should reject invalid metric types', () => {
    expect(validateMetricType('invalid_type')).toBe(false);
    expect(validateMetricType('UNKNOWN_METRIC')).toBe(false);
  });

  it('should handle case sensitivity correctly', () => {
    expect(validateMetricType('REVENUE_GROWTH')).toBe(false);
    expect(validateMetricType('revenue_growth')).toBe(true);
  });

  it('should handle empty and null inputs', () => {
    expect(() => validateMetricType('')).toThrow('Metric type is required');
    expect(() => validateMetricType(null as any)).toThrow('Metric type is required');
    expect(() => validateMetricType(undefined as any)).toThrow('Metric type is required');
  });
});

// Jest test suite for ARR range validation
describe('validateARRRange', () => {
  it('should validate correct ARR range formats', () => {
    expect(validateARRRange('LESS_THAN_1M')).toBe(true);
    expect(validateARRRange('1M_TO_5M')).toBe(true);
    expect(validateARRRange('ABOVE_50M')).toBe(true);
  });

  it('should reject invalid ARR range formats', () => {
    expect(validateARRRange('0_TO_1M')).toBe(false);
    expect(validateARRRange('INVALID_RANGE')).toBe(false);
    expect(validateARRRange('1M-5M')).toBe(false);
  });

  it('should handle empty and null inputs', () => {
    expect(() => validateARRRange('')).toThrow('ARR range is required');
    expect(() => validateARRRange(null as any)).toThrow('ARR range is required');
    expect(() => validateARRRange(undefined as any)).toThrow('ARR range is required');
  });
});

// Jest test suite for numeric value validation
describe('validateNumericValue', () => {
  it('should validate numbers within allowed range', () => {
    expect(validateNumericValue(0)).toBe(true);
    expect(validateNumericValue(100)).toBe(true);
    expect(validateNumericValue(-100)).toBe(true);
  });

  it('should reject numbers outside allowed range', () => {
    expect(validateNumericValue(1e10)).toBe(false);
    expect(validateNumericValue(-1e10)).toBe(false);
  });

  it('should handle invalid numeric inputs', () => {
    expect(() => validateNumericValue(NaN)).toThrow('Invalid numeric value');
    expect(() => validateNumericValue(Infinity)).toThrow('Invalid numeric value');
    expect(() => validateNumericValue('100' as any)).toThrow('Invalid numeric value');
  });

  it('should handle decimal precision correctly', () => {
    expect(validateNumericValue(123.456)).toBe(true);
    expect(validateNumericValue(0.0001)).toBe(true);
  });
});

// Jest test suite for input sanitization
describe('sanitizeInput', () => {
  it('should remove HTML tags', () => {
    expect(sanitizeInput('<p>Test</p>')).toBe('Test');
    expect(sanitizeInput('<script>alert(1)</script>')).toBe('alert1');
  });

  it('should handle special characters', () => {
    expect(sanitizeInput('Test@123')).toBe('Test123');
    expect(sanitizeInput('Test#456')).toBe('Test456');
  });

  it('should trim whitespace', () => {
    expect(sanitizeInput('  Test  ')).toBe('Test');
    expect(sanitizeInput('\n\tTest\n')).toBe('Test');
  });

  it('should handle empty and null inputs', () => {
    expect(sanitizeInput('')).toBe('');
    expect(sanitizeInput(null as any)).toBe('');
    expect(sanitizeInput(undefined as any)).toBe('');
  });

  it('should prevent common XSS patterns', () => {
    expect(sanitizeInput('<img src=x onerror=alert(1)>')).toBe('srcxonerroralert1');
    expect(sanitizeInput('javascript:alert(1)')).toBe('javascriptalert1');
  });
});