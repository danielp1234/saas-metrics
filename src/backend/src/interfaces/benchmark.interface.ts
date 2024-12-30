/**
 * @fileoverview TypeScript interfaces for SaaS metrics benchmark data structures
 * Defines comprehensive type definitions for benchmark data, filters, and percentile distributions
 * with strict type safety and validation support.
 */

/**
 * Valid ARR (Annual Recurring Revenue) range values
 * Represents standardized revenue brackets for benchmark comparisons
 */
export type ArrRangeType = 
  | '$0-$1M'
  | '$1M-$5M'
  | '$5M-$10M'
  | '$10M-$20M'
  | '$20M-$50M'
  | '$50M-$100M'
  | '$100M+'
;

/**
 * Data validation status values
 * Used to track the validation state of benchmark data entries
 */
export type ValidationStatus = 
  | 'pending'
  | 'valid'
  | 'invalid'
  | 'requires_review'
;

/**
 * Core interface defining the structure of benchmark data entries
 * Provides comprehensive type safety for all benchmark-related data
 */
export interface BenchmarkData {
  /** Unique identifier for the benchmark entry */
  id: string;
  
  /** Reference to the associated metric */
  metricId: string;
  
  /** Reference to the data source */
  sourceId: string;
  
  /** Numerical value of the benchmark */
  value: number;
  
  /** ARR range category for the benchmark */
  arrRange: ArrRangeType;
  
  /** Percentile value (0-100) */
  percentile: number;
  
  /** Date of the benchmark data point */
  dataDate: Date;
  
  /** Additional metadata for the benchmark */
  metadata: BenchmarkMetadata;
  
  /** Creation timestamp */
  createdAt: Date;
  
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Interface for additional benchmark metadata
 * Includes calculation methods and validation information
 */
export interface BenchmarkMetadata {
  /** Method used to calculate the benchmark value */
  calculationMethod: string;
  
  /** Required data points for calculation */
  dataPoints: string[];
  
  /** Current validation status */
  validationStatus: ValidationStatus;
}

/**
 * Comprehensive interface for filtering benchmark data queries
 * Supports multiple filter criteria with flexible value types
 */
export interface BenchmarkFilter {
  /** Filter by specific metric(s) */
  metricId?: string | string[];
  
  /** Filter by ARR range(s) */
  arrRange?: ArrRangeType | ArrRangeType[];
  
  /** Filter by data source(s) */
  sourceId?: string | string[];
  
  /** Filter by start date */
  startDate?: Date;
  
  /** Filter by end date */
  endDate?: Date;
  
  /** Include metadata in results */
  includeMetadata?: boolean;
}

/**
 * Interface defining the structure of percentile distribution calculations
 * Provides statistical accuracy for benchmark comparisons
 */
export interface PercentileDistribution {
  /** 5th percentile value */
  p5: number;
  
  /** 25th percentile value */
  p25: number;
  
  /** 50th percentile (median) value */
  p50: number;
  
  /** 75th percentile value */
  p75: number;
  
  /** 90th percentile value */
  p90: number;
}