// @reduxjs/toolkit v1.9.x - Redux state management
import { createReducer, PayloadAction } from '@reduxjs/toolkit';
// Internal imports
import { Metric, MetricValue, MetricFilters } from '../../interfaces/metrics.interface';
import { validateMetricData } from '../../utils/metrics.utils';
import { ERROR_MESSAGES, CACHE_TTL } from '../../config/constants';

/**
 * Interface for validation result tracking
 */
interface ValidationResult {
  isValid: boolean;
  errors: string[];
  lastValidated: number;
}

/**
 * Interface for detailed error state
 */
interface ErrorState {
  message: string;
  code: string;
  timestamp: number;
  context: Record<string, unknown>;
}

/**
 * Interface defining the metrics state structure
 */
interface MetricsState {
  metrics: Metric[];
  selectedMetric: Metric | null;
  filters: MetricFilters;
  loading: boolean;
  error: ErrorState | null;
  validationState: Record<string, ValidationResult>;
  lastUpdated: number | null;
  dataFreshness: Record<string, number>;
  filterPerformance: Record<string, number>;
}

/**
 * Initial state with default values
 */
const initialState: MetricsState = {
  metrics: [],
  selectedMetric: null,
  filters: {
    category: undefined,
    arrRange: undefined,
    source: undefined
  },
  loading: false,
  error: null,
  validationState: {},
  lastUpdated: null,
  dataFreshness: {},
  filterPerformance: {}
};

/**
 * Enhanced Redux reducer for metrics state management
 */
const metricsReducer = createReducer(initialState, (builder) => {
  builder
    // Handle metrics fetch request
    .addCase('metrics/fetchMetrics/pending', (state) => {
      state.loading = true;
      state.error = null;
    })

    // Handle successful metrics fetch
    .addCase('metrics/fetchMetrics/fulfilled', (state, action: PayloadAction<Metric[]>) => {
      const timestamp = Date.now();
      const metrics = action.payload;

      // Validate each metric and update validation state
      metrics.forEach(metric => {
        const validationResult = validateMetricData(metric);
        state.validationState[metric.id] = {
          isValid: validationResult.isValid,
          errors: validationResult.errors || [],
          lastValidated: timestamp
        };
        state.dataFreshness[metric.id] = timestamp;
      });

      state.metrics = metrics.filter(metric => 
        state.validationState[metric.id]?.isValid
      );
      state.loading = false;
      state.lastUpdated = timestamp;
    })

    // Handle metrics fetch error
    .addCase('metrics/fetchMetrics/rejected', (state, action) => {
      state.loading = false;
      state.error = {
        message: action.error.message || ERROR_MESSAGES.LOADING_FAILED,
        code: action.error.code || 'FETCH_ERROR',
        timestamp: Date.now(),
        context: {
          ...action.error,
          filters: state.filters
        }
      };
    })

    // Handle metric selection
    .addCase('metrics/setSelectedMetric', (state, action: PayloadAction<Metric | null>) => {
      state.selectedMetric = action.payload;
      if (action.payload) {
        // Check data freshness
        const lastUpdate = state.dataFreshness[action.payload.id];
        if (lastUpdate && Date.now() - lastUpdate > CACHE_TTL * 1000) {
          // Mark for refresh if data is stale
          state.dataFreshness[action.payload.id] = 0;
        }
      }
    })

    // Handle filter updates with performance tracking
    .addCase('metrics/setFilters', (state, action: PayloadAction<MetricFilters>) => {
      const startTime = performance.now();
      
      // Validate filter combination
      const newFilters = action.payload;
      const isValidCombination = Object.entries(newFilters)
        .every(([key, value]) => !value || typeof value === 'string');

      if (!isValidCombination) {
        state.error = {
          message: ERROR_MESSAGES.INVALID_FILTER,
          code: 'INVALID_FILTER',
          timestamp: Date.now(),
          context: { filters: newFilters }
        };
        return;
      }

      state.filters = newFilters;
      
      // Record filter operation performance
      const endTime = performance.now();
      state.filterPerformance[`filter_${Date.now()}`] = endTime - startTime;
    })

    // Handle metric value updates
    .addCase('metrics/updateMetricValue', (state, action: PayloadAction<MetricValue>) => {
      const { metricId, value, percentiles } = action.payload;
      const metricIndex = state.metrics.findIndex(m => m.id === metricId);
      
      if (metricIndex !== -1) {
        const timestamp = Date.now();
        // Validate new value
        const validationResult = validateMetricData({ ...state.metrics[metricIndex], value });
        
        state.validationState[metricId] = {
          isValid: validationResult.isValid,
          errors: validationResult.errors || [],
          lastValidated: timestamp
        };

        if (validationResult.isValid) {
          state.dataFreshness[metricId] = timestamp;
        }
      }
    });
});

export default metricsReducer;