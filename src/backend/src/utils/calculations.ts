/**
 * @fileoverview High-performance utility functions for calculating SaaS metrics and statistical distributions
 * Implements precise calculation methods defined in A.1.1 Metric Calculation Methods with comprehensive
 * validation, error handling, and optimized performance.
 * @version 1.0.0
 */

import { MetricType } from '../interfaces/metrics.interface';
import { PercentileDistribution } from '../interfaces/benchmark.interface';
import Decimal from 'decimal.js'; // v10.4.3 - For high-precision calculations

/**
 * Custom error class for calculation-related errors
 */
class CalculationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CalculationError';
  }
}

/**
 * Type guard to validate numeric input
 * @param value - Value to check
 * @returns boolean indicating if value is a valid number
 */
const isValidNumber = (value: any): value is number => {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
};

/**
 * Calculates revenue growth rate with comprehensive validation
 * Formula: ((Current ARR - Previous ARR) / Previous ARR) × 100
 * @param currentARR - Current period ARR
 * @param previousARR - Previous period ARR
 * @returns Growth rate as a percentage with 2 decimal precision
 * @throws CalculationError for invalid inputs or calculation errors
 */
export const calculateRevenueGrowth = (currentARR: number, previousARR: number): number => {
  // Input validation
  if (!isValidNumber(currentARR) || !isValidNumber(previousARR)) {
    throw new CalculationError('Invalid input: ARR values must be valid numbers');
  }
  if (currentARR < 0 || previousARR < 0) {
    throw new CalculationError('Invalid input: ARR values cannot be negative');
  }
  if (previousARR === 0) {
    throw new CalculationError('Invalid input: Previous ARR cannot be zero');
  }

  try {
    // Use Decimal.js for precise calculation
    const growth = new Decimal(currentARR)
      .minus(previousARR)
      .dividedBy(previousARR)
      .times(100)
      .toDecimalPlaces(2)
      .toNumber();

    return growth;
  } catch (error) {
    throw new CalculationError(`Failed to calculate revenue growth: ${error.message}`);
  }
};

/**
 * Calculates Net Dollar Retention with full validation
 * Formula: ((Beginning ARR + Expansion - Contraction - Churn) / Beginning ARR) × 100
 * @param beginningARR - Beginning period ARR
 * @param expansion - Expansion revenue
 * @param contraction - Contraction revenue
 * @param churn - Churned revenue
 * @returns NDR as a percentage with 2 decimal precision
 * @throws CalculationError for invalid inputs or calculation errors
 */
export const calculateNDR = (
  beginningARR: number,
  expansion: number,
  contraction: number,
  churn: number
): number => {
  // Input validation
  if (!isValidNumber(beginningARR) || !isValidNumber(expansion) ||
      !isValidNumber(contraction) || !isValidNumber(churn)) {
    throw new CalculationError('Invalid input: All values must be valid numbers');
  }
  if (beginningARR <= 0) {
    throw new CalculationError('Invalid input: Beginning ARR must be positive');
  }
  if (expansion < 0 || contraction < 0 || churn < 0) {
    throw new CalculationError('Invalid input: Revenue values cannot be negative');
  }
  if ((contraction + churn) > beginningARR) {
    throw new CalculationError('Invalid input: Combined contraction and churn cannot exceed beginning ARR');
  }

  try {
    const ndr = new Decimal(beginningARR)
      .plus(expansion)
      .minus(contraction)
      .minus(churn)
      .dividedBy(beginningARR)
      .times(100)
      .toDecimalPlaces(2)
      .toNumber();

    return ndr;
  } catch (error) {
    throw new CalculationError(`Failed to calculate NDR: ${error.message}`);
  }
};

/**
 * Calculates Magic Number with enhanced precision
 * Formula: Net New ARR / Sales & Marketing Spend
 * @param netNewARR - Net new ARR
 * @param salesMarketingSpend - Sales and marketing spend
 * @returns Magic Number ratio with 2 decimal precision
 * @throws CalculationError for invalid inputs or calculation errors
 */
