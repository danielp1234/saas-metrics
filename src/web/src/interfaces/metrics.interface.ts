// chart.js v4.4.0 - Chart type definitions for visualization
import { ChartData, ChartOptions } from 'chart.js';
// Internal imports for chart component props
import { ChartProps } from '../interfaces/chart.interface';

/**
 * Enumeration of metric unit types for consistent unit representation
 * across the application.
 */
export enum MetricUnit {
  PERCENTAGE = 'PERCENTAGE',
  CURRENCY = 'CURRENCY',
  RATIO = 'RATIO',
  NUMBER = 'NUMBER'
}

/**
 * Enumeration of metric categories for logical grouping and filtering
 * of SaaS performance indicators.
 */
export enum MetricCategory {
  GROWTH = 'GROWTH',
  EFFICIENCY = 'EFFICIENCY',
  PROFITABILITY = 'PROFITABILITY',
  RETENTION = 'RETENTION'
}

/**
 * Core interface defining the structure of a SaaS metric.
 * Includes comprehensive metadata and calculation specifications.
 */
export interface Metric {
  /** Unique identifier for the metric */
  id: string;
  /** Display name of the metric */
  name: string;
  /** Detailed description of what the metric measures */
  description: string;
  /** Formula or method used to calculate the metric */
  calculationMethod: string;
  /** Unit type for the metric value */
  unit: MetricUnit;
  /** Category classification of the metric */
  category: MetricCategory;
  /** Required data points for metric calculation */
  dataPoints: string[];
}

/**
 * Interface for percentile distribution data.
 * Provides statistical breakdowns at key percentile points.
 */
export interface PercentileData {
  p5: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

/**
 * Interface for statistical distribution analysis.
 * Enables detailed statistical analysis and visualization.
 */
export interface DistributionData {
  /** Array of bin boundaries for histogram */
  bins: number[];
  /** Array of frequency counts for each bin */
  frequencies: number[];
  /** Arithmetic mean of the distribution */
  mean: number;
  /** Standard deviation of the distribution */
  standardDeviation: number;
}

/**
 * Interface for metric values with comprehensive statistical data.
 * Combines raw values with statistical analysis for benchmarking.
 */
export interface MetricValue {
  /** Reference to the associated metric */
  metricId: string;
  /** Actual metric value */
  value: number;
  /** Percentile distribution data */
  percentiles: PercentileData;
  /** Statistical distribution data */
  distribution: DistributionData;
  /** Timestamp of the metric value */
  timestamp: Date;
}

/**
 * Interface for metric filtering capabilities.
 * Enables flexible data filtering and analysis.
 */
export interface MetricFilter {
  /** ARR range filter */
  arrRange?: string;
  /** Metric category filter */
  category?: MetricCategory;
  /** Date range filter */
  dateRange?: {
    start: Date;
    end: Date;
  };
  /** Source filter */
  source?: string;
}

/**
 * Interface for metric comparison analysis.
 * Facilitates comparative analysis between metrics or time periods.
 */
export interface MetricComparison {
  /** Base metric value */
  baseValue: MetricValue;
  /** Comparison metric value */
  comparisonValue: MetricValue;
  /** Absolute difference */
  difference: number;
  /** Percentage change */
  percentageChange: number;
}

/**
 * Interface for metric visualization options.
 * Extends chart.js configuration with metric-specific options.
 */
export interface MetricVisualization extends ChartProps {
  /** Visualization type */
  type: 'line' | 'bar' | 'distribution' | 'percentile';
  /** Custom chart options */
  chartOptions?: ChartOptions;
  /** Chart data configuration */
  chartData: ChartData;
  /** Show/hide percentile markers */
  showPercentiles?: boolean;
  /** Show/hide distribution curve */
  showDistribution?: boolean;
}

/**
 * Interface for metric metadata.
 * Provides additional context and documentation for metrics.
 */
export interface MetricMetadata {
  /** Industry standard name if applicable */
  standardName?: string;
  /** Related metrics */
  relatedMetrics?: string[];
  /** Recommended visualization types */
  recommendedVisualizations?: string[];
  /** Usage guidelines */
  guidelines?: string;
  /** Data source information */
  source?: {
    name: string;
    description: string;
    lastUpdated: Date;
  };
}