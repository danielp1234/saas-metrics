// @version @testing-library/react-hooks ^8.x.x
// @version @reduxjs/toolkit ^1.9.x
// @version jest ^29.x.x

import { renderHook, act, cleanup } from '@testing-library/react-hooks';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import useMetrics from '../../src/hooks/useMetrics';
import type { Metric, MetricFilter } from '../../src/interfaces/metrics.interface';
import metricsReducer from '../../src/store/reducers/metrics.reducer';

/**
 * Mock metrics service class for controlled testing environment
 */
class MockMetricsService {
  private mockMetrics: Metric[];
  private shouldFail: boolean;
  private responseDelay: number;
  private onRequest: () => void;

  constructor(config: { 
    mockData?: Metric[], 
    shouldFail?: boolean, 
    responseDelay?: number 
  }) {
    this.mockMetrics = config.mockData || [];
    this.shouldFail = config.shouldFail || false;
    this.responseDelay = config.responseDelay || 0;
    this.onRequest = jest.fn();
  }

  async getMetrics(filter?: MetricFilter): Promise<Metric[]> {
    this.onRequest();

    if (this.responseDelay) {
      await new Promise(resolve => setTimeout(resolve, this.responseDelay));
    }

    if (this.shouldFail) {
      throw new Error('Failed to fetch metrics');
    }

    // Apply filters if provided
    let filteredMetrics = [...this.mockMetrics];
    if (filter) {
      if (filter.arrRange) {
        filteredMetrics = filteredMetrics.filter(m => 
          m.metadata.arrRange === filter.arrRange
        );
      }
      if (filter.source) {
        filteredMetrics = filteredMetrics.filter(m => 
          m.metadata.source === filter.source
        );
      }
    }

    return filteredMetrics;
  }
}

/**
 * Helper function to create mock metric data
 */
const createMockMetric = (overrides?: Partial<Metric>): Metric => ({
  id: `metric-${Math.random().toString(36).substr(2, 9)}`,
  name: 'Test Metric',
  type: 'revenue_growth',
  value: 25.5,
  percentiles: {
    p5: 10,
    p25: 20,
    p50: 25.5,
    p75: 30,
    p90: 35
  },
  metadata: {
    source: 'test-source',
    arrRange: '$1M-$5M',
    updatedAt: new Date().toISOString(),
    dataPoints: 100,
    confidenceLevel: 0.95,
    calculationMethod: 'standard'
  },
  validation: {
    isValid: true,
    errors: [],
    dataQuality: 'high',
    lastValidated: new Date().toISOString(),
    validationRules: ['range_check', 'outlier_detection']
  },
  trend: {
    direction: 'up',
    percentage: 5,
    period: '30d',
    significance: 0.95,
    comparisonBasis: 'previous_period'
  },
  description: 'Test metric description',
  unit: '%',
  ...overrides
});

/**
 * Setup test environment with Redux store and mocks
 */
const setupTest = (options?: { 
  initialState?: any, 
  mockData?: Metric[], 
  shouldFail?: boolean 
}) => {
  // Create Redux store with test configuration
  const store = configureStore({
    reducer: {
      metrics: metricsReducer
    },
    preloadedState: options?.initialState
  });

  // Initialize mock service
  const mockService = new MockMetricsService({
    mockData: options?.mockData,
    shouldFail: options?.shouldFail
  });

  // Create wrapper with Provider
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );

  return { store, wrapper, mockService };
};

describe('useMetrics Hook', () => {
  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  it('should fetch metrics on mount with performance validation', async () => {
    // Setup test environment
    const mockMetrics = [createMockMetric(), createMockMetric()];
    const { wrapper } = setupTest({ mockData: mockMetrics });
    const startTime = Date.now();

    // Render hook
    const { result, waitForNextUpdate } = renderHook(
      () => useMetrics(),
      { wrapper }
    );

    // Verify initial loading state
    expect(result.current.loading).toBe(true);
    expect(result.current.metrics).toHaveLength(0);

    // Wait for data fetch
    await waitForNextUpdate();

    // Verify performance requirement (< 2 seconds)
    const endTime = Date.now();
    expect(endTime - startTime).toBeLessThan(2000);

    // Verify final state
    expect(result.current.loading).toBe(false);
    expect(result.current.metrics).toHaveLength(mockMetrics.length);
    expect(result.current.error).toBeNull();
  });

  it('should handle fetch errors comprehensively', async () => {
    // Setup test environment with failure condition
    const { wrapper } = setupTest({ shouldFail: true });

    // Render hook
    const { result, waitForNextUpdate } = renderHook(
      () => useMetrics(),
      { wrapper }
    );

    // Wait for error state
    await waitForNextUpdate();

    // Verify error handling
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeTruthy();
    expect(result.current.metrics).toHaveLength(0);
  });

  it('should handle filtering correctly', async () => {
    // Setup test data with different ARR ranges
    const mockMetrics = [
      createMockMetric({ metadata: { arrRange: '$1M-$5M' } as any }),
      createMockMetric({ metadata: { arrRange: '$5M-$10M' } as any })
    ];
    const { wrapper } = setupTest({ mockData: mockMetrics });

    // Render hook with filter
    const { result, waitForNextUpdate } = renderHook(
      () => useMetrics({ arr_range: '$1M-$5M' }),
      { wrapper }
    );

    await waitForNextUpdate();

    // Verify filtered results
    expect(result.current.metrics).toHaveLength(1);
    expect(result.current.metrics[0].metadata.arrRange).toBe('$1M-$5M');
  });

  it('should handle concurrent requests properly', async () => {
    // Setup test environment with delay
    const mockMetrics = [createMockMetric()];
    const { wrapper } = setupTest({ 
      mockData: mockMetrics,
      responseDelay: 100 
    });

    // Render hook multiple times
    const hooks = [
      renderHook(() => useMetrics(), { wrapper }),
      renderHook(() => useMetrics(), { wrapper }),
      renderHook(() => useMetrics(), { wrapper })
    ];

    // Wait for all updates
    await Promise.all(
      hooks.map(hook => hook.waitForNextUpdate())
    );

    // Verify consistent state across hooks
    hooks.forEach(hook => {
      expect(hook.result.current.loading).toBe(false);
      expect(hook.result.current.metrics).toHaveLength(mockMetrics.length);
      expect(hook.result.current.error).toBeNull();
    });
  });

  it('should refresh metrics data correctly', async () => {
    // Setup test environment
    const mockMetrics = [createMockMetric()];
    const { wrapper } = setupTest({ mockData: mockMetrics });

    // Render hook
    const { result, waitForNextUpdate } = renderHook(
      () => useMetrics(),
      { wrapper }
    );

    await waitForNextUpdate();

    // Trigger refresh
    await act(async () => {
      await result.current.refreshMetrics();
    });

    // Verify refresh behavior
    expect(result.current.loading).toBe(false);
    expect(result.current.metrics).toHaveLength(mockMetrics.length);
    expect(result.current.error).toBeNull();
  });

  it('should handle stale data detection', async () => {
    // Setup test environment
    const mockMetrics = [createMockMetric()];
    const { wrapper } = setupTest({ mockData: mockMetrics });

    // Render hook
    const { result, waitForNextUpdate } = renderHook(
      () => useMetrics(),
      { wrapper }
    );

    await waitForNextUpdate();

    // Verify initial freshness
    expect(result.current.isStale).toBe(false);

    // Fast-forward time to simulate data staleness
    jest.advanceTimersByTime(901000); // 15 minutes + 1 second

    // Verify stale detection
    expect(result.current.isStale).toBe(true);
  });
});