/**
 * @fileoverview Metrics service configuration
 * Defines comprehensive configuration settings for the SaaS metrics platform
 * including validation rules, caching settings, and metric-specific configurations.
 * @version 1.0.0
 */

import { MetricsConfig } from '../interfaces/config.interface';
import { MetricType } from '../interfaces/metrics.interface';
import { CACHE_TTL } from '../utils/constants';

/**
 * Comprehensive metrics service configuration
 * Implements settings based on technical specifications section 3.2
 */
export const metricsConfig: MetricsConfig = {
  // Enable metrics collection and processing
  enabled: true,

  // Metric name prefix for consistent naming
  prefix: 'saas_metrics',

  // Default labels applied to all metrics
  defaultLabels: {
    environment: process.env.NODE_ENV || 'development',
    service: 'metrics',
    version: process.env.APP_VERSION || '1.0.0'
  },

  // Validation configuration based on A.1.1 Metric Calculation Methods
  validation: {
    enabled: true,
    strictMode: true,
    rules: {
      // Revenue Growth Rate validation
      [MetricType.REVENUE_GROWTH]: {
        min: -100,
        max: 1000,
        precision: 2,
        required: true,
        description: 'Percentage change in ARR between periods',
        formula: '((Current ARR - Previous ARR) / Previous ARR) × 100'
      },

      // Net Dollar Retention validation
      [MetricType.NDR]: {
        min: 0,
        max: 200,
        precision: 2,
        required: true,
        description: 'Revenue retention including expansions',
        formula: '((Beginning ARR + Expansion - Contraction - Churn) / Beginning ARR) × 100'
      },

      // Magic Number validation
      [MetricType.MAGIC_NUMBER]: {
        min: -10,
        max: 10,
        precision: 3,
        required: true,
        description: 'Sales efficiency metric',
        formula: 'Net New ARR / Sales & Marketing Spend'
      },

      // EBITDA Margin validation
      [MetricType.EBITDA_MARGIN]: {
        min: -100,
        max: 100,
        precision: 2,
        required: true,
        description: 'Profitability metric as percentage of revenue',
        formula: '(EBITDA / Revenue) × 100'
      },

      // ARR per Employee validation
      [MetricType.ARR_PER_EMPLOYEE]: {
        min: 0,
        max: 1000000,
        precision: 0,
        required: true,
        description: 'Revenue efficiency per employee',
        formula: 'Total ARR / Full-time Employee Count'
      }
    }
  },

  // Caching configuration based on section 2.4 Cross-Cutting Concerns
  caching: {
    enabled: true,
    ttlSeconds: {
      metrics: CACHE_TTL.METRICS,      // 15 minutes default TTL
      benchmarks: CACHE_TTL.BENCHMARKS // 15 minutes default TTL
    },
    keys: {
      metricsList: 'metrics:list',
      metricDetail: 'metrics:detail:',  // Append metric ID
      benchmarkData: 'metrics:benchmark:', // Append metric ID and ARR range
      validationRules: 'metrics:validation:'
    },
    options: {
      compression: true,               // Enable compression for large datasets
      maxMemoryPolicy: 'allkeys-lru',  // Least Recently Used eviction policy
      enableKeyspaceEvents: true       // Enable cache invalidation events
    }
  },

  // Performance optimization settings
  performance: {
    sampleRate: 1.0,                   // 100% sampling rate for accuracy
    aggregationInterval: 60,           // Aggregate data every 60 seconds
    batchSize: 1000,                   // Process 1000 records per batch
    parallelization: {
      enabled: true,
      maxWorkers: 4                    // Maximum worker threads for processing
    }
  },

  // Error handling configuration
  errorHandling: {
    retryAttempts: 3,
    retryDelay: 1000,                 // 1 second delay between retries
    fallbackValue: null,              // Return null for failed calculations
    logErrors: true                   // Log all validation and calculation errors
  },

  // Monitoring configuration
  monitoring: {
    enabled: true,
    metrics: {
      calculationTime: true,          // Track metric calculation performance
      validationErrors: true,         // Track validation error rates
      cacheHitRate: true             // Track cache effectiveness
    },
    alerting: {
      errorThreshold: 0.01,          // Alert on 1% error rate
      latencyThreshold: 500          // Alert on 500ms+ calculation time
    }
  }
};

/**
 * Export the metrics configuration as default
 * Enables easy import and usage across the application
 */
export default metricsConfig;