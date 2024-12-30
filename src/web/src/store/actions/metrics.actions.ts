// @reduxjs/toolkit v1.9.x - Redux action creators and thunks
import { createAsyncThunk, createAction } from '@reduxjs/toolkit';

// Internal imports
import { MetricsService } from '../../services/metrics.service';
import { Metric, MetricFilter, MetricValue } from '../../interfaces/metrics.interface';
import { ERROR_MESSAGES, CACHE_TTL } from '../../config/constants';

// Initialize metrics service
const metricsService = new MetricsService();

/**
 * Action types for metrics operations
 */
export const METRICS_ACTIONS = {
  FETCH_METRICS: 'metrics/fetchMetrics',
  FETCH_METRIC_BY_ID: 'metrics/fetchMetricById',
  FETCH_FILTERED_METRICS: 'metrics/fetchFilteredMetrics',
  SET_SELECTED_METRIC: 'metrics/setSelectedMetric',
  SET_METRIC_FILTERS: 'metrics/setMetricFilters',
  CLEAR_METRICS_ERROR: 'metrics/clearError',
  INVALIDATE_CACHE: 'metrics/invalidateCache'
} as const;

/**
 * Interface for metrics thunk error type
 */
interface MetricsError {
  message: string;
  code?: number;
  details?: Record<string, unknown>;
}

/**
 * Cache management for request deduplication
 */
const requestCache = new Map<string, {
  timestamp: number;
  promise: Promise<any>;
}>();

/**
 * Async thunk for fetching all metrics with caching and error handling
 */
export const fetchMetrics = createAsyncThunk<
  Metric[],
  void,
  { rejectValue: MetricsError }
>(
  METRICS_ACTIONS.FETCH_METRICS,
  async (_, { rejectWithValue }) => {
    try {
      const cacheKey = 'all_metrics';
      const cached = requestCache.get(cacheKey);

      // Check cache validity
      if (cached && Date.now() - cached.timestamp < CACHE_TTL * 1000) {
        return cached.promise;
      }

      // Create new request promise
      const promise = metricsService.getMetrics().toPromise();
      requestCache.set(cacheKey, {
        timestamp: Date.now(),
        promise
      });

      const metrics = await promise;
      return metrics;
    } catch (error) {
      console.error('Error fetching metrics:', error);
      return rejectWithValue({
        message: ERROR_MESSAGES.LOADING_FAILED,
        code: error.code,
        details: error.details
      });
    }
  }
);

/**
 * Async thunk for fetching a specific metric by ID
 */
export const fetchMetricById = createAsyncThunk<
  Metric,
  string,
  { rejectValue: MetricsError }
>(
  METRICS_ACTIONS.FETCH_METRIC_BY_ID,
  async (metricId, { rejectWithValue }) => {
    try {
      const cacheKey = `metric_${metricId}`;
      const cached = requestCache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < CACHE_TTL * 1000) {
        return cached.promise;
      }

      const promise = metricsService.getMetricById(metricId).toPromise();
      requestCache.set(cacheKey, {
        timestamp: Date.now(),
        promise
      });

      const metric = await promise;
      return metric;
    } catch (error) {
      console.error(`Error fetching metric ${metricId}:`, error);
      return rejectWithValue({
        message: ERROR_MESSAGES.LOADING_FAILED,
        code: error.code,
        details: error.details
      });
    }
  }
);

/**
 * Async thunk for fetching filtered metrics with validation
 */
export const fetchFilteredMetrics = createAsyncThunk<
  MetricValue[],
  MetricFilter,
  { rejectValue: MetricsError }
>(
  METRICS_ACTIONS.FETCH_FILTERED_METRICS,
  async (filters, { rejectWithValue }) => {
    try {
      // Validate filter parameters
      if (!filters || !isValidFilter(filters)) {
        return rejectWithValue({
          message: ERROR_MESSAGES.INVALID_FILTER,
          code: 400
        });
      }

      const cacheKey = `filtered_metrics_${JSON.stringify(filters)}`;
      const cached = requestCache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < CACHE_TTL * 1000) {
        return cached.promise;
      }

      const promise = metricsService.getFilteredMetrics(filters).toPromise();
      requestCache.set(cacheKey, {
        timestamp: Date.now(),
        promise
      });

      const metrics = await promise;
      return metrics;
    } catch (error) {
      console.error('Error fetching filtered metrics:', error);
      return rejectWithValue({
        message: ERROR_MESSAGES.LOADING_FAILED,
        code: error.code,
        details: error.details
      });
    }
  }
);

/**
 * Action creator for setting the selected metric
 */
export const setSelectedMetric = createAction<string | null>(
  METRICS_ACTIONS.SET_SELECTED_METRIC
);

/**
 * Action creator for setting metric filters
 */
export const setMetricFilters = createAction<MetricFilter>(
  METRICS_ACTIONS.SET_METRIC_FILTERS
);

/**
 * Action creator for clearing metrics error state
 */
export const clearMetricsError = createAction(
  METRICS_ACTIONS.CLEAR_METRICS_ERROR
);

/**
 * Action creator for manually invalidating metrics cache
 */
export const invalidateCache = createAction(
  METRICS_ACTIONS.INVALIDATE_CACHE,
  () => {
    requestCache.clear();
    return { payload: undefined };
  }
);

/**
 * Helper function to validate metric filters
 */
function isValidFilter(filters: MetricFilter): boolean {
  if (!filters) return false;

  // Validate ARR range if provided
  if (filters.arrRange && !isValidArrRange(filters.arrRange)) {
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
 * Helper function to validate ARR range format
 */
function isValidArrRange(range: string): boolean {
  return /^\$\d+M-\$\d+M$|^\$\d+M\+$|^All$/.test(range);
}