// External imports with versions
import createHttpError from 'http-errors'; // ^2.0.0
import { Logger } from 'winston'; // ^3.8.0

// Internal imports
import { UserRole } from '../interfaces/auth.interface';
import { AuditModel } from '../models/audit.model';
import { DataSourceModel } from '../models/dataSource.model';
import { 
  IAuditLog, 
  IAuditQuery, 
  AuditAction, 
  AuditResource 
} from '../interfaces/audit.interface';
import { AuthenticatedUser } from '../interfaces/auth.interface';

/**
 * Enhanced service class handling administrative operations with strict security controls 
 * and comprehensive audit logging
 */
export class AdminService {
  /**
   * Initializes the admin service with required dependencies and security configurations
   * @param auditModel - Instance of AuditModel for audit logging
   * @param dataSourceModel - Instance of DataSourceModel for data source management
   * @param logger - Winston logger instance for secure logging
   */
  constructor(
    private readonly auditModel: AuditModel,
    private readonly dataSourceModel: DataSourceModel,
    private readonly logger: Logger
  ) {
    this.validateDependencies();
  }

  /**
   * Validates service dependencies on initialization
   * @private
   * @throws Error if required dependencies are missing
   */
  private validateDependencies(): void {
    if (!this.auditModel || !this.dataSourceModel || !this.logger) {
      throw new Error('Required dependencies not provided to AdminService');
    }
  }

  /**
   * Retrieves paginated audit logs with enhanced filtering and security context
   * @param queryParams - Query parameters for filtering audit logs
   * @param user - Authenticated user making the request
   * @returns Promise resolving to paginated audit logs with security metadata
   * @throws HttpError if user lacks permissions or operation fails
   */
  public async getAuditLogs(
    queryParams: IAuditQuery,
    user: AuthenticatedUser
  ): Promise<{ data: IAuditLog[]; total: number }> {
    try {
      // Validate admin access
      this.validateAdminAccess(user);

      // Apply role-based query restrictions
      const secureQueryParams = this.applyRoleBasedFilters(queryParams, user);

      // Log access attempt
      this.logger.info('Audit log access attempt', {
        userId: user.id,
        role: user.role,
        queryParams: secureQueryParams
      });

      // Execute query with security context
      const result = await this.auditModel.query(secureQueryParams);

      // Mask sensitive data based on user role
      const sanitizedData = this.sanitizeAuditLogs(result.data, user.role);

      return {
        data: sanitizedData,
        total: result.total
      };
    } catch (error) {
      this.logger.error('Failed to retrieve audit logs', {
        error: error.message,
        userId: user.id
      });
      throw createHttpError(error.status || 500, error.message);
    }
  }

  /**
   * Creates a new data source with comprehensive validation and security checks
   * @param dataSourceData - Data source configuration and metadata
   * @param user - Authenticated user making the request
   * @returns Promise resolving to created data source with security metadata
   * @throws HttpError if validation fails or operation fails
   */
  public async createDataSource(
    dataSourceData: Record<string, any>,
    user: AuthenticatedUser
  ): Promise<DataSourceModel> {
    try {
      // Validate admin access
      this.validateAdminAccess(user);

      // Sanitize input data
      const sanitizedData = await this.dataSourceModel.sanitizeInput(dataSourceData);

      // Validate data source configuration
      await this.dataSourceModel.validateConfig(sanitizedData);

      // Create audit log entry
      await this.auditModel.create({
        userId: user.id,
        userRole: user.role,
        action: AuditAction.CREATE,
        resource: AuditResource.DATA_SOURCE,
        resourceId: sanitizedData.id || 'pending',
        changes: sanitizedData,
        ipAddress: dataSourceData.ipAddress,
        userAgent: dataSourceData.userAgent,
        createdAt: new Date()
      });

      // Create data source with security context
      const createdDataSource = await this.dataSourceModel.query().insert(sanitizedData);

      this.logger.info('Data source created successfully', {
        dataSourceId: createdDataSource.id,
        userId: user.id
      });

      return createdDataSource;
    } catch (error) {
      this.logger.error('Failed to create data source', {
        error: error.message,
        userId: user.id
      });
      throw createHttpError(error.status || 500, error.message);
    }
  }

  /**
   * Validates user has required admin privileges
   * @private
   * @param user - Authenticated user to validate
   * @throws HttpError if user lacks required permissions
   */
  private validateAdminAccess(user: AuthenticatedUser): void {
    if (![UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(user.role)) {
      throw createHttpError(403, 'Insufficient permissions for administrative access');
    }
  }

  /**
   * Applies role-based filters to audit log queries
   * @private
   * @param queryParams - Original query parameters
   * @param user - Authenticated user
   * @returns Modified query parameters with role-based restrictions
   */
  private applyRoleBasedFilters(
    queryParams: IAuditQuery,
    user: AuthenticatedUser
  ): IAuditQuery {
    const secureParams = { ...queryParams };

    // Regular admins can only see non-system audit logs
    if (user.role === UserRole.ADMIN) {
      secureParams.resource = AuditResource.DATA_SOURCE;
    }

    return secureParams;
  }

  /**
   * Sanitizes audit log data based on user role
   * @private
   * @param logs - Audit logs to sanitize
   * @param role - User role for determining sanitization level
   * @returns Sanitized audit logs
   */
  private sanitizeAuditLogs(logs: IAuditLog[], role: UserRole): IAuditLog[] {
    return logs.map(log => {
      const sanitizedLog = { ...log };

      // Mask sensitive data for non-super admins
      if (role !== UserRole.SUPER_ADMIN) {
        if (sanitizedLog.changes?.password) {
          sanitizedLog.changes.password = '********';
        }
        if (sanitizedLog.changes?.credentials) {
          sanitizedLog.changes.credentials = '********';
        }
      }

      return sanitizedLog;
    });
  }
}