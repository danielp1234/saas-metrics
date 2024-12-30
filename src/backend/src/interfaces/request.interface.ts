/**
 * @fileoverview TypeScript interfaces for extending Express Request objects
 * Provides comprehensive type definitions for API requests with enhanced security,
 * validation, and pagination features.
 * @version 1.0.0
 */

// @package express ^4.18.x
import { Request } from 'express';
import { AuthenticatedUser, SessionData, UserRole } from './auth.interface';
import { MetricType } from './metrics.interface';

/**
 * Enhanced interface extending Express Request with authentication data
 * Provides comprehensive type safety for authenticated requests
 */
export interface AuthenticatedRequest extends Request {
  /** Authenticated user data */
  user: AuthenticatedUser;
  
  /** Active session data */
  session: SessionData;
  
  /** Unique request identifier for tracing */
  requestId: string;
  
  /** Request timestamp */
  timestamp: Date;
  
  /** Client IP address */
  clientIp: string;
}

/**
 * Enhanced interface for metrics-related request parameters
 * Supports comprehensive filtering and statistical options
 */
export interface MetricsQueryParams {
  /** Type of metric to query */
  metricType: MetricType;
  
  /** ARR range filter */
  arrRange?: string;
  
  /** Data source filter */
  source?: string;
  
  /** Start date for time range */
  startDate?: string;
  
  /** End date for time range */
  endDate?: string;
  
  /** Statistical confidence interval (0-1) */
  confidenceInterval?: number;
  
  /** Minimum sample size requirement */
  sampleSize?: number;
  
  /** Response format (json/csv) */
  format?: 'json' | 'csv';
  
  /** Flag to include statistical outliers */
  includeOutliers?: boolean;
  
  /** Timezone for date calculations */
  timeZone?: string;
}

/**
 * Interface for benchmark data import requests
 * Includes comprehensive validation and processing options
 */
export interface BenchmarkImportData {
  /** Data source identifier */
  source: string;
  
  /** Array of benchmark data entries */
  data: Array<unknown>;
  
  /** Unique import batch identifier */
  importId: string;
  
  /** Flag to enable data validation */
  validateData: boolean;
  
  /** Batch size for processing */
  batchSize: number;
  
  /** Retry strategy configuration */
  retryStrategy: 'immediate' | 'exponential' | 'none';
  
  /** Operation timeout in seconds */
  timeoutSeconds: number;
  
  /** Custom validation rules */
  validationRules?: Record<string, unknown>;
}

/**
 * Enhanced interface for advanced pagination
 * Supports cursor-based pagination with comprehensive filtering
 */
export interface PaginationParams {
  /** Page number for offset pagination */
  page?: number;
  
  /** Items per page */
  limit?: number;
  
  /** Sort field */
  sortBy?: string;
  
  /** Sort direction */
  sortOrder?: SortOrder;
  
  /** Cursor for cursor-based pagination */
  cursor?: string;
  
  /** Additional filter criteria */
  filters?: Record<string, unknown>;
  
  /** Flag to include total count */
  includeTotalCount?: boolean;
}

/**
 * Interface extending Express Request for metrics endpoints
 * Provides comprehensive type safety for metrics operations
 */
export interface MetricsRequest extends Request {
  /** Typed query parameters */
  query: MetricsQueryParams;
  
  /** Validation level for request processing */
  validationLevel: ValidationLevel;
  
  /** Request priority for processing */
  priority?: RequestPriority;
}

/**
 * Enum for sort order options
 * Used in pagination and sorting operations
 */
export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC'
}

/**
 * Enum for validation level configuration
 * Controls the strictness of request validation
 */
export enum ValidationLevel {
  STRICT = 'STRICT',
  NORMAL = 'NORMAL',
  RELAXED = 'RELAXED'
}

/**
 * Enum for request priority levels
 * Used for request queue management
 */
export enum RequestPriority {
  HIGH = 'HIGH',
  NORMAL = 'NORMAL',
  LOW = 'LOW'
}

/**
 * Type guard to validate MetricsQueryParams
 * @param value - Value to check
 * @returns boolean indicating if value is valid MetricsQueryParams
 */
export function isMetricsQueryParams(value: unknown): value is MetricsQueryParams {
  const params = value as MetricsQueryParams;
  return (
    typeof params === 'object' &&
    params !== null &&
    typeof params.metricType === 'string' &&
    (!params.arrRange || typeof params.arrRange === 'string') &&
    (!params.source || typeof params.source === 'string') &&
    (!params.startDate || typeof params.startDate === 'string') &&
    (!params.endDate || typeof params.endDate === 'string') &&
    (!params.confidenceInterval || 
      (typeof params.confidenceInterval === 'number' && 
       params.confidenceInterval >= 0 && 
       params.confidenceInterval <= 1))
  );
}