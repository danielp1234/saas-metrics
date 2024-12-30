/**
 * @fileoverview Express router configuration for administrative endpoints
 * Implements secure routes with comprehensive middleware chains for audit logs,
 * data source management, and administrative operations.
 * @version 1.0.0
 */

// External imports with versions
import express, { Router } from 'express'; // ^4.18.x
import rateLimit from 'express-rate-limit'; // ^6.x
import helmet from 'helmet'; // ^6.x

// Internal imports
import { AdminController } from '../controllers/admin.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validatePagination } from '../middleware/validation.middleware';
import { 
  validateAdminRole, 
  validateDataSourceUpdate 
} from '../validators/admin.validator';
import { UserRole } from '../../interfaces/auth.interface';

/**
 * Rate limiting configuration for admin routes
 * Implements strict rate limiting for security
 */
const adminRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Initializes and configures administrative routes with security middleware
 * @param adminController - Instance of AdminController for handling admin operations
 * @returns Configured Express router with secured admin routes
 */
export function initializeAdminRoutes(adminController: AdminController): Router {
  const router = express.Router();

  // Apply security middleware to all admin routes
  router.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      }
    },
    xssFilter: true,
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  }));
  router.use(adminRateLimiter);

  // Audit Log Routes
  router.get(
    '/audit-logs',
    authenticate,
    authorize([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
    validateAdminRole,
    validatePagination,
    adminController.getAuditLogs
  );

  router.get(
    '/audit-logs/user/:userId',
    authenticate,
    authorize([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
    validateAdminRole,
    validatePagination,
    adminController.getUserAuditLogs
  );

  // Data Source Management Routes
  router.post(
    '/data-sources',
    authenticate,
    authorize([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
    validateAdminRole,
    validateDataSourceUpdate,
    adminController.createDataSource
  );

  router.put(
    '/data-sources/:id',
    authenticate,
    authorize([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
    validateAdminRole,
    validateDataSourceUpdate,
    adminController.updateDataSource
  );

  router.delete(
    '/data-sources/:id',
    authenticate,
    authorize([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
    validateAdminRole,
    adminController.deleteDataSource
  );

  router.get(
    '/data-sources/:id/metrics',
    authenticate,
    authorize([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
    validateAdminRole,
    adminController.getDataSourceMetrics
  );

  // Error handling middleware
  router.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Admin route error:', err);
    res.status(err.status || 500).json({
      error: {
        message: err.message || 'Internal server error',
        status: err.status || 500,
        timestamp: new Date().toISOString(),
        path: req.path
      }
    });
  });

  return router;
}

// Export configured admin routes
export const adminRouter = (adminController: AdminController): Router => 
  initializeAdminRoutes(adminController);