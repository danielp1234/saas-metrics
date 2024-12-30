// @version jest ^29.0.0
// @version axios-mock-adapter ^1.21.0
// @version jest-localstorage-mock ^2.4.26

import { describe, beforeAll, beforeEach, afterEach, it, expect, jest } from '@jest/globals';
import MockAdapter from 'axios-mock-adapter';
import axios from 'axios';
import { AuthService } from '../../src/services/auth.service';
import { AuthState, AuthErrorCode, UserRole } from '../../src/interfaces/auth.interface';
import authConfig, { getStoredTokens, storeTokens } from '../../src/config/auth.config';
import { apiConfig } from '../../src/config/api.config';

describe('AuthService', () => {
  let authService: AuthService;
  let axiosMock: MockAdapter;

  // Mock data for testing
  const mockTokens = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    accessTokenExpires: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
    refreshTokenExpires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    tokenType: 'Bearer'
  };

  const mockUser = {
    id: 'user-123',
    email: 'test@verified.domain.com',
    role: UserRole.ADMIN,
    lastLogin: new Date().toISOString(),
    permissions: ['read:metrics', 'write:metrics'],
    activeSessions: 1,
    securityPreferences: {
      mfaEnabled: true,
      receiveSecurityAlerts: true
    }
  };

  beforeAll(() => {
    // Setup axios mock
    axiosMock = new MockAdapter(axios);
    
    // Mock crypto functions
    global.crypto = {
      getRandomValues: (arr: Uint8Array) => {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = Math.floor(Math.random() * 256);
        }
        return arr;
      },
      subtle: {
        digest: jest.fn()
      }
    } as unknown as Crypto;
  });

  beforeEach(() => {
    // Clear storage and reset mocks
    localStorage.clear();
    sessionStorage.clear();
    axiosMock.reset();
    jest.clearAllMocks();
    
    // Create new instance for each test
    authService = new AuthService();
    
    // Reset timers
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('OAuth Flow', () => {
    it('should generate and store CSRF token before OAuth redirect', async () => {
      const loginResult = await authService.login();
      const storedState = sessionStorage.getItem('oauth_state');
      
      expect(storedState).toBeTruthy();
      expect(loginResult).toBeDefined();
      expect(window.location.href).toContain('accounts.google.com');
      expect(window.location.href).toContain(storedState);
    });

    it('should handle OAuth callback successfully', async () => {
      const mockCode = 'mock-auth-code';
      const mockState = 'mock-state';
      
      // Setup CSRF state
      sessionStorage.setItem('oauth_state', mockState);
      
      // Mock token exchange endpoint
      axiosMock.onPost(`${apiConfig.endpoints.AUTH}/callback`).reply(200, {
        tokens: mockTokens,
        user: mockUser
      });

      const result = await authService.handleCallback(mockCode, mockState);
      
      expect(result.isAuthenticated).toBe(true);
      expect(result.user).toEqual(mockUser);
      expect(getStoredTokens()).toBeTruthy();
    });

    it('should prevent CSRF attacks by validating state', async () => {
      const mockCode = 'mock-auth-code';
      const invalidState = 'invalid-state';
      
      sessionStorage.setItem('oauth_state', 'original-state');
      
      await expect(authService.handleCallback(mockCode, invalidState))
        .rejects.toThrow('Invalid OAuth state');
    });

    it('should validate allowed email domains', async () => {
      const mockCode = 'mock-auth-code';
      const mockState = 'mock-state';
      
      sessionStorage.setItem('oauth_state', mockState);
      
      const invalidUser = { ...mockUser, email: 'test@invalid-domain.com' };
      
      axiosMock.onPost(`${apiConfig.endpoints.AUTH}/callback`).reply(200, {
        tokens: mockTokens,
        user: invalidUser
      });

      await expect(authService.handleCallback(mockCode, mockState))
        .rejects.toThrow('Domain not allowed');
    });
  });

  describe('Session Management', () => {
    it('should enforce maximum concurrent sessions', async () => {
      // Setup authenticated state
      storeTokens(mockTokens);
      
      // Mock sessions endpoint to return over limit
      axiosMock.onGet(`${apiConfig.endpoints.AUTH}/sessions`).reply(200, {
        count: authConfig.session.maxConcurrentSessions + 1
      });

      await authService.initializeAuthState();
      const authState = authService.getAuthState();
      
      expect(authState).toBeNull();
      expect(getStoredTokens()).toBeNull();
    });

    it('should handle session expiry correctly', async () => {
      // Setup authenticated state with expired session
      const expiredTokens = {
        ...mockTokens,
        accessTokenExpires: new Date(Date.now() - 1000).toISOString()
      };
      
      storeTokens(expiredTokens);
      await authService.initializeAuthState();
      
      const authState = authService.getAuthState();
      expect(authState).toBeNull();
    });

    it('should refresh tokens before expiry', async () => {
      // Setup near-expiry tokens
      const nearExpiryTokens = {
        ...mockTokens,
        accessTokenExpires: new Date(Date.now() + 4 * 60 * 1000).toISOString() // 4 minutes
      };
      
      storeTokens(nearExpiryTokens);
      
      // Mock refresh endpoint
      axiosMock.onPost(`${apiConfig.endpoints.AUTH}/refresh`).reply(200, mockTokens);
      
      await authService.initializeAuthState();
      
      // Advance timers to trigger refresh
      jest.advanceTimersByTime(1000);
      
      const newTokens = getStoredTokens();
      expect(newTokens?.accessToken).toBe(mockTokens.accessToken);
    });
  });

  describe('Token Management', () => {
    it('should securely store encrypted tokens', async () => {
      const mockCode = 'mock-auth-code';
      const mockState = 'mock-state';
      
      sessionStorage.setItem('oauth_state', mockState);
      
      axiosMock.onPost(`${apiConfig.endpoints.AUTH}/callback`).reply(200, {
        tokens: mockTokens,
        user: mockUser
      });

      await authService.handleCallback(mockCode, mockState);
      
      const storedTokens = getStoredTokens();
      expect(storedTokens?.accessToken).not.toBe(mockTokens.accessToken);
      expect(storedTokens?.refreshToken).not.toBe(mockTokens.refreshToken);
    });

    it('should handle token refresh failures', async () => {
      storeTokens(mockTokens);
      
      axiosMock.onPost(`${apiConfig.endpoints.AUTH}/refresh`).reply(401);
      
      await authService.initializeAuthState();
      
      try {
        await authService.refreshToken();
      } catch (error) {
        expect(authService.getAuthState()?.isAuthenticated).toBe(false);
        expect(getStoredTokens()).toBeNull();
      }
    });

    it('should clear tokens and state on logout', async () => {
      storeTokens(mockTokens);
      
      axiosMock.onPost(`${apiConfig.endpoints.AUTH}/logout`).reply(200);
      
      await authService.initializeAuthState();
      await authService.logout();
      
      expect(getStoredTokens()).toBeNull();
      expect(authService.getAuthState()).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      axiosMock.onPost(`${apiConfig.endpoints.AUTH}/callback`).networkError();
      
      const mockCode = 'mock-auth-code';
      const mockState = 'mock-state';
      
      sessionStorage.setItem('oauth_state', mockState);
      
      await expect(authService.handleCallback(mockCode, mockState))
        .rejects.toThrow();
    });

    it('should handle invalid token responses', async () => {
      const mockCode = 'mock-auth-code';
      const mockState = 'mock-state';
      
      sessionStorage.setItem('oauth_state', mockState);
      
      axiosMock.onPost(`${apiConfig.endpoints.AUTH}/callback`).reply(200, {
        tokens: { ...mockTokens, accessToken: null }, // Invalid token
        user: mockUser
      });

      await expect(authService.handleCallback(mockCode, mockState))
        .rejects.toThrow('Invalid token response');
    });
  });
});