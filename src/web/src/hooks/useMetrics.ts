// React hooks - v18.2.x
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
// Redux hooks - v8.x.x
import { useDispatch, useSelector } from 'react-redux';
// Lodash - v4.x.x
import { debounce } from 'lodash';

// Internal imports
import { 
  fetchMetrics,
  fetchMetricById,
  fetchMetricDistribution
} from '../store/actions/metrics.actions';
import {
  selectAllMetrics,
  selectMetricById,
  selectMetricsByCategory,
  selectMetricsByARRRange
} from '../store/selectors/metrics.selectors';
import {
  MetricData,
  MetricCategory,
  MetricFilters
} from '../interfaces/metrics.interface';

// Constants
const DEFAULT_FILTERS: MetricFilters = {
  category: undefined,
  arrRange: undefined,
  source: undefined
};

const MAX_RETRY_ATTEMPTS = 3;
const FILTER_DEBOUNCE_MS = 300;
const DEFAULT_REFRESH_INTERVAL = 300000; // 5 minutes

/**
 * Custom hook for managing metrics state and operations with optimized performance
 * and enhanced error handling
 * @param initialFilters - Initial filter state
 * @param refreshInterval - Optional interval for auto-refresh in milliseconds
 */
export const useMetrics = (
  initialFilters?: MetricFilters,
  refreshInterval?: number
) => {
  // Redux setup
  const dispatch = useDispatch();
  
  // Local state
  const [filters, setFilters] = useState<MetricFilters>(initialFilters || DEFAULT_FILTERS);
  const [selectedMetricId, setSelectedMetricId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Refs for cleanup
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Memoized selectors
  const metrics = useSelector(selectAllMetrics);
  const selectedMetric = useSelector(
    useMemo(() => 
      selectedMetricId ? selectMetricById(selectedMetricId) : null,
      [selectedMetricId]
    )
  );
  const loading = useSelector(state => state.metrics.loading);

  /**
   * Debounced filter update function to prevent rapid re-renders
   */
  const debouncedFilterUpdate = useCallback(
    debounce((newFilters: MetricFilters) => {
      try {
        // Validate filter values
        const validatedFilters = {
          category: newFilters.category && Object.values(MetricCategory).includes(newFilters.category)
            ? newFilters.category
            : undefined,
          arrRange: newFilters.arrRange || undefined,
          source: newFilters.source || undefined
        };

        setFilters(validatedFilters);
        setError(null);
      } catch (err) {
        setError('Invalid filter configuration');
        console.error('Filter validation error:', err);
      }
    }, FILTER_DEBOUNCE_MS),
    []
  );

  /**
   * Fetches metrics data with retry logic
   */
  const fetchMetricsData = useCallback(async () => {
    try {
      // Cancel any existing requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller
      abortControllerRef.current = new AbortController();

      setIsRefreshing(true);
      const result = await dispatch(fetchMetrics()).unwrap();

      if (result) {
        setLastUpdated(new Date());
        setRetryCount(0);
        setError(null);
      }
    } catch (err) {
      console.error('Error fetching metrics:', err);
      
      if (retryCount < MAX_RETRY_ATTEMPTS) {
        setRetryCount(prev => prev + 1);
        setTimeout(fetchMetricsData, 1000 * Math.pow(2, retryCount));
      } else {
        setError('Failed to fetch metrics after multiple attempts');
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [dispatch, retryCount]);

  /**
   * Handles metric selection with data validation
   */
  const selectMetric = useCallback(async (id: string) => {
    try {
      setSelectedMetricId(id);
      const metricData = await dispatch(fetchMetricById(id)).unwrap();
      
      if (metricData) {
        // Fetch distribution data for selected metric
        await dispatch(fetchMetricDistribution(id)).unwrap();
      }
    } catch (err) {
      console.error('Error selecting metric:', err);
      setError('Failed to load metric details');
    }
  }, [dispatch]);

  /**
   * Refreshes metrics data manually
   */
  const refreshMetrics = useCallback(async () => {
    if (!isRefreshing) {
      await fetchMetricsData();
    }
  }, [fetchMetricsData, isRefreshing]);

  /**
   * Clears error state
   */
  const clearError = useCallback(() => {
    setError(null);
    setRetryCount(0);
  }, []);

  // Setup automatic refresh interval
  useEffect(() => {
    if (refreshInterval || DEFAULT_REFRESH_INTERVAL) {
      refreshTimerRef.current = setInterval(
        fetchMetricsData,
        refreshInterval || DEFAULT_REFRESH_INTERVAL
      );
    }

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [fetchMetricsData, refreshInterval]);

  // Initial data fetch
  useEffect(() => {
    fetchMetricsData();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchMetricsData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      debouncedFilterUpdate.cancel();
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [debouncedFilterUpdate]);

  return {
    metrics,
    loading,
    error,
    selectedMetric,
    filters,
    setFilters: debouncedFilterUpdate,
    selectMetric,
    refreshMetrics,
    isRefreshing,
    lastUpdated,
    retryCount,
    clearError
  };
};