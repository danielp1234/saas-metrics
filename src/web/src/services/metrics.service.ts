import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { catchError, retry, debounceTime, map, tap } from 'rxjs/operators';

// Internal imports
import { ApiService } from './api.service';
import { Metric, MetricValue, MetricFilter } from '../interfaces/metrics.interface';
import { transformMetricData } from '../utils/metrics.utils';
import { API, CACHE_TTL, ERROR_MESSAGES } from '../config/constants';
import METRICS_CONFIG from '../config/metrics.config';

/**
 * Service class for handling SaaS metrics data retrieval, processing, and management
 * Implements comprehensive error handling, caching, and reactive data streams
 * @version 1.0.0
 */
@Injectable({
  providedIn: 'root'
})
export class MetricsService {
  // BehaviorSubject for caching and streaming metrics data
  private readonly metricsSubject = new BehaviorSubject<MetricValue[]>([]);
  
  // Cache management
  private cacheTimestamp: number | null = null;
  private readonly CACHE_TTL_MS = CACHE_TTL * 1000; // Convert to milliseconds
  private readonly MAX_RETRIES = 3;
  
  // Active request tracking for cancellation
  private activeRequests: Map<string, AbortController> = new Map();

  constructor(private readonly apiService: ApiService) {
    // Initialize cache invalidation timer
    this.setupCacheInvalidation();
  }

  /**
   * Retrieves all available metrics with caching and error handling
   * @returns Observable<Metric[]> Stream of metrics data
   */
  public getMetrics(): Observable<Metric[]> {
    // Check cache validity
    if (this.isCacheValid()) {
      return of(this.metricsSubject.value as unknown as Metric[]);
    }

    const controller = new AbortController();
    this.activeRequests.set('metrics', controller);

    return this.apiService.get<Metric[]>(API.ENDPOINTS.METRICS, {}, {
      signal: controller.signal
    }).pipe(
      retry(this.MAX_RETRIES),
      map(response => {
        if (!response.success) {
          throw new Error(response.error?.message || ERROR_MESSAGES.LOADING_FAILED);
        }
        return response.data;
      }),
      tap(metrics => {
        this.updateCache(metrics);
      }),
      catchError(error => {
        console.error('Error fetching metrics:', error);
        return throwError(() => new Error(ERROR_MESSAGES.LOADING_FAILED));
      }),
      tap(() => {
        this.activeRequests.delete('metrics');
      })
    );
  }

  /**
   * Retrieves filtered metrics based on provided criteria
   * @param filters MetricFilter object containing filter criteria
   * @returns Observable<MetricValue[]> Stream of filtered metric values
   */
  public getFilteredMetrics(filters: MetricFilter): Observable<MetricValue[]> {
    // Validate filter parameters
    if (!this.validateFilters(filters)) {
      return throwError(() => new Error(ERROR_MESSAGES.INVALID_FILTER));
    }

    const controller = new AbortController();
    const requestId = this.generateRequestId(filters);
    this.activeRequests.set(requestId, controller);

    return this.apiService.get<MetricValue[]>(
      API.ENDPOINTS.BENCHMARKS,
      this.buildFilterParams(filters),
      { signal: controller.signal }
    ).pipe(
      debounceTime(300), // Debounce rapid filter changes
      retry(this.MAX_RETRIES),
      map(response => {
        if (!response.success) {
          throw new Error(response.error?.message || ERROR_MESSAGES.LOADING_FAILED);
        }
        return this.processMetricValues(response.data);
      }),
      tap(metrics => {
        this.metricsSubject.next(metrics);
      }),
      catchError(error => {
        console.error('Error fetching filtered metrics:', error);
        return throwError(() => new Error(ERROR_MESSAGES.LOADING_FAILED));
      }),
      tap(() => {
        this.activeRequests.delete(requestId);
      })
    );
  }

  /**
   * Manually invalidates the metrics cache
   */
  public invalidateCache(): void {
    this.cacheTimestamp = null;
    this.metricsSubject.next([]);
  }

  /**
   * Retrieves current metrics data stream
   * @returns Observable<MetricValue[]> Current metrics data stream
   */
  public getMetricsStream(): Observable<MetricValue[]> {
    return this.metricsSubject.asObservable();
  }

  /**
   * Cancels all active metric requests
   */
  public cancelRequests(): void {
    this.activeRequests.forEach((controller, requestId) => {
      controller.abort();
      this.activeRequests.delete(requestId);
    });
  }

  /**
   * Validates provided filter parameters
   * @param filters MetricFilter object to validate
   * @returns boolean indicating filter validity
   */
  private validateFilters(filters: MetricFilter): boolean {
    if (!filters) return false;

    // Validate ARR range if provided
    if (filters.arrRange && !this.isValidArrRange(filters.arrRange)) {
      return false;
    }

    // Validate date range if provided
    if (filters.dateRange) {
      const { start, end } = filters.dateRange;
      if (!start || !end || start > end) {
        return false;
      }
    }

    return true;
  }

  /**
   * Processes raw metric values with transformation and validation
   * @param values Raw metric values from API
   * @returns Processed MetricValue array
   */
  private processMetricValues(values: MetricValue[]): MetricValue[] {
    return values.map(value => {
      const metricConfig = METRICS_CONFIG[value.metricId];
      if (!metricConfig) {
        console.warn(`Unknown metric ID: ${value.metricId}`);
        return value;
      }

      const transformed = transformMetricData(value, metricConfig);
      if (!transformed.success) {
        console.error(`Error transforming metric data: ${transformed.error}`);
        return value;
      }

      return {
        ...value,
        chartData: transformed.value
      };
    });
  }

  /**
   * Builds API query parameters from filter object
   * @param filters MetricFilter object
   * @returns Record<string, any> Query parameters
   */
  private buildFilterParams(filters: MetricFilter): Record<string, any> {
    const params: Record<string, any> = {};

    if (filters.arrRange) {
      params.arrRange = filters.arrRange;
    }
    if (filters.category) {
      params.category = filters.category;
    }
    if (filters.dateRange) {
      params.startDate = filters.dateRange.start.toISOString();
      params.endDate = filters.dateRange.end.toISOString();
    }
    if (filters.source) {
      params.source = filters.source;
    }

    return params;
  }

  /**
   * Checks if current cache is valid
   * @returns boolean indicating cache validity
   */
  private isCacheValid(): boolean {
    if (!this.cacheTimestamp) return false;
    return Date.now() - this.cacheTimestamp < this.CACHE_TTL_MS;
  }

  /**
   * Updates cache with new metrics data
   * @param metrics Metrics data to cache
   */
  private updateCache(metrics: Metric[]): void {
    this.cacheTimestamp = Date.now();
    this.metricsSubject.next(metrics as unknown as MetricValue[]);
  }

  /**
   * Sets up automatic cache invalidation
   */
  private setupCacheInvalidation(): void {
    setInterval(() => {
      if (this.cacheTimestamp && !this.isCacheValid()) {
        this.invalidateCache();
      }
    }, this.CACHE_TTL_MS);
  }

  /**
   * Generates unique request ID for filter combinations
   * @param filters MetricFilter object
   * @returns string Unique request identifier
   */
  private generateRequestId(filters: MetricFilter): string {
    return `metrics_${JSON.stringify(filters)}`;
  }

  /**
   * Validates ARR range format
   * @param range ARR range string
   * @returns boolean indicating range validity
   */
  private isValidArrRange(range: string): boolean {
    return /^\$\d+M-\$\d+M$|^\$\d+M\+$|^All$/.test(range);
  }
}