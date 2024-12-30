// @version react ^18.2.0
// @version @testing-library/react ^14.0.0
// @version @testing-library/user-event ^14.0.0
// @version jest ^29.5.0
// @version chart.js ^4.4.0
// @version @axe-core/react ^4.7.3

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Chart } from 'chart.js/auto';
import { ThemeProvider } from '@mui/material';
import theme from '../../../src/assets/styles/theme';
import LineChart from '../../../src/components/charts/LineChart';
import { LineChartProps } from '../../../src/interfaces/chart.interface';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Mock Chart.js
jest.mock('chart.js/auto', () => ({
  Chart: jest.fn(() => ({
    destroy: jest.fn(),
    resize: jest.fn(),
    update: jest.fn(),
  })),
  register: jest.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

describe('LineChart Component', () => {
  // Test data setup
  const mockChartData = {
    datasets: [
      {
        label: 'Revenue Growth',
        data: [
          { x: 'Jan', y: 10, tooltipData: { trend: 'up' } },
          { x: 'Feb', y: 20, tooltipData: { trend: 'up' } },
          { x: 'Mar', y: 30, tooltipData: { trend: 'stable' } },
          { x: 'Apr', y: 40, tooltipData: { trend: 'up' } },
          { x: 'May', y: 50, tooltipData: { trend: 'up' } },
        ],
        borderColor: '#4CAF50',
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const defaultProps: LineChartProps = {
    data: mockChartData.datasets,
    showLegend: true,
    xAxisLabel: 'Month',
    yAxisLabel: 'Growth Rate (%)',
    height: 400,
    testId: 'line-chart',
  };

  // Helper function to render component with theme
  const renderWithTheme = (props: Partial<LineChartProps> = {}) => {
    return render(
      <ThemeProvider theme={theme}>
        <LineChart {...defaultProps} {...props} />
      </ThemeProvider>
    );
  };

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the chart container with correct dimensions', () => {
      renderWithTheme();
      const container = screen.getByTestId('line-chart');
      expect(container).toBeInTheDocument();
      expect(container).toHaveStyle({ height: '400px' });
    });

    it('should render canvas element with correct ARIA attributes', () => {
      renderWithTheme();
      const canvas = screen.getByRole('img');
      expect(canvas).toHaveAttribute('aria-label', 'Line chart showing Growth Rate (%) over Month');
      expect(canvas).toHaveAttribute('tabindex', '0');
    });

    it('should render loading state correctly', () => {
      renderWithTheme({ loading: true });
      expect(screen.getByTestId('line-chart-loading')).toBeInTheDocument();
      expect(screen.getByText('Loading chart...')).toBeInTheDocument();
    });

    it('should render error state correctly', () => {
      const errorMessage = 'Failed to load chart data';
      renderWithTheme({ error: errorMessage });
      expect(screen.getByTestId('line-chart-error')).toBeInTheDocument();
      expect(screen.getByText(`Error loading chart: ${errorMessage}`)).toBeInTheDocument();
    });
  });

  describe('Chart.js Integration', () => {
    it('should initialize Chart.js with correct configuration', () => {
      renderWithTheme();
      expect(Chart).toHaveBeenCalledTimes(1);
      const chartConfig = (Chart as jest.Mock).mock.calls[0][1];
      expect(chartConfig.data.datasets).toEqual(mockChartData.datasets);
      expect(chartConfig.options.plugins.legend.display).toBe(true);
    });

    it('should destroy chart instance on unmount', () => {
      const { unmount } = renderWithTheme();
      const destroyMock = (Chart as jest.Mock).mock.results[0].value.destroy;
      unmount();
      expect(destroyMock).toHaveBeenCalledTimes(1);
    });

    it('should handle resize events', async () => {
      renderWithTheme();
      const resizeMock = (Chart as jest.Mock).mock.results[0].value.resize;
      
      // Trigger resize event
      fireEvent(window, new Event('resize'));
      
      // Wait for debounced resize handler
      await waitFor(() => {
        expect(resizeMock).toHaveBeenCalled();
      }, { timeout: 300 });
    });
  });

  describe('Interactivity', () => {
    it('should handle data point clicks', async () => {
      const onDataPointClick = jest.fn();
      renderWithTheme({ onDataPointClick });

      const canvas = screen.getByRole('img');
      fireEvent.click(canvas);

      // Simulate Chart.js click event
      const chartInstance = (Chart as jest.Mock).mock.results[0].value;
      chartInstance.options.onClick(null, [{ datasetIndex: 0, index: 0 }]);

      expect(onDataPointClick).toHaveBeenCalledWith(mockChartData.datasets[0].data[0]);
    });

    it('should update when data changes', () => {
      const { rerender } = renderWithTheme();
      const newData = [...mockChartData.datasets];
      newData[0].data.push({ x: 'Jun', y: 60, tooltipData: { trend: 'up' } });

      rerender(
        <ThemeProvider theme={theme}>
          <LineChart {...defaultProps} data={newData} />
        </ThemeProvider>
      );

      expect(Chart).toHaveBeenCalledTimes(2);
    });
  });

  describe('Accessibility', () => {
    it('should pass accessibility audit', async () => {
      const { container } = renderWithTheme();
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should be keyboard navigable', () => {
      renderWithTheme();
      const canvas = screen.getByRole('img');
      expect(canvas).toHaveFocus();
    });
  });

  describe('Responsive Behavior', () => {
    it('should adjust to container width changes', async () => {
      const { container } = renderWithTheme();
      const chartContainer = container.firstChild as HTMLElement;
      
      // Simulate container resize
      Object.defineProperty(chartContainer, 'offsetWidth', { value: 800 });
      fireEvent(window, new Event('resize'));

      await waitFor(() => {
        expect((Chart as jest.Mock).mock.results[0].value.resize).toHaveBeenCalled();
      });
    });

    it('should maintain aspect ratio on resize', async () => {
      const { container } = renderWithTheme({ height: 300, width: 600 });
      const chartContainer = container.firstChild as HTMLElement;
      
      expect(chartContainer).toHaveStyle({
        height: '300px',
        width: '600px',
      });
    });
  });

  describe('Performance', () => {
    it('should debounce resize events', async () => {
      renderWithTheme();
      const resizeMock = (Chart as jest.Mock).mock.results[0].value.resize;

      // Trigger multiple resize events rapidly
      for (let i = 0; i < 5; i++) {
        fireEvent(window, new Event('resize'));
      }

      // Wait for debounce timeout
      await waitFor(() => {
        expect(resizeMock).toHaveBeenCalledTimes(1);
      }, { timeout: 300 });
    });

    it('should clean up resources on unmount', () => {
      const { unmount } = renderWithTheme();
      const destroyMock = (Chart as jest.Mock).mock.results[0].value.destroy;
      
      unmount();
      
      expect(destroyMock).toHaveBeenCalled();
      expect(window.removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
    });
  });
});