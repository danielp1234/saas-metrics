/**
 * Redux Store Configuration
 * Implements centralized state management with enhanced middleware, performance monitoring,
 * and security features for the SaaS Metrics Platform
 * @version 1.0.0
 */

// @version @reduxjs/toolkit@1.9.x
import { 
  configureStore, 
  createImmutableStateInvariantMiddleware,
  isPlain,
  Middleware
} from '@reduxjs/toolkit';

// @version redux-state-sync@3.1.x
import { createStateSyncMiddleware, initMessageListener } from 'redux-state-sync';

// Import root reducer and types
import rootReducer from './reducers';
import type { RootState } from './reducers';

/**
 * Custom middleware configuration for development and production environments
 */
const DEVELOPMENT_MIDDLEWARE: Middleware[] = [
  createImmutableStateInvariantMiddleware({
    ignoredPaths: ['ui.notification']
  })
];

const PRODUCTION_MIDDLEWARE: Middleware[] = [];

/**
 * State synchronization configuration for multi-tab support
 */
const STATE_SYNC_CONFIG = {
  blacklist: [
    'ui/setLoadingState',
    'ui/setNotification',
    'metrics/updateMetricValue'
  ],
  broadcastChannelOption: {
    type: 'localstorage'
  }
};

/**
 * Serialization configuration for Redux
 * Implements security checks and validation
 */
const SERIALIZATION_CONFIG = {
  serializableCheck: {
    ignoredActions: ['ui/setNotification'],
    ignoredPaths: ['ui.notification'],
    warnAfter: 100,
    isSerializable: (value: unknown) => isPlain(value)
  }
};

/**
 * Performance monitoring configuration
 */
const PERFORMANCE_CONFIG = {
  measureTime: process.env.NODE_ENV === 'development',
  trace: process.env.NODE_ENV === 'development'
};

/**
 * Configures and creates the Redux store with enhanced features
 * Implements middleware, monitoring, and security measures
 */
export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) => {
    // Get default middleware with custom configuration
    const defaultMiddleware = getDefaultMiddleware({
      ...SERIALIZATION_CONFIG,
      thunk: {
        extraArgument: undefined
      },
      immutableCheck: {
        warnAfter: 100
      }
    });

    // Add environment-specific middleware
    const envMiddleware = process.env.NODE_ENV === 'production' 
      ? PRODUCTION_MIDDLEWARE 
      : DEVELOPMENT_MIDDLEWARE;

    // Add state sync middleware for multi-tab support
    const stateSyncMiddleware = createStateSyncMiddleware(STATE_SYNC_CONFIG);

    return defaultMiddleware
      .concat(envMiddleware)
      .concat(stateSyncMiddleware);
  },
  devTools: process.env.NODE_ENV !== 'production' && {
    name: 'SaaS Metrics Platform',
    trace: true,
    traceLimit: 25
  },
  preloadedState: undefined,
  enhancers: []
});

// Initialize message listener for state synchronization
initMessageListener(store);

/**
 * Type definitions for store dispatch and state
 * Enables strict typing throughout the application
 */
export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;

// Performance monitoring in development
if (process.env.NODE_ENV === 'development') {
  let currentState = store.getState();
  store.subscribe(() => {
    const previousState = currentState;
    currentState = store.getState();
    
    // Log significant state changes
    console.group('State Update');
    console.log('Previous State:', previousState);
    console.log('Current State:', currentState);
    console.groupEnd();
  });
}

// Export configured store as default
export default store;