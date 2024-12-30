/**
 * @fileoverview Custom error classes and error handling utilities for the SaaS Metrics Platform
 * Implements standardized error handling with comprehensive error tracking and monitoring
 * @version 1.0.0
 */

import { ErrorResponse } from '../interfaces/response.interface';

/**
 * Enum defining standardized error codes across the application
 */
export enum ErrorCode {
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  VALIDATION_ERROR = 422,
  INTERNAL_ERROR = 500,
  SERVICE_UNAVAILABLE = 503
}

/**
 * Enhanced base error class that extends Error with comprehensive error tracking
 * and monitoring capabilities
 */
export class BaseError extends Error {
  public readonly code: number;
  public readonly details: string[];
  public readonly timestamp: number;
  public readonly requestId?: string;
  private readonly isProduction: boolean;

  /**
   * Creates a new BaseError instance with enhanced error tracking
   * @param message - Human-readable error message
   * @param code - HTTP status code
   * @param details - Additional error details
   * @param isProduction - Production environment flag
   */
  constructor(
    message: string,
    code: number = ErrorCode.INTERNAL_ERROR,
    details: string[] = [],
    isProduction: boolean = process.env.NODE_ENV === 'production'
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
    this.timestamp = Date.now();
    this.isProduction = isProduction;
    this.requestId = process.env.REQUEST_ID;

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);

    // Log error for monitoring
    this.logError();
  }

  /**
   * Converts error to JSON format for API responses
   * @returns Standardized error response object
   */
  public toJSON(): ErrorResponse {
    const response: ErrorResponse = {
      code: this.code,
      message: this.isProduction ? this.sanitizeMessage(this.message) : this.message,
      details: this.isProduction ? this.filterSensitiveDetails(this.details) : this.details,
      status: this.getResponseStatus(),
      timestamp: this.timestamp,
      requestId: this.requestId
    };

    // Include stack trace in development
    if (!this.isProduction) {
      Object.assign(response, { stack: this.stack });
    }

    return response;
  }

  /**
   * Type guard to check if an error is an instance of BaseError
   * @param error - Error to check
   * @returns boolean indicating if error is BaseError instance
   */
  public static isBaseError(error: any): error is BaseError {
    return error instanceof BaseError;
  }

  /**
   * Maps error code to response status
   * @private
   */
  private getResponseStatus(): string {
    switch (this.code) {
      case ErrorCode.VALIDATION_ERROR:
        return 'VALIDATION_ERROR';
      case ErrorCode.NOT_FOUND:
        return 'NOT_FOUND';
      case ErrorCode.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case ErrorCode.FORBIDDEN:
        return 'FORBIDDEN';
      case ErrorCode.SERVICE_UNAVAILABLE:
        return 'SERVER_ERROR';
      default:
        return 'ERROR';
    }
  }

  /**
   * Sanitizes error message for production environment
   * @private
   */
  private sanitizeMessage(message: string): string {
    return message.replace(/[^\w\s-]/gi, '');
  }

  /**
   * Filters sensitive information from error details
   * @private
   */
  private filterSensitiveDetails(details: string[]): string[] {
    return details.map(detail => this.sanitizeMessage(detail));
  }

  /**
   * Logs error details to monitoring system
   * @private
   */
  private logError(): void {
    // TODO: Implement actual error logging/monitoring
    console.error({
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp,
      requestId: this.requestId,
      stack: this.stack
    });
  }
}

/**
 * Specialized error class for validation failures
 */
export class ValidationError extends BaseError {
  constructor(message: string, details: string[] = []) {
    super(message, ErrorCode.VALIDATION_ERROR, details);
  }
}

/**
 * Specialized error class for resource not found scenarios
 */
export class NotFoundError extends BaseError {
  constructor(resource: string) {
    super(`Resource not found: ${resource}`, ErrorCode.NOT_FOUND);
  }
}

/**
 * Specialized error class for authentication failures
 */
export class AuthenticationError extends BaseError {
  constructor(message: string = 'Authentication failed') {
    super(message, ErrorCode.UNAUTHORIZED);
  }
}

/**
 * Specialized error class for authorization failures
 */
export class AuthorizationError extends BaseError {
  constructor(message: string = 'Access forbidden') {
    super(message, ErrorCode.FORBIDDEN);
  }
}

/**
 * Specialized error class for service unavailability
 */
export class ServiceUnavailableError extends BaseError {
  constructor(service: string) {
    super(`Service unavailable: ${service}`, ErrorCode.SERVICE_UNAVAILABLE);
  }
}