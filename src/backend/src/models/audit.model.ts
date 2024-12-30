/**
 * @fileoverview Implements the Audit model for handling audit log entries in the SaaS Metrics Platform.
 * Provides comprehensive logging, retention policies, and secure data handling with robust error
 * management and performance optimization.
 * 
 * @version 1.0.0
 * @license MIT
 */

import { Knex } from 'knex'; // v2.5.0
import { v4 as uuidv4 } from 'uuid'; // v9.0.0
import { AuditLogEntry, AuditAction, AuditFilter } from '../interfaces/audit.interface';

/**
 * Interface for paginated results
 */
interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Interface for pagination options
 */
interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: keyof AuditLogEntry;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Model class for handling audit log entries with comprehensive validation,
 * error handling, and performance optimization
 */
export class AuditModel {
  private readonly knex: Knex;
  private readonly tableName: string = 'audit_logs';
  private readonly retentionPeriodYears: number;

  /**
   * Initializes the AuditModel with database connection and configuration
   * @param db - Knex database instance
   * @param retentionPeriodYears - Retention period in years (default: 3)
   */
  constructor(db: Knex, retentionPeriodYears: number = 3) {
    this.knex = db;
    this.retentionPeriodYears = retentionPeriodYears;
  }

  /**
   * Creates a new audit log entry with validation and error handling
   * @param entry - Audit log entry to create
   * @returns Promise resolving to created audit log entry
   * @throws Error if validation fails or database operation fails
   */
  async create(entry: Omit<AuditLogEntry, 'id' | 'createdAt' | 'retentionDate'>): Promise<AuditLogEntry> {
    // Validate required fields
    this.validateEntry(entry);

    const now = new Date();
    const retentionDate = new Date(now);
    retentionDate.setFullYear(now.getFullYear() + this.retentionPeriodYears);

    const auditEntry: AuditLogEntry = {
      id: uuidv4(),
      ...entry,
      createdAt: now,
      retentionDate
    };

    try {
      // Use transaction for data integrity
      await this.knex.transaction(async (trx) => {
        await trx(this.tableName).insert(auditEntry);
      });

      return auditEntry;
    } catch (error) {
      throw new Error(`Failed to create audit log entry: ${error.message}`);
    }
  }

  /**
   * Retrieves an audit log entry by ID
   * @param id - ID of the audit log entry to retrieve
   * @returns Promise resolving to found audit log entry or null
   */
  async findById(id: string): Promise<AuditLogEntry | null> {
    try {
      const entry = await this.knex(this.tableName)
        .where({ id })
        .first();
      
      return entry || null;
    } catch (error) {
      throw new Error(`Failed to retrieve audit log entry: ${error.message}`);
    }
  }

  /**
   * Retrieves audit log entries based on filter criteria with pagination
   * @param filter - Filter criteria for audit logs
   * @param pagination - Pagination options
   * @returns Promise resolving to paginated result of audit log entries
   */
  async findByFilter(
    filter: AuditFilter,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<AuditLogEntry>> {
    try {
      const query = this.knex(this.tableName);

      // Apply filters
      if (filter.userId) query.where('userId', filter.userId);
      if (filter.action) query.where('action', filter.action);
      if (filter.resourceType) query.where('resourceType', filter.resourceType);
      if (filter.startDate) query.where('createdAt', '>=', filter.startDate);
      if (filter.endDate) query.where('createdAt', '<=', filter.endDate);

      // Get total count for pagination
      const [{ count }] = await query.clone().count('* as count');
      const total = Number(count);

      // Apply pagination and sorting
      const { page, limit, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;
      const offset = (page - 1) * limit;

      const data = await query
        .orderBy(sortBy, sortOrder)
        .limit(limit)
        .offset(offset);

      return {
        data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      throw new Error(`Failed to retrieve audit logs: ${error.message}`);
    }
  }

  /**
   * Deletes audit logs older than retention period with archival
   * @returns Promise resolving to number of deleted entries
   */
  async deleteExpired(): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - this.retentionPeriodYears);

    try {
      // Use transaction for data integrity
      const deletedCount = await this.knex.transaction(async (trx) => {
        // Archive expired entries before deletion (implement archival logic here)
        const expiredEntries = await trx(this.tableName)
          .where('createdAt', '<', cutoffDate)
          .select('*');

        // Implement your archival logic here
        // await this.archiveEntries(expiredEntries);

        // Delete expired entries
        const count = await trx(this.tableName)
          .where('createdAt', '<', cutoffDate)
          .delete();

        return count;
      });

      return deletedCount;
    } catch (error) {
      throw new Error(`Failed to delete expired audit logs: ${error.message}`);
    }
  }

  /**
   * Validates audit log entry fields
   * @param entry - Audit log entry to validate
   * @throws Error if validation fails
   */
  private validateEntry(entry: Partial<AuditLogEntry>): void {
    if (!entry.userId) throw new Error('User ID is required');
    if (!entry.action || !Object.values(AuditAction).includes(entry.action)) {
      throw new Error('Valid action is required');
    }
    if (!entry.resourceType) throw new Error('Resource type is required');
    if (!entry.resourceId) throw new Error('Resource ID is required');
    if (!entry.ipAddress) throw new Error('IP address is required');
    if (!entry.userAgent) throw new Error('User agent is required');
  }
}