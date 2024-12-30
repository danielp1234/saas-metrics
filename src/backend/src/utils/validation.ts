/**
 * @fileoverview Core validation utility functions for the SaaS Metrics Platform
 * Implements comprehensive validation with enhanced security measures and performance optimization
 * @version 1.0.0
 */

import { validate } from 'class-validator'; // v0.14.x
import { sanitize } from 'class-sanitizer'; // v0.14.x
import { default as xss } from 'xss'; // v1.0.x
import { ValidationError } from './errors';
import { MetricType } from '../interfaces/metrics.interface';

// Global constants for validation rules
const METRIC_NAME_MAX_LENGTH = 100;
const METRIC_ID_REGEX = /^[a-zA-Z0-9-_]+$/;
const ARR_RANGE_REGEX = /^(LESS_THAN_1M|1M_TO_5M|5M_TO_10M|10M_TO_50M|ABOVE_50M)$/;
const NUMERIC_VALUE_MIN = -999999999;
const NUMERIC_VALUE_MAX = 999999999;
const VALIDATION_CACHE_TTL = 300; // 5 minutes in seconds
const MAX_VALIDATION_CHAIN_LENGTH = 10;
const SANITIZATION_OPTIONS = {
  stripTags: true,
  stripSpecialChars: true,
  trim: true
};

// Cache for validation results
const validationCache = new Map<string, { result: boolean; timestamp: number }>();

/**
 * Validates metric ID format using regex pattern
 * @param metricId - Metric identifier to validate
 * @returns boolean indicating if metric ID is valid
 * @throws ValidationError if metricId is undefined
 */
export function validateMetricId(metricId: string): boolean {
  if (!metricId) {
    throw new ValidationError('Metric ID is required');
  }

  const cacheKey = `metric_id:${metricId}`;
  const cached = getCachedValidation(cacheKey);
  if (cached !== undefined) return cached;

  const isValid = METRIC_ID_REGEX.test(metricId);
  cacheValidationResult(cacheKey, isValid);
  return isValid;
}

/**
 * Validates metric name length and characters with enhanced security
 * @param name - Metric name to validate
 * @returns boolean indicating if metric name is valid
 * @throws ValidationError if name is undefined or invalid
 */
export function validateMetricName(name: string): boolean {
  if (!name) {
    throw new ValidationError('Metric name is required');
  }

  const cacheKey = `metric_name:${name}`;
  const cached = getCachedValidation(cacheKey);
  if (cached !== undefined) return cached;

  const sanitizedName = sanitizeInput(name);
  const isValid = sanitizedName.length > 0 && 
                  sanitizedName.length <= METRIC_NAME_MAX_LENGTH;

  cacheValidationResult(cacheKey, isValid);
  return isValid;
}

/**
 * Validates if provided metric type exists in MetricType enum
 * @param type - Metric type to validate
 * @returns boolean indicating if metric type is valid
 * @throws ValidationError if type is undefined
 */
export function validateMetricType(type: string): boolean {
  if (!type) {
    throw new ValidationError('Metric type is required');
  }

  const cacheKey = `metric_type:${type}`;
  const cached = getCachedValidation(cacheKey);
  if (cached !== undefined) return cached;

  const isValid = Object.values(MetricType).includes(type as MetricType);
  cacheValidationResult(cacheKey, isValid);
  return isValid;
}

/**
 * Validates ARR range format against predefined patterns
 * @param arrRange - ARR range to validate
 * @returns boolean indicating if ARR range is valid
 * @throws ValidationError if arrRange is undefined
 */
export function validateARRRange(arrRange: string): boolean {
  if (!arrRange) {
    throw new ValidationError('ARR range is required');
  }

  const cacheKey = `arr_range:${arrRange}`;
  const cached = getCachedValidation(cacheKey);
  if (cached !== undefined) return cached;

  const isValid = ARR_RANGE_REGEX.test(arrRange);
  cacheValidationResult(cacheKey, isValid);
  return isValid;
}

/**
 * Validates numeric values within allowed ranges with precision handling
 * @param value - Numeric value to validate
 * @returns boolean indicating if numeric value is valid
 * @throws ValidationError if value is invalid
 */
export function validateNumericValue(value: number): boolean {
  if (typeof value !== 'number' || isNaN(value)) {
    throw new ValidationError('Invalid numeric value');
  }

  const cacheKey = `numeric_value:${value}`;
  const cached = getCachedValidation(cacheKey);
  if (cached !== undefined) return cached;

  const isValid = value >= NUMERIC_VALUE_MIN && 
                  value <= NUMERIC_VALUE_MAX;

  cacheValidationResult(cacheKey, isValid);
  return isValid;
}

/**
 * Sanitizes input strings with advanced XSS and injection protection
 * @param input - String to sanitize
 * @returns Sanitized string
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';

  // Apply XSS filtering
  let sanitized = xss(input);

  // Apply additional sanitization rules
  if (SANITIZATION_OPTIONS.stripTags) {
    sanitized = sanitized.replace(/<[^>]*>/g, '');
  }

  if (SANITIZATION_OPTIONS.stripSpecialChars) {
    sanitized = sanitized.replace(/[^\w\s-]/gi, '');
  }

  if (SANITIZATION_OPTIONS.trim) {
    sanitized = sanitized.trim();
  }

  return sanitized;
}

/**
 * Creates a chain of validation functions for complex validations
 * @param validators - Array of validation functions to chain
 * @returns Composed validation function
 * @throws ValidationError if chain length exceeds maximum
 */
export function createValidationChain(validators: Array<(value: any) => boolean>): (value: any) => boolean {
  if (validators.length > MAX_VALIDATION_CHAIN_LENGTH) {
    throw new ValidationError('Validation chain exceeds maximum length');
  }

  return (value: any): boolean => {
    const errors: string[] = [];

    for (const validator of validators) {
      try {
        if (!validator(value)) {
          errors.push('Validation failed');
        }
      } catch (error) {
        if (error instanceof ValidationError) {
          errors.push(error.message);
        } else {
          throw error;
        }
      }
    }

    if (errors.length > 0) {
      throw new ValidationError('Validation chain failed', errors);
    }

    return true;
  };
}

/**
 * Retrieves cached validation result if available and not expired
 * @param key - Cache key
 * @returns Cached validation result or undefined
 * @private
 */
function getCachedValidation(key: string): boolean | undefined {
  const cached = validationCache.get(key);
  if (cached && Date.now() - cached.timestamp < VALIDATION_CACHE_TTL * 1000) {
    return cached.result;
  }
  return undefined;
}

/**
 * Caches validation result with timestamp
 * @param key - Cache key
 * @param result - Validation result
 * @private
 */
function cacheValidationResult(key: string, result: boolean): void {
  validationCache.set(key, {
    result,
    timestamp: Date.now()
  });
}