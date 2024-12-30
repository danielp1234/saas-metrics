// @mui/material v5.x - Material-UI theme constants
// chart.js v4.4.0 - Chart configuration constants
import { MetricCategory } from '../interfaces/metrics.interface';
import { ThemeMode } from '../interfaces/common.interface';

/**
 * Application name constant
 */
export const APP_NAME = 'SaaS Metrics Platform';

/**
 * Responsive breakpoint constants aligned with design specifications
 * @see Technical Specification 3.1.1 Design Specifications
 */
export const BREAKPOINTS = {
  MOBILE: 320,   // 320px - 767px
  TABLET: 768,   // 768px - 1023px
  DESKTOP: 1024  // 1024px+
} as const;

/**
 * Grid column configuration for responsive layouts
 */
export const GRID_COLUMNS = {
  MOBILE: 1,   // Single column for mobile
  TABLET: 2,   // Two columns for tablet
  DESKTOP: 3   // Three columns for desktop
} as const;

/**
 * Available ARR (Annual Recurring Revenue) range options for filtering
 */
export const ARR_RANGES = [
  '$1M-$5M',
  '$5M-$10M',
  '$10M-$20M',
  '$20M-$50M',
  '$50M+',
  'All'
] as const;

/**
 * Metric categories for grouping and filtering SaaS metrics
 */
export const METRIC_CATEGORIES = {
  GROWTH: MetricCategory.GROWTH,
  EFFICIENCY: MetricCategory.EFFICIENCY,
  PROFITABILITY: MetricCategory.PROFITABILITY,
  RETENTION: MetricCategory.RETENTION
} as const;

/**
 * Theme configuration constants
 * Currently supporting light mode only as per Phase 1 requirements
 */
export const THEME = {
  MODE: ThemeMode.light,
  SPACING: 8,          // Base spacing unit in pixels
  CARD_ELEVATION: 2    // Material card elevation level
} as const;

/**
 * Cache configuration
 * TTL (Time To Live) in seconds for cached data
 */
export const CACHE_TTL = 900; // 15 minutes

/**
 * API endpoint configuration
 * Base URLs and endpoints for API requests
 */
export const API = {
  BASE_URL: '/api/v1',
  ENDPOINTS: {
    METRICS: '/metrics',
    BENCHMARKS: '/benchmarks',
    EXPORT: '/export',
    ADMIN: {
      DATA: '/admin/data',
      SOURCES: '/admin/sources'
    }
  }
} as const;

/**
 * Chart configuration constants
 */
export const CHART = {
  TYPES: {
    LINE: 'line',
    BAR: 'bar',
    DISTRIBUTION: 'distribution',
    PERCENTILE: 'percentile'
  },
  COLORS: {
    PRIMARY: '#1976d2',
    SECONDARY: '#dc004e',
    GRID: '#f0f0f0',
    TEXT: '#333333'
  },
  FONT: {
    FAMILY: '"Roboto", "Helvetica", "Arial", sans-serif',
    SIZE: 12,
    WEIGHT: 400
  }
} as const;

/**
 * Data visualization constants
 */
export const VISUALIZATION = {
  PERCENTILES: [5, 25, 50, 75, 90],  // Standard percentile points
  UPDATE_INTERVAL: 60000,             // Data refresh interval in milliseconds
  MIN_CHART_HEIGHT: 300,             // Minimum chart height in pixels
  ANIMATION_DURATION: 750            // Chart animation duration in milliseconds
} as const;

/**
 * Error message constants
 */
export const ERROR_MESSAGES = {
  LOADING_FAILED: 'Failed to load data. Please try again.',
  INVALID_FILTER: 'Invalid filter parameters provided.',
  EXPORT_FAILED: 'Failed to export data. Please try again.',
  NO_DATA: 'No data available for the selected filters.'
} as const;

/**
 * Validation constants
 */
export const VALIDATION = {
  MIN_ARR: 1000000,    // Minimum ARR value in dollars
  MAX_ARR: 1000000000, // Maximum ARR value in dollars
  DATE_FORMAT: 'YYYY-MM-DD',
  MAX_EXPORT_ROWS: 10000
} as const;