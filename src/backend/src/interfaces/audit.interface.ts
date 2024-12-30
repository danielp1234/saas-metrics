/**
 * @fileoverview Defines TypeScript interfaces and types for audit logging functionality
 * in the SaaS Metrics Platform. Implements secure, immutable audit trail with 
 * comprehensive tracking of admin actions and changes.
 * 
 * @version 1.0.0
 * @license MIT
 */

/**
 * Enumeration of all possible administrative actions that require audit logging.
 * Used to maintain consistent action types across the audit trail.
 */
export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  IMPORT = 'IMPORT',
  EXPORT = 'EXPORT',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  VIEW_SENSITIVE = 'VIEW_SENSITIVE',
  MODIFY_SETTINGS = 'MODIFY_SETTINGS',
  BULK_UPDATE = 'BULK_UPDATE'
}

/**
 * Interface defining the structure of an immutable audit log entry.
 * All properties are readonly to ensure audit trail integrity.
 * Implements comprehensive tracking of admin actions with user context,
 * IP address, and detailed change tracking.
 */
export interface AuditLogEntry {
  /** Unique identifier for the audit log entry */
  readonly id: string;

  /** ID of the user who performed the action */
  readonly userId: string;

  /** Type of action performed */
  readonly action: AuditAction;

  /** Type of resource affected (e.g., 'metric', 'user', 'setting') */
  readonly resourceType: string;

  /** Identifier of the specific resource affected */
  readonly resourceId: string;

  /** 
   * Detailed tracking of changes made, storing both old and new values
   * for each modified field
   */
  readonly changes: Record<string, {
    oldValue: unknown;
    newValue: unknown;
  }>;

  /** IP address from which the action was performed */
  readonly ipAddress: string;

  /** User agent string of the client that performed the action */
  readonly userAgent: string;

  /** Timestamp when the action was performed */
  readonly createdAt: Date;

  /** 
   * Calculated retention date based on 3-year retention policy
   * Used for automated cleanup of expired audit logs
   */
  readonly retentionDate: Date;
}

/**
 * Interface for filtering and querying audit logs.
 * Supports flexible searching with pagination and sorting.
 */
export interface AuditFilter {
  /** Filter by specific user ID */
  userId?: string;

  /** Filter by action type */
  action?: AuditAction;

  /** Filter by resource type */
  resourceType?: string;

  /** Start date for date range filtering */
  startDate?: Date;

  /** End date for date range filtering */
  endDate?: Date;

  /** Page number for pagination */
  page?: number;

  /** Number of items per page */
  limit?: number;

  /** Field to sort by */
  sortBy?: keyof AuditLogEntry;

  /** Sort order direction */
  sortOrder?: 'asc' | 'desc';
}