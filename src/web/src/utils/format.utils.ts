import { format } from 'd3-format';
import { MetricValue } from '../interfaces/metrics.interface';

/**
 * Configuration for number formatting
 */
const FORMAT_CONFIG = {
  percentage: {
    minDecimals: 0,
    maxDecimals: 20,
    defaultDecimals: 1
  },
  currency: {
    minDecimals: 0,
    maxDecimals: 4,
    defaultDecimals: 2,
    defaultSymbol: '$'
  },
  ratio: {
    minDecimals: 1,
    maxDecimals: 3,
    defaultDecimals: 2
  }
};

/**
 * Formats a number as a percentage with specified decimal places and validation
 * @param value - Number to format as percentage
 * @param decimals - Number of decimal places (0-20)
 * @param allowNegative - Whether to allow negative values
 * @returns Formatted percentage string with accessibility attributes
 */
export const formatPercentage = (
  value: number,
  decimals: number = FORMAT_CONFIG.percentage.defaultDecimals,
  allowNegative: boolean = true
): string => {
  // Validate input is a finite number
  if (!Number.isFinite(value)) {
    throw new Error('Invalid input: value must be a finite number');
  }

  // Validate decimals range
  if (decimals < FORMAT_CONFIG.percentage.minDecimals || decimals > FORMAT_CONFIG.percentage.maxDecimals) {
    throw new Error(`Decimals must be between ${FORMAT_CONFIG.percentage.minDecimals} and ${FORMAT_CONFIG.percentage.maxDecimals}`);
  }

  // Check for negative values if not allowed
  if (!allowNegative && value < 0) {
    throw new Error('Negative values are not allowed');
  }

  // Convert to percentage and format
  const percentValue = value * 100;
  const formatter = format(`.${decimals}f`);
  const formattedValue = formatter(percentValue);

  // Add accessibility attributes
  return {
    value: `${formattedValue}%`,
    ariaLabel: `${formattedValue} percent`
  };
};

/**
 * Formats a number as currency with specified decimal places and currency symbol
 * @param value - Number to format as currency
 * @param decimals - Number of decimal places (0-4)
 * @param currencySymbol - Currency symbol to use
 * @returns Formatted currency string with accessibility attributes
 */
export const formatCurrency = (
  value: number,
  decimals: number = FORMAT_CONFIG.currency.defaultDecimals,
  currencySymbol: string = FORMAT_CONFIG.currency.defaultSymbol
): string => {
  // Validate input is a finite number
  if (!Number.isFinite(value)) {
    throw new Error('Invalid input: value must be a finite number');
  }

  // Validate decimals range
  if (decimals < FORMAT_CONFIG.currency.minDecimals || decimals > FORMAT_CONFIG.currency.maxDecimals) {
    throw new Error(`Decimals must be between ${FORMAT_CONFIG.currency.minDecimals} and ${FORMAT_CONFIG.currency.maxDecimals}`);
  }

  // Format with thousands separator and decimal places
  const formatter = format(`,.${decimals}f`);
  const formattedValue = formatter(Math.abs(value));
  const sign = value < 0 ? '-' : '';

  // Add accessibility attributes
  return {
    value: `${sign}${currencySymbol}${formattedValue}`,
    ariaLabel: `${sign}${currencySymbol}${formattedValue} dollars`
  };
};

/**
 * Formats a metric value based on its unit type with validation
 * @param metricValue - Metric value object to format
 * @param unit - Unit type (percentage, currency, ratio)
 * @param options - Formatting options
 * @returns Formatted metric value with accessibility attributes
 */
export const formatMetricValue = (
  metricValue: MetricValue,
  unit: string,
  options: {
    decimals?: number;
    currencySymbol?: string;
    allowNegative?: boolean;
  } = {}
): string => {
  // Validate metric value object
  if (!metricValue || typeof metricValue.value !== 'number') {
    throw new Error('Invalid metric value object');
  }

  const value = metricValue.value;

  switch (unit.toUpperCase()) {
    case 'PERCENTAGE':
      return formatPercentage(value, options.decimals, options.allowNegative);
    case 'CURRENCY':
      return formatCurrency(value, options.decimals, options.currencySymbol);
    case 'RATIO':
      return {
        value: format(`.${options.decimals || FORMAT_CONFIG.ratio.defaultDecimals}f`)(value),
        ariaLabel: `ratio of ${format(`.${options.decimals || FORMAT_CONFIG.ratio.defaultDecimals}f`)(value)}`
      };
    default:
      return {
        value: format(',')(value),
        ariaLabel: `${format(',')(value)}`
      };
  }
};

/**
 * Formats distribution data for chart visualization
 * @param bins - Array of bin values
 * @param frequencies - Array of frequency values
 * @param options - Formatting options
 * @returns Formatted chart data object with accessibility metadata
 */
export const formatDistributionData = (
  bins: number[],
  frequencies: number[],
  options: {
    decimals?: number;
    unit?: string;
  } = {}
): object => {
  // Validate input arrays
  if (!bins.length || !frequencies.length) {
    throw new Error('Empty input arrays');
  }
  if (bins.length !== frequencies.length + 1) {
    throw new Error('Invalid bin and frequency array lengths');
  }

  const decimals = options.decimals || FORMAT_CONFIG.percentage.defaultDecimals;
  const formatter = format(`.${decimals}f`);

  // Format bin labels and frequencies
  const labels = bins.slice(0, -1).map((bin, i) => 
    `${formatter(bin)}-${formatter(bins[i + 1])}`
  );

  const formattedFrequencies = frequencies.map(freq => 
    formatPercentage(freq / Math.max(...frequencies), decimals)
  );

  return {
    labels,
    data: formattedFrequencies,
    ariaLabel: 'Distribution chart data',
    description: `Distribution across ${labels.length} ranges`
  };
};

/**
 * Formats percentile data for visualization with custom labels
 * @param percentiles - Percentile data object
 * @param unit - Unit type for formatting
 * @param labelOptions - Custom label options
 * @returns Formatted percentile data with accessibility metadata
 */
export const formatPercentileData = (
  percentiles: MetricValue['percentiles'],
  unit: string,
  labelOptions: {
    customLabels?: { [key: string]: string };
    decimals?: number;
  } = {}
): object => {
  // Validate percentile data
  if (!percentiles || !Object.keys(percentiles).length) {
    throw new Error('Invalid percentile data');
  }

  const defaultLabels = {
    p5: '5th Percentile',
    p25: '25th Percentile',
    p50: 'Median',
    p75: '75th Percentile',
    p90: '90th Percentile'
  };

  const labels = { ...defaultLabels, ...labelOptions.customLabels };

  // Format each percentile value
  const formattedData = Object.entries(percentiles).reduce((acc, [key, value]) => ({
    ...acc,
    [key]: formatMetricValue({ value } as MetricValue, unit, {
      decimals: labelOptions.decimals
    })
  }), {});

  return {
    data: formattedData,
    labels,
    ariaLabel: 'Percentile distribution data',
    description: 'Statistical distribution across key percentiles'
  };
};