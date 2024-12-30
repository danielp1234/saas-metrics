// @version chart.js/auto ^4.4.0
import { ChartConfiguration } from 'chart.js/auto';
import { BaseComponentProps } from './common.interface';

/**
 * Interface representing a single data point in a chart.
 * Supports both numeric and string values for x-axis to accommodate different chart types.
 */
export interface ChartDataPoint {
  /** X-axis value - can be numeric for continuous data or string for categorical data */
  x: number | string;
  /** Y-axis value - must be numeric */
  y: number;
  /** Optional label for the data point */
  label?: string;
  /** Optional additional data for tooltip display */
  tooltipData?: Record<string, any>;
}

/**
 * Interface for chart dataset configuration with enhanced styling options.
 * Represents a single series of data in a chart with associated styling properties.
 */
export interface ChartDataset {
  /** Dataset label displayed in legend */
  label: string;
  /** Array of data points */
  data: ChartDataPoint[];
  /** Background color(s) for the dataset */
  backgroundColor: string | string[];
  /** Border color(s) for the dataset */
  borderColor: string | string[];
  /** Whether to fill the area under the line (for line charts) */
  fill: boolean;
  /** Line tension for curved lines (0 = straight, 1 = very curved) */
  tension: number;
  /** Radius of data points */
  pointRadius: number;
  /** Radius of data points on hover */
  pointHoverRadius: number;
}

/**
 * Interface for base chart component props.
 * Extends BaseComponentProps and includes common chart configuration options.
 */
export interface ChartProps extends BaseComponentProps {
  /** Array of datasets to display */
  data: ChartDataset[];
  /** Chart.js configuration options */
  options?: ChartConfiguration['options'];
  /** Chart height in pixels */
  height?: number;
  /** Chart width in pixels */
  width?: number;
  /** Callback function for data point click events */
  onDataPointClick?: (point: ChartDataPoint) => void;
  /** Loading state indicator */
  loading?: boolean;
  /** Error message if chart fails to load */
  error?: string | null;
}

/**
 * Interface for line chart specific props.
 * Extends ChartProps with additional line chart specific configurations.
 */
export interface LineChartProps extends ChartProps {
  /** Toggle legend visibility */
  showLegend: boolean;
  /** X-axis label */
  xAxisLabel: string;
  /** Y-axis label */
  yAxisLabel: string;
  /** Enable zoom functionality */
  enableZoom: boolean;
  /** Show grid lines */
  showGridLines: boolean;
}

/**
 * Interface for distribution chart specific props.
 * Specialized for displaying statistical distributions and percentiles.
 */
export interface DistributionChartProps extends ChartProps {
  /** Toggle percentile markers visibility */
  showPercentiles: boolean;
  /** X-axis label */
  xAxisLabel: string;
  /** Y-axis label */
  yAxisLabel: string;
  /** Array of percentile values to display as lines */
  percentileLines: number[];
  /** Toggle distribution curve visibility */
  showDistributionCurve: boolean;
}

/**
 * Interface for percentile chart specific props.
 * Specialized for displaying percentile-based metrics with benchmark comparisons.
 */
export interface PercentileChartProps extends ChartProps {
  /** Toggle benchmark indicators visibility */
  showBenchmarks: boolean;
  /** X-axis label */
  xAxisLabel: string;
  /** Y-axis label */
  yAxisLabel: string;
  /** Benchmark data for comparison */
  benchmarkData: Record<string, number>;
  /** Toggle percentile label visibility */
  showPercentileLabels: boolean;
}

/**
 * Interface for chart theming options.
 * Provides consistent styling across all chart types.
 */
export interface ChartTheme {
  /** Array of colors for data series */
  colors: string[];
  /** Font family for all text elements */
  fontFamily: string;
  /** Base font size in pixels */
  fontSize: number;
  /** Color for grid lines */
  gridColor: string;
  /** Background color for tooltips */
  tooltipBackgroundColor: string;
}

/**
 * Interface for chart accessibility options.
 * Ensures charts meet WCAG 2.1 Level AA compliance requirements.
 */
export interface ChartAccessibility {
  /** ARIA label for screen readers */
  ariaLabel: string;
  /** ARIA role */
  role: string;
  /** Tab index for keyboard navigation */
  tabIndex: number;
  /** Enable keyboard navigation */
  keyboardNavigation: boolean;
}