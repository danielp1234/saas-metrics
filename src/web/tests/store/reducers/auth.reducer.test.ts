// @version jest ^29.0.0
// @version @reduxjs/toolkit ^1.9.5

import { authReducer, initialState } from '../../../src/store/reducers/auth.reducer';
import { 
  LOGIN_REQUEST,
  LOGIN_SUCCESS,
  LOGIN_FAILURE,
  LOGOUT,
  REFRESH_TOKEN_REQUEST,
  REFRESH_TOKEN_SUCCESS,
  REFRESH_TOKEN_FAILURE,
  SESSION_EXPIRED,
  CSRF_TOKEN_REQUEST,
  CSRF_TOKEN_SUCCESS,
  CSRF_TOKEN_FAILURE
} from '../../../src/store/actions/auth.actions';
import { AuthState, AuthErrorCode } from '../../../src/interfaces/auth.interface';

describe('authReducer', () => {
  // Test initial state
  it('should return the initial state', () => {
    expect(authReducer(undefined, { type: undefined })).toEqual(initialState);
  });

  // Test LOGIN_REQUEST
  it('should handle LOGIN_REQUEST with security context', () => {
    const action = {
      type: LOGIN_REQUEST,
      payload: { csrfToken: 'test-csrf-token' }
    };

    const nextState = authReducer(initialState, action);

    expect(nextState).toEqual({
      ...initialState,
      loading: true,
      error: null,
      sessionStatus: {
        ...initialState.sessionStatus,
        lastActivity: expect.any(Date),
        isActive: false,
        device: {
          ...initialState.sessionStatus.device,
          userAgent: navigator.userAgent
        }
      }
    });
  });

  // Test LOGIN_SUCCESS
  it('should handle LOGIN_SUCCESS with session tracking', () => {
    const mockUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      role: 'ADMIN',
      lastLogin: new Date(),
      permissions: ['admin'],
      activeSessions: 1,
      securityPreferences: {
        mfaEnabled: true,
        receiveSecurityAlerts: true
      }
    };

    const mockTokens = {
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      accessTokenExpires: new Date(Date.now() + 30 * 60 * 1000),
      refreshTokenExpires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      tokenType: 'Bearer' as const
    };

    const mockSessionStatus = {
      lastActivity: new Date(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      isActive: true,
      device: {
        id: 'test-device',
        userAgent: navigator.userAgent,
        ipAddress: '127.0.0.1'
      },
      createdAt: new Date()
    };

    const action = {
      type: LOGIN_SUCCESS,
      payload: {
        isAuthenticated: true,
        user: mockUser,
        tokens: mockTokens,
        sessionStatus: mockSessionStatus,
        error: null,
        loading: false
      } as AuthState
    };

    const nextState = authReducer(initialState, action);

    expect(nextState).toEqual({
      isAuthenticated: true,
      user: mockUser,
      tokens: mockTokens,
      sessionStatus: {
        ...mockSessionStatus,
        lastActivity: expect.any(Date),
        expiresAt: expect.any(Date)
      },
      error: null,
      loading: false
    });
  });

  // Test LOGIN_FAILURE
  it('should handle LOGIN_FAILURE with detailed error tracking', () => {
    const mockError = {
      code: AuthErrorCode.INVALID_CREDENTIALS,
      message: 'Invalid credentials provided',
      timestamp: new Date(),
      attemptedAction: 'login'
    };

    const action = {
      type: LOGIN_FAILURE,
      payload: mockError
    };

    const nextState = authReducer(initialState, action);

    expect(nextState).toEqual({
      ...initialState,
      error: mockError,
      sessionStatus: {
        ...initialState.sessionStatus,
        lastActivity: expect.any(Date)
      }
    });
  });

  // Test REFRESH_TOKEN_REQUEST
  it('should handle REFRESH_TOKEN_REQUEST with session tracking', () => {
    const action = { type: REFRESH_TOKEN_REQUEST };
    const nextState = authReducer(initialState, action);

    expect(nextState).toEqual({
      ...initialState,
      loading: true,
      sessionStatus: {
        ...initialState.sessionStatus,
        lastActivity: expect.any(Date)
      }
    });
  });

  // Test REFRESH_TOKEN_SUCCESS
  it('should handle REFRESH_TOKEN_SUCCESS with token update', () => {
    const mockTokens = {
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      accessTokenExpires: new Date(Date.now() + 30 * 60 * 1000),
      refreshTokenExpires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      tokenType: 'Bearer' as const
    };

    const action = {
      type: REFRESH_TOKEN_SUCCESS,
      payload: {
        ...initialState,
        tokens: mockTokens
      } as AuthState
    };

    const nextState = authReducer(initialState, action);

    expect(nextState).toEqual({
      ...initialState,
      tokens: mockTokens,
      sessionStatus: {
        ...initialState.sessionStatus,
        lastActivity: expect.any(Date),
        expiresAt: expect.any(Date)
      },
      loading: false,
      error: null
    });
  });

  // Test SESSION_EXPIRED
  it('should handle SESSION_EXPIRED with proper cleanup', () => {
    const authenticatedState: AuthState = {
      ...initialState,
      isAuthenticated: true,
      user: {
        id: 'test-user',
        email: 'test@example.com',
        role: 'ADMIN',
        lastLogin: new Date(),
        permissions: ['admin'],
        activeSessions: 1,
        securityPreferences: {
          mfaEnabled: true,
          receiveSecurityAlerts: true
        }
      }
    };

    const action = { type: SESSION_EXPIRED };
    const nextState = authReducer(authenticatedState, action);

    expect(nextState).toEqual({
      ...initialState,
      isAuthenticated: false,
      user: null,
      tokens: null,
      sessionStatus: {
        ...initialState.sessionStatus,
        lastActivity: expect.any(Date),
        isActive: false
      },
      error: {
        code: AuthErrorCode.SESSION_EXPIRED,
        message: 'Your session has expired. Please log in again.',
        timestamp: expect.any(Date),
        attemptedAction: 'session_validation'
      }
    });
  });

  // Test LOGOUT
  it('should handle LOGOUT with complete session cleanup', () => {
    const authenticatedState: AuthState = {
      ...initialState,
      isAuthenticated: true,
      user: {
        id: 'test-user',
        email: 'test@example.com',
        role: 'ADMIN',
        lastLogin: new Date(),
        permissions: ['admin'],
        activeSessions: 1,
        securityPreferences: {
          mfaEnabled: true,
          receiveSecurityAlerts: true
        }
      }
    };

    const action = { type: LOGOUT };
    const nextState = authReducer(authenticatedState, action);

    expect(nextState).toEqual({
      ...initialState,
      sessionStatus: {
        ...initialState.sessionStatus,
        lastActivity: expect.any(Date),
        isActive: false
      }
    });
  });

  // Test CSRF token handling
  it('should handle CSRF token request lifecycle', () => {
    // Test CSRF_TOKEN_REQUEST
    let nextState = authReducer(initialState, { type: CSRF_TOKEN_REQUEST });
    expect(nextState.loading).toBe(true);

    // Test CSRF_TOKEN_SUCCESS
    nextState = authReducer(nextState, {
      type: CSRF_TOKEN_SUCCESS,
      payload: { token: 'new-csrf-token' }
    });
    expect(nextState.loading).toBe(false);

    // Test CSRF_TOKEN_FAILURE
    const mockError = {
      code: AuthErrorCode.INVALID_TOKEN,
      message: 'Failed to obtain CSRF token',
      timestamp: new Date(),
      attemptedAction: 'csrf_token_request'
    };

    nextState = authReducer(nextState, {
      type: CSRF_TOKEN_FAILURE,
      payload: mockError
    });
    expect(nextState.error).toEqual(mockError);
    expect(nextState.loading).toBe(false);
  });
});