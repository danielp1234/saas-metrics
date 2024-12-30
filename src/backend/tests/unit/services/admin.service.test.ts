// External imports with versions
import { jest } from '@jest/globals'; // ^29.0.0
import winston from 'winston'; // ^3.8.0
import createHttpError from 'http-errors'; // ^2.0.0

// Internal imports
import { AdminService } from '../../src/services/admin.service';
import { AuditModel } from '../../src/models/audit.model';
import { DataSourceModel } from '../../src/models/dataSource.model';
import { UserRole } from '../../src/interfaces/auth.interface';
import { AuditAction, AuditResource } from '../../src/interfaces/audit.interface';

describe('AdminService', () => {
  // Mock instances
  let auditModel: jest.Mocked<AuditModel>;
  let dataSourceModel: jest.Mocked<DataSourceModel>;
  let logger: jest.Mocked<winston.Logger>;
  let adminService: AdminService;

  // Test data
  const mockAdminUser = {
    id: 'admin-123',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
    lastLogin: new Date(),
    isActive: true
  };

  const mockSuperAdminUser = {
    id: 'super-123',
    email: 'super@example.com',
    role: UserRole.SUPER_ADMIN,
    lastLogin: new Date(),
    isActive: true
  };

  beforeEach(() => {
    // Initialize mocks
    auditModel = {
      create: jest.fn(),
      query: jest.fn(),
      getUserActivity: jest.fn(),
      validateAuditData: jest.fn()
    } as unknown as jest.Mocked<AuditModel>;

    dataSourceModel = {
      validateConfig: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findById: jest.fn(),
      sanitizeInput: jest.fn()
    } as unknown as jest.Mocked<DataSourceModel>;

    logger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn()
    } as unknown as jest.Mocked<winston.Logger>;

    // Initialize service
    adminService = new AdminService(auditModel, dataSourceModel, logger);
  });

  describe('getAuditLogs', () => {
    const mockQuery = {
      startDate: new Date('2023-01-01'),
      endDate: new Date('2023-12-31'),
      userId: 'user-123',
      action: AuditAction.CREATE,
      resource: AuditResource.DATA_SOURCE,
      page: 1,
      limit: 10
    };

    const mockAuditLogs = {
      data: [
        {
          id: 'audit-1',
          userId: 'user-123',
          userRole: UserRole.ADMIN,
          action: AuditAction.CREATE,
          resource: AuditResource.DATA_SOURCE,
          resourceId: 'resource-1',
          changes: { name: 'test' },
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
          createdAt: new Date()
        }
      ],
      total: 1
    };

    it('should retrieve audit logs for admin user', async () => {
      auditModel.query.mockResolvedValue(mockAuditLogs);

      const result = await adminService.getAuditLogs(mockQuery, mockAdminUser);

      expect(result).toEqual({
        data: mockAuditLogs.data,
        total: mockAuditLogs.total
      });
      expect(auditModel.query).toHaveBeenCalledWith(expect.objectContaining({
        resource: AuditResource.DATA_SOURCE
      }));
      expect(logger.info).toHaveBeenCalled();
    });

    it('should retrieve all audit logs for super admin', async () => {
      auditModel.query.mockResolvedValue(mockAuditLogs);

      const result = await adminService.getAuditLogs(mockQuery, mockSuperAdminUser);

      expect(result).toEqual({
        data: mockAuditLogs.data,
        total: mockAuditLogs.total
      });
      expect(auditModel.query).toHaveBeenCalledWith(mockQuery);
    });

    it('should throw error for unauthorized access', async () => {
      const unauthorizedUser = { ...mockAdminUser, role: UserRole.PUBLIC };

      await expect(adminService.getAuditLogs(mockQuery, unauthorizedUser))
        .rejects
        .toThrow('Insufficient permissions for administrative access');
    });
  });

  describe('createDataSource', () => {
    const mockDataSource = {
      name: 'Test Source',
      description: 'Test Description',
      config: {
        connectionConfig: {
          host: 'localhost',
          port: 5432,
          database: 'test',
          username: 'user'
        }
      },
      active: true
    };

    it('should create data source with valid admin credentials', async () => {
      dataSourceModel.sanitizeInput.mockResolvedValue(mockDataSource);
      dataSourceModel.validateConfig.mockResolvedValue(true);
      dataSourceModel.query = jest.fn().mockReturnValue({
        insert: jest.fn().mockResolvedValue({ id: 'ds-123', ...mockDataSource })
      });

      const result = await adminService.createDataSource(mockDataSource, mockAdminUser);

      expect(result).toHaveProperty('id', 'ds-123');
      expect(auditModel.create).toHaveBeenCalledWith(expect.objectContaining({
        action: AuditAction.CREATE,
        resource: AuditResource.DATA_SOURCE
      }));
      expect(logger.info).toHaveBeenCalled();
    });

    it('should throw error on invalid configuration', async () => {
      dataSourceModel.validateConfig.mockRejectedValue(new Error('Invalid config'));

      await expect(adminService.createDataSource(mockDataSource, mockAdminUser))
        .rejects
        .toThrow('Invalid config');
      expect(logger.error).toHaveBeenCalled();
    });

    it('should throw error for unauthorized access', async () => {
      const unauthorizedUser = { ...mockAdminUser, role: UserRole.PUBLIC };

      await expect(adminService.createDataSource(mockDataSource, unauthorizedUser))
        .rejects
        .toThrow('Insufficient permissions for administrative access');
    });
  });

  describe('validateAdminAccess', () => {
    it('should allow access for admin user', () => {
      expect(() => {
        (adminService as any).validateAdminAccess(mockAdminUser);
      }).not.toThrow();
    });

    it('should allow access for super admin user', () => {
      expect(() => {
        (adminService as any).validateAdminAccess(mockSuperAdminUser);
      }).not.toThrow();
    });

    it('should throw error for non-admin user', () => {
      const publicUser = { ...mockAdminUser, role: UserRole.PUBLIC };
      
      expect(() => {
        (adminService as any).validateAdminAccess(publicUser);
      }).toThrow(createHttpError(403, 'Insufficient permissions for administrative access'));
    });
  });

  describe('sanitizeAuditLogs', () => {
    const mockLogs = [
      {
        id: 'audit-1',
        changes: {
          password: 'secret123',
          credentials: 'api-key-123',
          name: 'test'
        }
      }
    ];

    it('should mask sensitive data for admin users', () => {
      const result = (adminService as any).sanitizeAuditLogs(mockLogs, UserRole.ADMIN);
      
      expect(result[0].changes.password).toBe('********');
      expect(result[0].changes.credentials).toBe('********');
      expect(result[0].changes.name).toBe('test');
    });

    it('should not mask data for super admin users', () => {
      const result = (adminService as any).sanitizeAuditLogs(mockLogs, UserRole.SUPER_ADMIN);
      
      expect(result[0].changes.password).toBe('secret123');
      expect(result[0].changes.credentials).toBe('api-key-123');
      expect(result[0].changes.name).toBe('test');
    });
  });
});