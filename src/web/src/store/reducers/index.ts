/**
 * Root Reducer Configuration
 * Combines all individual reducers for the SaaS Metrics Platform's Redux store
 * with enhanced type safety and performance optimizations
 * @version 1.0.0
 */

// @version @reduxjs/toolkit@1.9.x
import { combineReducers } from '@reduxjs/toolkit';

// Import individual reducers
import uiReducer from './ui.reducer';
import authReducer from './auth.reducer';
import metricsReducer from './metrics.reducer';

/**
 * Interface defining the complete application state structure
 * Combines all individual state interfaces with strict typing
 */
export interface RootState {
  /** UI state including loading, notifications, and theme */
  ui: ReturnType<typeof uiReducer>;
  /** Authentication state including user and token management */
  auth: ReturnType<typeof authReducer>;
  /** Metrics state including data and filters */
  metrics: ReturnType<typeof metricsReducer>;
}

/**
 * Root reducer combining all feature reducers
 * Implements performance optimizations and type safety
 * @see Technical Specification 2.2.1 Web Application
 */
const rootReducer = combineReducers<RootState>({
  // UI state management for loading, notifications, and theme
  ui: uiReducer,
  
  // Authentication state management for Google OAuth flow
  auth: authReducer,
  
  // Metrics state management for benchmark data
  metrics: metricsReducer
});

export default rootReducer;