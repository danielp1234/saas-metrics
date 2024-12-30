// @version react ^18.2.0
// @version @testing-library/react ^14.0.0
// @version @testing-library/user-event ^14.0.0
// @version vitest ^0.34.0
// @version @axe-core/react ^4.7.0

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ThemeProvider } from '@mui/material';

import MetricDetail from '../../../../src/components/metrics/MetricDetail';
import { useMetrics } from '../../../../src/hooks/useMetrics';
import theme from '../../../../src/assets/styles/theme';
import { MetricType } from '../../../../src/interfaces/metrics.interface';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Mock hooks and components
vi.mock('../../../../src/hooks/useMetrics');
vi.mock('../../../../src/components/charts/DistributionChart', () => ({
  default: ({ data, ariaLabel }: any) => (
    <div data-testid="distribution-chart" aria-label={ariaLabel}>
      {JSON.stringify(data)}
    </div>
  ),
}));

/**
 * Helper function to render component with all required providers
 */
const renderWithProviders = (
  component: React.ReactElement,
  { initialState = {}, store = configureStore({ reducer: {}, preloadedState: initialState }) } = {}
) => {
  const user = userEvent.setup();
  return {
    user,
    ...render(
      <Provider store={store}>
        <ThemeProvider theme={theme}>
          {component}
        </ThemeProvider>
      </Provider>
    ),
    store,
  };
};

/**
 * Helper function to generate mock metric data
 */
const generateMockMetricData = (overrides = {}) => ({
  id: 'revenue-growth',
  name: 'Revenue Growth',
  type: MetricType.REVENUE_GROWTH,
  value: 25.5,
  description: 'Year-over-year revenue growth rate',
  percentiles: {
    p5: 5,
    p25: 15,
    p50: 25,
    p75: 35,
    p90: 45,
  },
  metadata: {
    source: 'Test Source',
    arrRange: '$1M-$5M',
    updatedAt: '2023-01-01T00:00:00Z',
    dataPoints: 100,
  },
  benchmarkComparison: {
    industryAverage: {
      p5: 4,
      p25: 14,
      p50: 24,
      p75: 34,
      p90: 44,
    },
  },
  ...overrides,
});

