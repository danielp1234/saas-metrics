// @version react ^18.2.0
// @version react-router-dom ^6.0.0
// @version retry-ts ^0.1.3

import { lazy } from 'react';
import { RouteObject } from 'react-router-dom';
import { retry } from 'retry-ts';
import { isAdmin } from '../utils/auth.utils';

// Constants for route configuration
const ROUTE_CACHE_TTL = 3600000; // 1 hour in milliseconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

/**
 * Enhanced interface for route configuration with metadata and security features
 */
interface RouteConfig extends RouteObject {
  requiresAuth: boolean;
  roles?: string[];
  metadata?: {
    title: string;
    description: string;
    analyticsId: string;
  };
  security?: {
    headers: Record<string, string>;
    csp: string;
  };
  performance?: {
    preload: boolean;
    cacheStrategy: string;
  };
}

/**
 * Cache for route validation results
 */
const routeCache = new Map<string, { isPublic: boolean; timestamp: number }>();

/**
 * Enhanced lazy loading with retry logic and error handling
 */
const lazyLoadComponent = (componentPath: string) => {
  const retryOptions = {
    retries: MAX_RETRIES,
    factor: 2,
    minTimeout: RETRY_DELAY,
    maxTimeout: RETRY_DELAY * 5,
  };

  return lazy(() =>
    retry(() =>
      import(`../pages/${componentPath}`).catch((error) => {
        console.error(`Failed to load component: ${componentPath}`, error);
        throw error;
      }), retryOptions)
  );
};

/**
 * Public routes configuration with metadata and security settings
 */
const publicRoutes: RouteConfig[] = [
  {
    path: '/',
    element: lazyLoadComponent('metrics/List'),
    requiresAuth: false,
    metadata: {
      title: 'SaaS Metrics Dashboard',
      description: 'View and analyze SaaS performance metrics',
      analyticsId: 'dashboard_view'
    },
    performance: {
      preload: true,
      cacheStrategy: 'stale-while-revalidate'
    }
  },
  {
    path: '/metrics',
    element: lazyLoadComponent('metrics/List'),
    requiresAuth: false,
    metadata: {
      title: 'Metrics Overview',
      description: 'Comprehensive SaaS metrics analysis',
      analyticsId: 'metrics_list'
    },
    performance: {
      preload: true,
      cacheStrategy: 'stale-while-revalidate'
    }
  },
  {
    path: '/metrics/:id',
    element: lazyLoadComponent('metrics/Detail'),
    requiresAuth: false,
    metadata: {
      title: 'Metric Details',
      description: 'Detailed metric analysis and benchmarks',
      analyticsId: 'metric_detail'
    }
  }
];

/**
 * Admin routes configuration with enhanced security
 */
const adminRoutes: RouteConfig[] = [
  {
    path: '/admin',
    element: lazyLoadComponent('admin/Dashboard'),
    requiresAuth: true,
    roles: ['ADMIN', 'SUPER_ADMIN'],
    metadata: {
      title: 'Admin Dashboard',
      description: 'Administrative controls and settings',
      analyticsId: 'admin_dashboard'
    },
    security: {
      headers: {
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff'
      },
      csp: "default-src 'self'"
    }
  },
  {
    path: '/admin/data-sources',
    element: lazyLoadComponent('admin/DataSources'),
    requiresAuth: true,
    roles: ['ADMIN', 'SUPER_ADMIN'],
    metadata: {
      title: 'Data Sources Management',
      description: 'Manage metric data sources',
      analyticsId: 'admin_sources'
    }
  }
];

/**
 * Utility routes for error handling and documentation
 */
const utilityRoutes: RouteConfig[] = [
  {
    path: '/error',
    element: lazyLoadComponent('Error'),
    requiresAuth: false,
    metadata: {
      title: 'Error',
      description: 'Error page',
      analyticsId: 'error_view'
    }
  },
  {
    path: '/help',
    element: lazyLoadComponent('Help'),
    requiresAuth: false,
    metadata: {
      title: 'Help & Documentation',
      description: 'Platform documentation and help resources',
      analyticsId: 'help_view'
    }
  }
];

/**
 * Enhanced public route checker with pattern matching and cache
 */
export const isPublicRoute = (path: string): boolean => {
  // Check cache first
  const cached = routeCache.get(path);
  if (cached && Date.now() - cached.timestamp < ROUTE_CACHE_TTL) {
    return cached.isPublic;
  }

  // Check if path matches any public route pattern
  const isPublic = publicRoutes.some(route => {
    if (typeof route.path === 'string') {
      const pattern = new RegExp('^' + route.path.replace(/:[^\s/]+/g, '[^/]+') + '$');
      return pattern.test(path);
    }
    return false;
  });

  // Cache result
  routeCache.set(path, { isPublic, timestamp: Date.now() });
  return isPublic;
};

/**
 * Enhanced admin route checker with security validation
 */
export const isAdminRoute = (path: string): boolean => {
  return path.startsWith('/admin') || adminRoutes.some(route => route.path === path);
};

// Combine all routes with proper ordering
const routes: RouteConfig[] = [
  ...publicRoutes,
  ...adminRoutes,
  ...utilityRoutes,
  {
    path: '*',
    element: lazyLoadComponent('NotFound'),
    requiresAuth: false,
    metadata: {
      title: 'Page Not Found',
      description: '404 - Page not found',
      analyticsId: '404_view'
    }
  }
];

export default routes;

// Export utility functions for route handling
export const routeUtils = {
  isPublicRoute,
  isAdminRoute,
  lazyLoadComponent
};