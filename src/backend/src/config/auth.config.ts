// External imports
// dotenv v16.0.0
import { config } from 'dotenv';

// Internal imports
import { AuthConfig } from '../interfaces/config.interface';

// Initialize environment variables
config();

/**
 * Validates authentication configuration requirements
 * Ensures all required environment variables are present and properly formatted
 * @param config - Partial authentication configuration to validate
 * @throws Error if configuration is invalid or missing required fields
 * @returns boolean indicating valid configuration
 */
const validateConfig = (config: Partial<AuthConfig>): boolean => {
  // Validate Google OAuth configuration
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_CALLBACK_URL) {
    throw new Error('Missing required Google OAuth environment variables');
  }

  // Validate JWT configuration
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT secret must be at least 32 characters long');
  }

  if (!process.env.JWT_PUBLIC_KEY || !process.env.JWT_PRIVATE_KEY) {
    throw new Error('Missing required JWT key pair environment variables');
  }

  // Validate session configuration
  if (!process.env.COOKIE_DOMAIN) {
    throw new Error('Missing required cookie domain configuration');
  }

  return true;
};

/**
 * Enhanced authentication configuration with comprehensive security settings
 * Implements secure defaults and environment-based configuration
 */
export const authConfig: AuthConfig = {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    callbackUrl: process.env.GOOGLE_CALLBACK_URL!,
    // Enforce HTTPS for security in production
    enforceHttps: process.env.NODE_ENV === 'production',
    // Parse allowed domains from environment variable
    allowedDomains: process.env.ALLOWED_DOMAINS?.split(',') || [],
    // OAuth scopes required for user profile information
    scope: ['email', 'profile']
  },
  jwt: {
    // Primary JWT configuration
    secret: process.env.JWT_SECRET!,
    publicKey: process.env.JWT_PUBLIC_KEY!,
    privateKey: process.env.JWT_PRIVATE_KEY!,
    // Token expiration time in seconds (30 minutes)
    expiresIn: parseInt(process.env.JWT_EXPIRES_IN || '1800', 10),
    // Use RS256 for asymmetric signing in production
    algorithm: process.env.NODE_ENV === 'production' ? 'RS256' : 'HS256',
    // Refresh token configuration
    refreshEnabled: true,
    // Refresh token expiration (7 days)
    refreshExpiresIn: parseInt(process.env.JWT_REFRESH_EXPIRES_IN || '604800', 10)
  },
  session: {
    // Session duration in seconds (7 days)
    maxAge: parseInt(process.env.SESSION_MAX_AGE || '604800', 10),
    // Security flags
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    // Session cookie name
    name: 'saas_metrics_sid',
    // Maximum concurrent sessions per user
    maxConcurrent: parseInt(process.env.MAX_CONCURRENT_SESSIONS || '3', 10),
    // Cookie domain configuration
    domain: process.env.COOKIE_DOMAIN!,
    // Enable session extension on activity
    rolling: true,
    // Strict same-site policy for CSRF protection
    sameSite: 'strict',
    // Cookie path restriction
    path: '/'
  }
};

// Validate configuration on initialization
validateConfig(authConfig);

// Export validated configuration
export default authConfig;