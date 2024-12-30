// External imports with versions
import request from 'supertest'; // ^6.3.3
import { describe, it, beforeEach, afterEach, jest } from 'jest'; // ^29.5.0

// Internal imports
import { AdminController } from '../../src/api/controllers/admin.controller';
import { UserRole } from '../../src/interfaces/auth.interface';
import { AuditAction, AuditResource } from '../../src/interfaces/audit.interface';
import { ValidationLevel } from '../../src/interfaces/request.interface';

/**
 * Test data source configuration for testing
 */
const TEST_DATA_SOURCE = {
  name: 'Test Data Source',
  description: 'Test data source for integration tests',
  active: true,
  config: {
    connectionConfig: {
      host: 'test-host',
      port: 5432,
      database: 'test-db',
      username: 'test-user',
      password: 'test-pass',
      ssl: true
    },
    poolConfig: {
      min: 2,
      max: 10,
      idleTimeoutMillis: 30000
    }
  }
};

/**
 * Integration test suite for admin functionality
 * Tests access control, audit logging, and data source management
 */
describe('Admin Integration Tests', () => {
  let app: Express.Application;
  let adminController: AdminController;
  let testUsers: Map<UserRole, any>;
  let testDataSources: any[];

  /**
   * Setup test environment before each test
   */
  beforeEach(async () => {
    // Initialize test application and controller
    app = await setupTestApplication();
    adminController = new AdminController(mockAdminService);

    // Setup test users for each role
    testUsers = new Map([
      [UserRole.SUPER_ADMIN, createTestUser(UserRole.SUPER_ADMIN)],
      [UserRole.ADMIN, createTestUser(UserRole.ADMIN)],
      [UserRole.PUBLIC, createTestUser(UserRole.PUBLIC)]
    ]);

    // Setup test data
    await setupTestDatabase();
  });

  /**
   * Cleanup test environment after each test
   */
  afterEach(async () => {
    await cleanupTestDatabase();
    jest.clearAllMocks();
  });

  describe('Access Control Tests', () => {
    it('should allow super admin to access all endpoints', async () => {
      const superAdmin = testUsers.get(UserRole.SUPER_ADMIN);
      
      // Test data source creation
      const createResponse = await request(app)
        .post('/api/v1/admin/data-sources')
        .set('Authorization', `Bearer ${superAdmin.token}`)
        .send(TEST_DATA_SOURCE);
      expect(createResponse.status).toBe(201);

      // Test audit log access
      const auditResponse = await request(app)
        .get('/api/v1/admin/audit-logs')
        .set('Authorization', `Bearer ${superAdmin.token}`);
      expect(auditResponse.status).toBe(200);
    });

    it('should restrict admin from sensitive operations', async () => {
      const admin = testUsers.get(UserRole.ADMIN);
      
      // Test data source creation (should fail)
      const createResponse = await request(app)
        .post('/api/v1/admin/data-sources')
        .set('Authorization', `Bearer ${admin.token}`)
        .send(TEST_DATA_SOURCE);
      expect(createResponse.status).toBe(403);

      // Test audit log access (should succeed)
      const auditResponse = await request(app)
        .get('/api/v1/admin/audit-logs')
        .set('Authorization', `Bearer ${admin.token}`);
      expect(auditResponse.status).toBe(200);
    });

    it('should deny public user access to admin endpoints', async () => {
      const publicUser = testUsers.get(UserRole.PUBLIC);
      
      const endpoints = [
        { method: 'get', path: '/api/v1/admin/audit-logs' },
        { method: 'post', path: '/api/v1/admin/data-sources' },
        { method: 'put', path: '/api/v1/admin/data-sources/1' },
        { method: 'delete', path: '/api/v1/admin/data-sources/1' }
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)[endpoint.method](endpoint.path)
          .set('Authorization', `Bearer ${publicUser.token}`);
        expect(response.status).toBe(403);
      }
    });
  });

  describe('Audit Logging Tests', () => {
    it('should create audit logs for all admin actions', async () => {
      const superAdmin = testUsers.get(UserRole.SUPER_ADMIN);

      // Perform admin action
      await request(app)
        .post('/api/v1/admin/data-sources')
        .set('Authorization', `Bearer ${superAdmin.token}`)
        .send(TEST_DATA_SOURCE);

      // Verify audit log creation
      const auditResponse = await request(app)
        .get('/api/v1/admin/audit-logs')
        .set('Authorization', `Bearer ${superAdmin.token}`);

      expect(auditResponse.status).toBe(200);
      expect(auditResponse.body.data).toContainEqual(
        expect.objectContaining({
          action: AuditAction.CREATE,
          resource: AuditResource.DATA_SOURCE,
          userId: superAdmin.id
        })
      );
    });

    it('should support audit log filtering and pagination', async () => {
      const admin = testUsers.get(UserRole.ADMIN);
      
      const response = await request(app)
        .get('/api/v1/admin/audit-logs')
        .query({
          startDate: new Date(Date.now() - 86400000).toISOString(), // Last 24 hours
          endDate: new Date().toISOString(),
          page: 1,
          limit: 10,
          action: AuditAction.CREATE
        })
        .set('Authorization', `Bearer ${admin.token}`);

      expect(response.status).toBe(200);
      expect(response.body.metadata).toHaveProperty('total');
      expect(response.body.data.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Data Source Management Tests', () => {
    it('should validate data source configuration', async () => {
      const superAdmin = testUsers.get(UserRole.SUPER_ADMIN);
      
      const invalidConfig = {
        ...TEST_DATA_SOURCE,
        config: {
          connectionConfig: {
            // Missing required fields
            host: 'test-host'
          }
        }
      };

      const response = await request(app)
        .post('/api/v1/admin/data-sources')
        .set('Authorization', `Bearer ${superAdmin.token}`)
        .send(invalidConfig);

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('Invalid connection configuration');
    });

    it('should handle concurrent data source operations', async () => {
      const superAdmin = testUsers.get(UserRole.SUPER_ADMIN);
      
      // Create multiple data sources concurrently
      const promises = Array(5).fill(null).map((_, index) => 
        request(app)
          .post('/api/v1/admin/data-sources')
          .set('Authorization', `Bearer ${superAdmin.token}`)
          .send({
            ...TEST_DATA_SOURCE,
            name: `Test Data Source ${index}`
          })
      );

      const results = await Promise.all(promises);
      
      // Verify all operations succeeded
      results.forEach(response => {
        expect(response.status).toBe(201);
      });

      // Verify correct number of data sources created
      const listResponse = await request(app)
        .get('/api/v1/admin/data-sources')
        .set('Authorization', `Bearer ${superAdmin.token}`);

      expect(listResponse.body.data.length).toBe(5);
    });

    it('should enforce rate limiting on admin endpoints', async () => {
      const admin = testUsers.get(UserRole.ADMIN);
      
      // Make multiple requests in quick succession
      const requests = Array(150).fill(null).map(() => 
        request(app)
          .get('/api/v1/admin/audit-logs')
          .set('Authorization', `Bearer ${admin.token}`)
      );

      const results = await Promise.all(requests);
      
      // Verify some requests were rate limited
      const rateLimited = results.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });
});

/**
 * Helper function to create test user with specified role
 * @param role User role for test user
 * @returns Test user object with authentication token
 */
function createTestUser(role: UserRole) {
  return {
    id: `test-${role}-${Date.now()}`,
    email: `test-${role}@example.com`,
    role,
    token: `test-token-${role}`,
    lastLogin: new Date(),
    isActive: true
  };
}