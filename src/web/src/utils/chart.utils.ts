// chart.js v4.4.0
import { Chart, ChartData, ChartOptions } from 'chart.js';
// lodash v4.17.21
import merge from 'lodash/merge';
import { ChartProps, MetricChartData, ChartAccessibility, ChartTheme } from '../interfaces/chart.interface';
import { LINE_CHART_CONFIG, CHART_COLORS, CHART_FONT } from '../config/chart.config';

// Constants for chart configuration
const DEFAULT_BIN_COUNT = 10;
const PERCENTILE_POINTS = [5, 25, 50, 75, 90];
const MIN_DATA_POINTS = 5;

/**
 * Configuration for chart animations with performance optimization
 */
const CHART_ANIMATION_CONFIG = {
  duration: 750,
  easing: 'easeInOutQuart',
  threshold: 1000 // Disable animations for large datasets
};

/**
 * Enhanced accessibility configuration meeting WCAG 2.1 Level AA requirements
 */
const ACCESSIBILITY_CONFIG: ChartAccessibility = {
  alt: 'SaaS Metrics Visualization',
  role: 'graphics-document',
  ariaLabels: {
    chartLabel: 'Interactive chart displaying SaaS metrics data',
    tooltipLabel: 'Click to view detailed metrics',
    legendLabel: 'Chart legend with metric categories'
  }
};

/**
 * Generates optimized distribution data with dynamic bin sizing and validation
 * @param values - Array of numeric values to generate distribution
 * @param binCount - Optional number of bins (default: DEFAULT_BIN_COUNT)
 * @param options - Optional configuration for distribution calculation
 * @returns Optimized distribution data with validation metadata
 */
export function generateDistributionData(
  values: number[],
  binCount: number = DEFAULT_BIN_COUNT,
  options: {
    normalize?: boolean;
    excludeOutliers?: boolean;
  } = {}
): { bins: number[]; frequencies: number[]; metadata: any } {
  if (!values?.length || values.length < MIN_DATA_POINTS) {
    throw new Error(`Insufficient data points. Minimum required: ${MIN_DATA_POINTS}`);
  }

  // Remove outliers if specified
  let processedValues = values;
  if (options.excludeOutliers) {
    const q1 = calculatePercentile(values, 25);
    const q3 = calculatePercentile(values, 75);
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    processedValues = values.filter(v => v >= lowerBound && v <= upperBound);
  }

  // Calculate bin size using optimized algorithm
  const min = Math.min(...processedValues);
  const max = Math.max(...processedValues);
  const binSize = (max - min) / binCount;

  // Use TypedArray for better performance with large datasets
  const frequencies = new Float64Array(binCount).fill(0);
  const bins = new Float64Array(binCount + 1);

  // Generate bin edges
  for (let i = 0; i <= binCount; i++) {
    bins[i] = min + (i * binSize);
  }

  // Calculate frequencies
  processedValues.forEach(value => {
    const binIndex = Math.min(Math.floor((value - min) / binSize), binCount - 1);
    frequencies[binIndex]++;
  });

  // Normalize if requested
  if (options.normalize) {
    const total = processedValues.length;
    for (let i = 0; i < frequencies.length; i++) {
      frequencies[i] = (frequencies[i] / total) * 100;
    }
  }

  return {
    bins: Array.from(bins),
    frequencies: Array.from(frequencies),
    metadata: {
      total: processedValues.length,
      min,
      max,
      binSize,
      outliers: values.length - processedValues.length
    }
  };
}

/**
 * Calculates percentile values with error bounds and confidence intervals
 * @param values - Array of numeric values
 * @param options - Optional configuration for percentile calculation
 * @returns Normalized percentile data with error bounds
 */
export function generatePercentileData(
  values: number[],
  options: {
    percentiles?: number[];
    confidence?: number;
  } = {}
): { percentiles: Record<number, number>; bounds: Record<number, [number, number]> } {
  if (!values?.length || values.length < MIN_DATA_POINTS) {
    throw new Error(`Insufficient data points. Minimum required: ${MIN_DATA_POINTS}`);
  }

  const percentilePoints = options.percentiles || PERCENTILE_POINTS;
  const confidence = options.confidence || 0.95;
  const results: Record<number, number> = {};
  const bounds: Record<number, [number, number]> = {};

  // Calculate percentiles and confidence intervals
  percentilePoints.forEach(p => {
    results[p] = calculatePercentile(values, p);
    bounds[p] = calculateConfidenceInterval(values, p, confidence);
  });

  return { percentiles: results, bounds };
}

/**
 * Formats chart data with theme integration and accessibility features
 * @param data - Raw metric chart data
 * @param options - Chart configuration options
 * @param theme - Material-UI theme configuration
 * @returns Formatted chart data with accessibility support
 */
export function formatChartData(
  data: MetricChartData,
  options: ChartOptions = {},
  theme?: ChartTheme
): ChartData {
  // Merge with default configuration
  const mergedOptions = merge({}, LINE_CHART_CONFIG.options, options);

  // Apply theme-aware styling
  const colors = theme ? {
    primary: theme.primary,
    secondary: theme.secondary,
    text: theme.textColor,
    grid: theme.gridColor
  } : CHART_COLORS;

  // Format datasets with accessibility features
  const formattedDatasets = data.datasets.map((dataset, index) => ({
    ...dataset,
    borderColor: dataset.borderColor || colors.primary,
    backgroundColor: dataset.backgroundColor || colors.secondary,
    borderWidth: dataset.borderWidth || 2,
    tension: dataset.tension || 0.4,
    // Add ARIA labels for accessibility
    label: `${dataset.label} (${data.title || 'Metric'} ${index + 1})`,
  }));

  return {
    labels: data.labels,
    datasets: formattedDatasets
  };
}

/**
 * Helper function to calculate percentile values using QuickSelect algorithm
 * @param values - Array of numeric values
 * @param percentile - Percentile to calculate (0-100)
 * @returns Calculated percentile value
 */
function calculatePercentile(values: number[], percentile: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const index = (percentile / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;

  if (upper === lower) return sorted[index];
  return (1 - weight) * sorted[lower] + weight * sorted[upper];
}

/**
 * Calculates confidence intervals for percentile values
 * @param values - Array of numeric values
 * @param percentile - Percentile to calculate bounds for
 * @param confidence - Confidence level (0-1)
 * @returns Tuple of lower and upper bounds
 */
function calculateConfidenceInterval(
  values: number[],
  percentile: number,
  confidence: number
): [number, number] {
  const n = values.length;
  const p = percentile / 100;
  const z = confidence === 0.95 ? 1.96 : 2.576; // 95% or 99% confidence
  const stderr = Math.sqrt((p * (1 - p)) / n);
  
  const lower = Math.max(0, p - z * stderr);
  const upper = Math.min(1, p + z * stderr);
  
  return [
    calculatePercentile(values, lower * 100),
    calculatePercentile(values, upper * 100)
  ];
}