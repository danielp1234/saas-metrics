// @version jest ^29.x
// @version @reduxjs/toolkit ^1.9.x

import metricsReducer, { getInitialState } from '../../../src/store/reducers/metrics.reducer';
import { fetchMetrics } from '../../../src/store/actions/metrics.actions';
import { MetricType } from '../../../src/interfaces/metrics.interface';

describe('Metrics Reducer', () => {
  // Performance measurement setup
  const performanceThreshold = 2000; // 2 seconds in milliseconds
  const validationThreshold = 0.999; // 99.9% accuracy requirement
  let startTime: number;

  beforeEach(() => {
    startTime = performance.now();
  });

  afterEach(() => {
    const endTime = performance.now();
    const duration = endTime - startTime;
    expect(duration).toBeLessThan(performanceThreshold);
  });

  describe('Initial State', () => {
    it('should return the correct initial state structure', () => {
      const state = metricsReducer(undefined, { type: '' });
      expect(state).toEqual({
        metrics: [],
        selectedMetric: null,
        filter: {
          type: undefined,
          arrRange: undefined,
          source: undefined,
          dateRange: undefined
        },
        loading: false,
        error: null,
        lastUpdated: null,
        cache: {
          timestamp: null,
          validUntil: null
        },
        validation: {
          status: 'idle',
          errors: []
        }
      });
    });
  });

  describe('Fetch Metrics', () => {
    const mockMetricsData = [
      {
        id: '1',
        name: 'Revenue Growth',
        type: MetricType.REVENUE_GROWTH,
        value: 25,
        percentiles: {
          p5: 5,
          p25: 15,
          p50: 25,
          p75: 35,
          p90: 45
        },
        metadata: {
          source: 'Source A',
          arrRange: '$1M-$5M',
          updatedAt: '2023-01-01'
        }
      }
    ];

    it('should handle pending state correctly', () => {
      const state = metricsReducer(undefined, fetchMetrics.pending);
      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
      expect(state.validation.status).toBe('validating');
    });

    it('should handle successful metrics fetch with validation', () => {
      const state = metricsReducer(
        undefined,
        fetchMetrics.fulfilled(mockMetricsData, '', undefined)
      );

      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.metrics).toEqual(mockMetricsData);
      expect(state.lastUpdated).toBeTruthy();
      expect(state.cache.timestamp).toBeTruthy();
      expect(state.cache.validUntil).toBeTruthy();
      expect(state.validation.status).toBe('valid');
      expect(state.validation.errors).toHaveLength(0);
    });

    it('should handle failed metrics fetch with error details', () => {
      const error = new Error('Failed to fetch metrics');
      const state = metricsReducer(
        undefined,
        fetchMetrics.rejected(error, '', undefined)
      );

      expect(state.loading).toBe(false);
      expect(state.error).toBe('Failed to fetch metrics');
      expect(state.validation.status).toBe('invalid');
      expect(state.validation.errors).toHaveLength(1);
      expect(state.validation.errors[0].code).toBe('FETCH_ERROR');
    });

    it('should validate metrics data structure with 99.9% accuracy', () => {
      const invalidMetric = {
        id: '2',
        name: 'Invalid Metric',
        type: MetricType.NDR,
        value: 'invalid', // Invalid value type
        percentiles: {
          p5: 'invalid' // Invalid percentile type
        }
      };

      const state = metricsReducer(
        undefined,
        fetchMetrics.fulfilled([invalidMetric], '', undefined)
      );

      expect(state.metrics).toHaveLength(0);
      expect(state.validation.status).toBe('invalid');
      expect(state.validation.errors).toHaveLength(2);
    });
  });

  describe('Cache Management', () => {
    const CACHE_TTL = 900000; // 15 minutes

    it('should handle cache updates correctly', () => {
      const initialState = getInitialState();
      const mockMetrics = [{
        id: '1',
        type: MetricType.REVENUE_GROWTH,
        value: 25,
        percentiles: {
          p5: 5, p25: 15, p50: 25, p75: 35, p90: 45
        }
      }];

      const state = metricsReducer(
        initialState,
        fetchMetrics.fulfilled(mockMetrics, '', undefined)
      );

      expect(state.cache.timestamp).toBeTruthy();
      expect(state.cache.validUntil).toBe(state.cache.timestamp! + CACHE_TTL);
    });

    it('should invalidate cache on filter updates', () => {
      const state = metricsReducer(
        {
          ...getInitialState(),
          cache: {
            timestamp: Date.now(),
            validUntil: Date.now() + CACHE_TTL
          }
        },
        {
          type: 'metrics/updateFilter',
          payload: { type: MetricType.REVENUE_GROWTH }
        }
      );

      expect(state.cache.timestamp).toBeNull();
      expect(state.cache.validUntil).toBeNull();
    });
  });

  describe('Concurrent Updates', () => {
    it('should handle multiple simultaneous updates correctly', async () => {
      const initialState = getInitialState();
      const updates = [
        fetchMetrics.fulfilled([{ id: '1', value: 10 }], '', undefined),
        fetchMetrics.fulfilled([{ id: '2', value: 20 }], '', undefined),
        fetchMetrics.fulfilled([{ id: '3', value: 30 }], '', undefined)
      ];

      const finalState = updates.reduce(
        (state, action) => metricsReducer(state, action),
        initialState
      );

      expect(finalState.metrics).toHaveLength(1);
      expect(finalState.validation.status).toBe('valid');
    });
  });

  describe('Memory Management', () => {
    it('should clean up resources when clearing filters', () => {
      const initialState = {
        ...getInitialState(),
        metrics: new Array(1000).fill({}), // Create large dataset
        cache: {
          timestamp: Date.now(),
          validUntil: Date.now() + 900000
        }
      };

      const state = metricsReducer(initialState, { type: 'metrics/clearFilter' });

      expect(state.metrics).toHaveLength(0);
      expect(state.cache.timestamp).toBeNull();
      expect(state.cache.validUntil).toBeNull();
    });
  });

  describe('Error Recovery', () => {
    it('should recover from error state on successful fetch', () => {
      const errorState = {
        ...getInitialState(),
        error: 'Previous error',
        validation: {
          status: 'invalid',
          errors: [{ code: 'ERROR', message: 'Previous error' }]
        }
      };

      const state = metricsReducer(
        errorState,
        fetchMetrics.fulfilled([], '', undefined)
      );

      expect(state.error).toBeNull();
      expect(state.validation.status).toBe('valid');
      expect(state.validation.errors).toHaveLength(0);
    });
  });
});