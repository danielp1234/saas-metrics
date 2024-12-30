// @version typescript ^5.0.0

import { MetricType, MetricData, PercentileData } from '../interfaces/metrics.interface';
import { FilterParams } from '../interfaces/common.interface';

/**
 * Valid ARR ranges for filtering
 */
const VALID_ARR_RANGES = ['0-1M', '1M-5M', '5M-10M', '10M-50M', '50M+'] as const;

/**
 * UUID v4 validation regex pattern
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Metric-specific value ranges for validation
 */
const METRIC_RANGES = {
  [MetricType.REVENUE_GROWTH]: { min: -100, max: 1000 }, // Allow for high-growth scenarios
  [MetricType.NDR]: { min: 0, max: 200 }, // NDR is typically 0-200%
  [MetricType.MAGIC_NUMBER]: { min: -10, max: 10 }, // Standard range for SaaS magic number
  [MetricType.EBITDA_MARGIN]: { min: -100, max: 100 }, // Percentage range
  [MetricType.ARR_PER_EMPLOYEE]: { min: 0, max: 1000000 } // Up to $1M per employee
} as const;

/**
 * Validates if a given string is a valid metric type
 * @param type - String to validate as metric type
 * @returns boolean indicating if type is valid
 */
export const isValidMetricType = (type: string): boolean => {
  if (!type || typeof type !== 'string') {
    return false;
  }

  const sanitizedType = type.trim().toLowerCase();
  return Object.values(MetricType).includes(sanitizedType as MetricType);
};

/**
 * Validates if a metric value is within acceptable range based on metric type
 * @param value - Numeric value to validate
 * @param metricType - Type of metric for range validation
 * @returns boolean indicating if value is valid for the metric type
 */
export const isValidMetricValue = (value: number, metricType: MetricType): boolean => {
  // Basic numeric validation
  if (!Number.isFinite(value)) {
    return false;
  }

  // Get range for metric type
  const range = METRIC_RANGES[metricType];
  if (!range) {
    return false;
  }

  // Check if value is within acceptable range
  return value >= range.min && value <= range.max;
};

/**
 * Validates percentile data structure and ensures values are in correct ascending order
 * @param percentiles - Percentile data object to validate
 * @returns boolean indicating if percentile data is valid
 */
export const isValidPercentileData = (percentiles: PercentileData): boolean => {
  // Check if all required percentiles exist
  const requiredPercentiles = ['p5', 'p25', 'p50', 'p75', 'p90'] as const;
  const hasAllPercentiles = requiredPercentiles.every(
    p => typeof percentiles[p] === 'number' && Number.isFinite(percentiles[p])
  );

  if (!hasAllPercentiles) {
    return false;
  }

  // Verify percentiles are in ascending order
  const values = requiredPercentiles.map(p => percentiles[p]);
  for (let i = 0; i < values.length - 1; i++) {
    if (values[i] >= values[i + 1]) {
      return false;
    }
  }

  // Validate each percentile is within 0-100 range
  return values.every(value => value >= 0 && value <= 100);
};

/**
 * Validates filter parameters with comprehensive type and format checking
 * @param params - Filter parameters object to validate
 * @returns boolean indicating if filter parameters are valid
 */
export const isValidFilterParams = (params: FilterParams): boolean => {
  // Check if params object exists
  if (!params || typeof params !== 'object') {
    return false;
  }

  // Validate ARR range
  if (params.arr_range !== null) {
    if (typeof params.arr_range !== 'string' || 
        !VALID_ARR_RANGES.includes(params.arr_range as typeof VALID_ARR_RANGES[number])) {
      return false;
    }
  }

  // Validate metric_id
  if (params.metric_id !== null) {
    if (typeof params.metric_id !== 'string' || !UUID_REGEX.test(params.metric_id)) {
      return false;
    }
  }

  // Validate source_id
  if (params.source_id !== null) {
    if (typeof params.source_id !== 'string' || !UUID_REGEX.test(params.source_id)) {
      return false;
    }
  }

  // Validate date_range if present
  if (params.date_range !== null) {
    const { startDate, endDate } = params.date_range;
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
        return false;
      }
    }
  }

  return true;
};

/**
 * Validates complete metric data structure
 * @param metricData - Complete metric data object to validate
 * @returns boolean indicating if metric data is valid
 */
export const isValidMetricData = (metricData: MetricData): boolean => {
  // Validate required fields exist
  if (!metricData.id || !metricData.type || !metricData.value || !metricData.percentiles) {
    return false;
  }

  // Validate UUID format
  if (!UUID_REGEX.test(metricData.id)) {
    return false;
  }

  // Validate metric type
  if (!isValidMetricType(metricData.type)) {
    return false;
  }

  // Validate metric value
  if (!isValidMetricValue(metricData.value, metricData.type)) {
    return false;
  }

  // Validate percentile data
  if (!isValidPercentileData(metricData.percentiles)) {
    return false;
  }

  return true;
};

/**
 * Sanitizes string input by trimming whitespace and removing special characters
 * @param input - String to sanitize
 * @returns Sanitized string
 */
export const sanitizeString = (input: string): string => {
  if (typeof input !== 'string') {
    return '';
  }
  return input.trim().replace(/[<>'"]/g, '');
};

/**
 * Validates numeric input is within specified range
 * @param value - Number to validate
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @returns boolean indicating if value is within range
 */
export const isNumberInRange = (value: number, min: number, max: number): boolean => {
  return Number.isFinite(value) && value >= min && value <= max;
};