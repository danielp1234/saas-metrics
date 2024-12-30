// chart.js v4.4.0 - Chart visualization configuration
import { ChartType } from '../interfaces/chart.interface';
// Internal type definitions and constants
import { 
  Metric,
  MetricCategory,
  MetricUnit,
  MetricVisualization
} from '../interfaces/metrics.interface';
import { ARR_RANGES, CHART, VALIDATION } from './constants';

/**
 * Interface for metric validation rules
 */
interface ValidationRules {
  range: {
    min: number;
    max: number;
  };
  requiredFields: string[];
  dataTypes: Record<string, string>;
  customValidation?: string;
}

/**
 * Interface for metric display configuration
 */
interface DisplayConfig {
  chartTypes: ChartType[];
  colors: {
    positive: string;
    negative: string;
  };
  tooltipFormat: string;
  accessibilityLabel: string;
}

/**
 * Interface for complete metric configuration
 */
interface MetricConfig extends Metric {
  validationRules: ValidationRules;
  displayConfig: DisplayConfig;
}

/**
 * Core metrics configuration object defining all SaaS metrics
 * with comprehensive validation and display properties
 */
export const METRICS_CONFIG: Record<string, MetricConfig> = {
  revenueGrowth: {
    id: 'revenue_growth',
    name: 'Revenue Growth',
    description: 'Year-over-year revenue growth rate',
    calculationMethod: '((currentARR - previousARR) / previousARR) * 100',
    unit: MetricUnit.PERCENTAGE,
    category: MetricCategory.GROWTH,
    dataPoints: ['currentARR', 'previousARR'],
    validationRules: {
      range: { min: -100, max: 1000 },
      requiredFields: ['currentARR', 'previousARR'],
      dataTypes: {
        currentARR: 'number',
        previousARR: 'number'
      },
      customValidation: 'currentARR >= 0 && previousARR >= 0'
    },
    displayConfig: {
      chartTypes: ['line', 'bar', 'distribution'],
      colors: {
        positive: '#34D399',
        negative: '#EF4444'
      },
      tooltipFormat: 'value => `${value}% YoY Growth`',
      accessibilityLabel: 'Year over year revenue growth rate in percentage'
    }
  },

  netDollarRetention: {
    id: 'net_dollar_retention',
    name: 'Net Dollar Retention',
    description: 'Measure of revenue retention including expansions and contractions',
    calculationMethod: '((beginningARR + expansion - contraction - churn) / beginningARR) * 100',
    unit: MetricUnit.PERCENTAGE,
    category: MetricCategory.RETENTION,
    dataPoints: ['beginningARR', 'expansion', 'contraction', 'churn'],
    validationRules: {
      range: { min: 0, max: 200 },
      requiredFields: ['beginningARR', 'expansion', 'contraction', 'churn'],
      dataTypes: {
        beginningARR: 'number',
        expansion: 'number',
        contraction: 'number',
        churn: 'number'
      },
      customValidation: 'beginningARR > 0'
    },
    displayConfig: {
      chartTypes: ['line', 'distribution'],
      colors: {
        positive: '#34D399',
        negative: '#EF4444'
      },
      tooltipFormat: 'value => `${value}% NDR`',
      accessibilityLabel: 'Net dollar retention rate in percentage'
    }
  },

  magicNumber: {
    id: 'magic_number',
    name: 'Magic Number',
    description: 'Sales efficiency metric measuring new ARR generated per dollar of sales and marketing spend',
    calculationMethod: 'newARR / salesMarketingSpend',
    unit: MetricUnit.RATIO,
    category: MetricCategory.EFFICIENCY,
    dataPoints: ['newARR', 'salesMarketingSpend'],
    validationRules: {
      range: { min: 0, max: 10 },
      requiredFields: ['newARR', 'salesMarketingSpend'],
      dataTypes: {
        newARR: 'number',
        salesMarketingSpend: 'number'
      },
      customValidation: 'salesMarketingSpend > 0'
    },
    displayConfig: {
      chartTypes: ['bar', 'distribution'],
      colors: {
        positive: '#34D399',
        negative: '#EF4444'
      },
      tooltipFormat: 'value => `${value.toFixed(2)}x`',
      accessibilityLabel: 'Magic number efficiency ratio'
    }
  },

  ebitdaMargin: {
    id: 'ebitda_margin',
    name: 'EBITDA Margin',
    description: 'Earnings before interest, taxes, depreciation, and amortization as a percentage of revenue',
    calculationMethod: '(ebitda / revenue) * 100',
    unit: MetricUnit.PERCENTAGE,
    category: MetricCategory.PROFITABILITY,
    dataPoints: ['ebitda', 'revenue'],
    validationRules: {
      range: { min: -100, max: 100 },
      requiredFields: ['ebitda', 'revenue'],
      dataTypes: {
        ebitda: 'number',
        revenue: 'number'
      },
      customValidation: 'revenue > 0'
    },
    displayConfig: {
      chartTypes: ['line', 'bar', 'distribution'],
      colors: {
        positive: '#34D399',
        negative: '#EF4444'
      },
      tooltipFormat: 'value => `${value}% Margin`',
      accessibilityLabel: 'EBITDA margin percentage'
    }
  }
};

/**
 * Helper function to validate metric values against defined rules
 * @param metricId - Unique identifier of the metric
 * @param data - Metric data to validate
 * @returns Validation result with status and error messages
 */
export const validateMetricValue = (
  metricId: string,
  data: Record<string, number>
): { isValid: boolean; errors: string[] } => {
  const metric = METRICS_CONFIG[metricId];
  const errors: string[] = [];

  if (!metric) {
    return { isValid: false, errors: ['Invalid metric ID'] };
  }

  // Check required fields
  metric.validationRules.requiredFields.forEach(field => {
    if (!(field in data)) {
      errors.push(`Missing required field: ${field}`);
    }
  });

  // Validate data types
  Object.entries(metric.validationRules.dataTypes).forEach(([field, type]) => {
    if (field in data && typeof data[field] !== type) {
      errors.push(`Invalid data type for ${field}: expected ${type}`);
    }
  });

  // Validate range
  const value = calculateMetricValue(metricId, data);
  if (value < metric.validationRules.range.min || value > metric.validationRules.range.max) {
    errors.push(`Value out of range: must be between ${metric.validationRules.range.min} and ${metric.validationRules.range.max}`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Helper function to calculate metric values based on configuration
 * @param metricId - Unique identifier of the metric
 * @param data - Input data for calculation
 * @returns Calculated metric value
 */
const calculateMetricValue = (
  metricId: string,
  data: Record<string, number>
): number => {
  const metric = METRICS_CONFIG[metricId];
  
  switch (metricId) {
    case 'revenue_growth':
      return ((data.currentARR - data.previousARR) / data.previousARR) * 100;
    case 'net_dollar_retention':
      return ((data.beginningARR + data.expansion - data.contraction - data.churn) / data.beginningARR) * 100;
    case 'magic_number':
      return data.newARR / data.salesMarketingSpend;
    case 'ebitda_margin':
      return (data.ebitda / data.revenue) * 100;
    default:
      throw new Error(`Unknown metric ID: ${metricId}`);
  }
};

export default METRICS_CONFIG;