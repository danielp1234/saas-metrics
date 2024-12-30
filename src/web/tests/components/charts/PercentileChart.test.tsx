// @version react ^18.2.0
// @version @testing-library/react ^14.0.0
// @version @testing-library/jest-dom ^5.16.5
// @version chart.js ^4.4.0
// @version @axe-core/react ^4.7.3
// @version @mui/material ^5.x.x

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { axe, toHaveNoViolations } from '@axe-core/react';
import { ThemeProvider } from '@mui/material';
import theme from '../../../src/assets/styles/theme';
import PercentileChart from '../../../src/components/charts/PercentileChart';
import { createChartConfig } from '../../../src/utils/chart.utils';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock Chart.js
jest.mock('chart.js/auto', () => {
  return {
    Chart: jest.fn().mockImplementation(() => ({
      destroy: jest.fn(),
      update: jest.fn(),
      data: { datasets: [] },
      resize: jest.fn(),
      canvas: document.createElement('canvas'),
    })),
    register: jest.fn(),
  };
});

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Test data
const validData = [
  {
    label: 'Revenue Growth',
    data: [
      { x: 'p10', y: 10 },
      { x: 'p25', y: 25 },
      { x: 'p50', y: 50 },
      { x: 'p75', y: 75 },
      { x: 'p90', y: 90 },
    ],
    backgroundColor: theme.palette.chart.p50,
    borderColor: theme.palette.chart.p90,
    fill: true,
    tension: 0.4,
  },
];

const benchmarkData = {
  p10: 12,
  p25: 28,
  p50: 45,
  p75: 72,
  p90: 88,
};

// Wrapper component for tests
const renderWithTheme = (ui: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {ui}
    </ThemeProvider>
  );
};

describe('PercentileChart', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render successfully with valid data', () => {
      const { container } = renderWithTheme(
        <PercentileChart
          data={validData}
          xAxisLabel="Percentile"
          yAxisLabel="Revenue Growth"
          showBenchmarks={true}
          benchmarkData={benchmarkData}
          showPercentileLabels={true}
        />
      );

      expect(container.querySelector('canvas')).toBeInTheDocument();
      expect(screen.getByRole('region')).toHaveAttribute(
        'aria-label',
        'Percentile distribution chart for Revenue Growth'
      );
    });

    it('should display loading state correctly', () => {
      renderWithTheme(
        <PercentileChart
          data={validData}
          loading={true}
          xAxisLabel="Percentile"
          yAxisLabel="Revenue Growth"
          showBenchmarks={true}
          benchmarkData={benchmarkData}
          showPercentileLabels={true}
        />
      );

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should display error state correctly', () => {
      const errorMessage = 'Failed to load chart data';
      renderWithTheme(
        <PercentileChart
          data={validData}
          error={errorMessage}
          xAxisLabel="Percentile"
          yAxisLabel="Revenue Growth"
          showBenchmarks={true}
          benchmarkData={benchmarkData}
          showPercentileLabels={true}
        />
      );

      expect(screen.getByRole('alert')).toHaveTextContent(errorMessage);
    });
  });

  describe('Interaction', () => {
    it('should handle resize events correctly', async () => {
      const { container } = renderWithTheme(
        <PercentileChart
          data={validData}
          xAxisLabel="Percentile"
          yAxisLabel="Revenue Growth"
          showBenchmarks={true}
          benchmarkData={benchmarkData}
          showPercentileLabels={true}
        />
      );

      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();

      // Trigger resize observer
      const resizeObserverCallback = (global.ResizeObserver as jest.Mock).mock.calls[0][0];
      resizeObserverCallback([
        {
          contentRect: {
            width: 800,
            height: 400,
          },
        },
      ]);

      await waitFor(() => {
        expect(Chart.prototype.resize).toHaveBeenCalled();
      });
    });

    it('should cleanup chart instance on unmount', () => {
      const { unmount } = renderWithTheme(
        <PercentileChart
          data={validData}
          xAxisLabel="Percentile"
          yAxisLabel="Revenue Growth"
          showBenchmarks={true}
          benchmarkData={benchmarkData}
          showPercentileLabels={true}
        />
      );

      unmount();
      expect(Chart.prototype.destroy).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should meet WCAG 2.1 Level AA standards', async () => {
      const { container } = renderWithTheme(
        <PercentileChart
          data={validData}
          xAxisLabel="Percentile"
          yAxisLabel="Revenue Growth"
          showBenchmarks={true}
          benchmarkData={benchmarkData}
          showPercentileLabels={true}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper ARIA labels', () => {
      renderWithTheme(
        <PercentileChart
          data={validData}
          xAxisLabel="Percentile"
          yAxisLabel="Revenue Growth"
          showBenchmarks={true}
          benchmarkData={benchmarkData}
          showPercentileLabels={true}
        />
      );

      const chart = screen.getByRole('region');
      expect(chart).toHaveAttribute('aria-label', expect.stringContaining('Revenue Growth'));
      
      const canvas = screen.getByRole('img');
      expect(canvas).toHaveAttribute('aria-label', expect.stringContaining('distribution'));
    });
  });

  describe('Performance', () => {
    it('should handle large datasets efficiently', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        x: `p${i}`,
        y: Math.random() * 100,
      }));

      const startTime = performance.now();
      
      renderWithTheme(
        <PercentileChart
          data={[{ ...validData[0], data: largeDataset }]}
          xAxisLabel="Percentile"
          yAxisLabel="Revenue Growth"
          showBenchmarks={true}
          benchmarkData={benchmarkData}
          showPercentileLabels={true}
        />
      );

      const renderTime = performance.now() - startTime;
      expect(renderTime).toBeLessThan(100); // 100ms threshold
    });

    it('should update efficiently when data changes', async () => {
      const { rerender } = renderWithTheme(
        <PercentileChart
          data={validData}
          xAxisLabel="Percentile"
          yAxisLabel="Revenue Growth"
          showBenchmarks={true}
          benchmarkData={benchmarkData}
          showPercentileLabels={true}
        />
      );

      const updatedData = [...validData];
      updatedData[0].data = updatedData[0].data.map(point => ({ ...point, y: point.y * 1.1 }));

      const startTime = performance.now();
      
      rerender(
        <PercentileChart
          data={updatedData}
          xAxisLabel="Percentile"
          yAxisLabel="Revenue Growth"
          showBenchmarks={true}
          benchmarkData={benchmarkData}
          showPercentileLabels={true}
        />
      );

      const updateTime = performance.now() - startTime;
      expect(updateTime).toBeLessThan(50); // 50ms threshold
      expect(Chart.prototype.update).toHaveBeenCalledWith('none');
    });
  });
});