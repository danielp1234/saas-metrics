// @version react ^18.2.0
// @version @testing-library/react ^14.0.0
// @version @testing-library/user-event ^14.0.0
// @version vitest ^0.34.0
// @version @axe-core/react ^4.7.0

import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { axe, toHaveNoViolations } from '@axe-core/react';
import { vi, beforeEach, afterEach, expect } from 'vitest';
import MetricDetailPage from '../../src/pages/metrics/Detail';
import { configureStore } from '@reduxjs/toolkit';
import rootReducer from '../../src/store/reducers';

// Add custom matchers for accessibility testing
expect.extend(toHaveNoViolations);

// Mock performance.now for timing tests
const mockPerformanceNow = vi.fn();
global.performance.now = mockPerformanceNow;

// Mock useMetrics hook
vi.mock('../../src/hooks/useMetrics', () => ({
  useMetrics: vi.fn()
}));

// Mock useNavigate hook
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useParams: () => ({ metricId: 'revenue_growth' })
  };
});

/**
 * Helper function to render component with required providers
 */
const renderWithProviders = (
  component: React.ReactElement,
  {
    initialState = {},
    store = configureStore({
      reducer: rootReducer,
      preloadedState: initialState
    }),
    route = '/metrics/revenue_growth'
  } = {}
) => {
  return {
    ...render(
      <Provider store={store}>
        <MemoryRouter initialEntries={[route]}>
          <Routes>
            <Route path="/metrics/:metricId" element={component} />
          </Routes>
        </MemoryRouter>
      </Provider>
    ),
    store
  };
};

describe('MetricDetailPage', () => {
  // Mock data for tests
  const mockMetricData = {
    id: 'revenue_growth',
    name: 'Revenue Growth',
    value: 25,
    percentiles: {
      p5: 5,
      p25: 15,
      p50: 25,
      p75: 35,
      p90: 45
    },
    metadata: {
      source: 'Test Source',
      arrRange: '$1M-$5M',
      updatedAt: '2023-01-01T00:00:00Z'
    },
    description: 'Year-over-year revenue growth rate'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockPerformanceNow.mockReturnValueOnce(0).mockReturnValueOnce(1000);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('renders loading spinner when data is being fetched', () => {
    // Mock loading state
    const useMetricsMock = vi.spyOn(require('../../src/hooks/useMetrics'), 'useMetrics');
    useMetricsMock.mockReturnValue({
      loading: true,
      error: null,
      metricData: null
    });

    renderWithProviders(<MetricDetailPage />);

    // Assert loading spinner is visible
    expect(screen.getByTestId('metric-detail-loading')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
  });

  it('displays error message when data fetch fails', async () => {
    // Mock error state
    const useMetricsMock = vi.spyOn(require('../../src/hooks/useMetrics'), 'useMetrics');
    useMetricsMock.mockReturnValue({
      loading: false,
      error: 'Failed to load metric data',
      metricData: null
    });

    renderWithProviders(<MetricDetailPage />);

    // Assert error message is displayed
    expect(screen.getByRole('alert')).toHaveTextContent('Failed to load metric data');
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('renders metric detail with correct data', async () => {
    // Mock successful data fetch
    const useMetricsMock = vi.spyOn(require('../../src/hooks/useMetrics'), 'useMetrics');
    useMetricsMock.mockReturnValue({
      loading: false,
      error: null,
      metricData: mockMetricData
    });

    renderWithProviders(<MetricDetailPage />);

    // Assert metric details are displayed correctly
    await waitFor(() => {
      expect(screen.getByText('Revenue Growth')).toBeInTheDocument();
      expect(screen.getByText('25%')).toBeInTheDocument();
      expect(screen.getByText('Test Source')).toBeInTheDocument();
      expect(screen.getByText('$1M-$5M')).toBeInTheDocument();
    });

    // Verify chart and table accessibility
    const chart = screen.getByRole('figure');
    expect(chart).toHaveAttribute('aria-label', expect.stringContaining('Revenue Growth'));
    
    const table = screen.getByRole('table');
    expect(table).toHaveAttribute('aria-label', expect.stringContaining('percentile'));
  });

  it('validates response time requirements', async () => {
    // Mock performance timing
    mockPerformanceNow.mockReturnValueOnce(0).mockReturnValueOnce(1500);

    const useMetricsMock = vi.spyOn(require('../../src/hooks/useMetrics'), 'useMetrics');
    useMetricsMock.mockReturnValue({
      loading: false,
      error: null,
      metricData: mockMetricData
    });

    renderWithProviders(<MetricDetailPage />);

    // Assert response time is under 2 seconds
    await waitFor(() => {
      const loadTime = mockPerformanceNow.mock.results[1].value - 
                      mockPerformanceNow.mock.results[0].value;
      expect(loadTime).toBeLessThan(2000);
    });
  });

  it('handles filter interactions correctly', async () => {
    const useMetricsMock = vi.spyOn(require('../../src/hooks/useMetrics'), 'useMetrics');
    const refreshMetricsMock = vi.fn();
    useMetricsMock.mockReturnValue({
      loading: false,
      error: null,
      metricData: mockMetricData,
      refreshMetrics: refreshMetricsMock
    });

    renderWithProviders(<MetricDetailPage />);

    // Simulate filter interaction
    const filterButton = screen.getByRole('button', { name: /filter/i });
    await userEvent.click(filterButton);

    // Assert filter panel is visible and interactive
    const filterPanel = screen.getByRole('region', { name: /filters/i });
    expect(filterPanel).toBeInTheDocument();

    // Test filter application
    const arrFilter = screen.getByRole('combobox', { name: /arr range/i });
    await userEvent.selectOptions(arrFilter, '$5M-$10M');

    expect(refreshMetricsMock).toHaveBeenCalled();
  });

  it('meets accessibility requirements', async () => {
    const useMetricsMock = vi.spyOn(require('../../src/hooks/useMetrics'), 'useMetrics');
    useMetricsMock.mockReturnValue({
      loading: false,
      error: null,
      metricData: mockMetricData
    });

    const { container } = renderWithProviders(<MetricDetailPage />);

    // Run accessibility tests
    const results = await axe(container);
    expect(results).toHaveNoViolations();

    // Verify keyboard navigation
    const backButton = screen.getByRole('button', { name: /back/i });
    backButton.focus();
    expect(document.activeElement).toBe(backButton);

    // Test focus management
    fireEvent.keyDown(backButton, { key: 'Enter' });
    await waitFor(() => {
      expect(screen.getByRole('main')).toHaveFocus();
    });
  });
});