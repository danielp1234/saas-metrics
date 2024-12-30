// Version: express@4.18.x
// Version: uuid@8.x

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../lib/logger';
import type { ApiResponse } from '../../interfaces/response.interface';

// Constants for logging configuration
const SENSITIVE_HEADERS = ['authorization', 'cookie', 'x-api-key', 'x-session-id', 'x-csrf-token'];
const MAX_BODY_LENGTH = 10000; // Maximum length for request/response body logging
const LOG_SAMPLING_RATE = 1.0; // Log sampling rate (1.0 = 100%)

/**
 * Interface for enhanced request logging
 */
interface RequestLogData {
  requestId: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  query: Record<string, any>;
  body: any;
  ip: string;
  userAgent: string;
  timestamp: string;
  correlationId?: string;
}

/**
 * Interface for enhanced response logging
 */
interface ResponseLogData {
  requestId: string;
  statusCode: number;
  headers: Record<string, string>;
  body: any;
  duration: number;
  size: number;
  timestamp: string;
}

/**
 * Formats request details for logging with security sanitization
 * @param req Express request object
 * @param requestId Unique request identifier
 * @returns Sanitized request log data
 */
export function formatRequestLog(req: Request, requestId: string): RequestLogData {
  const headers = { ...req.headers };
  
  // Sanitize sensitive headers
  SENSITIVE_HEADERS.forEach(header => {
    if (headers[header]) {
      headers[header] = '********';
    }
  });

  // Sanitize and truncate request body
  const sanitizedBody = sanitizeData(req.body, SENSITIVE_HEADERS);
  const truncatedBody = JSON.stringify(sanitizedBody).length > MAX_BODY_LENGTH
    ? { _truncated: true, originalSize: JSON.stringify(sanitizedBody).length }
    : sanitizedBody;

  return {
    requestId,
    method: req.method,
    url: req.url,
    headers,
    query: sanitizeData(req.query, SENSITIVE_HEADERS),
    body: truncatedBody,
    ip: req.ip,
    userAgent: req.get('user-agent') || 'unknown',
    timestamp: new Date().toISOString(),
    correlationId: req.get('x-correlation-id')
  };
}

/**
 * Formats response details with performance metrics
 * @param res Express response object
 * @param requestId Unique request identifier
 * @param duration Request duration in milliseconds
 * @param body Response body
 * @returns Formatted response log data
 */
export function formatResponseLog(
  res: Response,
  requestId: string,
  duration: number,
  body: ApiResponse<any>
): ResponseLogData {
  const headers = { ...res.getHeaders() };
  
  // Sanitize sensitive response headers
  SENSITIVE_HEADERS.forEach(header => {
    if (headers[header]) {
      headers[header] = '********';
    }
  });

  // Calculate response size
  const size = JSON.stringify(body).length;

  return {
    requestId,
    statusCode: res.statusCode,
    headers,
    body: size > MAX_BODY_LENGTH ? { _truncated: true, originalSize: size } : body,
    duration,
    size,
    timestamp: new Date().toISOString()
  };
}

/**
 * Sanitizes sensitive data from objects recursively
 * @param data Object to sanitize
 * @param sensitiveFields Array of sensitive field names
 * @returns Sanitized object
 */
function sanitizeData(data: any, sensitiveFields: string[]): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sanitized = Array.isArray(data) ? [...data] : { ...data };

  for (const key in sanitized) {
    if (sensitiveFields.includes(key.toLowerCase())) {
      sanitized[key] = '********';
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeData(sanitized[key], sensitiveFields);
    }
  }

  return sanitized;
}

/**
 * Express middleware for comprehensive request/response logging
 * Implements logging requirements from Technical Specifications Section 2.4.1
 */
export function loggingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Generate unique request ID
  const requestId = uuidv4();
  
  // Apply sampling rate for high-volume environments
  const shouldLog = Math.random() < LOG_SAMPLING_RATE;
  
  // Record request start time
  const startTime = process.hrtime();
  
  // Add request ID to response headers for tracing
  res.setHeader('x-request-id', requestId);

  // Log incoming request if sampling allows
  if (shouldLog) {
    const requestLog = formatRequestLog(req, requestId);
    logger.info('Incoming request', requestLog);
  }

  // Override res.json to intercept and log response
  const originalJson = res.json;
  res.json = function(body: ApiResponse<any>): Response {
    if (shouldLog) {
      const [seconds, nanoseconds] = process.hrtime(startTime);
      const duration = seconds * 1000 + nanoseconds / 1000000;
      
      const responseLog = formatResponseLog(res, requestId, duration, body);
      
      // Log based on response status
      if (res.statusCode >= 500) {
        logger.error('Server error response', responseLog);
      } else if (res.statusCode >= 400) {
        logger.warn('Client error response', responseLog);
      } else {
        logger.info('Successful response', responseLog);
      }
    }
    
    return originalJson.call(this, body);
  };

  // Handle errors in the response
  res.on('error', (error: Error) => {
    logger.error('Response error', {
      requestId,
      error: {
        message: error.message,
        stack: error.stack
      }
    });
  });

  next();
}