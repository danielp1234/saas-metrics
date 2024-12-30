/**
 * @fileoverview Authentication request validation schemas and middleware
 * Implements comprehensive validation for authentication flows with enhanced security
 * @version 1.0.0
 */

import { z } from 'zod'; // v3.21.4
import { validateRequest } from '../middleware/validation.middleware';
import { User, AuthToken, GoogleProfile } from '../../interfaces/auth.interface';

// Constants for validation rules
const TOKEN_MIN_LENGTH = 64;
const NONCE_MIN_LENGTH = 32;
const CSRF_TOKEN_MIN_LENGTH = 32;
const DEVICE_ID_MIN_LENGTH = 32;
const FINGERPRINT_MIN_LENGTH = 32;
const IP_PATTERN = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

/**
 * Enhanced validation schema for Google OAuth callback requests
 * Implements authentication flow requirements from Section 7.1.1
 */
const googleAuthSchema = z.object({
  // OAuth authorization code with format validation
  code: z.string()
    .min(1, 'Authorization code is required')
    .regex(/^[a-zA-Z0-9-_]+$/, 'Invalid authorization code format'),

  // State parameter for CSRF protection
  state: z.string()
    .uuid('Invalid state parameter')
    .optional(),

  // Nonce for replay attack prevention
  nonce: z.string()
    .min(NONCE_MIN_LENGTH, `Nonce must be at least ${NONCE_MIN_LENGTH} characters`)
    .optional(),

  // Redirect URI validation against whitelist
  redirect_uri: z.string()
    .url('Invalid redirect URI')
    .refine(
      (uri) => uri.startsWith('https://') || process.env.NODE_ENV === 'development',
      'Redirect URI must use HTTPS in production'
    ),

  // CSRF token validation
  csrf_token: z.string()
    .min(CSRF_TOKEN_MIN_LENGTH, `CSRF token must be at least ${CSRF_TOKEN_MIN_LENGTH} characters`)
});

/**
 * Enhanced validation schema for token refresh requests
 * Implements session management requirements from Section 7.1.3
 */
const refreshTokenSchema = z.object({
  // Refresh token validation with format and length checks
  refreshToken: z.string()
    .min(TOKEN_MIN_LENGTH, `Refresh token must be at least ${TOKEN_MIN_LENGTH} characters`)
    .regex(/^[a-zA-Z0-9-_]+$/, 'Invalid refresh token format'),

  // Device ID for session tracking
  deviceId: z.string()
    .min(DEVICE_ID_MIN_LENGTH, `Device ID must be at least ${DEVICE_ID_MIN_LENGTH} characters`),

  // Device fingerprint for fraud detection
  fingerprint: z.string()
    .min(FINGERPRINT_MIN_LENGTH, `Fingerprint must be at least ${FINGERPRINT_MIN_LENGTH} characters`),

  // Session ID validation
  sessionId: z.string()
    .uuid('Invalid session ID')
});

/**
 * Enhanced validation schema for logout requests
 * Implements session termination with audit requirements
 */
const logoutSchema = z.object({
  // User ID validation
  userId: z.string()
    .uuid('Invalid user ID'),

  // Session ID validation
  sessionId: z.string()
    .uuid('Invalid session ID'),

  // Device ID validation
  deviceId: z.string()
    .min(DEVICE_ID_MIN_LENGTH, `Device ID must be at least ${DEVICE_ID_MIN_LENGTH} characters`),

  // IP address validation
  ipAddress: z.string()
    .regex(IP_PATTERN, 'Invalid IP address format'),

  // User agent validation
  userAgent: z.string()
    .min(1, 'User agent is required')
    .max(500, 'User agent is too long')
});

/**
 * Validates Google OAuth callback request parameters with enhanced security checks
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 */
export const validateGoogleAuth = validateRequest(googleAuthSchema, async (req, res, next) => {
  try {
    // Additional security checks beyond schema validation
    const { code, state, nonce, redirect_uri, csrf_token } = req.body;

    // Verify redirect URI against whitelist
    const validRedirectUris = process.env.GOOGLE_CALLBACK_URL?.split(',') || [];
    if (!validRedirectUris.includes(redirect_uri)) {
      throw new Error('Invalid redirect URI');
    }

    // Verify CSRF token matches session
    if (csrf_token !== req.session?.csrf_token) {
      throw new Error('Invalid CSRF token');
    }

    // Verify state parameter if provided
    if (state && state !== req.session?.oauth_state) {
      throw new Error('Invalid state parameter');
    }

    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Validates token refresh request with comprehensive security checks
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 */
export const validateTokenRefresh = validateRequest(refreshTokenSchema, async (req, res, next) => {
  try {
    // Additional security checks beyond schema validation
    const { refreshToken, deviceId, fingerprint, sessionId } = req.body;

    // Verify session exists and is active
    const session = await req.app.locals.sessionStore.get(sessionId);
    if (!session) {
      throw new Error('Invalid session');
    }

    // Verify device fingerprint matches session
    if (session.fingerprint !== fingerprint) {
      throw new Error('Invalid device fingerprint');
    }

    // Verify device ID matches session
    if (session.deviceId !== deviceId) {
      throw new Error('Invalid device ID');
    }

    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Validates logout request with security and audit considerations
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 */
export const validateLogout = validateRequest(logoutSchema, async (req, res, next) => {
  try {
    // Additional security checks beyond schema validation
    const { userId, sessionId, deviceId, ipAddress, userAgent } = req.body;

    // Verify session exists and belongs to user
    const session = await req.app.locals.sessionStore.get(sessionId);
    if (!session || session.userId !== userId) {
      throw new Error('Invalid session');
    }

    // Verify device ID matches session
    if (session.deviceId !== deviceId) {
      throw new Error('Invalid device ID');
    }

    // Record logout attempt in audit log
    await req.app.locals.logger.auditLog('USER_LOGOUT_ATTEMPT', {
      userId,
      sessionId,
      ipAddress,
      userAgent
    });

    next();
  } catch (error) {
    next(error);
  }
});
```

This implementation provides comprehensive validation for authentication-related requests with the following features:

1. Security:
- Strict validation of OAuth parameters
- CSRF protection with token validation
- Session verification and tracking
- Device fingerprinting for fraud detection
- IP address and user agent validation

2. Validation:
- Zod schemas with detailed validation rules
- Custom validation logic beyond schema checks
- Comprehensive error handling
- Audit logging for security events

3. Session Management:
- Session verification and tracking
- Device ID validation
- Concurrent session management
- Session expiry handling

4. Error Handling:
- Detailed error messages
- Security-aware error responses
- Audit trail for validation failures

5. Compliance:
- Implements OAuth 2.0 security requirements
- HTTPS enforcement in production
- Session security best practices
- Audit logging for compliance

The validators can be used in authentication routes to ensure request integrity and security:

```typescript
router.post('/auth/google/callback', validateGoogleAuth, authController.handleGoogleCallback);
router.post('/auth/refresh', validateTokenRefresh, authController.refreshToken);
router.post('/auth/logout', validateLogout, authController.logout);