// @version react ^18.2.0
// @version @testing-library/react ^14.0.0
// @version @testing-library/user-event ^14.0.0
// @version @testing-library/jest-dom ^5.16.0
// @version @mui/material ^5.0.0
import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material';
import theme from '../../../src/assets/styles/theme';
import MetricCard from '../../../src/components/metrics/MetricCard';
import { MetricType } from '../../../src/interfaces/metrics.interface';

// Mock ResizeObserver for chart responsiveness testing
const mockResizeObserver = jest.fn(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));
window.ResizeObserver = mockResizeObserver;

// Mock handlers
const mockOnInfoClick = jest.fn();

/**
 * Helper function to render components with theme context
 */
const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

/**
 * Creates mock metric data for testing
 */
const createMockMetricData = (type: MetricType, overrides = {}) => ({
  id: 'test-metric-1',
  name: 'Revenue Growth',
  type,
  value: 25,
  description: 'Year-over-year revenue growth rate',
  percentiles: {
    p90: 45,
    p75: 35,
    p50: 25,
    p25: 15,
    p05: 5
  },
  trend: {
    direction: 'up' as const,
    value: 5
  },
  ...overrides
});

describe('MetricCard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering Tests', () => {
    it('renders metric name and value correctly', () => {
      const mockData = createMockMetricData(MetricType.REVENUE_GROWTH);
      renderWithTheme(
        <MetricCard
          {...mockData}
          testId="metric-card"
          onInfoClick={mockOnInfoClick}
        />
      );

      expect(screen.getByText('Revenue Growth')).toBeInTheDocument();
      expect(screen.getByText('25%')).toBeInTheDocument();
    });

    it('displays complete percentile distribution', () => {
      const mockData = createMockMetricData(MetricType.REVENUE_GROWTH);
      renderWithTheme(
        <MetricCard
          {...mockData}
          testId="metric-card"
        />
      );

      const percentiles = ['P90', 'P75', 'P50', 'P25', 'P05'];
      const values = ['45%', '35%', '25%', '15%', '5%'];

      percentiles.forEach((percentile, index) => {
        const cell = screen.getByText(percentile);
        expect(cell).toBeInTheDocument();
        expect(screen.getByText(values[index])).toBeInTheDocument();
      });
    });

    it('handles loading state appropriately', () => {
      const mockData = createMockMetricData(MetricType.REVENUE_GROWTH);
      renderWithTheme(
        <MetricCard
          {...mockData}
          loading={true}
          testId="metric-card"
        />
      );

      const loadingCard = screen.getByTestId('metric-card-loading');
      expect(loadingCard).toBeInTheDocument();
      expect(loadingCard.querySelector('.MuiSkeleton-root')).toBeInTheDocument();
    });

    it('displays error state with message', () => {
      const mockData = createMockMetricData(MetricType.REVENUE_GROWTH);
      const errorMessage = 'Failed to load metric data';
      
      renderWithTheme(
        <MetricCard
          {...mockData}
          error={errorMessage}
          testId="metric-card"
        />
      );

      const errorCard = screen.getByTestId('metric-card-error');
      expect(errorCard).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('applies correct formatting per metric type', () => {
      const testCases = [
        { type: MetricType.REVENUE_GROWTH, value: 25, expected: '25%' },
        { type: MetricType.NDR, value: 110, expected: '110%' },
        { type: MetricType.MAGIC_NUMBER, value: 0.8, expected: '0.8' }
      ];

      testCases.forEach(({ type, value, expected }) => {
        const mockData = createMockMetricData(type, { value });
        const { rerender } = renderWithTheme(
          <MetricCard
            {...mockData}
            testId="metric-card"
          />
        );

        expect(screen.getByText(expected)).toBeInTheDocument();
        rerender(<></>);
      });
    });
  });

  describe('Interaction Tests', () => {
    it('handles info button click correctly', async () => {
      const mockData = createMockMetricData(MetricType.REVENUE_GROWTH);
      renderWithTheme(
        <MetricCard
          {...mockData}
          testId="metric-card"
          onInfoClick={mockOnInfoClick}
        />
      );

      const infoButton = screen.getByLabelText('More information about this metric');
      await userEvent.click(infoButton);
      expect(mockOnInfoClick).toHaveBeenCalledTimes(1);
    });

    it('shows tooltip on trend indicator hover', async () => {
      const mockData = createMockMetricData(MetricType.REVENUE_GROWTH);
      renderWithTheme(
        <MetricCard
          {...mockData}
          testId="metric-card"
        />
      );

      const trendIndicator = screen.getByLabelText('Trend indicator:');
      await userEvent.hover(trendIndicator);
      
      // Wait for tooltip to appear
      const tooltip = await screen.findByRole('tooltip');
      expect(tooltip).toBeInTheDocument();
      expect(tooltip).toHaveTextContent('Increased by 5%');
    });
  });

  describe('Accessibility Tests', () => {
    it('provides appropriate ARIA labels', () => {
      const mockData = createMockMetricData(MetricType.REVENUE_GROWTH);
      renderWithTheme(
        <MetricCard
          {...mockData}
          testId="metric-card"
        />
      );

      expect(screen.getByLabelText('Current metric value: 25%')).toBeInTheDocument();
      expect(screen.getByLabelText('Percentile distribution:')).toBeInTheDocument();
      expect(screen.getByLabelText('Trend indicator:')).toBeInTheDocument();
    });

    it('maintains correct heading hierarchy', () => {
      const mockData = createMockMetricData(MetricType.REVENUE_GROWTH);
      renderWithTheme(
        <MetricCard
          {...mockData}
          testId="metric-card"
        />
      );

      const heading = screen.getByRole('heading', { name: 'Revenue Growth' });
      expect(heading.tagName).toBe('H2');
    });

    it('supports keyboard navigation', async () => {
      const mockData = createMockMetricData(MetricType.REVENUE_GROWTH);
      renderWithTheme(
        <MetricCard
          {...mockData}
          testId="metric-card"
          onInfoClick={mockOnInfoClick}
        />
      );

      const infoButton = screen.getByLabelText('More information about this metric');
      await userEvent.tab();
      expect(infoButton).toHaveFocus();
      
      await userEvent.keyboard('{enter}');
      expect(mockOnInfoClick).toHaveBeenCalled();
    });
  });

  describe('Responsive Behavior Tests', () => {
    it('maintains responsive layout across breakpoints', () => {
      const mockData = createMockMetricData(MetricType.REVENUE_GROWTH);
      const { container } = renderWithTheme(
        <MetricCard
          {...mockData}
          testId="metric-card"
        />
      );

      // Test mobile layout
      window.innerWidth = 320;
      fireEvent(window, new Event('resize'));
      expect(container.firstChild).toHaveStyle({ width: '100%' });

      // Test desktop layout
      window.innerWidth = 1024;
      fireEvent(window, new Event('resize'));
      expect(container.firstChild).toHaveStyle({ width: '100%' });
    });

    it('resizes chart appropriately', () => {
      const mockData = createMockMetricData(MetricType.REVENUE_GROWTH);
      renderWithTheme(
        <MetricCard
          {...mockData}
          testId="metric-card"
        />
      );

      expect(mockResizeObserver).toHaveBeenCalled();
    });
  });
});