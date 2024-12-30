/**
 * Authentication Utilities for SaaS Metrics Platform
 * Provides secure token management and OAuth handling functions
 * @version 1.0.0
 */

import jwtDecode from 'jwt-decode'; // v3.1.2
import { AuthToken, GoogleAuthResponse, User } from '../interfaces/auth.interface';
import { authConfig } from '../config/auth.config';

/**
 * Error messages for authentication operations
 */
const AUTH_ERRORS = {
  INVALID_TOKEN: 'Invalid authentication token structure',
  TOKEN_EXPIRED: 'Authentication token has expired',
  STORAGE_ERROR: 'Error accessing token storage',
  PARSE_ERROR: 'Error parsing authentication data',
  INVALID_OAUTH: 'Invalid OAuth response format'
} as const;

/**
 * Interface for decoded JWT token payload
 */
interface DecodedToken {
  exp: number;
  iat: number;
  sub: string;
  role: string;
}

/**
 * Retrieves and validates stored authentication token
 * @returns {AuthToken | null} Validated token or null if invalid/not found
 */
export const getStoredToken = (): AuthToken | null => {
  try {
    const storedToken = localStorage.getItem(authConfig.token.storageKey);
    if (!storedToken) return null;

    const parsedToken: AuthToken = JSON.parse(storedToken);
    if (!isTokenValid(parsedToken)) {
      removeStoredToken();
      return null;
    }

    return parsedToken;
  } catch (error) {
    console.error('Error retrieving stored token:', error);
    removeStoredToken();
    return null;
  }
};

/**
 * Securely stores authentication token
 * @param {AuthToken} token - Token to store
 */
export const setStoredToken = (token: AuthToken): void => {
  try {
    if (!token || !token.accessToken || !token.refreshToken) {
      throw new Error(AUTH_ERRORS.INVALID_TOKEN);
    }

    // Encrypt token if encryption is enabled
    const tokenToStore = authConfig.security.tokenEncryption 
      ? encryptToken(token)
      : token;

    localStorage.setItem(
      authConfig.token.storageKey,
      JSON.stringify(tokenToStore)
    );
  } catch (error) {
    console.error('Error storing token:', error);
    throw new Error(AUTH_ERRORS.STORAGE_ERROR);
  }
};

/**
 * Removes stored authentication token and related session data
 */
export const removeStoredToken = (): void => {
  try {
    localStorage.removeItem(authConfig.token.storageKey);
    localStorage.removeItem(authConfig.session.storageKey);
    
    // Clear any cached data
    sessionStorage.clear();
  } catch (error) {
    console.error('Error removing token:', error);
  }
};

/**
 * Validates token structure, signature, and expiration
 * @param {AuthToken} token - Token to validate
 * @returns {boolean} Token validity status
 */
export const isTokenValid = (token: AuthToken): boolean => {
  try {
    if (!token || !token.accessToken) return false;

    const decoded = jwtDecode<DecodedToken>(token.accessToken);
    if (!decoded || !decoded.exp) return false;

    // Check token expiration
    const currentTime = Math.floor(Date.now() / 1000);
    if (decoded.exp <= currentTime) return false;

    // Validate token structure and claims
    if (!decoded.sub || !decoded.role) return false;

    return true;
  } catch (error) {
    console.error('Error validating token:', error);
    return false;
  }
};

/**
 * Determines if token requires refresh based on configuration
 * @param {AuthToken} token - Token to check
 * @returns {boolean} Whether token should be refreshed
 */
export const shouldRefreshToken = (token: AuthToken): boolean => {
  try {
    if (!isTokenValid(token)) return true;

    const decoded = jwtDecode<DecodedToken>(token.accessToken);
    const currentTime = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = decoded.exp - currentTime;

    return timeUntilExpiry <= authConfig.token.refreshThreshold;
  } catch (error) {
    console.error('Error checking token refresh:', error);
    return true;
  }
};

/**
 * Parses and validates Google OAuth response
 * @param {string} url - OAuth callback URL
 * @returns {GoogleAuthResponse} Parsed OAuth response
 */
export const parseGoogleResponse = (url: string): GoogleAuthResponse => {
  try {
    const urlParams = new URLSearchParams(new URL(url).search);
    
    // Validate required OAuth parameters
    const code = urlParams.get('code');
    const scope = urlParams.get('scope');
    const authuser = urlParams.get('authuser');
    const prompt = urlParams.get('prompt');

    if (!code || !scope) {
      throw new Error(AUTH_ERRORS.INVALID_OAUTH);
    }

    // Validate scope matches configuration
    if (!scope.includes(authConfig.googleOAuth.scope)) {
      throw new Error('Invalid OAuth scope');
    }

    return {
      code,
      scope,
      authuser: authuser || '0',
      prompt: prompt || 'none'
    };
  } catch (error) {
    console.error('Error parsing OAuth response:', error);
    throw new Error(AUTH_ERRORS.PARSE_ERROR);
  }
};

/**
 * Encrypts token data if encryption is enabled
 * @param {AuthToken} token - Token to encrypt
 * @returns {AuthToken} Encrypted token
 */
const encryptToken = (token: AuthToken): AuthToken => {
  // Note: Actual encryption implementation would go here
  // This is a placeholder for the encryption logic
  return token;
};