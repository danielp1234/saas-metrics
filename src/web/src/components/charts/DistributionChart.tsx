import React, { useRef, useEffect, memo, useCallback } from 'react';
import { Chart } from 'chart.js/auto';
import { Box } from '@mui/material';
import { DistributionData } from '../../interfaces/chart.interface';
import { DISTRIBUTION_CHART_CONFIG } from '../../config/chart.config';
import { generateDistributionData } from '../../utils/chart.utils';
import useTheme from '../../hooks/useTheme';

/**
 * Props interface for the DistributionChart component
 */
interface DistributionChartProps {
  /** Array of numeric values to create distribution from */
  values: number[];
  /** Number of bins for distribution histogram */
  binCount?: number;
  /** Chart height in pixels */
  height?: number;
  /** CSS class name for styling */
  className?: string;
  /** Accessibility label for the chart */
  ariaLabel?: string;
  /** Detailed accessibility description */
  ariaDescription?: string;
  /** Callback for keyboard navigation focus */
  onDataPointFocus?: (index: number, value: number) => void;
}

/**
 * A responsive and accessible distribution chart component that visualizes
 * statistical distribution of SaaS metrics data using Chart.js.
 *
 * Features:
 * - WCAG 2.1 Level AA compliance
 * - Responsive design with Material-UI integration
 * - Interactive tooltips and keyboard navigation
 * - Theme-aware styling
 * - Performance optimized with memoization
 *
 * @version Chart.js v4.4.0
 */
const DistributionChart: React.FC<DistributionChartProps> = memo(({
  values,
  binCount = 10,
  height = 300,
  className,
  ariaLabel = 'Metric Distribution Chart',
  ariaDescription = 'Statistical distribution of metric values with percentile indicators',
  onDataPointFocus
}) => {
  // Refs and hooks
  const chartRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstance = useRef<Chart | null>(null);
  const { theme } = useTheme();

  /**
   * Generates chart data with error handling and validation
   */
  const generateChartData = useCallback(() => {
    try {
      const { bins, frequencies, metadata } = generateDistributionData(values, binCount, {
        normalize: true,
        excludeOutliers: true
      });

      return {
        labels: bins.map((bin, index) => 
          index === bins.length - 1 ? `${bin.toFixed(1)}+` : bin.toFixed(1)
        ),
        datasets: [{
          label: 'Distribution',
          data: frequencies,
          backgroundColor: theme.palette.primary.main,
          borderColor: theme.palette.primary.dark,
          borderWidth: 1,
          barPercentage: 1,
          categoryPercentage: 0.9,
        }]
      };
    } catch (error) {
      console.error('Error generating distribution data:', error);
      return null;
    }
  }, [values, binCount, theme.palette]);

  /**
   * Handles keyboard navigation for accessibility
   */
  const handleKeyboardNavigation = useCallback((event: KeyboardEvent) => {
    if (!chartInstance.current) return;

    const activeElements = chartInstance.current.getActiveElements();
    const currentIndex = activeElements[0]?.index ?? -1;
    const dataLength = chartInstance.current.data.datasets[0].data.length;

    let newIndex = currentIndex;

    switch (event.key) {
      case 'ArrowRight':
        newIndex = Math.min(currentIndex + 1, dataLength - 1);
        break;
      case 'ArrowLeft':
        newIndex = Math.max(currentIndex - 1, 0);
        break;
      default:
        return;
    }

    if (newIndex !== currentIndex && onDataPointFocus) {
      const value = chartInstance.current.data.datasets[0].data[newIndex];
      onDataPointFocus(newIndex, value);
    }
  }, [onDataPointFocus]);

  /**
   * Initializes and updates chart instance
   */
  useEffect(() => {
    if (!chartRef.current) return;

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    const data = generateChartData();
    if (!data) return;

    // Merge default config with theme-specific options
    const config = {
      ...DISTRIBUTION_CHART_CONFIG.options,
      plugins: {
        ...DISTRIBUTION_CHART_CONFIG.options.plugins,
        tooltip: {
          ...DISTRIBUTION_CHART_CONFIG.options.plugins?.tooltip,
          callbacks: {
            label: (context: any) => `Frequency: ${context.parsed.y.toFixed(1)}%`,
            title: (tooltipItems: any[]) => `Range: ${tooltipItems[0].label}`
          }
        }
      }
    };

    // Destroy existing chart instance
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    // Create new chart instance
    chartInstance.current = new Chart(ctx, {
      type: 'bar',
      data,
      options: config
    });

    // Add keyboard event listeners
    document.addEventListener('keydown', handleKeyboardNavigation);

    // Cleanup
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
      document.removeEventListener('keydown', handleKeyboardNavigation);
    };
  }, [generateChartData, handleKeyboardNavigation]);

  return (
    <Box
      className={className}
      sx={{
        height,
        width: '100%',
        position: 'relative'
      }}
      role="img"
      aria-label={ariaLabel}
    >
      <canvas
        ref={chartRef}
        tabIndex={0}
        aria-description={ariaDescription}
        style={{ cursor: 'pointer' }}
      />
    </Box>
  );
});

DistributionChart.displayName = 'DistributionChart';

export default DistributionChart;