// express.d.ts
// External dependencies:
// express: ^4.18.x - Core Express namespace for type augmentation
// jsonwebtoken: ^9.x.x - JWT token payload type definition

import { Request } from 'express';
import { JwtPayload } from 'jsonwebtoken';

/**
 * Enum defining possible user roles in the system with strict access levels
 */
export enum UserRole {
  PUBLIC = 'PUBLIC',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN'
}

/**
 * Base interface extending Express Request with common properties for all requests
 */
interface CustomRequest {
  /** Request start timestamp for performance monitoring */
  startTime: number;
  /** JWT token from authorization header */
  token?: string;
  /** Unique identifier for request tracing */
  requestId: string;
}

/**
 * Interface for metrics-related requests with filtering capabilities
 */
interface MetricsRequest extends CustomRequest {
  /** ARR range filter */
  arr_range: string;
  /** Specific metric identifier */
  metric_id: string;
  /** Data source identifier */
  source_id: string;
  /** Time range for metrics data */
  date_range: {
    start: string;
    end: string;
  };
  /** Additional dynamic filters */
  filters: Record<string, string | number | boolean>;
}

/**
 * Interface for authenticated requests with user context
 */
interface AuthRequest extends CustomRequest {
  /** Authenticated user information with role and permissions */
  user: JwtPayload & {
    role: UserRole;
    permissions: string[];
    lastLogin: string;
  };
  /** Session information */
  session: {
    id: string;
    createdAt: string;
    expiresAt: string;
  };
}

/**
 * Interface for admin-only requests with audit capabilities
 */
interface AdminRequest extends AuthRequest {
  /** Type of administrative action being performed */
  admin_action: string;
  /** Note for audit logging */
  audit_note: string;
  /** Flag indicating if admin is impersonating another user */
  impersonating: boolean;
  /** Track changes for audit purposes */
  changes: Record<string, {
    old: unknown;
    new: unknown;
  }>;
}

// Augment Express namespace to include custom types
declare global {
  namespace Express {
    // Extend Express Request interface with custom properties
    interface Request extends CustomRequest {
      startTime: number;
      token?: string;
      user?: JwtPayload & {
        role: UserRole;
        permissions: string[];
      };
      requestId: string;
    }
  }
}

// Ensure this file is treated as a module
export {};