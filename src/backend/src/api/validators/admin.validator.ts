/**
 * @fileoverview Admin validation middleware implementing comprehensive request validation,
 * data sanitization, and role-based authorization checks for administrative operations
 * @version 1.0.0
 */

// @package express ^4.18.x
import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../interfaces/request.interface';
import { UserRole } from '../../interfaces/auth.interface';
import { 
  validateMetricId, 
  validateMetricName, 
  validateNumericValue,
  sanitizeInput,
  createValidationChain 
} from '../../utils/validation';
import { 
  ValidationError, 
  AuthorizationError 
} from '../../utils/errors';
import { MetricType } from '../../interfaces/metrics.interface';
import { ArrRangeType, ValidationStatus } from '../../interfaces/benchmark.interface';

// Constants for validation rules
const MAX_BATCH_SIZE = 1000;
const MIN_BATCH_SIZE = 1;
const MAX_SOURCE_NAME_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 500;

/**
 * Validates if the user has admin or super admin role with session verification
 * @param req - Authenticated request object
 * @param res - Response object
 * @param next - Next middleware function
 */
export const validateAdminRole = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Verify user object exists
    if (!req.user) {
      throw new AuthorizationError('User not authenticated');
    }

    // Verify session exists and is valid
    if (!req.session || Date.now() > req.session.expiresAt) {
      throw new AuthorizationError('Session expired');
    }

    // Verify user has admin privileges
    if (![UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(req.user.role)) {
      throw new AuthorizationError('Insufficient permissions');
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Validates metric creation request payload with enhanced validation
 * @param req - Request object
 * @param res - Response object
 * @param next - Next middleware function
 */
export const validateMetricCreation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, description, type, calculationMethod } = req.body;

    // Validate required fields
    if (!name || !description || !type || !calculationMethod) {
      throw new ValidationError('Missing required fields');
    }

    // Validate metric name
    if (!validateMetricName(name)) {
      throw new ValidationError('Invalid metric name format');
    }

    // Sanitize description
    const sanitizedDescription = sanitizeInput(description);
    if (sanitizedDescription.length > MAX_DESCRIPTION_LENGTH) {
      throw new ValidationError('Description exceeds maximum length');
    }

    // Validate metric type
    if (!Object.values(MetricType).includes(type)) {
      throw new ValidationError('Invalid metric type');
    }

    // Attach sanitized data to request
    req.body.description = sanitizedDescription;

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Enhanced validation for data source update requests
 * @param req - Request object
 * @param res - Response object
 * @param next - Next middleware function
 */
export const validateDataSourceUpdate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, description, config } = req.body;

    // Validate source name
    if (name) {
      const sanitizedName = sanitizeInput(name);
      if (sanitizedName.length === 0 || sanitizedName.length > MAX_SOURCE_NAME_LENGTH) {
        throw new ValidationError('Invalid source name length');
      }
      req.body.name = sanitizedName;
    }

    // Validate description if provided
    if (description) {
      const sanitizedDescription = sanitizeInput(description);
      if (sanitizedDescription.length > MAX_DESCRIPTION_LENGTH) {
        throw new ValidationError('Description exceeds maximum length');
      }
      req.body.description = sanitizedDescription;
    }

    // Validate configuration object
    if (config) {
      if (typeof config !== 'object' || Array.isArray(config)) {
        throw new ValidationError('Invalid configuration format');
      }

      // Validate required config fields
      const requiredFields = ['connectionType', 'credentials'];
      for (const field of requiredFields) {
        if (!(field in config)) {
          throw new ValidationError(`Missing required config field: ${field}`);
        }
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Comprehensive validation for benchmark data import
 * @param req - Request object
 * @param res - Response object
 * @param next - Next middleware function
 */
export const validateBenchmarkImport = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { sourceId, data, batchSize } = req.body;

    // Validate source ID
    if (!sourceId || typeof sourceId !== 'string') {
      throw new ValidationError('Invalid source ID');
    }

    // Validate data array
    if (!Array.isArray(data)) {
      throw new ValidationError('Data must be an array');
    }

    // Validate batch size
    if (batchSize) {
      if (!Number.isInteger(batchSize) || 
          batchSize < MIN_BATCH_SIZE || 
          batchSize > MAX_BATCH_SIZE) {
        throw new ValidationError(`Batch size must be between ${MIN_BATCH_SIZE} and ${MAX_BATCH_SIZE}`);
      }
    }

    // Validate each data entry
    const validationChain = createValidationChain([
      (entry: any) => validateMetricId(entry.metricId),
      (entry: any) => validateNumericValue(entry.value),
      (entry: any) => Object.values(ArrRangeType).includes(entry.arrRange),
      (entry: any) => entry.percentile >= 0 && entry.percentile <= 100
    ]);

    const errors: string[] = [];
    data.forEach((entry, index) => {
      try {
        validationChain(entry);
      } catch (error) {
        if (error instanceof ValidationError) {
          errors.push(`Entry ${index}: ${error.message}`);
        }
      }
    });

    if (errors.length > 0) {
      throw new ValidationError('Data validation failed', errors);
    }

    next();
  } catch (error) {
    next(error);
  }
};