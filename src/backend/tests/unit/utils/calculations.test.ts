/**
 * @fileoverview Unit tests for SaaS metrics calculation utility functions
 * Verifies accuracy of calculations and proper error handling based on
 * specifications in A.1.1 Metric Calculation Methods
 * @version 1.0.0
 */

import { describe, test, expect } from '@jest/globals'; // v29.0.0
import {
  calculateRevenueGrowth,
  calculateNDR,
  calculateMagicNumber,
  calculateEBITDAMargin,
  calculateARRPerEmployee,
  calculatePercentileDistribution
} from '../../../src/utils/calculations';

describe('calculateRevenueGrowth', () => {
  test('calculates positive growth correctly', () => {
    expect(calculateRevenueGrowth(150000, 100000)).toBe(50.00);
  });

  test('calculates negative growth correctly', () => {
    expect(calculateRevenueGrowth(75000, 100000)).toBe(-25.00);
  });

  test('maintains decimal precision', () => {
    expect(calculateRevenueGrowth(123456, 100000)).toBe(23.46);
  });

  test('throws error for zero previous ARR', () => {
    expect(() => calculateRevenueGrowth(100000, 0))
      .toThrow('Invalid input: Previous ARR cannot be zero');
  });

  test('throws error for negative ARR values', () => {
    expect(() => calculateRevenueGrowth(-100000, 100000))
      .toThrow('Invalid input: ARR values cannot be negative');
  });

  test('handles large numbers correctly', () => {
    expect(calculateRevenueGrowth(1000000000, 500000000)).toBe(100.00);
  });

  test('handles small numbers correctly', () => {
    expect(calculateRevenueGrowth(0.15, 0.10)).toBe(50.00);
  });

  test('throws error for invalid number inputs', () => {
    expect(() => calculateRevenueGrowth(NaN, 100000))
      .toThrow('Invalid input: ARR values must be valid numbers');
  });
});

describe('calculateNDR', () => {
  test('calculates NDR correctly with all components', () => {
    expect(calculateNDR(1000000, 200000, 50000, 100000)).toBe(105.00);
  });

  test('handles perfect retention scenario', () => {
    expect(calculateNDR(1000000, 0, 0, 0)).toBe(100.00);
  });

  test('calculates high growth NDR correctly', () => {
    expect(calculateNDR(1000000, 300000, 0, 50000)).toBe(125.00);
  });

  test('calculates low NDR correctly', () => {
    expect(calculateNDR(1000000, 0, 100000, 150000)).toBe(75.00);
  });

  test('throws error for negative revenue values', () => {
    expect(() => calculateNDR(1000000, -100000, 50000, 50000))
      .toThrow('Invalid input: Revenue values cannot be negative');
  });

  test('throws error when contraction + churn exceeds beginning ARR', () => {
    expect(() => calculateNDR(1000000, 0, 600000, 500000))
      .toThrow('Invalid input: Combined contraction and churn cannot exceed beginning ARR');
  });

  test('maintains decimal precision', () => {
    expect(calculateNDR(1000000, 123456, 45678, 34567)).toBe(104.32);
  });

  test('throws error for zero beginning ARR', () => {
    expect(() => calculateNDR(0, 100000, 0, 0))
      .toThrow('Invalid input: Beginning ARR must be positive');
  });
});

describe('calculateMagicNumber', () => {
  test('calculates optimal magic number correctly', () => {
    expect(calculateMagicNumber(1000000, 1200000)).toBe(0.83);
  });

  test('calculates high efficiency scenario correctly', () => {
    expect(calculateMagicNumber(2000000, 1000000)).toBe(2.00);
  });

  test('calculates low efficiency scenario correctly', () => {
    expect(calculateMagicNumber(500000, 1500000)).toBe(0.33);
  });

  test('handles negative net new ARR correctly', () => {
    expect(calculateMagicNumber(-500000, 1000000)).toBe(-0.50);
  });

  test('throws error for zero marketing spend', () => {
    expect(() => calculateMagicNumber(1000000, 0))
      .toThrow('Invalid input: Sales & Marketing spend must be positive');
  });

  test('maintains decimal precision', () => {
    expect(calculateMagicNumber(123456, 100000)).toBe(1.23);
  });

  test('handles large numbers correctly', () => {
    expect(calculateMagicNumber(10000000, 5000000)).toBe(2.00);
  });

  test('throws error for invalid inputs', () => {
    expect(() => calculateMagicNumber(NaN, 100000))
      .toThrow('Invalid input: Values must be valid numbers');
  });
});