export const calculateMagicNumber = (
  netNewARR: number,
  salesMarketingSpend: number
): number => {
  // Input validation
  if (!isValidNumber(netNewARR) || !isValidNumber(salesMarketingSpend)) {
    throw new CalculationError('Invalid input: Values must be valid numbers');
  }
  if (salesMarketingSpend <= 0) {
    throw new CalculationError('Invalid input: Sales & Marketing spend must be positive');
  }

  try {
    const magicNumber = new Decimal(netNewARR)
      .dividedBy(salesMarketingSpend)
      .toDecimalPlaces(2)
      .toNumber();

    return magicNumber;
  } catch (error) {
    throw new CalculationError(`Failed to calculate Magic Number: ${error.message}`);
  }
};

/**
 * Calculates EBITDA margin with comprehensive validation
 * Formula: (EBITDA / Revenue) × 100
 * @param ebitda - EBITDA value
 * @param revenue - Total revenue
 * @returns EBITDA margin as a percentage with 2 decimal precision
 * @throws CalculationError for invalid inputs or calculation errors
 */
export const calculateEBITDAMargin = (ebitda: number, revenue: number): number => {
  // Input validation
  if (!isValidNumber(ebitda) || !isValidNumber(revenue)) {
    throw new CalculationError('Invalid input: Values must be valid numbers');
  }
  if (revenue <= 0) {
    throw new CalculationError('Invalid input: Revenue must be positive');
  }

  try {
    const margin = new Decimal(ebitda)
      .dividedBy(revenue)
      .times(100)
      .toDecimalPlaces(2)
      .toNumber();

    return margin;
  } catch (error) {
    throw new CalculationError(`Failed to calculate EBITDA margin: ${error.message}`);
  }
};

/**
 * Calculates ARR per employee with input validation
 * Formula: Total ARR / Full-time Employee Count
 * @param totalARR - Total ARR
 * @param employeeCount - Number of full-time employees
 * @returns ARR per employee value rounded to nearest whole number
 * @throws CalculationError for invalid inputs or calculation errors
 */
export const calculateARRPerEmployee = (
  totalARR: number,
  employeeCount: number
): number => {
  // Input validation
  if (!isValidNumber(totalARR) || !isValidNumber(employeeCount)) {
    throw new CalculationError('Invalid input: Values must be valid numbers');
  }
  if (totalARR < 0) {
    throw new CalculationError('Invalid input: Total ARR cannot be negative');
  }
  if (employeeCount <= 0 || !Number.isInteger(employeeCount)) {
    throw new CalculationError('Invalid input: Employee count must be a positive integer');
  }

  try {
    const arrPerEmployee = new Decimal(totalARR)
      .dividedBy(employeeCount)
      .round()
      .toNumber();

    return arrPerEmployee;
  } catch (error) {
    throw new CalculationError(`Failed to calculate ARR per employee: ${error.message}`);
  }
};

/**
 * Calculates percentile distribution with optimized performance
 * Implements efficient sorting and interpolation for large datasets
 * @param values - Array of numeric values to calculate percentiles from
 * @returns Object containing p5, p25, p50, p75, p90 values
 * @throws CalculationError for invalid inputs or calculation errors
 */
export const calculatePercentileDistribution = (values: number[]): PercentileDistribution => {
  // Input validation
  if (!Array.isArray(values) || values.length === 0) {
    throw new CalculationError('Invalid input: Values must be a non-empty array');
  }
  if (!values.every(isValidNumber)) {
    throw new CalculationError('Invalid input: All values must be valid numbers');
  }

  try {
    // Sort values in ascending order
    const sortedValues = [...values].sort((a, b) => a - b);
    const length = sortedValues.length;

    // Helper function to calculate percentile value
    const getPercentile = (percentile: number): number => {
      const index = (percentile / 100) * (length - 1);
      const lower = Math.floor(index);
      const upper = Math.ceil(index);
      
      if (lower === upper) {
        return sortedValues[lower];
      }

      const fraction = index - lower;
      return new Decimal(sortedValues[lower])
        .times(1 - fraction)
        .plus(new Decimal(sortedValues[upper]).times(fraction))
        .toDecimalPlaces(2)
        .toNumber();
    };

    // Calculate all required percentiles
    return {
      p5: getPercentile(5),
      p25: getPercentile(25),
      p50: getPercentile(50),
      p75: getPercentile(75),
      p90: getPercentile(90)
    };
  } catch (error) {
    throw new CalculationError(`Failed to calculate percentile distribution: ${error.message}`);
  }
};