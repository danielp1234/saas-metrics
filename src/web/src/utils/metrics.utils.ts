// @version lodash ^4.17.21

import { isNumber, memoize } from 'lodash';
import { MetricType, MetricData } from '../interfaces/metrics.interface';
import metricsConfig from '../config/metrics.config';
import { formatMetricValue } from './format.utils';

// Constants for metric calculations and analysis
const TREND_THRESHOLD = 0.01;
const CALCULATION_PRECISION = 4;
const CONFIDENCE_THRESHOLD = 0.95;
const MIN_HISTORICAL_DATA_POINTS = 3;

/**
 * Calculates a metric value based on its type and input data
 * Implements calculation methods from technical specifications
 */
export const calculateMetricValue = memoize((metricType: MetricType, data: Record<string, number>): number | null => {
  try {
    const config = metricsConfig.metrics[metricType];
    if (!config) {
      throw new Error(`Invalid metric type: ${metricType}`);
    }

    // Validate required fields
    const missingFields = config.requiredDataPoints.filter(field => !isNumber(data[field]));
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // Calculate metric value based on type
    let value: number;
    switch (metricType) {
      case MetricType.REVENUE_GROWTH:
        value = ((data.currentARR - data.previousARR) / data.previousARR) * 100;
        break;

      case MetricType.NDR:
        value = ((data.beginningARR + data.expansion - data.contraction - data.churn) / data.beginningARR) * 100;
        break;

      case MetricType.MAGIC_NUMBER:
        value = data.netNewARR / data.salesMarketingSpend;
        break;

      case MetricType.EBITDA_MARGIN:
        value = (data.ebitda / data.revenue) * 100;
        break;

      case MetricType.ARR_PER_EMPLOYEE:
        value = data.totalARR / data.employeeCount;
        break;

      default:
        throw new Error(`Calculation not implemented for metric type: ${metricType}`);
    }

    // Validate output
    const { minValue, maxValue } = metricsConfig.metrics[metricType].validationRules;
    if (value < minValue || value > maxValue) {
      throw new Error(`Calculated value ${value} is outside valid range [${minValue}, ${maxValue}]`);
    }

    return Number(value.toFixed(CALCULATION_PRECISION));
  } catch (error) {
    console.error(`Error calculating ${metricType}:`, error);
    return null;
  }
});

/**
 * Calculates the percentile score of a metric value against benchmark data
 * Uses linear interpolation for precise percentile calculation
 */
export const calculatePercentileScore = (value: number, benchmarkData: number[]): number => {
  if (!isNumber(value) || !Array.isArray(benchmarkData) || benchmarkData.length === 0) {
    return 0;
  }

  const sortedData = [...benchmarkData].sort((a, b) => a - b);
  const n = sortedData.length;

  // Handle edge cases
  if (value <= sortedData[0]) return 0;
  if (value >= sortedData[n - 1]) return 100;

  // Find position using linear interpolation
  for (let i = 0; i < n - 1; i++) {
    if (value >= sortedData[i] && value <= sortedData[i + 1]) {
      const position = i + (value - sortedData[i]) / (sortedData[i + 1] - sortedData[i]);
      return (position / (n - 1)) * 100;
    }
  }

  return 0;
};

/**
 * Determines the status of a metric value based on configured thresholds
 * Maps to industry standard benchmarks from technical specifications
 */
export const getMetricThresholdStatus = (value: number, metricType: MetricType): string => {
  if (!isNumber(value)) return 'invalid';

  const thresholds = metricsConfig.thresholds[metricType];
  if (!thresholds) return 'invalid';

  const { excellent, good, average, poor } = thresholds;

  // Handle metrics where higher is better
  const isHigherBetter = ![MetricType.CAC, MetricType.PAYBACK_PERIOD].includes(metricType);

  if (isHigherBetter) {
    if (value >= excellent) return 'excellent';
    if (value >= good) return 'good';
    if (value >= average) return 'average';
    if (value >= poor) return 'poor';
  } else {
    if (value <= excellent) return 'excellent';
    if (value <= good) return 'good';
    if (value <= average) return 'average';
    if (value <= poor) return 'poor';
  }

  return 'poor';
};

/**
 * Calculates detailed trend analysis including direction, magnitude, and statistical significance
 * Implements comprehensive trend analysis from technical specifications
 */
export const calculateMetricTrend = (
  currentValue: number,
  previousValue: number,
  historicalData: number[]
): {
  direction: 'up' | 'down' | 'flat';
  percentage: number;
  significance: boolean;
  confidence: number;
} => {
  if (!isNumber(currentValue) || !isNumber(previousValue)) {
    return {
      direction: 'flat',
      percentage: 0,
      significance: false,
      confidence: 0
    };
  }

  // Calculate percentage change
  const percentageChange = ((currentValue - previousValue) / Math.abs(previousValue)) * 100;

  // Determine direction
  let direction: 'up' | 'down' | 'flat' = 'flat';
  if (Math.abs(percentageChange) > TREND_THRESHOLD) {
    direction = percentageChange > 0 ? 'up' : 'down';
  }

  // Calculate statistical significance and confidence
  let significance = false;
  let confidence = 0;

  if (historicalData.length >= MIN_HISTORICAL_DATA_POINTS) {
    const mean = historicalData.reduce((sum, val) => sum + val, 0) / historicalData.length;
    const stdDev = Math.sqrt(
      historicalData.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / historicalData.length
    );

    // Calculate z-score
    const zScore = Math.abs((currentValue - mean) / stdDev);
    confidence = 1 - 2 * (1 - 0.5 * (1 + Math.erf(zScore / Math.sqrt(2))));
    significance = confidence >= CONFIDENCE_THRESHOLD;
  }

  return {
    direction,
    percentage: Number(percentageChange.toFixed(CALCULATION_PRECISION)),
    significance,
    confidence: Number(confidence.toFixed(CALCULATION_PRECISION))
  };
};