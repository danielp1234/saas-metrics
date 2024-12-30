// @version react ^18.2.0
// @version @mui/material ^5.0.0
// @version @sentry/react ^7.0.0

import React, { Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider, CssBaseline, CircularProgress, Box } from '@mui/material';
import * as Sentry from '@sentry/react';
import Home from './pages/Home';
import useAuth from './hooks/useAuth';
import theme from './assets/styles/theme';
import ErrorBoundary from './components/common/ErrorBoundary';
import LoadingSpinner from './components/common/LoadingSpinner';

// Lazy-loaded components for code splitting
const MetricsList = React.lazy(() => import('./pages/metrics/List'));
const MetricDetailPage = React.lazy(() => import('./pages/metrics/Detail'));
const Dashboard = React.lazy(() => import('./pages/admin/Dashboard'));

// Initialize Sentry for error tracking
Sentry.init({
  dsn: process.env.VITE_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.2,
  integrations: [new Sentry.BrowserTracing()],
});

/**
 * Route guard component for protected admin routes
 */
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isAdmin, sessionStatus, refreshToken } = useAuth();
  const location = useLocation();

  useEffect(() => {
    // Refresh token if session is about to expire
    if (sessionStatus?.expiresAt) {
      const expiryTime = new Date(sessionStatus.expiresAt).getTime();
      const currentTime = Date.now();
      const timeUntilExpiry = expiryTime - currentTime;

      if (timeUntilExpiry < 300000) { // 5 minutes
        refreshToken().catch(console.error);
      }
    }
  }, [sessionStatus, refreshToken]);

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

/**
 * Root application component that handles routing, authentication,
 * theme provider, and error boundaries.
 */
const App: React.FC = () => {
  // Track page views
  const trackPageView = (path: string) => {
    if (process.env.NODE_ENV === 'production') {
      Sentry.addBreadcrumb({
        category: 'navigation',
        message: `Page view: ${path}`,
        level: 'info',
      });
    }
  };

  return (
    <ErrorBoundary
      fallback={
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="100vh"
        >
          <CircularProgress />
        </Box>
      }
    >
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <Suspense
            fallback={
              <LoadingSpinner
                fullPage
                size={40}
                color="primary"
                loadingText="Loading application..."
              />
            }
          >
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Home />} />
              <Route
                path="/metrics"
                element={
                  <Suspense fallback={<LoadingSpinner fullPage />}>
                    <MetricsList />
                  </Suspense>
                }
              />
              <Route
                path="/metrics/:metricId"
                element={
                  <Suspense fallback={<LoadingSpinner fullPage />}>
                    <MetricDetailPage />
                  </Suspense>
                }
              />

              {/* Protected admin routes */}
              <Route
                path="/admin/*"
                element={
                  <ProtectedRoute>
                    <Suspense fallback={<LoadingSpinner fullPage />}>
                      <Dashboard />
                    </Suspense>
                  </ProtectedRoute>
                }
              />

              {/* Catch-all route */}
              <Route
                path="*"
                element={
                  <Navigate
                    to="/"
                    replace
                  />
                }
              />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

// Track route changes
const RouteTracker: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    trackPageView(location.pathname);
  }, [location]);

  return null;
};

// Export wrapped app with route tracking
export default Sentry.withProfiler(App);