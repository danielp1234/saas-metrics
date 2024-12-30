// @version react@18.2.0
// @version @mui/material@5.0.0

import React, { Component, ErrorInfo } from 'react';
import { Box, Typography, Container } from '@mui/material';
import Notification, { NotificationProps } from './Notification';

/**
 * Props interface for the ErrorBoundary component
 */
export interface ErrorBoundaryProps {
  /** Child components to be rendered and monitored for errors */
  children: React.ReactNode;
  /** Optional custom fallback UI to display when an error occurs */
  fallback?: React.ReactNode;
  /** Optional callback function to handle errors externally */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

/**
 * State interface for the ErrorBoundary component
 */
interface ErrorBoundaryState {
  /** Indicates whether an error has occurred */
  hasError: boolean;
  /** The error object if one exists */
  error: Error | null;
  /** React error info object containing component stack */
  errorInfo: React.ErrorInfo | null;
  /** Controls visibility of error notification */
  showNotification: boolean;
}

/**
 * ErrorBoundary component that catches JavaScript errors anywhere in the child
 * component tree. Provides fallback UI and error notifications while preventing
 * application crashes.
 * 
 * @example
 * ```tsx
 * <ErrorBoundary onError={(error, errorInfo) => logError(error, errorInfo)}>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showNotification: false
    };
  }

  /**
   * Static method to update state when an error occurs
   * @param error - The error that was caught
   */
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorInfo: null,
      showNotification: true
    };
  }

  /**
   * Lifecycle method called when an error is caught
   * Handles error logging and notification
   * 
   * @param error - The error that was caught
   * @param errorInfo - React error info containing component stack
   */
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error details in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // Update state with error details
    this.setState({
      error,
      errorInfo,
      showNotification: true
    });

    // Call onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // In production, you might want to log to an error tracking service
    if (process.env.NODE_ENV === 'production') {
      // Example: logErrorToService(error, errorInfo);
    }
  }

  /**
   * Renders the error boundary's content
   * Either displays the error UI or renders children normally
   */
  render(): JSX.Element {
    const { hasError, error, showNotification } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      // Render custom fallback UI if provided
      if (fallback) {
        return (
          <>
            {fallback}
            {showNotification && (
              <Notification />
            )}
          </>
        );
      }

      // Default error UI
      return (
        <>
          <Container maxWidth="sm" sx={{ mt: 8 }}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                p: 3,
                bgcolor: 'background.paper',
                borderRadius: 1,
                boxShadow: 1
              }}
            >
              <Typography
                variant="h5"
                component="h1"
                gutterBottom
                color="error"
                align="center"
              >
                Something went wrong
              </Typography>
              <Typography
                variant="body1"
                color="text.secondary"
                align="center"
                paragraph
              >
                We apologize for the inconvenience. Please try refreshing the page or contact support if the problem persists.
              </Typography>
              {process.env.NODE_ENV === 'development' && error && (
                <Typography
                  variant="body2"
                  component="pre"
                  sx={{
                    mt: 2,
                    p: 2,
                    bgcolor: 'grey.100',
                    borderRadius: 1,
                    overflow: 'auto',
                    maxWidth: '100%'
                  }}
                >
                  {error.toString()}
                </Typography>
              )}
            </Box>
          </Container>
          {showNotification && (
            <Notification />
          )}
        </>
      );
    }

    // Render children if no error
    return <>{children}</>;
  }
}

export default ErrorBoundary;