// @version react ^18.2.0
// @version react-dom ^18.2.0
// @version @mui/material ^5.0.0
// @version @datadog/browser-rum ^4.0.0

import React, { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { datadogRum } from '@datadog/browser-rum';

import { App } from './App';
import store from './store/store';
import theme from './assets/styles/theme';

/**
 * Initializes performance monitoring and error tracking with DataDog RUM
 */
const initializeMonitoring = (): void => {
  if (process.env.NODE_ENV === 'production') {
    datadogRum.init({
      applicationId: process.env.VITE_DATADOG_APP_ID || '',
      clientToken: process.env.VITE_DATADOG_CLIENT_TOKEN || '',
      site: 'datadoghq.com',
      service: 'saas-metrics-platform',
      env: process.env.NODE_ENV,
      version: process.env.VITE_APP_VERSION || '1.0.0',
      sessionSampleRate: 100,
      sessionReplaySampleRate: 20,
      trackUserInteractions: true,
      trackResources: true,
      trackLongTasks: true,
      defaultPrivacyLevel: 'mask-user-input'
    });

    // Start tracking performance
    datadogRum.startSessionReplayRecording();
  }
};

/**
 * Renders the root application with all required providers and error boundary
 */
const renderApp = (): void => {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root element not found');
  }

  // Initialize performance monitoring
  initializeMonitoring();

  // Create React root with strict mode in development
  const root = ReactDOM.createRoot(rootElement);
  
  root.render(
    <StrictMode>
      <Provider store={store}>
        <ThemeProvider theme={theme}>
          {/* Reset CSS baseline */}
          <CssBaseline />
          <App />
        </ThemeProvider>
      </Provider>
    </StrictMode>
  );
};

// Handle errors during initialization
try {
  renderApp();
} catch (error) {
  console.error('Failed to initialize application:', error);
  
  // Report critical initialization errors
  if (process.env.NODE_ENV === 'production') {
    datadogRum.addError(error, {
      errorType: 'initialization_error',
      errorMessage: error instanceof Error ? error.message : 'Unknown initialization error'
    });
  }

  // Display fallback UI for critical errors
  const rootElement = document.getElementById('root');
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="display: flex; justify-content: center; align-items: center; height: 100vh;">
        <div style="text-align: center;">
          <h1>Unable to load application</h1>
          <p>Please try refreshing the page. If the problem persists, contact support.</p>
        </div>
      </div>
    `;
  }
}

// Enable hot module replacement in development
if (process.env.NODE_ENV === 'development' && module.hot) {
  module.hot.accept('./App', () => {
    renderApp();
  });
}