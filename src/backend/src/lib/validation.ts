/**
 * @fileoverview Core validation library implementing comprehensive validation rules and schemas
 * for the SaaS Metrics Platform, including request validation, metrics validation, and data sanitization
 * with enhanced security features and performance optimization.
 * @version 1.0.0
 */

import { validate } from 'class-validator';
import { sanitize } from 'class-sanitizer';
import * as Joi from 'joi';
import { ValidationError } from '../utils/errors';
import { MetricType } from '../interfaces/metrics.interface';
import { MetricsQueryParams } from '../interfaces/request.interface';

// Constants for validation rules
const METRIC_NAME_MAX_LENGTH = 100;
const METRIC_ID_REGEX = /^[a-zA-Z0-9-_]+$/;
const ARR_RANGE_REGEX = /^(LESS_THAN_1M|1M_TO_5M|5M_TO_10M|10M_TO_50M|ABOVE_50M)$/;
const NUMERIC_VALUE_MIN = -999999999;
const NUMERIC_VALUE_MAX = 999999999;
const VALIDATION_CACHE_TTL = 300; // 5 minutes
const MAX_VALIDATION_BATCH_SIZE = 1000;

// Cache for validation results
const validationCache = new Map<string, { result: boolean; timestamp: number }>();

/**
 * Enhanced metric ID validation with caching and performance optimization
 * @param metricId - Metric identifier to validate
 * @returns boolean indicating if metric ID is valid
 * @throws ValidationError if validation fails
 */
export function validateMetricId(metricId: string): boolean {
  // Check cache first
  const cached = validationCache.get(metricId);
  if (cached && Date.now() - cached.timestamp < VALIDATION_CACHE_TTL * 1000) {
    return cached.result;
  }

  // Validate metric ID
  if (!metricId || typeof metricId !== 'string') {
    throw new ValidationError('Invalid metric ID: ID must be a non-empty string');
  }

  const isValid = METRIC_ID_REGEX.test(metricId);
  
  // Cache result
  validationCache.set(metricId, {
    result: isValid,
    timestamp: Date.now()
  });

  if (!isValid) {
    throw new ValidationError('Invalid metric ID format');
  }

  return isValid;
}

/**
 * Enhanced metric name validation with security features
 * @param name - Metric name to validate
 * @returns boolean indicating if metric name is valid
 * @throws ValidationError if validation fails
 */
export function validateMetricName(name: string): boolean {
  // Sanitize input first
  const sanitizedName = sanitizeInput(name);

  // Validate length
  if (!sanitizedName || sanitizedName.length > METRIC_NAME_MAX_LENGTH) {
    throw new ValidationError(
      `Invalid metric name: Length must be between 1 and ${METRIC_NAME_MAX_LENGTH} characters`
    );
  }

  // Check for SQL injection patterns
  const sqlInjectionPattern = /(\b(select|insert|update|delete|drop|union|exec|declare)\b)|([;'"])/gi;
  if (sqlInjectionPattern.test(name)) {
    throw new ValidationError('Invalid metric name: Contains forbidden patterns');
  }

  // Validate character set
  const validCharPattern = /^[\w\s-]+$/;
  if (!validCharPattern.test(sanitizedName)) {
    throw new ValidationError('Invalid metric name: Contains invalid characters');
  }

  return true;
}

/**
 * Enhanced query parameter validation with Joi schema and error aggregation
 * @param params - Query parameters to validate
 * @returns Validated and sanitized query parameters
 * @throws ValidationError if validation fails
 */
export function validateMetricsQueryParams(params: MetricsQueryParams): MetricsQueryParams {
  const schema = Joi.object({
    metricType: Joi.string()
      .valid(...Object.values(MetricType))
      .required()
      .messages({
        'any.required': 'Metric type is required',
        'any.only': 'Invalid metric type'
      }),

    arrRange: Joi.string()
      .pattern(ARR_RANGE_REGEX)
      .optional()
      .messages({
        'string.pattern.base': 'Invalid ARR range format'
      }),

    source: Joi.string()
      .trim()
      .max(100)
      .optional()
      .messages({
        'string.max': 'Source name exceeds maximum length'
      }),

    startDate: Joi.date()
      .iso()
      .optional()
      .messages({
        'date.base': 'Invalid start date format'
      }),

    endDate: Joi.date()
      .iso()
      .min(Joi.ref('startDate'))
      .optional()
      .messages({
        'date.min': 'End date must be after start date'
      }),

    confidenceInterval: Joi.number()
      .min(0)
      .max(1)
      .optional()
      .messages({
        'number.min': 'Confidence interval must be between 0 and 1',
        'number.max': 'Confidence interval must be between 0 and 1'
      }),

    sampleSize: Joi.number()
      .integer()
      .min(1)
      .optional()
      .messages({
        'number.base': 'Invalid sample size',
        'number.min': 'Sample size must be positive'
      })
  });

  const { error, value } = schema.validate(params, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    throw new ValidationError(
      'Query parameter validation failed',
      error.details.map(detail => detail.message)
    );
  }

  // Sanitize validated parameters
  return Object.keys(value).reduce((acc, key) => {
    acc[key] = typeof value[key] === 'string' ? sanitizeInput(value[key]) : value[key];
    return acc;
  }, {} as MetricsQueryParams);
}

/**
 * Enhanced input sanitization with multiple security layers
 * @param input - String input to sanitize
 * @returns Sanitized string
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';

  let sanitized = input;

  // Remove HTML tags and scripts
  sanitized = sanitized.replace(/<[^>]*>/g, '');

  // Escape special characters
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');

  // Remove SQL injection patterns
  sanitized = sanitized.replace(/(\b(select|insert|update|delete|drop|union|exec|declare)\b)|([;'"])/gi, '');

  // Apply XSS protection filters
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=/gi, '');
  sanitized = sanitized.replace(/data:/gi, '');

  // Normalize Unicode characters
  sanitized = sanitized.normalize('NFKC');

  return sanitized.trim();
}