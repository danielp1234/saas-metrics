/**
 * @fileoverview TypeScript interfaces for standardized API response structures
 * Defines comprehensive response interfaces with type safety and validation support
 * Implements requirements from Technical Specification sections 3.3.2 and 3.3.4
 * @version 1.0.0
 */

import { Metric } from './metrics.interface';
import { BenchmarkData, PercentileDistribution } from './benchmark.interface';

/**
 * Enum defining standardized response status codes
 * Maps to HTTP status codes and internal application states
 */
export enum ResponseStatus {
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  RATE_LIMITED = 'RATE_LIMITED',
  SERVER_ERROR = 'SERVER_ERROR'
}

/**
 * Interface for standardized error responses
 * Provides detailed error information with validation support
 */
export interface ErrorResponse {
  /** HTTP status code */
  code: number;
  
  /** Human-readable error message */
  message: string;
  
  /** Detailed error information */
  details: string[];
  
  /** Standardized response status */
  status: ResponseStatus;
  
  /** Error timestamp */
  timestamp: number;
  
  /** Request ID for error tracking */
  requestId?: string;
}

/**
 * Interface for response metadata
 * Tracks performance metrics and request information
 */
export interface ResponseMetadata {
  /** Response time in milliseconds */
  responseTime: number;
  
  /** API version */
  apiVersion: string;
  
  /** Response timestamp */
  timestamp: number;
  
  /** Unique request identifier */
  requestId: string;
  
  /** Server region/identifier */
  server?: string;
  
  /** Cache status (hit/miss) */
  cacheStatus?: 'hit' | 'miss';
}

/**
 * Interface for metric-specific metadata
 * Provides context for metric responses
 */
export interface MetricMetadata {
  /** Data source identifier */
  source: string;
  
  /** ARR range category */
  arr_range: string;
  
  /** Last update timestamp */
  updated_at: string;
  
  /** Data quality indicator */
  data_quality: string;
  
  /** Sample size for statistical validity */
  sample_size: number;
}

/**
 * Interface for pagination metadata
 * Supports paginated response handling
 */
export interface PaginationMetadata {
  /** Total number of items */
  total: number;
  
  /** Current page number */
  page: number;
  
  /** Items per page */
  limit: number;
  
  /** Total number of pages */
  totalPages: number;
  
  /** Indicates if there is a next page */
  hasNextPage: boolean;
  
  /** Indicates if there is a previous page */
  hasPreviousPage: boolean;
}

/**
 * Generic interface for standardized API responses
 * Provides type safety for response data
 */
export interface ApiResponse<T> {
  /** Indicates if the request was successful */
  success: boolean;
  
  /** Response data of type T */
  data: T | null;
  
  /** Error information if request failed */
  error: ErrorResponse | null;
  
  /** Response metadata */
  metadata: ResponseMetadata;
}

/**
 * Interface for metric response data
 * Combines metric information with statistical data
 */
export interface MetricResponse {
  /** Core metric information */
  metric: Metric;
  
  /** Current metric value */
  value: number;
  
  /** Statistical distribution */
  percentiles: PercentileDistribution;
  
  /** Metric metadata */
  metadata: MetricMetadata;
  
  /** Statistical confidence level (0-1) */
  confidenceLevel: number;
}

/**
 * Generic interface for paginated responses
 * Supports pagination for list endpoints
 */
export interface PaginatedResponse<T> {
  /** Array of response items */
  data: T[];
  
  /** Pagination information */
  pagination: PaginationMetadata;
  
  /** Response metadata */
  metadata: ResponseMetadata;
}

/**
 * Interface for benchmark data responses
 * Combines benchmark data with metadata
 */
export interface BenchmarkResponse {
  /** Benchmark data array */
  benchmarks: BenchmarkData[];
  
  /** Statistical distribution */
  distribution: PercentileDistribution;
  
  /** Response metadata */
  metadata: MetricMetadata;
}

/**
 * Type guard to validate ApiResponse
 * @param value - Value to check
 * @returns boolean indicating if value is a valid ApiResponse
 */
export function isApiResponse<T>(value: any): value is ApiResponse<T> {
  return (
    typeof value === 'object' &&
    typeof value.success === 'boolean' &&
    (value.data === null || typeof value.data === 'object') &&
    (value.error === null || typeof value.error === 'object') &&
    typeof value.metadata === 'object' &&
    typeof value.metadata.responseTime === 'number' &&
    typeof value.metadata.apiVersion === 'string'
  );
}