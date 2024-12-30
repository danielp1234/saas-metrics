/**
 * @fileoverview Global constants used throughout the SaaS metrics platform.
 * @version 1.0.0
 */

/**
 * Interface defining the structure of metric validation rules
 */
interface ValidationRule {
  /** Minimum allowed value */
  MIN: number;
  /** Maximum allowed value */
  MAX: number;
  /** Unit of measurement */
  UNIT: 'percentage' | 'ratio' | 'currency';
}

/**
 * Cache duration constants in seconds.
 * Default TTL of 15 minutes (900 seconds) for optimal performance balance.
 * @constant
 */
export const CACHE_TTL = {
  /** Cache duration for metric data */
  METRICS: 900,
  /** Cache duration for benchmark data */
  BENCHMARKS: 900
} as const;

/**
 * API rate limiting thresholds and window configurations.
 * Implements tiered rate limiting for different API endpoints.
 * @constant
 */
export const API_RATE_LIMITS = {
  /** Public API endpoint limit (requests per minute) */
  PUBLIC_API: 100,
  /** Admin API endpoint limit (requests per minute) */
  ADMIN_API: 1000,
  /** Export API endpoint limit (requests per minute) */
  EXPORT_API: 10,
  /** Time window for rate limiting in seconds */
  WINDOW_SIZE: 60
} as const;

/**
 * Validation rules and boundaries for each metric type.
 * Based on industry standards and statistical analysis.
 * @constant
 */
export const METRIC_VALIDATION: Record<string, ValidationRule> = {
  /** Revenue Growth Rate validation rules */
  REVENUE_GROWTH: {
    MIN: -100, // Can't decrease more than 100%
    MAX: 1000, // Hypergrowth scenarios allowed up to 1000%
    UNIT: 'percentage'
  },
  /** Net Dollar Retention validation rules */
  NDR: {
    MIN: 0,    // Can't be negative
    MAX: 200,  // Up to 200% retention allowed
    UNIT: 'percentage'
  },
  /** Magic Number validation rules */
  MAGIC_NUMBER: {
    MIN: -10,  // Allows for extreme inefficiency scenarios
    MAX: 10,   // Allows for extreme efficiency scenarios
    UNIT: 'ratio'
  },
  /** EBITDA Margin validation rules */
  EBITDA_MARGIN: {
    MIN: -100, // Allows for heavy loss scenarios
    MAX: 100,  // Can't exceed 100% by definition
    UNIT: 'percentage'
  },
  /** Annual Recurring Revenue per Employee validation rules */
  ARR_PER_EMPLOYEE: {
    MIN: 0,      // Can't be negative
    MAX: 1000000, // Up to $1M ARR per employee
    UNIT: 'currency'
  }
} as const;

/**
 * Standard HTTP status codes used across the application.
 * Follows RFC 7231 standard status codes.
 * @constant
 */
export const HTTP_STATUS = {
  /** Successful response */
  OK: 200,
  /** Invalid request parameters or validation failure */
  BAD_REQUEST: 400,
  /** Missing or invalid authentication */
  UNAUTHORIZED: 401,
  /** Valid authentication but insufficient permissions */
  FORBIDDEN: 403,
  /** Requested resource not found */
  NOT_FOUND: 404,
  /** Rate limit exceeded */
  TOO_MANY_REQUESTS: 429,
  /** Server-side error occurred */
  INTERNAL_SERVER_ERROR: 500
} as const;

/**
 * Type definitions for strict typing when using constants
 */
export type CacheTTLKey = keyof typeof CACHE_TTL;
export type APIRateLimitKey = keyof typeof API_RATE_LIMITS;
export type MetricValidationKey = keyof typeof METRIC_VALIDATION;
export type HTTPStatusKey = keyof typeof HTTP_STATUS;