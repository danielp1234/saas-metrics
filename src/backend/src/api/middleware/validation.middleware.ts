/**
 * @fileoverview Express middleware for request validation and sanitization
 * Implements comprehensive validation rules for API endpoints with strict type checking,
 * input sanitization, and robust error handling.
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express';
import {
  validateMetricType,
  validateARRRange,
  validateMetricsQueryParams,
  sanitizeInput
} from '../../lib/validation';
import { ValidationError } from '../../utils/errors';
import { MetricsQueryParams, ValidationLevel, RequestPriority } from '../../interfaces/request.interface';

// Constants for validation rules
const MAX_PAGE_SIZE = 100;
const MIN_PAGE_SIZE = 1;
const MAX_BATCH_SIZE = 1000;
const MAX_REQUEST_SIZE = '10mb';

/**
 * Middleware to validate metrics endpoint requests
 * Implements comprehensive parameter validation and sanitization
 */
export const validateMetricsRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract and validate query parameters
    const queryParams: MetricsQueryParams = {
      metricType: req.query.metricType as string,
      arrRange: req.query.arrRange as string,
      source: req.query.source as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      confidenceInterval: req.query.confidenceInterval ? 
        parseFloat(req.query.confidenceInterval as string) : undefined,
      sampleSize: req.query.sampleSize ? 
        parseInt(req.query.sampleSize as string) : undefined
    };

    // Validate query parameters using comprehensive validation
    const validatedParams = await validateMetricsQueryParams(queryParams);

    // Attach validated parameters to request
    req.query = validatedParams;

    // Set validation level based on request context
    (req as any).validationLevel = ValidationLevel.STRICT;
    (req as any).priority = RequestPriority.NORMAL;

    next();
  } catch (error) {
    if (error instanceof ValidationError) {
      next(error);
    } else {
      next(new ValidationError('Invalid request parameters', [error.message]));
    }
  }
};

/**
 * Middleware to validate benchmark data import requests
 * Implements strict data validation with comprehensive error handling
 */
export const validateBenchmarkImport = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Validate request size
    if (!req.headers['content-length'] || 
        parseInt(req.headers['content-length']) > parseInt(MAX_REQUEST_SIZE)) {
      throw new ValidationError('Request size exceeds maximum allowed size');
    }

    // Validate content type
    if (!req.is('application/json')) {
      throw new ValidationError('Content-Type must be application/json');
    }

    // Validate request body structure
    if (!req.body || !req.body.source || !Array.isArray(req.body.data)) {
      throw new ValidationError('Invalid request body structure');
    }

    // Validate batch size
    if (req.body.data.length > MAX_BATCH_SIZE) {
      throw new ValidationError(`Batch size exceeds maximum of ${MAX_BATCH_SIZE} items`);
    }

    // Validate and sanitize source
    req.body.source = sanitizeInput(req.body.source);

    // Validate each data item
    const validationErrors: string[] = [];
    req.body.data = req.body.data.map((item: any, index: number) => {
      try {
        // Validate required fields
        if (!item.metricId || !item.value || !item.arrRange) {
          throw new Error(`Item ${index}: Missing required fields`);
        }

        // Sanitize string inputs
        item.metricId = sanitizeInput(item.metricId);
        item.arrRange = sanitizeInput(item.arrRange);

        // Validate numeric value
        const value = parseFloat(item.value);
        if (isNaN(value)) {
          throw new Error(`Item ${index}: Invalid numeric value`);
        }
        item.value = value;

        return item;
      } catch (error) {
        validationErrors.push(error.message);
        return null;
      }
    }).filter(Boolean);

    if (validationErrors.length > 0) {
      throw new ValidationError('Data validation failed', validationErrors);
    }

    next();
  } catch (error) {
    if (error instanceof ValidationError) {
      next(error);
    } else {
      next(new ValidationError('Import validation failed', [error.message]));
    }
  }
};

/**
 * Middleware to validate pagination parameters
 * Implements comprehensive pagination validation with range checking
 */
export const validatePagination = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const sortBy = req.query.sortBy as string;
    const sortOrder = (req.query.sortOrder as string)?.toUpperCase();

    // Validate page number
    if (page < 1) {
      throw new ValidationError('Page number must be positive');
    }

    // Validate page size
    if (limit < MIN_PAGE_SIZE || limit > MAX_PAGE_SIZE) {
      throw new ValidationError(
        `Page size must be between ${MIN_PAGE_SIZE} and ${MAX_PAGE_SIZE}`
      );
    }

    // Validate sort parameters
    if (sortBy && !['name', 'value', 'date', 'source'].includes(sortBy)) {
      throw new ValidationError('Invalid sort field');
    }

    if (sortOrder && !['ASC', 'DESC'].includes(sortOrder)) {
      throw new ValidationError('Invalid sort order');
    }

    // Attach validated pagination parameters
    req.query = {
      ...req.query,
      page,
      limit,
      sortBy: sortBy || 'date',
      sortOrder: sortOrder || 'DESC'
    };

    next();
  } catch (error) {
    if (error instanceof ValidationError) {
      next(error);
    } else {
      next(new ValidationError('Pagination validation failed', [error.message]));
    }
  }
};