// @version @reduxjs/toolkit ^1.9.5

import { createAction } from '@reduxjs/toolkit';
import type { ThunkAction } from '@reduxjs/toolkit';
import { AuthState, AuthenticatedUser, AuthError, AuthErrorCode } from '../../interfaces/auth.interface';
import { AuthService } from '../../services/auth.service';

// Action type constants with namespacing for better organization
export const LOGIN_REQUEST = '@auth/LOGIN_REQUEST';
export const LOGIN_SUCCESS = '@auth/LOGIN_SUCCESS';
export const LOGIN_FAILURE = '@auth/LOGIN_FAILURE';
export const LOGOUT = '@auth/LOGOUT';
export const REFRESH_TOKEN_REQUEST = '@auth/REFRESH_TOKEN_REQUEST';
export const REFRESH_TOKEN_SUCCESS = '@auth/REFRESH_TOKEN_SUCCESS';
export const REFRESH_TOKEN_FAILURE = '@auth/REFRESH_TOKEN_FAILURE';
export const SESSION_EXPIRED = '@auth/SESSION_EXPIRED';
export const CSRF_TOKEN_REQUEST = '@auth/CSRF_TOKEN_REQUEST';
export const CSRF_TOKEN_SUCCESS = '@auth/CSRF_TOKEN_SUCCESS';
export const CSRF_TOKEN_FAILURE = '@auth/CSRF_TOKEN_FAILURE';

// Create singleton instance of AuthService
const authService = new AuthService();

// Action creators with type safety
export const loginRequest = createAction<{ csrfToken: string }>(LOGIN_REQUEST);
export const loginSuccess = createAction<AuthState>(LOGIN_SUCCESS);
export const loginFailure = createAction<AuthError>(LOGIN_FAILURE);
export const logout = createAction(LOGOUT);
export const refreshTokenRequest = createAction(REFRESH_TOKEN_REQUEST);
export const refreshTokenSuccess = createAction<AuthState>(REFRESH_TOKEN_SUCCESS);
export const refreshTokenFailure = createAction<AuthError>(REFRESH_TOKEN_FAILURE);
export const sessionExpired = createAction(SESSION_EXPIRED);
export const csrfTokenRequest = createAction(CSRF_TOKEN_REQUEST);
export const csrfTokenSuccess = createAction<{ token: string }>(CSRF_TOKEN_SUCCESS);
export const csrfTokenFailure = createAction<AuthError>(CSRF_TOKEN_FAILURE);

// Thunk action creator for Google OAuth login flow
export const loginWithGoogle = (): ThunkAction<Promise<void>, any, unknown, any> => {
  return async (dispatch) => {
    try {
      // Request CSRF token for security
      dispatch(csrfTokenRequest());
      const csrfToken = await authService.getCsrfToken();
      dispatch(csrfTokenSuccess({ token: csrfToken }));

      // Initiate login request with CSRF protection
      dispatch(loginRequest({ csrfToken }));
      const authState = await authService.login();

      // Validate response and check concurrent sessions
      if (authState.user && authState.tokens) {
        dispatch(loginSuccess(authState));
        
        // Set up token refresh cycle
        const tokenExpiryTime = new Date(authState.tokens.accessTokenExpires).getTime() - Date.now();
        setTimeout(() => {
          dispatch(refreshTokenThunk());
        }, Math.max(0, tokenExpiryTime - 5 * 60 * 1000)); // Refresh 5 minutes before expiry
      } else {
        throw new Error('Invalid authentication response');
      }
    } catch (error) {
      const authError: AuthError = {
        code: AuthErrorCode.INVALID_CREDENTIALS,
        message: error instanceof Error ? error.message : 'Authentication failed',
        timestamp: new Date(),
        attemptedAction: 'login'
      };
      dispatch(loginFailure(authError));
    }
  };
};

// Thunk action creator for token refresh
export const refreshTokenThunk = (): ThunkAction<Promise<void>, any, unknown, any> => {
  return async (dispatch) => {
    try {
      dispatch(refreshTokenRequest());
      const newTokens = await authService.refreshToken();
      
      const authState = authService.getAuthState();
      if (authState && newTokens) {
        const updatedState: AuthState = {
          ...authState,
          tokens: newTokens,
          sessionStatus: {
            ...authState.sessionStatus,
            lastActivity: new Date()
          }
        };
        dispatch(refreshTokenSuccess(updatedState));

        // Schedule next token refresh
        const tokenExpiryTime = new Date(newTokens.accessTokenExpires).getTime() - Date.now();
        setTimeout(() => {
          dispatch(refreshTokenThunk());
        }, Math.max(0, tokenExpiryTime - 5 * 60 * 1000));
      }
    } catch (error) {
      const authError: AuthError = {
        code: AuthErrorCode.TOKEN_EXPIRED,
        message: error instanceof Error ? error.message : 'Token refresh failed',
        timestamp: new Date(),
        attemptedAction: 'token_refresh'
      };
      dispatch(refreshTokenFailure(authError));
      dispatch(sessionExpired());
    }
  };
};

// Thunk action creator for session validation
export const validateSessionThunk = (): ThunkAction<Promise<void>, any, unknown, any> => {
  return async (dispatch) => {
    try {
      const isValid = await authService.validateSession();
      if (!isValid) {
        dispatch(sessionExpired());
        dispatch(logout());
      }
    } catch (error) {
      const authError: AuthError = {
        code: AuthErrorCode.SESSION_EXPIRED,
        message: error instanceof Error ? error.message : 'Session validation failed',
        timestamp: new Date(),
        attemptedAction: 'session_validation'
      };
      dispatch(loginFailure(authError));
      dispatch(sessionExpired());
    }
  };
};

// Thunk action creator for secure logout
export const logoutThunk = (): ThunkAction<Promise<void>, any, unknown, any> => {
  return async (dispatch) => {
    try {
      await authService.logout();
      dispatch(logout());
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout even if API call fails
      dispatch(logout());
    }
  };
};