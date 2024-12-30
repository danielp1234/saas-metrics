/**
 * Authentication Configuration for SaaS Metrics Platform
 * Defines core authentication settings, token management, and session handling
 * @version 1.0.0
 */

import { UserRole } from '../interfaces/auth.interface';

/**
 * Main authentication configuration object
 * Contains all settings for Google OAuth, token management, session handling,
 * endpoints, and role-based access control
 */
export const authConfig = {
  /**
   * Google OAuth Configuration
   * Settings for Google OAuth 2.0 authentication flow
   */
  googleOAuth: {
    clientId: process.env.VITE_GOOGLE_CLIENT_ID,
    redirectUri: `${window.location.origin}/auth/callback`,
    scope: 'email profile',
    responseType: 'code',
    accessType: 'offline',
    prompt: 'consent',
    securityLevel: 'high',
    allowedDomains: [] // Empty array allows all domains
  },

  /**
   * Token Management Configuration
   * Settings for JWT token handling and refresh logic
   */
  token: {
    storageKey: 'saas_metrics_token',
    refreshThreshold: 300, // Refresh token 5 minutes before expiry
    refreshEndpoint: `${process.env.VITE_API_URL}/auth/refresh`,
    encryptionEnabled: true,
    maxRetries: 3,
    retryDelay: 1000 // 1 second delay between retries
  },

  /**
   * Session Management Configuration
   * Settings for user session handling and timeout behavior
   */
  session: {
    storageKey: 'saas_metrics_session',
    checkInterval: 60, // Check session every minute
    inactivityTimeout: 1800, // 30 minutes inactivity timeout
    renewalThreshold: 300, // Renew session 5 minutes before expiry
    maxConcurrentSessions: 3,
    persistentSession: false // Don't persist sessions across browser restarts
  },

  /**
   * Authentication Endpoints
   * API endpoints for authentication operations
   */
  endpoints: {
    login: `${process.env.VITE_API_URL}/auth/login`,
    logout: `${process.env.VITE_API_URL}/auth/logout`,
    refresh: `${process.env.VITE_API_URL}/auth/refresh`,
    callback: `${process.env.VITE_API_URL}/auth/callback`,
    validate: `${process.env.VITE_API_URL}/auth/validate`,
    revoke: `${process.env.VITE_API_URL}/auth/revoke`
  },

  /**
   * Role-Based Access Control Configuration
   * Defines roles and their associated permissions
   */
  roles: {
    default: UserRole.PUBLIC,
    admin: UserRole.ADMIN,
    superAdmin: UserRole.SUPER_ADMIN,
    permissions: {
      [UserRole.PUBLIC]: [
        'view_metrics',
        'export_data'
      ],
      [UserRole.ADMIN]: [
        'view_metrics',
        'export_data',
        'manage_data',
        'access_admin'
      ],
      [UserRole.SUPER_ADMIN]: [
        'view_metrics',
        'export_data',
        'manage_data',
        'access_admin',
        'manage_users'
      ]
    }
  },

  /**
   * Security Configuration
   * Additional security settings for authentication
   */
  security: {
    tokenEncryption: 'AES-256',
    csrfProtection: true,
    requireMFA: false, // MFA not implemented in Phase 1
    passwordPolicy: {
      minLength: 12,
      requireSpecialChar: true,
      requireNumber: true,
      requireUppercase: true
    }
  }
} as const;

// Type assertion to ensure configuration object is read-only
Object.freeze(authConfig);
export default authConfig;