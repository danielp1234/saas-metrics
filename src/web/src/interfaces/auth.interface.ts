// @version jsonwebtoken ^9.0.0
import { JwtPayload } from 'jsonwebtoken';
import { BaseComponentProps } from './common.interface';

/**
 * Enhanced enumeration of user roles with strict type checking.
 * Defines the possible authorization levels in the application.
 */
export enum UserRole {
  PUBLIC = 'PUBLIC',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN'
}

/**
 * Enumeration of possible authentication error codes.
 * Used for consistent error handling across the auth flow.
 */
export enum AuthErrorCode {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS'
}

/**
 * Interface for JWT token management with enhanced security features.
 * Extends JwtPayload to include additional security metadata.
 */
export interface AuthTokens {
  /** Access token for API authorization */
  accessToken: string;
  /** Refresh token for obtaining new access tokens */
  refreshToken: string;
  /** Access token expiration timestamp */
  accessTokenExpires: Date;
  /** Refresh token expiration timestamp */
  refreshTokenExpires: Date;
  /** Token type for authorization header */
  tokenType: 'Bearer';
}

/**
 * Interface for authenticated user data with enhanced security metadata.
 */
export interface AuthenticatedUser {
  /** Unique user identifier */
  id: string;
  /** User's email address */
  email: string;
  /** User's assigned role */
  role: UserRole;
  /** Timestamp of last successful login */
  lastLogin: Date;
  /** Array of granted permissions */
  permissions: string[];
  /** Number of active sessions */
  activeSessions: number;
  /** Security preferences */
  securityPreferences: {
    mfaEnabled: boolean;
    receiveSecurityAlerts: boolean;
  };
}

/**
 * Interface for tracking session status and activity.
 */
export interface SessionStatus {
  /** Timestamp of last user activity */
  lastActivity: Date;
  /** Session expiration timestamp */
  expiresAt: Date;
  /** Flag indicating if session is currently active */
  isActive: boolean;
  /** Current device information */
  device: {
    id: string;
    userAgent: string;
    ipAddress: string;
  };
  /** Session creation timestamp */
  createdAt: Date;
}

/**
 * Interface for authentication error details.
 */
export interface AuthError {
  /** Error code for identification */
  code: AuthErrorCode;
  /** Human-readable error message */
  message: string;
  /** Error occurrence timestamp */
  timestamp: Date;
  /** Additional error context */
  context?: Record<string, unknown>;
  /** Attempted action that caused the error */
  attemptedAction?: string;
}

/**
 * Interface representing the authentication state in Redux store.
 */
export interface AuthState {
  /** Flag indicating if user is authenticated */
  isAuthenticated: boolean;
  /** Currently authenticated user data */
  user: AuthenticatedUser | null;
  /** Current authentication tokens */
  tokens: AuthTokens | null;
  /** Current session status */
  sessionStatus: SessionStatus;
  /** Authentication error details if any */
  error: AuthError | null;
  /** Loading state for auth operations */
  loading: boolean;
}

/**
 * Interface for authentication-related component props.
 * Extends BaseComponentProps for consistent component structure.
 */
export interface AuthComponentProps extends BaseComponentProps {
  /** Current authentication state */
  authState: AuthState;
  /** Optional callback for auth state changes */
  onAuthStateChange?: (newState: AuthState) => void;
  /** Optional auth error handler */
  onAuthError?: (error: AuthError) => void;
}

/**
 * Type guard for checking if a user has admin privileges.
 * @param user The user to check
 * @returns Boolean indicating if user has admin access
 */
export function isAdmin(user: AuthenticatedUser | null): user is AuthenticatedUser {
  return user?.role === UserRole.ADMIN || user?.role === UserRole.SUPER_ADMIN;
}

/**
 * Type guard for checking if a user has super admin privileges.
 * @param user The user to check
 * @returns Boolean indicating if user has super admin access
 */
export function isSuperAdmin(user: AuthenticatedUser | null): user is AuthenticatedUser {
  return user?.role === UserRole.SUPER_ADMIN;
}

/**
 * Interface for OAuth state management.
 */
export interface OAuthState {
  /** OAuth provider (e.g., 'google') */
  provider: string;
  /** State parameter for CSRF protection */
  state: string;
  /** Nonce for replay attack prevention */
  nonce: string;
  /** Original request URL */
  redirectUrl: string;
  /** Timestamp when OAuth flow was initiated */
  initiatedAt: Date;
}