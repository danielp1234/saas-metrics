/**
 * API Configuration for SaaS Metrics Platform
 * Defines comprehensive API settings, endpoints, and security configurations
 * @version 1.0.0
 */

import { ApiRequestConfig } from '../interfaces/api.interface';
import { CACHE_TTL } from './constants';

/**
 * API version constant
 * Used for versioning API endpoints
 */
export const API_VERSION = 'v1';

/**
 * Enhanced API configuration with comprehensive security headers and retry policies
 * Implements security requirements from Technical Specification 7.1
 */
export const API_CONFIG: ApiRequestConfig = {
  baseURL: `/api/${API_VERSION}`,
  timeout: 30000, // 30 second timeout
  retryPolicy: {
    maxRetries: 3,
    backoffFactor: 2,
    retryableStatusCodes: [408, 429, 500, 502, 503, 504],
    timeout: 5000,
    retryCondition: (error) => {
      return error.code >= 500 || error.code === 429;
    }
  },
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    // Security headers as per Technical Specification 7.2
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Content-Security-Policy': "default-src 'self'; frame-ancestors 'none'",
    'X-XSS-Protection': '1; mode=block',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Cache-Control': `public, max-age=${CACHE_TTL}`,
    'X-Request-ID': '${requestId}', // Placeholder for dynamic request ID
    'X-CSRF-Token': '${csrfToken}' // Placeholder for CSRF token
  }
};

/**
 * Comprehensive API endpoint configurations
 * Implements endpoint specifications from Technical Specification 3.3
 */
export const API_ENDPOINTS = {
  metrics: {
    list: '/metrics',
    detail: '/metrics/:id',
    export: '/metrics/export',
    distribution: '/metrics/:id/distribution',
    percentiles: '/metrics/:id/percentiles'
  },
  benchmarks: {
    list: '/benchmarks',
    filter: '/benchmarks/filter',
    compare: '/benchmarks/compare',
    trends: '/benchmarks/trends'
  },
  auth: {
    login: '/auth/login',
    logout: '/auth/logout',
    refresh: '/auth/refresh',
    verify: '/auth/verify'
  },
  admin: {
    import: '/admin/data',
    sources: '/admin/sources',
    settings: '/admin/settings',
    audit: '/admin/audit',
    users: '/admin/users'
  }
} as const;

/**
 * Helper function to construct endpoint URLs with parameters
 * @param endpoint - The endpoint path from API_ENDPOINTS
 * @param params - Parameters to replace in the URL
 * @returns Formatted endpoint URL with replaced parameters
 */
export function getEndpointUrl(endpoint: string, params?: Record<string, string>): string {
  let url = endpoint;
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url = url.replace(`:${key}`, encodeURIComponent(value));
    });
  }
  
  return url;
}

/**
 * Type definitions for API endpoint paths
 * Ensures type safety when using endpoint paths
 */
export type MetricEndpoints = typeof API_ENDPOINTS.metrics;
export type BenchmarkEndpoints = typeof API_ENDPOINTS.benchmarks;
export type AuthEndpoints = typeof API_ENDPOINTS.auth;
export type AdminEndpoints = typeof API_ENDPOINTS.admin;

/**
 * Interface for API error responses
 * Provides consistent error handling across the application
 */
export interface ApiErrorResponse {
  code: number;
  message: string;
  details?: Record<string, unknown>;
  requestId: string;
}

/**
 * Constants for API rate limiting
 * Implements rate limiting specifications from Technical Specification 3.3.3
 */
export const API_RATE_LIMITS = {
  PUBLIC: 100, // requests per minute
  AUTHENTICATED: 1000, // requests per minute
  EXPORT: 10 // requests per minute
} as const;

/**
 * Constants for API response caching
 * Implements caching specifications from Technical Specification 2.4
 */
export const API_CACHE_CONFIG = {
  TTL: CACHE_TTL,
  STALE_WHILE_REVALIDATE: 60, // seconds
  CACHE_CONTROL: {
    PUBLIC: `public, max-age=${CACHE_TTL}`,
    PRIVATE: `private, max-age=${CACHE_TTL}`,
    NO_STORE: 'no-store, no-cache, must-revalidate'
  }
} as const;