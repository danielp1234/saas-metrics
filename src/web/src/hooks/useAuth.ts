/**
 * Enhanced Authentication Hook for SaaS Metrics Platform
 * Provides secure authentication state management and utilities with comprehensive security features
 * @version 1.0.0
 */

import { useEffect, useCallback, useRef } from 'react'; // v18.2.0
import { useDispatch, useSelector } from 'react-redux'; // v8.0.5
import {
  User,
  UserRole,
  AuthResponse,
  SecurityContext,
  AuditLog
} from '../interfaces/auth.interface';
import {
  loginWithGoogle,
  handleGoogleCallback,
  refreshAuthToken,
  logout,
  checkAuth,
  logSecurityEvent
} from '../store/actions/auth.actions';
import { authConfig } from '../config/auth.config';
import { isTokenValid, shouldRefreshToken } from '../utils/auth.utils';

/**
 * Security error interface for enhanced error handling
 */
interface SecurityError {
  code: string;
  message: string;
  timestamp: number;
  context?: Record<string, unknown>;
}

/**
 * Enhanced authentication hook with comprehensive security features
 * @returns Authentication state and security utilities
 */
export const useAuth = () => {
  const dispatch = useDispatch();
  
  // Redux selectors for auth state
  const user = useSelector((state: any) => state.auth.user);
  const isLoading = useSelector((state: any) => state.auth.loading);
  const error = useSelector((state: any) => state.auth.error);
  const token = useSelector((state: any) => state.auth.token);

  // Security context ref to prevent unnecessary re-renders
  const securityContextRef = useRef<SecurityContext>({
    lastActivity: Date.now(),
    sessionStarted: Date.now(),
    failedAttempts: 0,
    securityEvents: []
  });

  // Refresh timer ref
  const refreshTimerRef = useRef<number>();

  /**
   * Validates and updates security context
   */
  const updateSecurityContext = useCallback(() => {
    const now = Date.now();
    securityContextRef.current = {
      ...securityContextRef.current,
      lastActivity: now
    };
  }, []);

  /**
   * Initiates Google OAuth login with security validation
   */
  const login = useCallback(async () => {
    try {
      updateSecurityContext();
      await dispatch(loginWithGoogle());
    } catch (error) {
      const securityError: SecurityError = {
        code: 'AUTH_LOGIN_FAILED',
        message: error instanceof Error ? error.message : 'Login failed',
        timestamp: Date.now()
      };
      securityContextRef.current.failedAttempts++;
      securityContextRef.current.securityEvents.push({
        type: 'LOGIN_FAILURE',
        timestamp: Date.now(),
        details: securityError
      });
      throw securityError;
    }
  }, [dispatch, updateSecurityContext]);

  /**
   * Handles Google OAuth callback with enhanced security validation
   */
  const handleCallback = useCallback(async (response: AuthResponse) => {
    try {
      updateSecurityContext();
      const result = await dispatch(handleGoogleCallback(response));
      if (result.payload) {
        securityContextRef.current.failedAttempts = 0;
      }
      return result.payload;
    } catch (error) {
      const securityError: SecurityError = {
        code: 'AUTH_CALLBACK_FAILED',
        message: error instanceof Error ? error.message : 'Callback failed',
        timestamp: Date.now(),
        context: { response }
      };
      throw securityError;
    }
  }, [dispatch, updateSecurityContext]);

  /**
   * Refreshes authentication token with retry mechanism
   */
  const refreshToken = useCallback(async () => {
    try {
      if (token && shouldRefreshToken(token)) {
        await dispatch(refreshAuthToken());
      }
    } catch (error) {
      const securityError: SecurityError = {
        code: 'AUTH_REFRESH_FAILED',
        message: error instanceof Error ? error.message : 'Token refresh failed',
        timestamp: Date.now()
      };
      securityContextRef.current.securityEvents.push({
        type: 'TOKEN_REFRESH_FAILURE',
        timestamp: Date.now(),
        details: securityError
      });
      throw securityError;
    }
  }, [dispatch, token]);

  /**
   * Checks authentication status with enhanced validation
   */
  const checkAuthStatus = useCallback(async () => {
    try {
      updateSecurityContext();
      return await dispatch(checkAuth());
    } catch (error) {
      const securityError: SecurityError = {
        code: 'AUTH_CHECK_FAILED',
        message: error instanceof Error ? error.message : 'Auth check failed',
        timestamp: Date.now()
      };
      throw securityError;
    }
  }, [dispatch, updateSecurityContext]);

  /**
   * Checks if user has specific role with security validation
   */
  const hasRole = useCallback((role: UserRole): boolean => {
    if (!user || !token || !isTokenValid(token)) {
      return false;
    }

    const userRole = user.role;
    if (userRole === UserRole.SUPER_ADMIN) return true;
    if (userRole === UserRole.ADMIN) {
      return role === UserRole.ADMIN || role === UserRole.PUBLIC;
    }
    return userRole === role && role === UserRole.PUBLIC;
  }, [user, token]);

  /**
   * Checks if user has specific permission
   */
  const hasPermission = useCallback((permission: string): boolean => {
    if (!user || !token || !isTokenValid(token)) {
      return false;
    }

    const userPermissions = authConfig.roles.permissions[user.role];
    return userPermissions.includes(permission);
  }, [user, token]);

  /**
   * Sets up token refresh interval with security monitoring
   */
  useEffect(() => {
    if (token && isTokenValid(token)) {
      refreshTimerRef.current = window.setInterval(async () => {
        try {
          await refreshToken();
        } catch (error) {
          console.error('Token refresh failed:', error);
        }
      }, authConfig.token.refreshThreshold * 1000);
    }

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [token, refreshToken]);

  /**
   * Monitors session activity and security events
   */
  useEffect(() => {
    const activityCheck = setInterval(() => {
      const inactiveTime = Date.now() - securityContextRef.current.lastActivity;
      if (inactiveTime > authConfig.session.inactivityTimeout * 1000) {
        dispatch(logout());
      }
    }, authConfig.session.checkInterval * 1000);

    return () => clearInterval(activityCheck);
  }, [dispatch]);

  return {
    user,
    isAuthenticated: !!user && !!token && isTokenValid(token),
    isLoading,
    error,
    securityContext: securityContextRef.current,
    login,
    handleCallback,
    refreshToken,
    logout: () => dispatch(logout()),
    checkAuthStatus,
    hasRole,
    hasPermission
  };
};