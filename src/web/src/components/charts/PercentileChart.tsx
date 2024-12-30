// react-chartjs-2 v5.2.0
import React, { useMemo, useCallback } from 'react';
import { Line } from 'react-chartjs-2';
import { Box } from '@mui/material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions
} from 'chart.js';

// Internal imports
import { ChartProps, PercentileData } from '../../interfaces/chart.interface';
import { generatePercentileData } from '../../utils/chart.utils';
import { CHART_COLORS, PERCENTILE_CHART_CONFIG } from '../../config/chart.config';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface PercentileChartProps extends Omit<ChartProps, 'data'> {
  data: number[];
  title?: string;
  height?: number;
  className?: string;
  highContrastMode?: boolean;
  tooltipFormat?: string;
  onDataPointClick?: (value: number, percentile: number) => void;
}

/**
 * PercentileChart Component
 * 
 * Renders an accessible and performant percentile distribution chart using Chart.js
 * Compliant with WCAG 2.1 Level AA accessibility standards
 * 
 * @param props - Component props including data and configuration options
 * @returns React component displaying percentile distribution
 */
export const PercentileChart: React.FC<PercentileChartProps> = React.memo(({
  data,
  title = 'Percentile Distribution',
  height = 300,
  className,
  highContrastMode = false,
  tooltipFormat,
  onDataPointClick,
  options: customOptions,
  ...props
}) => {
  // Calculate percentile data with error handling
  const percentileData = useMemo(() => {
    try {
      const { percentiles, bounds } = generatePercentileData(data, {
        confidence: 0.95
      });
      return { percentiles, bounds };
    } catch (error) {
      console.error('Error calculating percentiles:', error);
      return null;
    }
  }, [data]);

  // Format chart data with accessibility features
  const chartData: ChartData = useMemo(() => {
    if (!percentileData) return { labels: [], datasets: [] };

    const { percentiles, bounds } = percentileData;
    const labels = ['P5', 'P25', 'P50', 'P75', 'P90'];
    const values = [
      percentiles[5],
      percentiles[25],
      percentiles[50],
      percentiles[75],
      percentiles[90]
    ];

    return {
      labels,
      datasets: [
        {
          label: title,
          data: values,
          borderColor: highContrastMode ? CHART_COLORS.highContrast : CHART_COLORS.primary,
          backgroundColor: CHART_COLORS.background,
          borderWidth: 2,
          tension: 0.4,
          pointRadius: 6,
          pointHoverRadius: 8
        },
        {
          label: 'Confidence Interval',
          data: labels.map((_, i) => bounds[PERCENTILE_POINTS[i]][1] - bounds[PERCENTILE_POINTS[i]][0]),
          borderColor: highContrastMode ? CHART_COLORS.highContrast : CHART_COLORS.secondary,
          backgroundColor: `${CHART_COLORS.secondary}20`,
          borderWidth: 1,
          tension: 0.4,
          fill: true
        }
      ]
    };
  }, [percentileData, title, highContrastMode]);

  // Merge custom options with default configuration
  const chartOptions: ChartOptions = useMemo(() => ({
    ...PERCENTILE_CHART_CONFIG.options,
    ...customOptions,
    plugins: {
      ...PERCENTILE_CHART_CONFIG.options.plugins,
      tooltip: {
        ...PERCENTILE_CHART_CONFIG.options.plugins?.tooltip,
        callbacks: {
          label: (context: any) => {
            const value = context.raw;
            return tooltipFormat
              ? tooltipFormat.replace('{value}', value.toFixed(2))
              : `Value: ${value.toFixed(2)}`;
          }
        }
      },
      legend: {
        ...PERCENTILE_CHART_CONFIG.options.plugins?.legend,
        labels: {
          ...PERCENTILE_CHART_CONFIG.options.plugins?.legend?.labels,
          color: highContrastMode ? CHART_COLORS.highContrast : CHART_COLORS.text
        }
      }
    },
    scales: {
      ...PERCENTILE_CHART_CONFIG.options.scales,
      y: {
        ...PERCENTILE_CHART_CONFIG.options.scales?.y,
        grid: {
          ...PERCENTILE_CHART_CONFIG.options.scales?.y?.grid,
          color: highContrastMode ? CHART_COLORS.highContrast : CHART_COLORS.grid
        }
      }
    }
  }), [customOptions, highContrastMode, tooltipFormat]);

  // Handle chart click events
  const handleClick = useCallback((event: any, elements: any[]) => {
    if (elements.length > 0 && onDataPointClick) {
      const datasetIndex = elements[0].datasetIndex;
      const index = elements[0].index;
      const value = chartData.datasets[datasetIndex].data[index] as number;
      const percentile = PERCENTILE_POINTS[index];
      onDataPointClick(value, percentile);
    }
  }, [chartData, onDataPointClick]);

  // Error state handling
  if (!percentileData) {
    return (
      <Box
        className={className}
        height={height}
        display="flex"
        alignItems="center"
        justifyContent="center"
        color="error.main"
        role="alert"
      >
        Error loading chart data
      </Box>
    );
  }

  return (
    <Box
      className={className}
      height={height}
      position="relative"
      role="img"
      aria-label={`${title} percentile distribution chart`}
      {...props}
    >
      <Line
        data={chartData}
        options={{
          ...chartOptions,
          onClick: handleClick
        }}
        plugins={[{
          id: 'customCanvasBackgroundColor',
          beforeDraw: (chart) => {
            const ctx = chart.canvas.getContext('2d');
            if (ctx) {
              ctx.save();
              ctx.globalCompositeOperation = 'destination-over';
              ctx.fillStyle = CHART_COLORS.background;
              ctx.fillRect(0, 0, chart.width, chart.height);
              ctx.restore();
            }
          }
        }]}
      />
    </Box>
  );
});

PercentileChart.displayName = 'PercentileChart';

export default PercentileChart;

// Constants used in the component
const PERCENTILE_POINTS = [5, 25, 50, 75, 90];