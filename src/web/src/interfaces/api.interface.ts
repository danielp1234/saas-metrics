/**
 * API Interface Definitions for SaaS Metrics Platform
 * Defines core types for API communication, security, and data transfer
 * @version 1.0.0
 */

import { MetricData } from './metrics.interface';
import { AuthResponse } from './auth.interface';

/**
 * Enumeration of supported HTTP methods
 */
export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
  HEAD = 'HEAD',
  OPTIONS = 'OPTIONS'
}

/**
 * Enhanced generic interface for all API responses
 * Includes security metadata, rate limiting, and error handling
 */
export interface ApiResponse<T> {
  /** Operation success indicator */
  success: boolean;
  /** Response payload */
  data: T | null;
  /** Error information if applicable */
  error: ApiError | null;
  /** Response message */
  message: string;
  /** Response timestamp */
  timestamp: Date;
  /** Rate limiting information */
  rateLimit: RateLimitInfo | null;
  /** Unique request identifier for tracing */
  requestId: string;
}

/**
 * Enhanced error interface with detailed debugging information
 */
export interface ApiError {
  /** HTTP status code */
  code: number;
  /** Error message */
  message: string;
  /** Additional error details */
  details: Record<string, any>;
  /** Error timestamp */
  timestamp: Date;
  /** Request identifier for error tracking */
  requestId: string;
  /** Stack trace (only in development) */
  stackTrace: string | null;
}

/**
 * Interface for API request configuration with security features
 */
export interface ApiRequestConfig {
  /** Custom request headers */
  headers: Record<string, string>;
  /** URL parameters */
  params?: Record<string, any>;
  /** Request timeout in milliseconds */
  timeout: number;
  /** Retry configuration */
  retryConfig?: RetryConfig;
  /** CSRF token for request validation */
  csrfToken: string;
  /** Request identifier for tracing */
  requestId: string;
  /** Cancellation token for request abortion */
  cancelToken?: CancelToken;
}

/**
 * Interface for retry configuration with enhanced control
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Exponential backoff factor */
  backoffFactor: number;
  /** HTTP status codes to retry on */
  retryableStatusCodes: number[];
  /** Timeout for each retry attempt */
  timeout: number;
  /** Custom retry condition function */
  retryCondition: (error: ApiError) => boolean;
}

/**
 * Interface for rate limiting information
 */
export interface RateLimitInfo {
  /** Rate limit ceiling */
  limit: number;
  /** Remaining requests in window */
  remaining: number;
  /** Rate limit reset time */
  reset: Date;
  /** Retry after duration in seconds */
  retryAfter: number | null;
}

/**
 * Enhanced interface for paginated responses
 */
export interface PaginatedResponse<T> {
  /** Page data */
  data: T[];
  /** Total number of items */
  total: number;
  /** Current page number */
  page: number;
  /** Items per page */
  pageSize: number;
  /** Total number of pages */
  totalPages: number;
  /** Next page availability */
  hasNextPage: boolean;
  /** Previous page availability */
  hasPreviousPage: boolean;
  /** Sorting configuration */
  sorting: SortConfig;
  /** Filter configuration */
  filters: FilterConfig;
}

/**
 * Interface for sorting configuration
 */
export interface SortConfig {
  /** Field to sort by */
  field: string;
  /** Sort direction */
  direction: SortDirection;
  /** Null value handling */
  nullsPosition: NullsPosition;
}

/**
 * Interface for filtering configuration
 */
export interface FilterConfig {
  /** Field to filter on */
  field: string;
  /** Filter operator */
  operator: FilterOperator;
  /** Filter value */
  value: any;
  /** Filter logic for multiple conditions */
  logic: FilterLogic;
}

/**
 * Type for sort directions
 */
export type SortDirection = 'ASC' | 'DESC';

/**
 * Type for filter operators
 */
export type FilterOperator = 
  | 'eq' 
  | 'neq' 
  | 'gt' 
  | 'gte' 
  | 'lt' 
  | 'lte' 
  | 'contains' 
  | 'startsWith' 
  | 'endsWith';

/**
 * Type for filter logic
 */
export type FilterLogic = 'AND' | 'OR';

/**
 * Type for null value handling in sorting
 */
export type NullsPosition = 'FIRST' | 'LAST';

/**
 * Type for request cancellation token
 */
export interface CancelToken {
  /** Cancel request function */
  cancel: () => void;
  /** Promise that resolves when cancelled */
  promise: Promise<void>;
}

/**
 * Type guard for checking API response success
 */
export function isSuccessResponse<T>(response: ApiResponse<T>): response is ApiResponse<T> & { data: T } {
  return response.success === true && response.data !== null;
}

/**
 * Type guard for checking API response error
 */
export function isErrorResponse<T>(response: ApiResponse<T>): response is ApiResponse<T> & { error: ApiError } {
  return response.success === false && response.error !== null;
}