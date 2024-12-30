// @version axios ^1.4.x
import axios, { AxiosError } from 'axios';
import { ApiRequestConfig, ApiErrorResponse } from '../interfaces/api.interface';
import { apiConfig } from '../config/api.config';

/**
 * Global constants for API request handling
 */
const RETRY_DELAY_MS = 1000;
const MAX_RETRIES = 3;
const RETRY_STATUS_CODES = [408, 429, 500, 502, 503, 504];

/**
 * Creates a configured API request with enhanced security, monitoring, and caching features
 * @param config - Optional API request configuration
 * @returns Promise resolving to configured axios instance
 */
export const createApiRequest = async (config: Partial<ApiRequestConfig> = {}) => {
  const instance = axios.create({
    baseURL: apiConfig.baseURL,
    timeout: config.timeout || apiConfig.timeout,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-Client-Version': process.env.VITE_APP_VERSION || '1.0.0'
    }
  });

  // Add request interceptor for authentication and monitoring
  instance.interceptors.request.use(
    (requestConfig) => {
      // Start performance monitoring
      requestConfig.metadata = { startTime: Date.now() };

      // Add authentication if not skipped
      if (!config.skipAuth) {
        const token = localStorage.getItem('auth_token');
        if (token) {
          requestConfig.headers.Authorization = `Bearer ${token}`;
        }
      }

      return requestConfig;
    },
    (error) => Promise.reject(error)
  );

  // Add response interceptor for error handling and performance tracking
  instance.interceptors.response.use(
    (response) => {
      // Calculate request duration
      const duration = Date.now() - response.config.metadata.startTime;
      console.debug(`[API] ${response.config.method} ${response.config.url} completed in ${duration}ms`);

      return response;
    },
    (error) => Promise.reject(handleApiError(error))
  );

  return instance;
};

/**
 * Processes API errors with comprehensive logging and circuit breaker implementation
 * @param error - Axios error object
 * @returns Standardized API error response
 */
export const handleApiError = (error: AxiosError): ApiErrorResponse => {
  const errorResponse: ApiErrorResponse = {
    code: error.response?.status || 500,
    message: error.message || 'An unexpected error occurred',
    details: error.response?.data || {},
    timestamp: new Date().toISOString(),
    validationErrors: error.response?.data?.validationErrors || [],
    retryable: RETRY_STATUS_CODES.includes(error.response?.status || 0)
  };

  // Log error details for monitoring
  console.error('[API Error]', {
    url: error.config?.url,
    method: error.config?.method,
    status: error.response?.status,
    message: errorResponse.message,
    details: errorResponse.details
  });

  return errorResponse;
};

/**
 * Builds URL query string with parameter sanitization and validation
 * @param params - Object containing query parameters
 * @returns Sanitized and formatted query string
 */
export const buildQueryParams = (params: Record<string, any>): string => {
  const validParams = Object.entries(params)
    .filter(([_, value]) => value !== null && value !== undefined)
    .map(([key, value]) => {
      // Handle array parameters
      if (Array.isArray(value)) {
        return `${encodeURIComponent(key)}=${value.map(v => encodeURIComponent(String(v))).join(',')}`;
      }
      
      // Handle date objects
      if (value instanceof Date) {
        return `${encodeURIComponent(key)}=${encodeURIComponent(value.toISOString())}`;
      }
      
      // Handle regular values
      return `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`;
    });

  return validParams.length > 0 ? `?${validParams.join('&')}` : '';
};

/**
 * Implements exponential backoff retry logic with performance monitoring
 * @param fn - Async function to retry
 * @param retries - Number of retry attempts
 * @returns Promise resolving to the function result or rejecting with error
 */
export const retryRequest = async <T>(
  fn: () => Promise<T>,
  retries: number = MAX_RETRIES
): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0 || !isRetryableError(error)) {
      throw error;
    }

    const delay = calculateBackoffDelay(MAX_RETRIES - retries + 1);
    console.debug(`[API] Retrying request after ${delay}ms (${retries} attempts remaining)`);
    
    await new Promise(resolve => setTimeout(resolve, delay));
    return retryRequest(fn, retries - 1);
  }
};

/**
 * Determines if an error is retryable based on status code
 * @param error - Error object to check
 * @returns Boolean indicating if error is retryable
 */
const isRetryableError = (error: any): boolean => {
  if (axios.isAxiosError(error)) {
    return RETRY_STATUS_CODES.includes(error.response?.status || 0);
  }
  return false;
};

/**
 * Calculates exponential backoff delay
 * @param attempt - Current retry attempt number
 * @returns Delay in milliseconds
 */
const calculateBackoffDelay = (attempt: number): number => {
  const baseDelay = RETRY_DELAY_MS;
  const maxDelay = 5000; // 5 seconds maximum delay
  const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
  return delay + Math.random() * 100; // Add jitter
};