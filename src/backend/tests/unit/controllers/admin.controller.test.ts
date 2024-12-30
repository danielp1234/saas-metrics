// External imports with versions
import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals'; // ^29.0.0
import { Response, NextFunction } from 'express'; // ^4.18.x
import createHttpError from 'http-errors'; // ^2.0.0

// Internal imports
import { AdminController } from '../../../src/api/controllers/admin.controller';
import { AdminService } from '../../../src/services/admin.service';
import { AuthenticatedRequest } from '../../../src/interfaces/request.interface';
import { UserRole } from '../../../src/interfaces/auth.interface';
import { AuditAction, AuditResource } from '../../../src/interfaces/audit.interface';
import { ResponseStatus } from '../../../src/interfaces/response.interface';

// Mock AdminService
jest.mock('../../../src/services/admin.service');

describe('AdminController', () => {
  let adminController: AdminController;
  let mockAdminService: jest.Mocked<AdminService>;
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Initialize mocked service
    mockAdminService = {
      getAuditLogs: jest.fn(),
      getUserAuditLogs: jest.fn(),
      createDataSource: jest.fn(),
      updateDataSource: jest.fn(),
      deleteDataSource: jest.fn(),
    } as unknown as jest.Mocked<AdminService>;

    // Initialize controller
    adminController = new AdminController(mockAdminService);

    // Setup mock request
    mockRequest = {
      user: {
        id: 'test-user-id',
        email: 'admin@test.com',
        role: UserRole.ADMIN,
        lastLogin: new Date(),
        isActive: true
      },
      requestId: 'test-request-id',
      clientIp: '127.0.0.1',
      headers: {
        'user-agent': 'test-user-agent'
      },
      query: {}
    };

    // Setup mock response
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    // Setup mock next function
    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('getAuditLogs', () => {
    test('should successfully retrieve audit logs with default pagination', async () => {
      // Arrange
      const mockAuditLogs = {
        data: [
          {
            id: 'log-1',
            userId: 'user-1',
            action: AuditAction.CREATE,
            resource: AuditResource.DATA_SOURCE
          }
        ],
        total: 1
      };

      mockRequest.query = {
        startDate: '2023-01-01',
        endDate: '2023-12-31',
        page: '1',
        limit: '10'
      };

      mockAdminService.getAuditLogs.mockResolvedValue(mockAuditLogs);

      // Act
      await adminController.getAuditLogs(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockAdminService.getAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: expect.any(Date),
          endDate: expect.any(Date),
          page: 1,
          limit: 10
        }),
        mockRequest.user
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockAuditLogs,
          error: null,
          metadata: expect.objectContaining({
            apiVersion: '1.0.0',
            requestId: 'test-request-id'
          })
        })
      );
    });

    test('should handle invalid date range parameters', async () => {
      // Arrange
      mockRequest.query = {
        startDate: 'invalid-date',
        endDate: '2023-12-31'
      };

      // Act
      await adminController.getAuditLogs(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 400,
          message: 'Valid date range is required'
        })
      );
    });

    test('should enforce admin access control', async () => {
      // Arrange
      mockRequest.user!.role = UserRole.PUBLIC;

      // Act
      await adminController.getAuditLogs(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 403,
          message: 'Insufficient permissions for administrative access'
        })
      );
    });
  });

  describe('createDataSource', () => {
    test('should successfully create a data source with valid data', async () => {
      // Arrange
      mockRequest.user!.role = UserRole.SUPER_ADMIN;
      mockRequest.body = {
        name: 'Test Source',
        description: 'Test Description',
        config: {
          connectionConfig: {
            host: 'localhost',
            port: 5432,
            database: 'test_db',
            username: 'test_user'
          }
        },
        active: true
      };

      const mockCreatedSource = {
        id: 'source-1',
        ...mockRequest.body,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockAdminService.createDataSource.mockResolvedValue(mockCreatedSource);

      // Act
      await adminController.createDataSource(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockAdminService.createDataSource).toHaveBeenCalledWith(
        expect.objectContaining({
          ...mockRequest.body,
          ipAddress: '127.0.0.1',
          userAgent: 'test-user-agent'
        }),
        mockRequest.user
      );
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockCreatedSource,
          error: null
        })
      );
    });

    test('should enforce super admin access control', async () => {
      // Arrange
      mockRequest.user!.role = UserRole.ADMIN;

      // Act
      await adminController.createDataSource(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 403,
          message: 'Super admin privileges required for this operation'
        })
      );
    });
  });

  describe('updateDataSource', () => {
    test('should successfully update a data source', async () => {
      // Arrange
      const sourceId = 'source-1';
      mockRequest.params = { id: sourceId };
      mockRequest.body = {
        name: 'Updated Source',
        description: 'Updated Description',
        active: false
      };

      const mockUpdatedSource = {
        id: sourceId,
        ...mockRequest.body,
        updatedAt: new Date()
      };

      mockAdminService.updateDataSource.mockResolvedValue(mockUpdatedSource);

      // Act
      await adminController.updateDataSource(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockAdminService.updateDataSource).toHaveBeenCalledWith(
        sourceId,
        expect.objectContaining({
          ...mockRequest.body,
          ipAddress: '127.0.0.1',
          userAgent: 'test-user-agent'
        }),
        mockRequest.user
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockUpdatedSource,
          error: null
        })
      );
    });

    test('should handle missing data source ID', async () => {
      // Arrange
      mockRequest.params = {};

      // Act
      await adminController.updateDataSource(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 400,
          message: 'Data source ID is required'
        })
      );
    });
  });

  describe('deleteDataSource', () => {
    test('should successfully delete a data source', async () => {
      // Arrange
      mockRequest.user!.role = UserRole.SUPER_ADMIN;
      mockRequest.params = { id: 'source-1' };

      mockAdminService.deleteDataSource.mockResolvedValue(undefined);

      // Act
      await adminController.deleteDataSource(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockAdminService.deleteDataSource).toHaveBeenCalledWith(
        'source-1',
        expect.objectContaining({
          ipAddress: '127.0.0.1',
          userAgent: 'test-user-agent'
        }),
        mockRequest.user
      );
      expect(mockResponse.status).toHaveBeenCalledWith(204);
    });

    test('should enforce super admin access for deletion', async () => {
      // Arrange
      mockRequest.user!.role = UserRole.ADMIN;
      mockRequest.params = { id: 'source-1' };

      // Act
      await adminController.deleteDataSource(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 403,
          message: 'Super admin privileges required for this operation'
        })
      );
    });
  });
});