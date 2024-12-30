// External imports with versions
import { Request, Response, NextFunction } from 'express'; // ^4.18.x
import createHttpError from 'http-errors'; // ^2.0.0
import { performance } from 'perf_hooks'; // Node.js built-in

// Internal imports
import { AdminService } from '../../services/admin.service';
import { AuthenticatedRequest } from '../../interfaces/request.interface';
import { ApiResponse, ResponseStatus, ResponseMetadata } from '../../interfaces/response.interface';
import { UserRole } from '../../interfaces/auth.interface';
import { IAuditQuery } from '../../interfaces/audit.interface';
import { ValidationLevel } from '../../interfaces/request.interface';

/**
 * Enhanced controller class handling administrative endpoints with security,
 * performance monitoring, and comprehensive audit logging capabilities
 */
export class AdminController {
  /**
   * Initializes the admin controller with required services and configurations
   * @param adminService - Instance of AdminService for administrative operations
   */
  constructor(private readonly adminService: AdminService) {
    this.validateDependencies();
  }

  /**
   * Validates controller dependencies
   * @private
   * @throws Error if required dependencies are missing
   */
  private validateDependencies(): void {
    if (!this.adminService) {
      throw new Error('AdminService is required');
    }
  }

  /**
   * Retrieves paginated and filtered audit logs with performance tracking
   * @param req - Authenticated request with query parameters
   * @param res - Express response object
   * @param next - Express next function
   */
  public async getAuditLogs(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const startTime = performance.now();
    
    try {
      // Extract and validate query parameters
      const queryParams: IAuditQuery = this.validateAuditQueryParams({
        startDate: new Date(req.query.startDate as string),
        endDate: new Date(req.query.endDate as string),
        userId: req.query.userId as string,
        action: req.query.action as string,
        resource: req.query.resource as string,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10
      });

      // Get audit logs with security context
      const result = await this.adminService.getAuditLogs(queryParams, req.user);

      // Prepare response metadata
      const metadata: ResponseMetadata = {
        responseTime: performance.now() - startTime,
        apiVersion: '1.0.0',
        timestamp: Date.now(),
        requestId: req.requestId,
        server: process.env.SERVER_ID
      };

      // Send successful response
      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
        error: null,
        metadata
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Creates a new data source with comprehensive validation
   * @param req - Authenticated request with data source configuration
   * @param res - Express response object
   * @param next - Express next function
   */
  public async createDataSource(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const startTime = performance.now();

    try {
      // Validate user has super admin privileges
      this.validateSuperAdminAccess(req.user);

      // Create data source with security context
      const result = await this.adminService.createDataSource(
        {
          ...req.body,
          ipAddress: req.clientIp,
          userAgent: req.headers['user-agent']
        },
        req.user
      );

      // Prepare response metadata
      const metadata: ResponseMetadata = {
        responseTime: performance.now() - startTime,
        apiVersion: '1.0.0',
        timestamp: Date.now(),
        requestId: req.requestId,
        server: process.env.SERVER_ID
      };

      // Send successful response
      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
        error: null,
        metadata
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Updates an existing data source with validation
   * @param req - Authenticated request with updated configuration
   * @param res - Express response object
   * @param next - Express next function
   */
  public async updateDataSource(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const startTime = performance.now();

    try {
      // Validate user has admin privileges
      this.validateAdminAccess(req.user);

      // Validate data source ID
      const dataSourceId = req.params.id;
      if (!dataSourceId) {
        throw createHttpError(400, 'Data source ID is required');
      }

      // Update data source with security context
      const result = await this.adminService.updateDataSource(
        dataSourceId,
        {
          ...req.body,
          ipAddress: req.clientIp,
          userAgent: req.headers['user-agent']
        },
        req.user
      );

      // Prepare response metadata
      const metadata: ResponseMetadata = {
        responseTime: performance.now() - startTime,
        apiVersion: '1.0.0',
        timestamp: Date.now(),
        requestId: req.requestId,
        server: process.env.SERVER_ID
      };

      // Send successful response
      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
        error: null,
        metadata
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Deletes a data source with proper authorization
   * @param req - Authenticated request with data source ID
   * @param res - Express response object
   * @param next - Express next function
   */
  public async deleteDataSource(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const startTime = performance.now();

    try {
      // Validate user has super admin privileges
      this.validateSuperAdminAccess(req.user);

      // Validate data source ID
      const dataSourceId = req.params.id;
      if (!dataSourceId) {
        throw createHttpError(400, 'Data source ID is required');
      }

      // Delete data source with security context
      await this.adminService.deleteDataSource(
        dataSourceId,
        {
          ipAddress: req.clientIp,
          userAgent: req.headers['user-agent']
        },
        req.user
      );

      // Prepare response metadata
      const metadata: ResponseMetadata = {
        responseTime: performance.now() - startTime,
        apiVersion: '1.0.0',
        timestamp: Date.now(),
        requestId: req.requestId,
        server: process.env.SERVER_ID
      };

      // Send successful response
      const response: ApiResponse<null> = {
        success: true,
        data: null,
        error: null,
        metadata
      };

      res.status(204).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Validates audit query parameters
   * @private
   * @param params - Query parameters to validate
   * @returns Validated query parameters
   * @throws HttpError if validation fails
   */
  private validateAuditQueryParams(params: Partial<IAuditQuery>): IAuditQuery {
    const { startDate, endDate, page, limit } = params;

    if (!startDate || !endDate || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw createHttpError(400, 'Valid date range is required');
    }

    if (startDate > endDate) {
      throw createHttpError(400, 'Start date must be before end date');
    }

    if (page < 1 || limit < 1) {
      throw createHttpError(400, 'Invalid pagination parameters');
    }

    return params as IAuditQuery;
  }

  /**
   * Validates user has admin privileges
   * @private
   * @param user - Authenticated user to validate
   * @throws HttpError if user lacks required permissions
   */
  private validateAdminAccess(user: AuthenticatedRequest['user']): void {
    if (![UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(user.role)) {
      throw createHttpError(403, 'Insufficient permissions for administrative access');
    }
  }

  /**
   * Validates user has super admin privileges
   * @private
   * @param user - Authenticated user to validate
   * @throws HttpError if user lacks required permissions
   */
  private validateSuperAdminAccess(user: AuthenticatedRequest['user']): void {
    if (user.role !== UserRole.SUPER_ADMIN) {
      throw createHttpError(403, 'Super admin privileges required for this operation');
    }
  }
}