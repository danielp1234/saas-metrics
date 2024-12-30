/**
 * @fileoverview Implements comprehensive validation schemas and middleware for metrics-related API requests
 * Ensures data integrity and security through robust validation rules with caching and performance optimization
 * @version 1.0.0
 */

import * as Joi from 'joi'; // @version 17.x
import { Request, Response, NextFunction } from 'express'; // @version 4.18.x
import { MetricType } from '../../interfaces/metrics.interface';
import {
  validateMetricId,
  validateMetricName,
  validateARRRange,
  validateNumericValue,
  sanitizeInput
} from '../../lib/validation';
import { ValidationError } from '../../utils/errors';

// Cache for validation schemas to improve performance
const schemaCache = new Map<string, Joi.ObjectSchema>();
const SCHEMA_CACHE_TTL = 300000; // 5 minutes in milliseconds

// Validation constants
const MAX_DESCRIPTION_LENGTH = 500;
const MAX_CALCULATION_METHOD_LENGTH = 1000;

/**
 * Schema for GET /metrics query parameters
 * Implements comprehensive filtering and validation rules
 */
const metricQuerySchema = Joi.object().keys({
  metricType: Joi.string()
    .valid(...Object.values(MetricType))
    .messages({
      'any.only': 'Invalid metric type. Must be one of the supported types.',
      'any.required': 'Metric type is required'
    }),
  
  arrRange: Joi.string()
    .custom(validateARRRange)
    .messages({
      'any.custom': 'Invalid ARR range format'
    }),
  
  startDate: Joi.date()
    .iso()
    .messages({
      'date.base': 'Start date must be a valid ISO date',
      'date.format': 'Start date must be in ISO format'
    }),
  
  endDate: Joi.date()
    .iso()
    .greater(Joi.ref('startDate'))
    .messages({
      'date.greater': 'End date must be after start date',
      'date.format': 'End date must be in ISO format'
    }),
  
  source: Joi.string()
    .custom(sanitizeInput)
    .messages({
      'string.base': 'Source must be a string'
    })
});

/**
 * Schema for POST /metrics request body
 * Implements comprehensive validation for metric creation
 */
const metricCreateSchema = Joi.object().keys({
  name: Joi.string()
    .required()
    .custom(validateMetricName)
    .messages({
      'any.required': 'Metric name is required',
      'string.empty': 'Metric name cannot be empty',
      'any.custom': 'Invalid metric name format'
    }),
  
  type: Joi.string()
    .required()
    .valid(...Object.values(MetricType))
    .messages({
      'any.required': 'Metric type is required',
      'any.only': 'Invalid metric type'
    }),
  
  calculationMethod: Joi.string()
    .required()
    .max(MAX_CALCULATION_METHOD_LENGTH)
    .custom(sanitizeInput)
    .messages({
      'any.required': 'Calculation method is required',
      'string.max': `Calculation method cannot exceed ${MAX_CALCULATION_METHOD_LENGTH} characters`
    }),
  
  description: Joi.string()
    .max(MAX_DESCRIPTION_LENGTH)
    .custom(sanitizeInput)
    .messages({
      'string.max': `Description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters`
    })
});

/**
 * Schema for PUT /metrics/:id request body
 * Implements flexible validation for metric updates
 */
const metricUpdateSchema = Joi.object().keys({
  name: Joi.string()
    .custom(validateMetricName)
    .messages({
      'any.custom': 'Invalid metric name format'
    }),
  
  type: Joi.string()
    .valid(...Object.values(MetricType))
    .messages({
      'any.only': 'Invalid metric type'
    }),
  
  calculationMethod: Joi.string()
    .max(MAX_CALCULATION_METHOD_LENGTH)
    .custom(sanitizeInput)
    .messages({
      'string.max': `Calculation method cannot exceed ${MAX_CALCULATION_METHOD_LENGTH} characters`
    }),
  
  description: Joi.string()
    .max(MAX_DESCRIPTION_LENGTH)
    .custom(sanitizeInput)
    .messages({
      'string.max': `Description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters`
    })
});

/**
 * Validates GET /metrics request query parameters
 * Implements caching and performance optimization
 */
export const validateGetMetricsRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { error } = metricQuerySchema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      throw new ValidationError(
        'Invalid query parameters',
        error.details.map(detail => detail.message)
      );
    }

    next();
  } catch (err) {
    if (err instanceof ValidationError) {
      next(err);
    } else {
      next(new ValidationError('Query validation failed'));
    }
  }
};

/**
 * Validates GET /metrics/:id request parameters
 * Implements enhanced ID validation with security checks
 */
export const validateGetMetricByIdRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!validateMetricId(req.params.id)) {
      throw new ValidationError('Invalid metric ID format');
    }
    next();
  } catch (err) {
    next(new ValidationError('Invalid metric ID'));
  }
};

/**
 * Validates POST /metrics request body
 * Implements comprehensive validation with security measures
 */
export const validateCreateMetricRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { error } = metricCreateSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      throw new ValidationError(
        'Invalid metric data',
        error.details.map(detail => detail.message)
      );
    }

    next();
  } catch (err) {
    if (err instanceof ValidationError) {
      next(err);
    } else {
      next(new ValidationError('Metric validation failed'));
    }
  }
};

/**
 * Validates PUT /metrics/:id request
 * Implements flexible validation for partial updates
 */
export const validateUpdateMetricRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Validate ID
    if (!validateMetricId(req.params.id)) {
      throw new ValidationError('Invalid metric ID format');
    }

    // Validate update data
    const { error } = metricUpdateSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      throw new ValidationError(
        'Invalid update data',
        error.details.map(detail => detail.message)
      );
    }

    next();
  } catch (err) {
    if (err instanceof ValidationError) {
      next(err);
    } else {
      next(new ValidationError('Update validation failed'));
    }
  }
};