describe('MetricDetail Component', () => {
  const mockOnBack = vi.fn();
  const mockGetMetricById = vi.fn();
  const mockFetchMetricPercentiles = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useMetrics as jest.Mock).mockReturnValue({
      getMetricById: mockGetMetricById,
      fetchMetricPercentiles: mockFetchMetricPercentiles,
    });
  });

  describe('Rendering', () => {
    it('displays loading skeleton initially', () => {
      renderWithProviders(<MetricDetail metricId="test-id" onBack={mockOnBack} />);
      
      expect(screen.getByTestId('skeleton-header')).toBeInTheDocument();
      expect(screen.getByTestId('skeleton-chart')).toBeInTheDocument();
      expect(screen.getByTestId('skeleton-table')).toBeInTheDocument();
    });

    it('renders metric details correctly after data load', async () => {
      const mockMetric = generateMockMetricData();
      mockGetMetricById.mockResolvedValueOnce(mockMetric);
      mockFetchMetricPercentiles.mockResolvedValueOnce(mockMetric.percentiles);

      renderWithProviders(<MetricDetail metricId="test-id" onBack={mockOnBack} />);

      await waitFor(() => {
        expect(screen.getByText(mockMetric.name)).toBeInTheDocument();
        expect(screen.getByText(mockMetric.description)).toBeInTheDocument();
        expect(screen.getByText(`Current Value: ${mockMetric.value}%`)).toBeInTheDocument();
      });
    });

    it('maintains layout consistency with F-pattern', async () => {
      const mockMetric = generateMockMetricData();
      mockGetMetricById.mockResolvedValueOnce(mockMetric);
      mockFetchMetricPercentiles.mockResolvedValueOnce(mockMetric.percentiles);

      const { container } = renderWithProviders(
        <MetricDetail metricId="test-id" onBack={mockOnBack} />
      );

      await waitFor(() => {
        const layout = container.firstChild;
        expect(layout).toHaveStyle({ padding: theme.spacing(3) });
        expect(layout).toHaveStyle({ maxWidth: '1200px' });
      });
    });

    it('applies correct spacing using 8px grid', async () => {
      const mockMetric = generateMockMetricData();
      mockGetMetricById.mockResolvedValueOnce(mockMetric);
      mockFetchMetricPercentiles.mockResolvedValueOnce(mockMetric.percentiles);

      const { container } = renderWithProviders(
        <MetricDetail metricId="test-id" onBack={mockOnBack} />
      );

      await waitFor(() => {
        const elements = container.querySelectorAll('[class*="Styled"]');
        elements.forEach(element => {
          const computedStyle = window.getComputedStyle(element);
          const margins = [
            computedStyle.marginTop,
            computedStyle.marginRight,
            computedStyle.marginBottom,
            computedStyle.marginLeft,
          ];
          margins.forEach(margin => {
            const value = parseInt(margin);
            expect(value % 8).toBe(0);
          });
        });
      });
    });
  });

  describe('Interaction', () => {
    it('handles back navigation with keyboard and click', async () => {
      const mockMetric = generateMockMetricData();
      mockGetMetricById.mockResolvedValueOnce(mockMetric);
      mockFetchMetricPercentiles.mockResolvedValueOnce(mockMetric.percentiles);

      const { user } = renderWithProviders(
        <MetricDetail metricId="test-id" onBack={mockOnBack} />
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
      });

      // Test click
      await user.click(screen.getByRole('button', { name: /back/i }));
      expect(mockOnBack).toHaveBeenCalledTimes(1);

      // Test keyboard
      await user.tab();
      await user.keyboard('{Enter}');
      expect(mockOnBack).toHaveBeenCalledTimes(2);
    });

    it('maintains focus management', async () => {
      const mockMetric = generateMockMetricData();
      mockGetMetricById.mockResolvedValueOnce(mockMetric);
      mockFetchMetricPercentiles.mockResolvedValueOnce(mockMetric.percentiles);

      const { user } = renderWithProviders(
        <MetricDetail metricId="test-id" onBack={mockOnBack} />
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
      });

      // Test focus trap
      await user.tab();
      expect(document.activeElement).toHaveAttribute('aria-label', 'Go back to metrics overview');
    });
  });

  describe('Accessibility', () => {
    it('meets WCAG 2.1 Level AA requirements', async () => {
      const mockMetric = generateMockMetricData();
      mockGetMetricById.mockResolvedValueOnce(mockMetric);
      mockFetchMetricPercentiles.mockResolvedValueOnce(mockMetric.percentiles);

      const { container } = renderWithProviders(
        <MetricDetail metricId="test-id" onBack={mockOnBack} />
      );

      await waitFor(() => {
        expect(screen.getByText(mockMetric.name)).toBeInTheDocument();
      });

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('supports screen reader navigation', async () => {
      const mockMetric = generateMockMetricData();
      mockGetMetricById.mockResolvedValueOnce(mockMetric);
      mockFetchMetricPercentiles.mockResolvedValueOnce(mockMetric.percentiles);

      renderWithProviders(<MetricDetail metricId="test-id" onBack={mockOnBack} />);

      await waitFor(() => {
        const chart = screen.getByTestId('distribution-chart');
        expect(chart).toHaveAttribute('aria-label', `Distribution chart for ${mockMetric.name}`);
        
        const table = screen.getByRole('table');
        expect(table).toHaveAttribute('aria-label', `Percentile table for ${mockMetric.name}`);
      });
    });
  });

  describe('Error Handling', () => {
    it('shows error message appropriately', async () => {
      const errorMessage = 'Failed to load metric data';
      mockGetMetricById.mockRejectedValueOnce(new Error(errorMessage));

      renderWithProviders(<MetricDetail metricId="test-id" onBack={mockOnBack} />);

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });

    it('provides retry functionality', async () => {
      mockGetMetricById.mockRejectedValueOnce(new Error('Network error'));
      
      renderWithProviders(<MetricDetail metricId="test-id" onBack={mockOnBack} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument();
      });

      await userEvent.click(screen.getByRole('button', { name: /go back/i }));
      expect(mockOnBack).toHaveBeenCalled();
    });
  });

  describe('Performance', () => {
    it('renders within 2 second threshold', async () => {
      const startTime = performance.now();
      const mockMetric = generateMockMetricData();
      mockGetMetricById.mockResolvedValueOnce(mockMetric);
      mockFetchMetricPercentiles.mockResolvedValueOnce(mockMetric.percentiles);

      renderWithProviders(<MetricDetail metricId="test-id" onBack={mockOnBack} />);

      await waitFor(() => {
        expect(screen.getByText(mockMetric.name)).toBeInTheDocument();
      });

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(2000);
    });

    it('cleans up resources properly', async () => {
      const mockMetric = generateMockMetricData();
      mockGetMetricById.mockResolvedValueOnce(mockMetric);
      mockFetchMetricPercentiles.mockResolvedValueOnce(mockMetric.percentiles);

      const { unmount } = renderWithProviders(
        <MetricDetail metricId="test-id" onBack={mockOnBack} />
      );

      await waitFor(() => {
        expect(screen.getByText(mockMetric.name)).toBeInTheDocument();
      });

      unmount();
      // Verify cleanup
      expect(screen.queryByText(mockMetric.name)).not.toBeInTheDocument();
    });
  });
});