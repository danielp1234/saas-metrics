/**
 * @fileoverview Comprehensive utility module for type-safe formatting of metrics, currencies, percentages, and dates
 * Implements enterprise-grade formatting with extensive validation and error handling
 * @version 1.0.0
 */

import { format } from 'date-fns';
import numeral from 'numeral';
import { MetricType } from '../interfaces/metrics.interface';
import { METRIC_VALIDATION } from './constants';

/**
 * Options for metric value formatting
 */
interface FormatOptions {
  /** Number of decimal places */
  precision?: number;
  /** Include unit symbol */
  includeSymbol?: boolean;
  /** Custom format string */
  format?: string;
  /** Locale for formatting */
  locale?: string;
}

/**
 * Options for percentage formatting
 */
interface PercentageOptions {
  /** Number of decimal places */
  precision?: number;
  /** Include space before % */
  spaceBeforeSymbol?: boolean;
  /** Format for negative values */
  negativeFormat?: 'parentheses' | 'minus';
}

/**
 * Options for currency formatting
 */
interface CurrencyOptions {
  /** Currency symbol */
  symbol?: string;
  /** Symbol position */
  symbolPosition?: 'prefix' | 'suffix';
  /** Number of decimal places */
  precision?: number;
  /** Include thousands separator */
  thousandsSeparator?: boolean;
}

/**
 * Options for date formatting
 */
interface DateFormatOptions {
  /** Timezone offset in minutes */
  timezone?: number;
  /** Locale for formatting */
  locale?: string;
  /** Include timezone */
  includeTimezone?: boolean;
}

/**
 * Custom error class for formatting errors
 */
class FormattingError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'FormattingError';
  }
}

/**
 * Formats a metric value according to its type and validation rules
 * @param value - Numeric value to format
 * @param metricType - Type of metric from MetricType enum
 * @param options - Optional formatting options
 * @returns Formatted string value
 * @throws FormattingError if validation fails
 */
export function formatMetricValue(
  value: number,
  metricType: MetricType,
  options: FormatOptions = {}
): string {
  // Validate input value
  if (typeof value !== 'number' || isNaN(value)) {
    throw new FormattingError('Invalid numeric value', 'INVALID_NUMBER');
  }

  const validation = METRIC_VALIDATION[metricType];
  if (!validation) {
    throw new FormattingError(`Unknown metric type: ${metricType}`, 'UNKNOWN_METRIC_TYPE');
  }

  // Check boundaries
  if (value < validation.MIN || value > validation.MAX) {
    throw new FormattingError(
      `Value ${value} outside valid range [${validation.MIN}, ${validation.MAX}]`,
      'OUT_OF_RANGE'
    );
  }

  // Format based on unit type
  switch (validation.UNIT) {
    case 'percentage':
      return formatPercentage(value, options.precision ?? 1);
    case 'ratio':
      return numeral(value).format(options.format ?? '0.00');
    case 'currency':
      return formatCurrency(value, {
        symbol: '$',
        precision: options.precision ?? 0,
      });
    default:
      throw new FormattingError(`Unsupported unit type: ${validation.UNIT}`, 'UNSUPPORTED_UNIT');
  }
}

/**
 * Formats a number as a percentage with specified precision
 * @param value - Numeric value to format as percentage
 * @param precision - Number of decimal places
 * @param options - Optional formatting options
 * @returns Formatted percentage string
 * @throws FormattingError if validation fails
 */
export function formatPercentage(
  value: number,
  precision: number = 1,
  options: PercentageOptions = {}
): string {
  if (typeof value !== 'number' || isNaN(value)) {
    throw new FormattingError('Invalid numeric value', 'INVALID_NUMBER');
  }

  const {
    spaceBeforeSymbol = true,
    negativeFormat = 'minus'
  } = options;

  // Format the number with specified precision
  const formatted = numeral(value).format(`0.${'0'.repeat(precision)}`);

  // Handle negative values
  if (value < 0) {
    const absFormatted = formatted.substring(1); // Remove the minus sign
    return negativeFormat === 'parentheses'
      ? `(${absFormatted}${spaceBeforeSymbol ? ' ' : ''}%)`
      : `-${absFormatted}${spaceBeforeSymbol ? ' ' : ''}%`;
  }

  return `${formatted}${spaceBeforeSymbol ? ' ' : ''}%`;
}

/**
 * Formats a number as currency with specified options
 * @param value - Numeric value to format as currency
 * @param options - Optional formatting options
 * @returns Formatted currency string
 * @throws FormattingError if validation fails
 */
export function formatCurrency(
  value: number,
  options: CurrencyOptions = {}
): string {
  if (typeof value !== 'number' || isNaN(value)) {
    throw new FormattingError('Invalid numeric value', 'INVALID_NUMBER');
  }

  const {
    symbol = '$',
    symbolPosition = 'prefix',
    precision = 0,
    thousandsSeparator = true
  } = options;

  // Create format string based on options
  const format = `${thousandsSeparator ? '0,0' : '0'}${precision > 0 ? '.' + '0'.repeat(precision) : ''}`;
  const formatted = numeral(value).format(format);

  return symbolPosition === 'prefix'
    ? `${symbol}${formatted}`
    : `${formatted}${symbol}`;
}

/**
 * Formats a date with specified format string and options
 * @param date - Date to format
 * @param formatString - Format string for date-fns
 * @param options - Optional formatting options
 * @returns Formatted date string
 * @throws FormattingError if validation fails
 */
export function formatDate(
  date: Date,
  formatString: string,
  options: DateFormatOptions = {}
): string {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new FormattingError('Invalid date value', 'INVALID_DATE');
  }

  try {
    const {
      timezone,
      includeTimezone = false
    } = options;

    // Adjust for timezone if specified
    let adjustedDate = date;
    if (timezone !== undefined) {
      const offset = timezone - date.getTimezoneOffset();
      adjustedDate = new Date(date.getTime() + offset * 60000);
    }

    // Add timezone to format string if requested
    const finalFormat = includeTimezone ? `${formatString} xxx` : formatString;

    return format(adjustedDate, finalFormat);
  } catch (error) {
    throw new FormattingError(
      `Date formatting failed: ${(error as Error).message}`,
      'FORMAT_ERROR'
    );
  }
}