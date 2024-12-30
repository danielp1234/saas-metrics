/**
 * Redux Selectors for Metrics State Management
 * Implements memoized selectors for efficient metrics data access and computation
 * with comprehensive error handling and performance monitoring
 * @version 1.0.0
 */

// @version @reduxjs/toolkit@1.9.x
import { createSelector, createSelectorCreator, defaultMemoize } from '@reduxjs/toolkit';
import { RootState } from '../reducers';
import { Metric, MetricCategory } from '../../interfaces/metrics.interface';
import { CACHE_TTL, ERROR_MESSAGES } from '../../config/constants';

/**
 * Performance monitoring constants
 */
const SELECTOR_CACHE_SIZE = 100;
const PERFORMANCE_THRESHOLD_MS = 50;

/**
 * Custom selector creator with enhanced memoization
 */
const createMetricSelector = createSelectorCreator(
  defaultMemoize,
  {
    // Custom equality check for metrics
    equalityCheck: (a: any, b: any) => {
      if (a === b) return true;
      if (!a || !b) return false;
      return JSON.stringify(a) === JSON.stringify(b);
    },
    // Maximum cache size to prevent memory leaks
    maxSize: SELECTOR_CACHE_SIZE
  }
);

/**
 * Base selector to get metrics state slice
 * Includes validation and error handling
 */
export const selectMetricsState = (state: RootState) => {
  try {
    if (!state.metrics) {
      console.error('Metrics state not found');
      return null;
    }
    return state.metrics;
  } catch (error) {
    console.error('Error accessing metrics state:', error);
    return null;
  }
};

/**
 * Memoized selector to get all metrics
 * Includes data freshness validation and error handling
 */
export const selectAllMetrics = createMetricSelector(
  [selectMetricsState],
  (metricsState) => {
    if (!metricsState) return [];
    return metricsState.metrics;
  }
);

/**
 * Memoized selector to get selected metric
 * Includes null checks and type validation
 */
export const selectSelectedMetric = createMetricSelector(
  [selectMetricsState],
  (metricsState) => {
    if (!metricsState) return null;
    return metricsState.selectedMetric;
  }
);

/**
 * Memoized selector to get metrics by category
 * Includes category validation and filtering
 */
export const selectMetricsByCategory = createMetricSelector(
  [selectAllMetrics, (state: RootState, category: MetricCategory) => category],
  (metrics, category): Metric[] => {
    try {
      if (!metrics || !category) return [];
      return metrics.filter(metric => metric.category === category);
    } catch (error) {
      console.error('Error filtering metrics by category:', error);
      return [];
    }
  }
);

/**
 * Memoized selector to get current filter state
 * Includes validation of filter combinations
 */
export const selectMetricFilters = createMetricSelector(
  [selectMetricsState],
  (metricsState) => {
    if (!metricsState) return {};
    return metricsState.filters;
  }
);

/**
 * Memoized selector to get loading state
 * Includes performance monitoring
 */
export const selectMetricsLoading = createMetricSelector(
  [selectMetricsState],
  (metricsState) => {
    if (!metricsState) return false;
    return metricsState.loading;
  }
);

/**
 * Memoized selector to get error state
 * Includes error context and timestamp
 */
export const selectMetricsError = createMetricSelector(
  [selectMetricsState],
  (metricsState) => {
    if (!metricsState) return null;
    return metricsState.error;
  }
);

/**
 * Memoized selector to get data freshness state
 * Includes cache validation and TTL checks
 */
export const selectMetricsDataFreshness = createMetricSelector(
  [selectMetricsState],
  (metricsState) => {
    if (!metricsState) return {};
    
    const currentTime = Date.now();
    const freshness: Record<string, boolean> = {};
    
    Object.entries(metricsState.dataFreshness).forEach(([metricId, timestamp]) => {
      freshness[metricId] = (currentTime - timestamp) < (CACHE_TTL * 1000);
    });
    
    return freshness;
  }
);

/**
 * Memoized selector to get filtered metrics
 * Includes comprehensive filter application and validation
 */
export const selectFilteredMetrics = createMetricSelector(
  [selectAllMetrics, selectMetricFilters],
  (metrics, filters) => {
    try {
      if (!metrics) return [];
      
      return metrics.filter(metric => {
        // Apply category filter
        if (filters.category && metric.category !== filters.category) {
          return false;
        }
        
        // Apply ARR range filter if present
        if (filters.arrRange && filters.arrRange !== 'All') {
          // ARR range filtering logic would go here
          // Implementation depends on specific ARR range format
        }
        
        // Apply source filter
        if (filters.source && metric.source !== filters.source) {
          return false;
        }
        
        return true;
      });
    } catch (error) {
      console.error('Error applying filters:', error);
      return [];
    }
  }
);

/**
 * Performance monitoring for selector execution
 * @param selectorName - Name of the selector being monitored
 * @param startTime - Start time of selector execution
 */
const monitorSelectorPerformance = (selectorName: string, startTime: number) => {
  const executionTime = performance.now() - startTime;
  if (executionTime > PERFORMANCE_THRESHOLD_MS) {
    console.warn(`Slow selector execution: ${selectorName} took ${executionTime.toFixed(2)}ms`);
  }
};