// @version react ^18.2.0
// @version chart.js ^4.4.0
// @version lodash ^4.17.21
// @version @mui/material ^5.x
import React, { useRef, useEffect, useMemo } from 'react';
import { Chart } from 'chart.js/auto';
import { merge, debounce } from 'lodash';
import { useTheme } from '@mui/material';

import { LineChartProps } from '../../interfaces/chart.interface';
import { lineChartOptions } from '../../config/chart.config';
import { createChartConfig, formatChartValue, formatTooltipContent } from '../../utils/chart.utils';

/**
 * LineChart Component
 * 
 * A reusable line chart component for visualizing time-series SaaS metrics data.
 * Built with Chart.js and implements WCAG 2.1 accessibility standards.
 * 
 * @param {LineChartProps} props - Component props
 * @returns {JSX.Element} Rendered line chart component
 */
const LineChart: React.FC<LineChartProps> = ({
  data,
  showLegend = true,
  xAxisLabel,
  yAxisLabel,
  height = 400,
  width,
  onDataPointClick,
  loading = false,
  error = null,
  className,
  style,
  testId = 'line-chart',
}) => {
  // Refs and hooks
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart | null>(null);
  const theme = useTheme();

  // Create memoized chart configuration
  const chartConfig = useMemo(() => {
    const baseConfig = createChartConfig(data, lineChartOptions);
    
    return merge({}, baseConfig, {
      options: {
        plugins: {
          legend: {
            display: showLegend,
          },
          tooltip: {
            callbacks: {
              label: (context: any) => formatTooltipContent(context),
            },
          },
        },
        scales: {
          x: {
            title: {
              display: !!xAxisLabel,
              text: xAxisLabel,
              font: {
                size: 14,
                weight: theme.typography.fontWeightMedium,
              },
            },
          },
          y: {
            title: {
              display: !!yAxisLabel,
              text: yAxisLabel,
              font: {
                size: 14,
                weight: theme.typography.fontWeightMedium,
              },
            },
            ticks: {
              callback: (value: number) => formatChartValue(value, 'number'),
            },
          },
        },
        onClick: (event: any, elements: any[]) => {
          if (elements.length > 0 && onDataPointClick) {
            const datasetIndex = elements[0].datasetIndex;
            const index = elements[0].index;
            onDataPointClick(data[datasetIndex].data[index]);
          }
        },
      },
    });
  }, [data, showLegend, xAxisLabel, yAxisLabel, theme, onDataPointClick]);

  // Handle chart resize with debouncing
  const handleResize = useMemo(
    () =>
      debounce(() => {
        if (chartInstanceRef.current) {
          chartInstanceRef.current.resize();
        }
      }, 250),
    []
  );

  // Initialize and update chart
  useEffect(() => {
    if (!canvasRef.current || loading || error) return;

    // Destroy existing chart instance
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    // Create new chart instance
    try {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        chartInstanceRef.current = new Chart(ctx, chartConfig);
      }
    } catch (err) {
      console.error('Error initializing chart:', err);
    }

    // Add resize listener
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [chartConfig, loading, error, handleResize]);

  // Handle loading and error states
  if (loading) {
    return (
      <div
        className={className}
        style={{ height, width, display: 'flex', alignItems: 'center', justifyContent: 'center', ...style }}
        data-testid={`${testId}-loading`}
      >
        Loading chart...
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={className}
        style={{ height, width, display: 'flex', alignItems: 'center', justifyContent: 'center', ...style }}
        data-testid={`${testId}-error`}
      >
        Error loading chart: {error}
      </div>
    );
  }

  // Render chart
  return (
    <div
      className={className}
      style={{ height, width, position: 'relative', ...style }}
      data-testid={testId}
    >
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={`Line chart showing ${yAxisLabel} over ${xAxisLabel}`}
        tabIndex={0}
      />
    </div>
  );
};

export default LineChart;