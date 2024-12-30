import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'; // v1.4.x
import axiosRetry from 'axios-retry'; // v3.5.x
import { API_CONFIG } from '../config/api.config';
import { 
  ApiResponse, 
  ApiError, 
  RateLimitInfo, 
  RetryConfig,
  isErrorResponse 
} from '../interfaces/api.interface';

/**
 * Enhanced API Service class for handling all HTTP communications
 * Implements comprehensive security measures, rate limiting, and error handling
 */
export class ApiService {
  private axiosInstance: AxiosInstance;
  private readonly baseURL: string;
  private readonly requestControllers: Map<string, AbortController>;
  private readonly rateLimitTracker: Map<string, RateLimitInfo>;

  constructor() {
    this.baseURL = API_CONFIG.baseURL;
    this.requestControllers = new Map();
    this.rateLimitTracker = new Map();

    // Initialize axios instance with enhanced configuration
    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      timeout: API_CONFIG.timeout,
      headers: {
        ...API_CONFIG.headers,
        'X-Request-ID': crypto.randomUUID()
      }
    });

    // Configure retry mechanism with exponential backoff
    axiosRetry(this.axiosInstance, {
      retries: 3,
      retryDelay: axiosRetry.exponentialDelay,
      retryCondition: (error) => {
        return axiosRetry.isNetworkOrIdempotentRequestError(error) || 
               error.response?.status === 429;
      }
    });

    this.setupInterceptors();
  }

  /**
   * Configure request and response interceptors for enhanced security and monitoring
   */
  private setupInterceptors(): void {
    // Request interceptor for authentication and security headers
    this.axiosInstance.interceptors.request.use(
      (config) => {
        // Add security headers
        config.headers = {
          ...config.headers,
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'X-XSS-Protection': '1; mode=block'
        };

        // Add CSRF token if available
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        if (csrfToken) {
          config.headers['X-CSRF-Token'] = csrfToken;
        }

        return config;
      },
      (error) => Promise.reject(this.handleError(error))
    );

    // Response interceptor for error handling and rate limit tracking
    this.axiosInstance.interceptors.response.use(
      (response) => {
        this.updateRateLimitInfo(response);
        return this.transformResponse(response);
      },
      (error) => Promise.reject(this.handleError(error))
    );
  }

  /**
   * Perform GET request with enhanced error handling and rate limiting
   */
  public async get<T>(
    endpoint: string, 
    params?: Record<string, any>, 
    options: AxiosRequestConfig = {}
  ): Promise<ApiResponse<T>> {
    try {
      // Check rate limits before making request
      const rateLimitInfo = this.rateLimitTracker.get(endpoint);
      if (rateLimitInfo?.remaining === 0) {
        throw new Error(`Rate limit exceeded. Retry after ${rateLimitInfo.retryAfter} seconds`);
      }

      // Create abort controller for request cancellation
      const controller = new AbortController();
      this.requestControllers.set(endpoint, controller);

      const response = await this.axiosInstance.get<T>(endpoint, {
        params,
        signal: controller.signal,
        ...options
      });

      return this.transformResponse(response);
    } catch (error) {
      throw this.handleError(error);
    } finally {
      this.requestControllers.delete(endpoint);
    }
  }

  /**
   * Perform POST request with enhanced security and validation
   */
  public async post<T>(
    endpoint: string, 
    data: any, 
    options: AxiosRequestConfig = {}
  ): Promise<ApiResponse<T>> {
    try {
      const controller = new AbortController();
      this.requestControllers.set(endpoint, controller);

      const response = await this.axiosInstance.post<T>(endpoint, data, {
        signal: controller.signal,
        ...options
      });

      return this.transformResponse(response);
    } catch (error) {
      throw this.handleError(error);
    } finally {
      this.requestControllers.delete(endpoint);
    }
  }

  /**
   * Perform PUT request with data validation
   */
  public async put<T>(
    endpoint: string, 
    data: any, 
    options: AxiosRequestConfig = {}
  ): Promise<ApiResponse<T>> {
    try {
      const controller = new AbortController();
      this.requestControllers.set(endpoint, controller);

      const response = await this.axiosInstance.put<T>(endpoint, data, {
        signal: controller.signal,
        ...options
      });

      return this.transformResponse(response);
    } catch (error) {
      throw this.handleError(error);
    } finally {
      this.requestControllers.delete(endpoint);
    }
  }

  /**
   * Perform DELETE request with confirmation
   */
  public async delete<T>(
    endpoint: string, 
    options: AxiosRequestConfig = {}
  ): Promise<ApiResponse<T>> {
    try {
      const controller = new AbortController();
      this.requestControllers.set(endpoint, controller);

      const response = await this.axiosInstance.delete<T>(endpoint, {
        signal: controller.signal,
        ...options
      });

      return this.transformResponse(response);
    } catch (error) {
      throw this.handleError(error);
    } finally {
      this.requestControllers.delete(endpoint);
    }
  }

  /**
   * Transform API response to standardized format
   */
  private transformResponse<T>(response: AxiosResponse): ApiResponse<T> {
    return {
      success: response.status >= 200 && response.status < 300,
      data: response.data,
      error: null,
      message: response.statusText,
      timestamp: new Date(),
      rateLimit: this.extractRateLimitInfo(response),
      requestId: response.headers['x-request-id']
    };
  }

  /**
   * Handle and standardize API errors
   */
  private handleError(error: any): ApiError {
    const apiError: ApiError = {
      code: error.response?.status || 500,
      message: error.response?.data?.message || error.message,
      details: error.response?.data?.details || {},
      timestamp: new Date(),
      requestId: error.response?.headers?.['x-request-id'] || 'unknown',
      stackTrace: process.env.NODE_ENV === 'development' ? error.stack : null
    };

    // Log error for monitoring
    console.error(`API Error [${apiError.requestId}]:`, apiError);

    return apiError;
  }

  /**
   * Extract rate limit information from response headers
   */
  private extractRateLimitInfo(response: AxiosResponse): RateLimitInfo {
    return {
      limit: parseInt(response.headers['x-ratelimit-limit'] || '100'),
      remaining: parseInt(response.headers['x-ratelimit-remaining'] || '0'),
      reset: new Date(response.headers['x-ratelimit-reset'] || Date.now()),
      retryAfter: parseInt(response.headers['retry-after'] || '0')
    };
  }

  /**
   * Update rate limit tracking information
   */
  private updateRateLimitInfo(response: AxiosResponse): void {
    const rateLimitInfo = this.extractRateLimitInfo(response);
    const endpoint = response.config.url || '';
    this.rateLimitTracker.set(endpoint, rateLimitInfo);
  }

  /**
   * Get current rate limit information for an endpoint
   */
  public getRateLimitInfo(endpoint: string): RateLimitInfo | undefined {
    return this.rateLimitTracker.get(endpoint);
  }

  /**
   * Cancel an ongoing request
   */
  public cancelRequest(endpoint: string): void {
    const controller = this.requestControllers.get(endpoint);
    if (controller) {
      controller.abort();
      this.requestControllers.delete(endpoint);
    }
  }
}

// Export singleton instance
export const apiService = new ApiService();