// @version axios ^1.4.x
// @version crypto-js ^4.1.x

import axios from 'axios';
import CryptoJS from 'crypto-js';
import { AuthState, AuthTokens, AuthenticatedUser, AuthError, AuthErrorCode } from '../interfaces/auth.interface';
import { apiConfig } from '../config/api.config';
import authConfig, { getStoredTokens, storeTokens, clearTokens } from '../config/auth.config';

/**
 * Service class handling authentication operations with enhanced security measures
 * including token encryption, session management, and proactive token refresh.
 */
export class AuthService {
  private authState: AuthState | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;
  private readonly encryptionKey: string;

  constructor() {
    // Generate unique encryption key for token storage
    this.encryptionKey = CryptoJS.lib.WordArray.random(256 / 8).toString();
    this.initializeAuthState();
  }

  /**
   * Initializes authentication state from secure storage
   * @private
   */
  private async initializeAuthState(): Promise<void> {
    try {
      const storedTokens = getStoredTokens();
      if (storedTokens && this.validateTokens(storedTokens)) {
        const user = await this.validateUserSession(storedTokens);
        if (user) {
          this.authState = {
            isAuthenticated: true,
            user,
            tokens: storedTokens,
            sessionStatus: {
              lastActivity: new Date(),
              expiresAt: new Date(Date.now() + authConfig.session.inactivityTimeout * 1000),
              isActive: true,
              device: {
                id: this.generateDeviceId(),
                userAgent: navigator.userAgent,
                ipAddress: await this.getClientIp()
              },
              createdAt: new Date()
            },
            error: null,
            loading: false
          };
          this.setupRefreshTimer(storedTokens.accessTokenExpires);
          await this.checkConcurrentSessions();
        }
      }
    } catch (error) {
      console.error('Error initializing auth state:', error);
      this.handleAuthError(error as Error);
    }
  }

  /**
   * Initiates Google OAuth login flow with CSRF protection
   * @returns Promise<AuthState>
   */
  public async login(): Promise<AuthState> {
    try {
      const csrfToken = this.generateCsrfToken();
      sessionStorage.setItem('oauth_state', csrfToken);

      const oauthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      oauthUrl.searchParams.append('client_id', authConfig.google.clientId);
      oauthUrl.searchParams.append('redirect_uri', authConfig.google.redirectUri);
      oauthUrl.searchParams.append('response_type', authConfig.google.responseType);
      oauthUrl.searchParams.append('scope', authConfig.google.scope);
      oauthUrl.searchParams.append('access_type', authConfig.google.accessType);
      oauthUrl.searchParams.append('state', csrfToken);
      oauthUrl.searchParams.append('prompt', authConfig.google.prompt);

      window.location.href = oauthUrl.toString();
      return this.authState!;
    } catch (error) {
      this.handleAuthError(error as Error);
      throw error;
    }
  }

  /**
   * Handles OAuth callback and token exchange
   * @param code OAuth authorization code
   * @param state CSRF state token
   * @returns Promise<AuthState>
   */
  public async handleCallback(code: string, state: string): Promise<AuthState> {
    try {
      const storedState = sessionStorage.getItem('oauth_state');
      if (!storedState || storedState !== state) {
        throw new Error('Invalid OAuth state');
      }

      const response = await axios.post(`${apiConfig.endpoints.AUTH}/callback`, {
        code,
        redirect_uri: authConfig.google.redirectUri
      });

      const { tokens, user } = response.data;
      if (!this.validateTokenResponse(tokens, user)) {
        throw new Error('Invalid token response');
      }

      const encryptedTokens = this.encryptTokens(tokens);
      storeTokens(encryptedTokens);

      this.authState = {
        isAuthenticated: true,
        user,
        tokens: encryptedTokens,
        sessionStatus: {
          lastActivity: new Date(),
          expiresAt: new Date(Date.now() + authConfig.session.inactivityTimeout * 1000),
          isActive: true,
          device: {
            id: this.generateDeviceId(),
            userAgent: navigator.userAgent,
            ipAddress: await this.getClientIp()
          },
          createdAt: new Date()
        },
        error: null,
        loading: false
      };

      this.setupRefreshTimer(encryptedTokens.accessTokenExpires);
      await this.checkConcurrentSessions();

      return this.authState;
    } catch (error) {
      this.handleAuthError(error as Error);
      throw error;
    }
  }

