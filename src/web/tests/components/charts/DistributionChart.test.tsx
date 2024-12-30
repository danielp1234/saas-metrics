// @version react ^18.2.0
// @version @testing-library/react ^14.0.0
// @version @testing-library/user-event ^14.0.0
// @version jest ^29.0.0
// @version chart.js ^4.4.0
// @version @axe-core/react ^4.7.3

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Chart } from 'chart.js/auto';
import { ThemeProvider } from '@mui/material';
import theme from '../../../assets/styles/theme';
import DistributionChart from '../../../components/charts/DistributionChart';
import { createDistributionChartConfig } from '../../../utils/chart.utils';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock Chart.js
jest.mock('chart.js/auto', () => {
  return {
    Chart: jest.fn().mockImplementation(() => ({
      destroy: jest.fn(),
      resize: jest.fn(),
      update: jest.fn(),
      data: { datasets: [] },
      options: {},
    })),
  };
});

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

describe('DistributionChart', () => {
  // Test data setup
  const mockData = {
    datasets: [
      {
        label: 'Revenue Growth',
        data: [
          { x: 0, y: 10 },
          { x: 25, y: 20 },
          { x: 50, y: 30 },
          { x: 75, y: 40 },
          { x: 100, y: 50 },
        ],
        backgroundColor: '#1976d2',
        borderColor: '#1976d2',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const defaultProps = {
    data: mockData.datasets,
    showPercentiles: true,
    xAxisLabel: 'Growth Rate (%)',
    yAxisLabel: 'Frequency',
    ariaLabel: 'Revenue Growth Distribution Chart',
  };

  // Helper function to render component with theme
  const renderWithTheme = (props = {}) => {
    return render(
      <ThemeProvider theme={theme}>
        <DistributionChart {...defaultProps} {...props} />
      </ThemeProvider>
    );
  };

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('Rendering Tests', () => {
    it('renders without crashing', () => {
      renderWithTheme();
      expect(screen.getByTestId('distribution-chart')).toBeInTheDocument();
    });

    it('initializes canvas element correctly', () => {
      renderWithTheme();
      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
      expect(canvas.tagName.toLowerCase()).toBe('canvas');
    });

    it('applies correct container styles', () => {
      renderWithTheme();
      const container = screen.getByTestId('distribution-chart');
      expect(container).toHaveStyle({
        position: 'relative',
        height: '400px',
        width: '100%',
      });
    });

    it('handles error boundaries gracefully', () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      const invalidData = [{ invalid: 'data' }];
      
      renderWithTheme({ data: invalidData });
      
      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });
  });

  describe('Data Visualization Tests', () => {
    it('creates chart instance with correct configuration', () => {
      renderWithTheme();
      expect(Chart).toHaveBeenCalledTimes(1);
      const chartConfig = Chart.mock.calls[0][1];
      expect(chartConfig.data.datasets).toHaveLength(1);
      expect(chartConfig.options.scales.x.title.text).toBe('Growth Rate (%)');
      expect(chartConfig.options.scales.y.title.text).toBe('Frequency');
    });

    it('updates chart when data changes', async () => {
      const { rerender } = renderWithTheme();
      const updatedData = [{
        ...mockData.datasets[0],
        data: [{ x: 0, y: 15 }, { x: 100, y: 55 }],
      }];

      rerender(
        <ThemeProvider theme={theme}>
          <DistributionChart {...defaultProps} data={updatedData} />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(Chart).toHaveBeenCalledTimes(2);
      });
    });

    it('configures percentile markers correctly when enabled', () => {
      renderWithTheme({ showPercentiles: true });
      const chartConfig = Chart.mock.calls[0][1];
      expect(chartConfig.options.plugins.annotation.annotations).toBeDefined();
    });
  });

  describe('Interaction Tests', () => {
    it('shows tooltips on hover', async () => {
      renderWithTheme();
      const canvas = screen.getByRole('img');
      
      fireEvent.mouseMove(canvas, { clientX: 100, clientY: 100 });
      
      await waitFor(() => {
        expect(Chart.mock.calls[0][1].options.plugins.tooltip.enabled).toBe(true);
      });
    });

    it('supports keyboard navigation', async () => {
      renderWithTheme();
      const canvas = screen.getByRole('img');
      expect(canvas).toHaveAttribute('tabIndex', '0');
      
      await userEvent.tab();
      expect(canvas).toHaveFocus();
    });
  });

  describe('Responsive Tests', () => {
    it('resizes chart on container resize', async () => {
      renderWithTheme();
      const container = screen.getByTestId('distribution-chart');
      
      // Trigger resize observer
      const resizeObserverCallback = ResizeObserver.mock.calls[0][0];
      resizeObserverCallback([
        { contentRect: { width: 800, height: 600 } },
      ]);

      await waitFor(() => {
        expect(Chart.mock.instances[0].resize).toHaveBeenCalled();
      });
    });

    it('maintains aspect ratio on resize', async () => {
      renderWithTheme();
      const container = screen.getByTestId('distribution-chart');
      
      // Verify aspect ratio is maintained
      expect(container).toHaveStyle({
        position: 'relative',
        width: '100%',
      });
    });
  });

  describe('Theme Integration Tests', () => {
    it('applies theme colors correctly', () => {
      renderWithTheme();
      const chartConfig = Chart.mock.calls[0][1];
      expect(chartConfig.options.plugins.tooltip.backgroundColor)
        .toBe(theme.palette.background.paper);
    });

    it('uses correct typography from theme', () => {
      renderWithTheme();
      const chartConfig = Chart.mock.calls[0][1];
      expect(chartConfig.options.scales.x.ticks.font.family)
        .toBe(theme.typography.fontFamily);
    });
  });

  describe('Accessibility Tests', () => {
    it('has correct ARIA attributes', () => {
      renderWithTheme();
      const canvas = screen.getByRole('img');
      expect(canvas).toHaveAttribute('aria-label', defaultProps.ariaLabel);
    });

    it('passes accessibility audit', async () => {
      const { container } = renderWithTheme();
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('provides keyboard-accessible controls', async () => {
      renderWithTheme();
      const canvas = screen.getByRole('img');
      
      await userEvent.tab();
      expect(canvas).toHaveFocus();
      
      // Verify keyboard interactions
      await userEvent.keyboard('{Enter}');
      expect(canvas).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('Cleanup Tests', () => {
    it('destroys chart instance on unmount', () => {
      const { unmount } = renderWithTheme();
      const destroyMock = Chart.mock.instances[0].destroy;
      
      unmount();
      expect(destroyMock).toHaveBeenCalled();
    });

    it('disconnects resize observer on unmount', () => {
      const { unmount } = renderWithTheme();
      const disconnect = ResizeObserver.mock.instances[0].disconnect;
      
      unmount();
      expect(disconnect).toHaveBeenCalled();
    });
  });
});