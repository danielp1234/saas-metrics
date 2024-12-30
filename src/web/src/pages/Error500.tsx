// @version react ^18.2.0
// @version @mui/material ^5.0.0

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Container, CircularProgress } from '@mui/material';
import { styled } from '@mui/material/styles';
import Button from '../components/common/Button';
import MainLayout from '../components/layout/MainLayout';

// Styled components for enhanced visual presentation
const ErrorContainer = styled(Container)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '60vh',
  textAlign: 'center',
  padding: theme.spacing(3),
  [theme.breakpoints.up('sm')]: {
    padding: theme.spacing(4),
  },
}));

const ErrorCode = styled(Typography)(({ theme }) => ({
  color: theme.palette.error.main,
  fontSize: '4rem',
  fontWeight: theme.typography.fontWeightBold,
  marginBottom: theme.spacing(2),
  [theme.breakpoints.up('sm')]: {
    fontSize: '6rem',
  },
}));

const ActionContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(2),
  marginTop: theme.spacing(4),
  flexDirection: 'column',
  [theme.breakpoints.up('sm')]: {
    flexDirection: 'row',
  },
}));

/**
 * Interface for retry state management
 */
interface RetryState {
  isLoading: boolean;
  retryCount: number;
}

/**
 * Error500 component that displays a user-friendly 500 Internal Server Error page
 * with enhanced accessibility features and recovery options.
 */
const Error500: React.FC = () => {
  const navigate = useNavigate();
  const [retryState, setRetryState] = useState<RetryState>({
    isLoading: false,
    retryCount: 0,
  });

  const MAX_RETRIES = 3;
  const RETRY_DELAY = 2000; // 2 seconds

  /**
   * Handles retry attempts with loading state and attempt limiting
   */
  const handleRetry = useCallback(async () => {
    if (retryState.retryCount >= MAX_RETRIES) {
      return;
    }

    setRetryState(prev => ({
      ...prev,
      isLoading: true,
    }));

    try {
      // Simulate delay before reload
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      window.location.reload();
    } catch (error) {
      console.error('Retry failed:', error);
      setRetryState(prev => ({
        isLoading: false,
        retryCount: prev.retryCount + 1,
      }));
    }
  }, [retryState.retryCount]);

  /**
   * Handles navigation to home page
   */
  const handleHome = useCallback(() => {
    navigate('/');
  }, [navigate]);

  return (
    <MainLayout>
      <ErrorContainer maxWidth="md">
        <ErrorCode variant="h1" component="h1">
          500
        </ErrorCode>
        
        <Typography 
          variant="h4" 
          component="h2" 
          gutterBottom
          sx={{ mb: 3 }}
        >
          Internal Server Error
        </Typography>

        <Typography 
          variant="body1" 
          color="textSecondary"
          paragraph
          sx={{ maxWidth: 600 }}
        >
          We apologize, but something went wrong on our end. Our team has been notified and is working to fix the issue. Please try again in a few moments.
        </Typography>

        <ActionContainer>
          <Button
            variant="contained"
            color="primary"
            onClick={handleRetry}
            disabled={retryState.isLoading || retryState.retryCount >= MAX_RETRIES}
            loading={retryState.isLoading}
            startIcon={retryState.isLoading ? <CircularProgress size={20} /> : undefined}
            ariaLabel="Retry loading the page"
          >
            {retryState.isLoading ? 'Retrying...' : 'Retry'}
          </Button>

          <Button
            variant="outlined"
            color="primary"
            onClick={handleHome}
            disabled={retryState.isLoading}
            ariaLabel="Return to home page"
          >
            Return to Home
          </Button>
        </ActionContainer>

        {retryState.retryCount >= MAX_RETRIES && (
          <Typography 
            variant="body2" 
            color="error" 
            sx={{ mt: 2 }}
            role="alert"
          >
            Maximum retry attempts reached. Please try again later or contact support.
          </Typography>
        )}
      </ErrorContainer>
    </MainLayout>
  );
};

export default Error500;