// @version @testing-library/react-hooks ^8.0.1
// @version react-redux ^8.0.5
// @version @reduxjs/toolkit ^1.9.5
// @version @jest/globals ^29.0.0

import { renderHook, act, cleanup } from '@testing-library/react-hooks';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { jest, describe, beforeEach, afterEach, it, expect } from '@jest/globals';

import { useAuth } from '../../src/hooks/useAuth';
import { AuthState, AuthErrorCode, UserRole } from '../../src/interfaces/auth.interface';
import * as authActions from '../../src/store/actions/auth.actions';
import authConfig from '../../src/config/auth.config';

// Mock store setup
const createMockStore = (initialState: Partial<AuthState> = {}) => {
  return configureStore({
    reducer: {
      auth: (state = initialState, action: any) => state
    },
    preloadedState: {
      auth: {
        isAuthenticated: false,
        user: null,
        tokens: null,
        sessionStatus: {
          lastActivity: new Date(),
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          isActive: false,
          device: {
            id: 'test-device',
            userAgent: 'test-agent',
            ipAddress: '127.0.0.1'
          },
          createdAt: new Date()
        },
        error: null,
        loading: false,
        ...initialState
      }
    }
  });
};

// Mock data
const mockUser = {
  id: 'test-user-id',
  email: 'test@verified.domain.com',
  role: UserRole.ADMIN,
  lastLogin: new Date(),
  permissions: ['read', 'write'],
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

describe('useAuth hook', () => {
  let mockStore: ReturnType<typeof createMockStore>;
  let wrapper: React.FC;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create fresh store instance
    mockStore = createMockStore();
    
    // Setup provider wrapper
    wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={mockStore}>{children}</Provider>
    );

    // Mock timers
    jest.useFakeTimers();

    // Mock localStorage
    Storage.prototype.getItem = jest.fn();
    Storage.prototype.setItem = jest.fn();
    Storage.prototype.removeItem = jest.fn();
  });

  afterEach(() => {
    cleanup();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('should initialize with default unauthenticated state', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should handle Google OAuth login flow successfully', async () => {
    // Mock OAuth state
    const mockOAuthState = 'mock-oauth-state';
    jest.spyOn(sessionStorage, 'getItem').mockReturnValue(mockOAuthState);
    
    // Mock login action
    const loginSpy = jest.spyOn(authActions, 'loginWithGoogle')
      .mockImplementation(() => async (dispatch) => {
        dispatch(authActions.loginSuccess({
          isAuthenticated: true,
          user: mockUser,
          tokens: mockTokens,
          error: null,
          loading: false,
          sessionStatus: {
            lastActivity: new Date(),
            expiresAt: new Date(Date.now() + 30 * 60 * 1000),
            isActive: true,
            device: {
              id: 'test-device',
              userAgent: 'test-agent',
              ipAddress: '127.0.0.1'
            },
            createdAt: new Date()
          }
        }));
      });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login('mock-code');
    });

    expect(loginSpy).toHaveBeenCalled();
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.error).toBeNull();
  });

  it('should handle token refresh before expiration', async () => {
    // Setup initial authenticated state
    mockStore = createMockStore({
      isAuthenticated: true,
      user: mockUser,
      tokens: mockTokens
    });

    const refreshSpy = jest.spyOn(authActions, 'refreshTokenThunk')
      .mockImplementation(() => async (dispatch) => {
        const newTokens = {
          ...mockTokens,
          accessToken: 'new-access-token',
          accessTokenExpires: new Date(Date.now() + 30 * 60 * 1000)
        };
        dispatch(authActions.refreshTokenSuccess({
          isAuthenticated: true,
          user: mockUser,
          tokens: newTokens,
          error: null,
          loading: false,
          sessionStatus: {
            lastActivity: new Date(),
            expiresAt: new Date(Date.now() + 30 * 60 * 1000),
            isActive: true,
            device: {
              id: 'test-device',
              userAgent: 'test-agent',
              ipAddress: '127.0.0.1'
            },
            createdAt: new Date()
          }
        }));
      });

    const { result } = renderHook(() => useAuth(), { wrapper });

    // Fast-forward to near token expiration
    jest.advanceTimersByTime(25 * 60 * 1000); // 25 minutes

    await act(async () => {
      await result.current.refreshToken();
    });

    expect(refreshSpy).toHaveBeenCalled();
    expect(result.current.tokens?.accessToken).toBe('new-access-token');
  });

  it('should handle concurrent session limits', async () => {
    // Mock session validation
    const validateSessionSpy = jest.spyOn(authActions, 'validateSessionThunk')
      .mockImplementation(() => async (dispatch) => {
        dispatch(authActions.sessionExpired());
        dispatch(authActions.logout());
      });

    const { result } = renderHook(() => useAuth(), { wrapper });

    // Simulate max sessions exceeded
    await act(async () => {
      await result.current.validateSession();
    });

    expect(validateSessionSpy).toHaveBeenCalled();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('should implement secure logout with cleanup', async () => {
    // Setup initial authenticated state
    mockStore = createMockStore({
      isAuthenticated: true,
      user: mockUser,
      tokens: mockTokens
    });

    const logoutSpy = jest.spyOn(authActions, 'logoutThunk')
      .mockImplementation(() => async (dispatch) => {
        dispatch(authActions.logout());
      });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.logout();
    });

    expect(logoutSpy).toHaveBeenCalled();
    expect(sessionStorage.removeItem).toHaveBeenCalledWith('oauth_state');
    expect(localStorage.removeItem).toHaveBeenCalledWith(authConfig.token.storageKey);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('should handle authentication errors appropriately', async () => {
    const mockError = {
      code: AuthErrorCode.INVALID_CREDENTIALS,
      message: 'Invalid credentials',
      timestamp: new Date(),
      attemptedAction: 'login'
    };

    // Mock failed login
    jest.spyOn(authActions, 'loginWithGoogle')
      .mockImplementation(() => async (dispatch) => {
        dispatch(authActions.loginFailure(mockError));
      });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login('invalid-code');
    });

    expect(result.current.error).toEqual(mockError);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });
});