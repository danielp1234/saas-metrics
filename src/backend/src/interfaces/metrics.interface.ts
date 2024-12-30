/**
 * @fileoverview TypeScript interfaces and types for SaaS metrics system
 * Defines core metric structures, calculation methods, and filtering capabilities
 * with comprehensive type safety and validation support.
 * @version 1.0.0
 */

import { PercentileDistribution } from './benchmark.interface';

/**
 * Enum defining supported metric types in the SaaS metrics system
 * Maps to calculation methods defined in A.1.1 Metric Calculation Methods
 */
export enum MetricType {
  REVENUE_GROWTH = 'revenue_growth',
  NDR = 'net_dollar_retention',
  MAGIC_NUMBER = 'magic_number',
  EBITDA_MARGIN = 'ebitda_margin',
  ARR_PER_EMPLOYEE = 'arr_per_employee'
}

/**
 * Core interface defining the structure of a metric
 * Includes comprehensive details about calculation methods and requirements
 */
export interface Metric {
  /** Unique identifier for the metric */
  id: string;

  /** Human-readable name of the metric */
  name: string;

  /** Detailed description of what the metric measures */
  description: string;

  /** Type of metric from supported enum */
  type: MetricType;

  /** Description of how the metric is calculated */
  calculationMethod: string;

  /** Required data points for calculation */
  dataPoints: string[];

  /** Mathematical formula representation */
  formula: string;

  /** Unit of measurement (%, $, ratio, etc.) */
  unit: string;

  /** Creation timestamp */
  createdAt: Date;

  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Interface for metric values including statistical distribution
 * Incorporates percentile calculations and confidence metrics
 */
export interface MetricValue {
  /** Calculated metric value */
  value: number;

  /** Statistical distribution across percentiles */
  percentiles: PercentileDistribution;

  /** Associated metadata */
  metadata: MetricMetadata;

  /** Statistical confidence level (0-1) */
  confidence: number;

  /** Number of data points in sample */
  sampleSize: number;
}

/**
 * Interface for filtering metric queries
 * Supports comprehensive filtering options based on UI requirements
 */
export interface MetricFilter {
  /** Filter by metric type */
  type: MetricType;

  /** Filter by ARR range */
  arrRange: string;

  /** Start date for time-based filtering */
  startDate: Date;

  /** End date for time-based filtering */
  endDate: Date;

  /** Filter by data source */
  source: string;

  /** Minimum confidence level required */
  confidence: number;
}

/**
 * Interface for metric metadata
 * Tracks source information and temporal data
 */
export interface MetricMetadata {
  /** Data source identifier */
  source: string;

  /** ARR range category */
  arrRange: string;

  /** Date of the metric data */
  dataDate: Date;

  /** Last update timestamp */
  lastUpdated: Date;
}

/**
 * Type guard to check if a value is a valid MetricType
 * @param value - Value to check
 * @returns boolean indicating if value is a valid MetricType
 */
export function isMetricType(value: any): value is MetricType {
  return Object.values(MetricType).includes(value as MetricType);
}

/**
 * Type guard to validate complete Metric object
 * @param value - Value to check
 * @returns boolean indicating if value is a valid Metric
 */
export function isMetric(value: any): value is Metric {
  return (
    typeof value === 'object' &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.description === 'string' &&
    isMetricType(value.type) &&
    typeof value.calculationMethod === 'string' &&
    Array.isArray(value.dataPoints) &&
    typeof value.formula === 'string' &&
    typeof value.unit === 'string' &&
    value.createdAt instanceof Date &&
    value.updatedAt instanceof Date
  );
}