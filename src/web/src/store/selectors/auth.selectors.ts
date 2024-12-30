// @version @reduxjs/toolkit ^1.9.5

import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../store';
import type { AuthState, AuthenticatedUser } from '../../interfaces/auth.interface';

/**
 * Base selector for accessing the auth slice of state
 * Provides direct access to the complete auth state
 */
export const selectAuthState = (state: RootState): AuthState => state.auth;

/**
 * Memoized selector for checking authentication status
 * Combines isAuthenticated flag with session validation
 */
export const selectIsAuthenticated = createSelector(
  [selectAuthState],
  (auth): boolean => {
    return auth.isAuthenticated && 
           auth.sessionStatus.isActive && 
           new Date(auth.sessionStatus.expiresAt) > new Date();
  }
);

/**
 * Memoized selector for accessing current authenticated user
 * Returns null if user is not authenticated or session is invalid
 */
export const selectCurrentUser = createSelector(
  [selectAuthState],
  (auth): AuthenticatedUser | null => {
    if (!auth.isAuthenticated || !auth.sessionStatus.isActive) {
      return null;
    }
    return auth.user;
  }
);

/**
 * Memoized selector for checking authentication loading state
 * Used for displaying loading indicators during auth operations
 */
export const selectAuthLoading = createSelector(
  [selectAuthState],
  (auth): boolean => auth.loading
);

/**
 * Memoized selector for accessing authentication error state
 * Returns null if no error is present
 */
export const selectAuthError = createSelector(
  [selectAuthState],
  (auth): string | null => auth.error ? auth.error.message : null
);

/**
 * Memoized selector for accessing current session status
 * Provides comprehensive session information including device details
 */
export const selectSessionStatus = createSelector(
  [selectAuthState],
  (auth) => auth.sessionStatus
);

/**
 * Memoized selector for accessing token expiration timestamp
 * Returns null if no valid token exists
 */
export const selectTokenExpiry = createSelector(
  [selectAuthState],
  (auth): number | null => {
    if (!auth.tokens?.accessTokenExpires) {
      return null;
    }
    return new Date(auth.tokens.accessTokenExpires).getTime();
  }
);

/**
 * Memoized selector for checking if token refresh is needed
 * Considers token expiry and session status
 */
export const selectNeedsTokenRefresh = createSelector(
  [selectAuthState],
  (auth): boolean => {
    if (!auth.tokens?.accessTokenExpires) {
      return false;
    }

    const expiryTime = new Date(auth.tokens.accessTokenExpires).getTime();
    const currentTime = Date.now();
    const refreshThreshold = 5 * 60 * 1000; // 5 minutes before expiry

    return auth.isAuthenticated && 
           auth.sessionStatus.isActive && 
           (expiryTime - currentTime) <= refreshThreshold;
  }
);

/**
 * Memoized selector for checking if session has expired
 * Combines session expiry with token validation
 */
export const selectIsSessionExpired = createSelector(
  [selectAuthState],
  (auth): boolean => {
    if (!auth.sessionStatus.expiresAt) {
      return true;
    }

    return new Date(auth.sessionStatus.expiresAt) <= new Date() || 
           !auth.sessionStatus.isActive;
  }
);