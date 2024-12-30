// Version: express@4.18.x

import { Request, Response, NextFunction } from 'express';
import { logger } from '../../lib/logger';
import { ErrorResponse } from '../../interfaces/response.interface';
import { BaseError, createErrorResponse } from '../../utils/errors';

// Constants for error handling
const DEFAULT_ERROR_CODE = 500;
const DEFAULT_ERROR_MESSAGE = 'Internal Server Error';
const ERROR_RATE_THRESHOLD = 100;
const MAX_ERROR_DETAILS_LENGTH = 1000;
const SENSITIVE_DATA_PATTERNS = ['password', 'token', 'key', 'secret'];

/**
 * Generates a unique correlation ID for error tracking
 */
const generateCorrelationId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Determines error severity based on status code and error type
 */
const determineErrorSeverity = (error: Error | BaseError): 'critical' | 'error' | 'warning' => {
  if ('code' in error && (error as BaseError).code >= 500) {
    return 'critical';
  }
  if (error instanceof BaseError && error.code >= 400) {
    return 'error';
  }
  return 'warning';
};

/**
 * Sanitizes error details based on environment and security rules
 */
const sanitizeErrorDetails = (details: any): any => {
  if (typeof details !== 'object' || !details) {
    return details;
  }

  const sanitized = { ...details };
  for (const key in sanitized) {
    if (SENSITIVE_DATA_PATTERNS.some(pattern => key.toLowerCase().includes(pattern))) {
      sanitized[key] = '********';
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeErrorDetails(sanitized[key]);
    } else if (typeof sanitized[key] === 'string' && sanitized[key].length > MAX_ERROR_DETAILS_LENGTH) {
      sanitized[key] = `${sanitized[key].substring(0, MAX_ERROR_DETAILS_LENGTH)}...`;
    }
  }
  return sanitized;
};

/**
 * Adds security headers to error responses
 */
const addSecurityHeaders = (res: Response): void => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
};

/**
 * Global error handling middleware for Express application
 * Implements comprehensive error handling with security, monitoring, and compliance features
 */
export const errorMiddleware = async (
  error: Error | BaseError,
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Generate correlation ID for error tracking
    const correlationId = generateCorrelationId();

    // Determine error severity
    const severity = determineErrorSeverity(error);

    // Create base error response
    let errorResponse: ErrorResponse = {
      code: (error as BaseError).code || DEFAULT_ERROR_CODE,
      message: error.message || DEFAULT_ERROR_MESSAGE,
      details: [],
      correlationId,
      severity
    };

    // Enhance error details based on environment
    if (process.env.NODE_ENV !== 'production') {
      errorResponse.details = [
        ...(error.stack?.split('\n') || []),
        ...(Object.entries(error).map(([key, value]) => `${key}: ${JSON.stringify(value)}`))
      ];
    }

    // Sanitize error details
    errorResponse = {
      ...errorResponse,
      details: errorResponse.details.map(detail => 
        typeof detail === 'string' ? detail : JSON.stringify(sanitizeErrorDetails(detail))
      )
    };

    // Log error with appropriate severity
    const logMetadata = {
      error: sanitizeErrorDetails(error),
      correlationId,
      path: req.path,
      method: req.method,
      ip: req.ip,
      userId: (req as any).user?.id,
      headers: sanitizeErrorDetails(req.headers)
    };

    if (severity === 'critical') {
      await logger.error(error.message, logMetadata, true);
    } else if (severity === 'error') {
      await logger.error(error.message, logMetadata);
    } else {
      await logger.warn(error.message, logMetadata);
    }

    // Add security headers
    addSecurityHeaders(res);

    // Send error response
    res.status(errorResponse.code).json({
      success: false,
      error: errorResponse,
      data: null,
      metadata: {
        timestamp: new Date().toISOString(),
        correlationId,
        environment: process.env.NODE_ENV
      }
    });

  } catch (handlingError) {
    // Fallback error handling if error middleware fails
    logger.error('Error middleware failed', {
      originalError: error,
      handlingError,
      path: req.path
    }, true);

    res.status(500).json({
      success: false,
      error: {
        code: 500,
        message: DEFAULT_ERROR_MESSAGE,
        details: [],
        correlationId: generateCorrelationId(),
        severity: 'critical'
      },
      data: null,
      metadata: {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
      }
    });
  }
};