/**
 * Authentication Reducer for SaaS Metrics Platform
 * Manages authentication state including Google OAuth flow, token management,
 * and user session handling with comprehensive security measures
 * @version 1.0.0
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit'; // v1.9.0
import { User, AuthToken, UserRole } from '../../interfaces/auth.interface';
import { 
  loginWithGoogle,
  handleGoogleCallback,
  refreshAuthToken,
  logout,
  checkAuth
} from '../actions/auth.actions';

/**
 * Interface for authentication state
 */
interface AuthState {
  user: User | null;
  token: AuthToken | null;
  isLoading: boolean;
  error: string | null;
  isTokenRefreshing: boolean;
  sessionExpiryTime: number | null;
}

/**
 * Initial authentication state
 */
const initialState: AuthState = {
  user: null,
  token: null,
  isLoading: false,
  error: null,
  isTokenRefreshing: false,
  sessionExpiryTime: null
};

/**
 * Authentication slice with comprehensive state management
 */
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /**
     * Updates user state with role validation
     */
    setUser: (state, action: PayloadAction<User>) => {
      // Validate user object structure
      if (!action.payload.id || !action.payload.email || !action.payload.role) {
        return;
      }

      // Update user state
      state.user = action.payload;
      state.error = null;
    },

    /**
     * Updates authentication token with security checks
     */
    setToken: (state, action: PayloadAction<AuthToken>) => {
      // Validate token structure
      if (!action.payload.accessToken || !action.payload.refreshToken || !action.payload.expiresIn) {
        return;
      }

      // Update token state and calculate expiry
      state.token = action.payload;
      state.sessionExpiryTime = Date.now() + (action.payload.expiresIn * 1000);
      state.error = null;
    },

    /**
     * Securely clears authentication state
     */
    clearAuth: (state) => {
      state.user = null;
      state.token = null;
      state.isLoading = false;
      state.error = null;
      state.isTokenRefreshing = false;
      state.sessionExpiryTime = null;
    }
  },
  extraReducers: (builder) => {
    // Handle Google login flow
    builder
      .addCase(loginWithGoogle.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginWithGoogle.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(loginWithGoogle.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload?.error || 'Login failed';
      })

    // Handle Google OAuth callback
    builder
      .addCase(handleGoogleCallback.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(handleGoogleCallback.fulfilled, (state, action) => {
        if (action.payload) {
          const { user, token } = action.payload;
          state.user = user;
          state.token = token;
          state.sessionExpiryTime = Date.now() + (token.expiresIn * 1000);
        }
        state.isLoading = false;
        state.error = null;
      })
      .addCase(handleGoogleCallback.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload?.error || 'OAuth callback failed';
      })

    // Handle token refresh
    builder
      .addCase(refreshAuthToken.pending, (state) => {
        state.isTokenRefreshing = true;
        state.error = null;
      })
      .addCase(refreshAuthToken.fulfilled, (state, action) => {
        if (action.payload) {
          state.token = action.payload;
          state.sessionExpiryTime = Date.now() + (action.payload.expiresIn * 1000);
        }
        state.isTokenRefreshing = false;
        state.error = null;
      })
      .addCase(refreshAuthToken.rejected, (state, action) => {
        state.isTokenRefreshing = false;
        state.error = action.payload?.error || 'Token refresh failed';
        // Clear auth state on refresh failure
        state.user = null;
        state.token = null;
        state.sessionExpiryTime = null;
      })

    // Handle logout
    builder
      .addCase(logout.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(logout.fulfilled, (state) => {
        // Clear all auth state
        state.user = null;
        state.token = null;
        state.isLoading = false;
        state.error = null;
        state.isTokenRefreshing = false;
        state.sessionExpiryTime = null;
      })
      .addCase(logout.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload?.error || 'Logout failed';
      })

    // Handle auth check
    builder
      .addCase(checkAuth.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(checkAuth.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload) {
          state.user = action.payload;
        }
      })
      .addCase(checkAuth.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload?.error || 'Auth check failed';
        // Clear auth state on check failure
        state.user = null;
        state.token = null;
        state.sessionExpiryTime = null;
      });
  }
});

// Export actions and reducer
export const { setUser, setToken, clearAuth } = authSlice.actions;
export default authSlice.reducer;