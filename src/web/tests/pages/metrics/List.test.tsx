// @version react ^18.2.0
// @version @testing-library/react ^13.0.0
// @version vitest ^0.34.0
// @version msw ^1.0.0

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, beforeEach, afterEach } from 'vitest';
import { setupServer } from 'msw';
import { rest } from 'msw';

import MetricsList from '../../../../src/pages/metrics/List';
import { createStore } from '../../../utils/testUtils';
import { MetricType } from '../../../interfaces/metrics.interface';

// Mock data for testing
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
      source: 'openview',
      arrRange: '1M-5M',
      updatedAt: new Date().toISOString()
    }
  },
  // Add more mock metrics as needed
];

// MSW server setup for API mocking
const server = setupServer(
  rest.get('/api/v1/metrics', (req, res, ctx) => {
    return res(ctx.json(mockMetricsData));
  })
);

// Test wrapper component with required providers
const renderWithProviders = (component: React.ReactNode) => {
  const store = createStore({
    metrics: {
      metrics: mockMetricsData,
      loading: false,
      error: null,
      filter: {}
    }
  });

  return render(
    <Provider store={store}>
      <MemoryRouter>
        {component}
      </MemoryRouter>
    </Provider>
  );
};

describe('MetricsList', () => {
  beforeEach(() => {
    server.listen();
    // Reset performance marks
    performance.clearMarks();
    performance.clearMeasures();
  });

  afterEach(() => {
    server.resetHandlers();
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render loading state initially', () => {
      renderWithProviders(<MetricsList />);
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should render metrics grid after loading', async () => {
      renderWithProviders(<MetricsList />);
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
        expect(screen.getByRole('region', { name: /metrics/i })).toBeInTheDocument();
      });
    });

    it('should render error state when API fails', async () => {
      server.use(
        rest.get('/api/v1/metrics', (req, res, ctx) => {
          return res(ctx.status(500));
        })
      );

      renderWithProviders(<MetricsList />);
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });

    it('should render empty state when no metrics available', async () => {
      server.use(
        rest.get('/api/v1/metrics', (req, res, ctx) => {
          return res(ctx.json([]));
        })
      );

      renderWithProviders(<MetricsList />);
      await waitFor(() => {
        expect(screen.getByText(/no metrics/i)).toBeInTheDocument();
      });
    });
  });

  describe('Filtering', () => {
    it('should update metrics when ARR filter changes', async () => {
      renderWithProviders(<MetricsList />);
      const arrFilter = await screen.findByLabelText(/arr range/i);
      
      await userEvent.click(arrFilter);
      await userEvent.click(screen.getByText('$1M - $5M ARR'));

      await waitFor(() => {
        expect(screen.getByText('$1M - $5M ARR')).toBeInTheDocument();
      });
    });

    it('should update metrics when metric type filter changes', async () => {
      renderWithProviders(<MetricsList />);
      const metricFilter = await screen.findByLabelText(/select metric/i);

      await userEvent.click(metricFilter);
      await userEvent.click(screen.getByText('Revenue Growth'));

      await waitFor(() => {
        expect(screen.getByText('Revenue Growth')).toBeInTheDocument();
      });
    });

    it('should update metrics when source filter changes', async () => {
      renderWithProviders(<MetricsList />);
      const sourceFilter = await screen.findByLabelText(/data source/i);

      await userEvent.click(sourceFilter);
      await userEvent.click(screen.getByText('OpenView Partners'));

      await waitFor(() => {
        expect(screen.getByText('OpenView Partners')).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to metric detail when metric card is clicked', async () => {
      const navigateMock = vi.fn();
      vi.mock('react-router-dom', async () => ({
        ...await vi.importActual('react-router-dom'),
        useNavigate: () => navigateMock
      }));

      renderWithProviders(<MetricsList />);
      await waitFor(() => {
        const metricCard = screen.getByText('Revenue Growth');
        fireEvent.click(metricCard);
        expect(navigateMock).toHaveBeenCalledWith('/metrics/1');
      });
    });
  });

  describe('Performance', () => {
    it('should load metrics within 2 seconds', async () => {
      const startTime = performance.now();
      renderWithProviders(<MetricsList />);

      await waitFor(() => {
        expect(screen.getByRole('region', { name: /metrics/i })).toBeInTheDocument();
        const loadTime = performance.now() - startTime;
        expect(loadTime).toBeLessThan(2000);
      });
    });

    it('should update filters without blocking UI', async () => {
      renderWithProviders(<MetricsList />);
      const arrFilter = await screen.findByLabelText(/arr range/i);

      const startTime = performance.now();
      await userEvent.click(arrFilter);
      await userEvent.click(screen.getByText('$1M - $5M ARR'));

      const updateTime = performance.now() - startTime;
      expect(updateTime).toBeLessThan(100);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', async () => {
      renderWithProviders(<MetricsList />);
      await waitFor(() => {
        expect(screen.getByRole('main')).toHaveAttribute('aria-label', 'SaaS Metrics Dashboard');
        expect(screen.getByRole('region', { name: /metrics/i })).toBeInTheDocument();
      });
    });

    it('should support keyboard navigation', async () => {
      renderWithProviders(<MetricsList />);
      await waitFor(() => {
        const firstMetric = screen.getByText('Revenue Growth');
        firstMetric.focus();
        expect(document.activeElement).toBe(firstMetric);
      });
    });

    it('should announce filter changes to screen readers', async () => {
      renderWithProviders(<MetricsList />);
      const arrFilter = await screen.findByLabelText(/arr range/i);

      await userEvent.click(arrFilter);
      await userEvent.click(screen.getByText('$1M - $5M ARR'));

      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });
});