// @version chart.js ^4.4.0
import { Chart, ChartConfiguration } from 'chart.js';
import { ChartDataPoint } from '../interfaces/chart.interface';
import { theme } from '../assets/styles/theme';

/**
 * Global chart color definitions using Material-UI theme palette
 */
const CHART_COLORS = {
  primary: theme.palette.primary.main,
  secondary: theme.palette.secondary.main,
  error: theme.palette.error.main,
  warning: theme.palette.warning.main,
  success: theme.palette.success.main,
  info: theme.palette.info.main,
  percentiles: {
    p90: theme.palette.chart.p90,
    p75: theme.palette.chart.p75,
    p50: theme.palette.chart.p50,
    p25: theme.palette.chart.p25,
    p05: theme.palette.chart.p05,
  },
};

/**
 * Global chart font configuration using Material-UI typography
 */
const CHART_FONT = {
  family: theme.typography.fontFamily,
  size: 12,
  weight: theme.typography.fontWeightRegular,
  lineHeight: 1.2,
};

/**
 * Creates a gradient background for chart datasets
 * @param ctx - Canvas rendering context
 * @param color - Base color for gradient
 * @param opacity - Maximum opacity value
 */
export const createChartGradient = (
  ctx: CanvasRenderingContext2D,
  color: string,
  opacity = 0.5
): CanvasGradient => {
  const gradient = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
  gradient.addColorStop(0, `${color}${Math.round(opacity * 255).toString(16)}`);
  gradient.addColorStop(0.5, `${color}${Math.round(opacity * 0.5 * 255).toString(16)}`);
  gradient.addColorStop(1, `${color}00`);
  return gradient;
};

/**
 * Formats numeric values for chart display
 * @param value - Numeric value to format
 * @param type - Type of value (percentage, currency, number)
 * @param precision - Number of decimal places
 */
export const formatChartValue = (
  value: number,
  type: 'percentage' | 'currency' | 'number',
  precision = 1
): string => {
  const formatter = new Intl.NumberFormat('en-US', {
    style: type === 'currency' ? 'currency' : 'decimal',
    currency: 'USD',
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });

  const formattedValue = formatter.format(value);
  return type === 'percentage' ? `${formattedValue}%` : formattedValue;
};

/**
 * Default chart options applied to all chart types
 */
export const defaultChartOptions: ChartConfiguration['options'] = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: 'top',
      labels: {
        font: CHART_FONT,
        usePointStyle: true,
        padding: 16,
      },
    },
    tooltip: {
      enabled: true,
      mode: 'index',
      intersect: false,
      backgroundColor: theme.palette.background.paper,
      titleColor: theme.palette.text.primary,
      bodyColor: theme.palette.text.secondary,
      borderColor: theme.palette.divider,
      borderWidth: 1,
      padding: 8,
      titleFont: {
        ...CHART_FONT,
        weight: theme.typography.fontWeightMedium,
      },
      bodyFont: CHART_FONT,
    },
  },
  animation: {
    duration: 750,
    easing: 'easeInOutQuart',
  },
  interaction: {
    mode: 'nearest',
    axis: 'x',
    intersect: false,
  },
};

/**
 * Line chart specific configuration
 */
export const lineChartOptions: ChartConfiguration['options'] = {
  ...defaultChartOptions,
  scales: {
    x: {
      grid: {
        display: true,
        color: theme.palette.divider,
      },
      ticks: {
        font: CHART_FONT,
        color: theme.palette.text.secondary,
      },
    },
    y: {
      beginAtZero: true,
      grid: {
        display: true,
        color: theme.palette.divider,
      },
      ticks: {
        font: CHART_FONT,
        color: theme.palette.text.secondary,
      },
    },
  },
  elements: {
    line: {
      tension: 0.4,
      borderWidth: 2,
    },
    point: {
      radius: 3,
      hoverRadius: 5,
    },
  },
};

/**
 * Distribution chart specific configuration
 */
export const distributionChartOptions: ChartConfiguration['options'] = {
  ...defaultChartOptions,
  scales: {
    x: {
      type: 'linear',
      grid: {
        display: false,
      },
      ticks: {
        font: CHART_FONT,
        callback: (value) => formatChartValue(Number(value), 'number'),
      },
    },
    y: {
      beginAtZero: true,
      grid: {
        display: true,
        color: theme.palette.divider,
      },
      ticks: {
        font: CHART_FONT,
        callback: (value) => formatChartValue(Number(value), 'percentage'),
      },
    },
  },
  plugins: {
    ...defaultChartOptions.plugins,
    annotation: {
      annotations: {
        p90Line: {
          type: 'line',
          borderColor: CHART_COLORS.percentiles.p90,
          borderWidth: 2,
          label: {
            content: 'P90',
            enabled: true,
          },
        },
        p75Line: {
          type: 'line',
          borderColor: CHART_COLORS.percentiles.p75,
          borderWidth: 2,
          label: {
            content: 'P75',
            enabled: true,
          },
        },
        p50Line: {
          type: 'line',
          borderColor: CHART_COLORS.percentiles.p50,
          borderWidth: 2,
          label: {
            content: 'P50',
            enabled: true,
          },
        },
      },
    },
  },
};

/**
 * Percentile chart specific configuration
 */
export const percentileChartOptions: ChartConfiguration['options'] = {
  ...defaultChartOptions,
  scales: {
    x: {
      type: 'category',
      grid: {
        display: false,
      },
      ticks: {
        font: CHART_FONT,
      },
    },
    y: {
      beginAtZero: true,
      grid: {
        display: true,
        color: theme.palette.divider,
      },
      ticks: {
        font: CHART_FONT,
        callback: (value) => formatChartValue(Number(value), 'percentage'),
      },
    },
  },
  plugins: {
    ...defaultChartOptions.plugins,
    tooltip: {
      ...defaultChartOptions.plugins?.tooltip,
      callbacks: {
        label: (context) => {
          const value = context.parsed.y;
          return formatChartValue(value, 'percentage');
        },
      },
    },
  },
};