describe('calculateEBITDAMargin', () => {
  test('calculates positive margin correctly', () => {
    expect(calculateEBITDAMargin(200000, 1000000)).toBe(20.00);
  });

  test('calculates negative margin correctly', () => {
    expect(calculateEBITDAMargin(-100000, 1000000)).toBe(-10.00);
  });

  test('handles high profitability scenario', () => {
    expect(calculateEBITDAMargin(400000, 1000000)).toBe(40.00);
  });

  test('maintains decimal precision', () => {
    expect(calculateEBITDAMargin(123456, 1000000)).toBe(12.35);
  });

  test('throws error for zero revenue', () => {
    expect(() => calculateEBITDAMargin(100000, 0))
      .toThrow('Invalid input: Revenue must be positive');
  });

  test('handles large numbers correctly', () => {
    expect(calculateEBITDAMargin(10000000, 100000000)).toBe(10.00);
  });

  test('throws error for invalid inputs', () => {
    expect(() => calculateEBITDAMargin(100000, NaN))
      .toThrow('Invalid input: Values must be valid numbers');
  });
});

describe('calculateARRPerEmployee', () => {
  test('calculates standard ARR per employee correctly', () => {
    expect(calculateARRPerEmployee(10000000, 100)).toBe(100000);
  });

  test('handles high efficiency scenario correctly', () => {
    expect(calculateARRPerEmployee(10000000, 10)).toBe(1000000);
  });

  test('handles low efficiency scenario correctly', () => {
    expect(calculateARRPerEmployee(1000000, 20)).toBe(50000);
  });

  test('throws error for zero employees', () => {
    expect(() => calculateARRPerEmployee(1000000, 0))
      .toThrow('Invalid input: Employee count must be a positive integer');
  });

  test('throws error for negative ARR', () => {
    expect(() => calculateARRPerEmployee(-1000000, 10))
      .toThrow('Invalid input: Total ARR cannot be negative');
  });

  test('throws error for fractional employees', () => {
    expect(() => calculateARRPerEmployee(1000000, 10.5))
      .toThrow('Invalid input: Employee count must be a positive integer');
  });

  test('handles large ARR values correctly', () => {
    expect(calculateARRPerEmployee(1000000000, 1000)).toBe(1000000);
  });
});

describe('calculatePercentileDistribution', () => {
  test('calculates percentiles correctly for sorted array', () => {
    const values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    const result = calculatePercentileDistribution(values);
    expect(result).toEqual({
      p5: 14.50,
      p25: 32.50,
      p50: 55.00,
      p75: 77.50,
      p90: 94.00
    });
  });

  test('calculates percentiles correctly for unsorted array', () => {
    const values = [90, 30, 70, 20, 50, 80, 40, 10, 60, 100];
    const result = calculatePercentileDistribution(values);
    expect(result).toEqual({
      p5: 14.50,
      p25: 32.50,
      p50: 55.00,
      p75: 77.50,
      p90: 94.00
    });
  });

  test('throws error for empty array', () => {
    expect(() => calculatePercentileDistribution([]))
      .toThrow('Invalid input: Values must be a non-empty array');
  });

  test('handles single value array correctly', () => {
    const result = calculatePercentileDistribution([50]);
    expect(result).toEqual({
      p5: 50.00,
      p25: 50.00,
      p50: 50.00,
      p75: 50.00,
      p90: 50.00
    });
  });

  test('throws error for invalid array values', () => {
    expect(() => calculatePercentileDistribution([10, NaN, 30]))
      .toThrow('Invalid input: All values must be valid numbers');
  });

  test('handles decimal values correctly', () => {
    const values = [10.5, 20.7, 30.2, 40.9, 50.3];
    const result = calculatePercentileDistribution(values);
    expect(result.p50).toBe(30.20);
  });

  test('handles large datasets efficiently', () => {
    const values = Array.from({ length: 1000 }, (_, i) => i + 1);
    const result = calculatePercentileDistribution(values);
    expect(result.p50).toBe(500.50);
  });
});