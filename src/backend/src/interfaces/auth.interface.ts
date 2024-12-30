// @package jsonwebtoken ^9.0.0
import { JwtPayload } from 'jsonwebtoken';

/**
 * Enum defining user roles for Role-Based Access Control (RBAC)
 * Used to enforce authorization across the platform
 */
export enum UserRole {
  PUBLIC = 'PUBLIC',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN'
}

/**
 * Interface representing an authenticated user with security metadata
 * Contains essential user information and security-related flags
 */
export interface AuthenticatedUser {
  /** Unique user identifier */
  id: string;
  
  /** User's verified email address */
  email: string;
  
  /** User's role for access control */
  role: UserRole;
  
  /** Timestamp of last successful login */
  lastLogin: Date;
  
  /** Account active status flag */
  isActive: boolean;
}

/**
 * Interface for Redis session data with security context
 * Used to track active sessions and enforce security policies
 */
export interface SessionData {
  /** User ID for session ownership */
  userId: string;
  
  /** User role for session authorization */
  role: UserRole;
  
  /** Session expiration timestamp */
  expiresAt: number;
  
  /** Client IP address for session */
  ipAddress: string;
  
  /** Client user agent string */
  userAgent: string;
}

/**
 * Interface for Google OAuth profile data with verification
 * Contains essential profile information from Google OAuth
 */
export interface GoogleProfile {
  /** Google profile identifier */
  id: string;
  
  /** Google account email */
  email: string;
  
  /** User's display name */
  displayName: string;
  
  /** Email verification status */
  verified: boolean;
}

/**
 * Interface for JWT token pairs with metadata
 * Used for managing authentication tokens and their lifecycle
 */
export interface AuthTokens {
  /** Short-lived JWT access token */
  accessToken: string;
  
  /** Long-lived JWT refresh token */
  refreshToken: string;
  
  /** Token expiration in seconds */
  expiresIn: number;
  
  /** Token type identifier */
  tokenType: string;
}

/**
 * Interface extending JwtPayload with custom fields for session tracking
 * Used for creating and validating JWT tokens with additional security context
 */
export interface JWTCustomPayload extends JwtPayload {
  /** User identifier in payload */
  userId: string;
  
  /** User email in payload */
  email: string;
  
  /** User role in payload */
  role: UserRole;
  
  /** Session tracking identifier */
  sessionId: string;
}