  /**
   * Logs out user and cleans up session data
   * @returns Promise<void>
   */
  public async logout(): Promise<void> {
    try {
      if (this.authState?.tokens) {
        await axios.post(`${apiConfig.endpoints.AUTH}/logout`, {
          refreshToken: this.authState.tokens.refreshToken
        });
      }

      this.clearRefreshTimer();
      clearTokens();
      this.authState = null;
      sessionStorage.removeItem('oauth_state');
      
      await this.updateSessionCount(-1);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  }

  /**
   * Refreshes access token before expiration
   * @returns Promise<AuthTokens>
   */
  public async refreshToken(): Promise<AuthTokens> {
    try {
      if (!this.authState?.tokens?.refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await axios.post(`${apiConfig.endpoints.AUTH}/refresh`, {
        refreshToken: this.authState.tokens.refreshToken
      });

      const newTokens = response.data;
      if (!this.validateTokenResponse(newTokens, this.authState.user)) {
        throw new Error('Invalid refresh token response');
      }

      const encryptedTokens = this.encryptTokens(newTokens);
      storeTokens(encryptedTokens);

      if (this.authState) {
        this.authState.tokens = encryptedTokens;
      }

      this.setupRefreshTimer(encryptedTokens.accessTokenExpires);
      return encryptedTokens;
    } catch (error) {
      this.handleAuthError(error as Error);
      throw error;
    }
  }

  /**
   * Returns current authentication state
   * @returns AuthState | null
   */
  public getAuthState(): AuthState | null {
    return this.authState;
  }

  /**
   * Validates tokens for expiration and format
   * @private
   * @param tokens AuthTokens
   * @returns boolean
   */
  private validateTokens(tokens: AuthTokens): boolean {
    if (!tokens.accessToken || !tokens.refreshToken) {
      return false;
    }

    const now = Date.now();
    return new Date(tokens.accessTokenExpires).getTime() > now &&
           new Date(tokens.refreshTokenExpires).getTime() > now;
  }

  /**
   * Validates user session and domain
   * @private
   * @param tokens AuthTokens
   * @returns Promise<AuthenticatedUser | null>
   */
  private async validateUserSession(tokens: AuthTokens): Promise<AuthenticatedUser | null> {
    try {
      const response = await axios.get(`${apiConfig.endpoints.AUTH}/validate`, {
        headers: { Authorization: `${authConfig.token.tokenType} ${tokens.accessToken}` }
      });

      const user = response.data;
      if (!authConfig.google.allowedDomains.includes(user.email.split('@')[1])) {
        throw new Error('Domain not allowed');
      }

      return user;
    } catch (error) {
      return null;
    }
  }

  /**
   * Encrypts tokens for secure storage
   * @private
   * @param tokens AuthTokens
   * @returns AuthTokens
   */
  private encryptTokens(tokens: AuthTokens): AuthTokens {
    return {
      ...tokens,
      accessToken: CryptoJS.AES.encrypt(tokens.accessToken, this.encryptionKey).toString(),
      refreshToken: CryptoJS.AES.encrypt(tokens.refreshToken, this.encryptionKey).toString()
    };
  }

  /**
   * Sets up timer for token refresh
   * @private
   * @param expiresAt Date
   */
  private setupRefreshTimer(expiresAt: Date): void {
    this.clearRefreshTimer();
    const expiresIn = new Date(expiresAt).getTime() - Date.now();
    const refreshTime = Math.max(0, expiresIn - 5 * 60 * 1000); // 5 minutes before expiry

    this.refreshTimer = setTimeout(async () => {
      try {
        await this.refreshToken();
      } catch (error) {
        this.handleAuthError(error as Error);
      }
    }, refreshTime);
  }

  /**
   * Clears token refresh timer
   * @private
   */
  private clearRefreshTimer(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * Generates CSRF token for OAuth flow
   * @private
   * @returns string
   */
  private generateCsrfToken(): string {
    return CryptoJS.lib.WordArray.random(128 / 8).toString();
  }

  /**
   * Generates unique device identifier
   * @private
   * @returns string
   */
  private generateDeviceId(): string {
    return CryptoJS.SHA256(navigator.userAgent + navigator.language + screen.width + screen.height).toString();
  }

  /**
   * Gets client IP address
   * @private
   * @returns Promise<string>
   */
  private async getClientIp(): Promise<string> {
    try {
      const response = await axios.get('https://api.ipify.org?format=json');
      return response.data.ip;
    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * Checks and enforces concurrent session limit
   * @private
   * @returns Promise<void>
   */
  private async checkConcurrentSessions(): Promise<void> {
    try {
      const response = await axios.get(`${apiConfig.endpoints.AUTH}/sessions`, {
        headers: { Authorization: `${authConfig.token.tokenType} ${this.authState?.tokens?.accessToken}` }
      });

      const activeSessions = response.data.count;
      if (activeSessions > authConfig.session.maxConcurrentSessions) {
        await this.logout();
        throw new Error('Maximum concurrent sessions exceeded');
      }
    } catch (error) {
      this.handleAuthError(error as Error);
    }
  }

  /**
   * Updates session count
   * @private
   * @param delta number
   * @returns Promise<void>
   */
  private async updateSessionCount(delta: number): Promise<void> {
    try {
      await axios.post(`${apiConfig.endpoints.AUTH}/sessions/update`, {
        delta,
        deviceId: this.authState?.sessionStatus.device.id
      });
    } catch (error) {
      console.error('Error updating session count:', error);
    }
  }

  /**
   * Handles authentication errors
   * @private
   * @param error Error
   */
  private handleAuthError(error: Error): void {
    const authError: AuthError = {
      code: AuthErrorCode.INVALID_TOKEN,
      message: error.message,
      timestamp: new Date(),
      attemptedAction: 'authentication'
    };

    if (this.authState) {
      this.authState.error = authError;
      this.authState.isAuthenticated = false;
    }

    this.clearRefreshTimer();
    clearTokens();
  }

  /**
   * Validates token response format and content
   * @private
   * @param tokens AuthTokens
   * @param user AuthenticatedUser
   * @returns boolean
   */
  private validateTokenResponse(tokens: AuthTokens, user: AuthenticatedUser): boolean {
    return Boolean(
      tokens &&
      tokens.accessToken &&
      tokens.refreshToken &&
      tokens.accessTokenExpires &&
      tokens.refreshTokenExpires &&
      user &&
      user.email &&
      user.role
    );
  }
}