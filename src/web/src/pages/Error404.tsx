// @version react ^18.2.0
// @version @mui/material ^5.0.0
// @version framer-motion ^6.0.0

import React, { useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, Typography, Container, useTheme, useMediaQuery } from '@mui/material';
import { motion } from 'framer-motion';
import MainLayout from '../components/layout/MainLayout';
import Button from '../components/common/Button';

/**
 * 404 Error page component that displays when users attempt to access non-existent routes.
 * Implements responsive design, accessibility features, and error tracking integration.
 * 
 * @returns {JSX.Element} Rendered 404 error page
 */
const Error404: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Handle navigation back to home page
  const handleGoHome = useCallback(() => {
    // Track 404 error occurrence before navigation
    if (process.env.NODE_ENV === 'production') {
      console.error('404 Error:', {
        path: location.pathname,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
      });
    }
    navigate('/');
  }, [navigate, location.pathname]);

  return (
    <MainLayout>
      <Container
        maxWidth="md"
        component={motion.div}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: `calc(100vh - ${theme.spacing(16)})`, // Account for header and footer
          textAlign: 'center',
          padding: theme.spacing(3),
        }}
      >
        {/* Error Code */}
        <Typography
          variant={isMobile ? 'h2' : 'h1'}
          component="h1"
          color="primary"
          sx={{
            fontSize: isMobile ? '4rem' : '6rem',
            fontWeight: theme.typography.fontWeightBold,
            marginBottom: theme.spacing(2),
          }}
          aria-label="Error 404"
        >
          404
        </Typography>

        {/* Error Title */}
        <Typography
          variant="h4"
          component="h2"
          gutterBottom
          sx={{
            fontWeight: theme.typography.fontWeightMedium,
            marginBottom: theme.spacing(2),
          }}
        >
          Page Not Found
        </Typography>

        {/* Error Description */}
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{
            maxWidth: '600px',
            marginBottom: theme.spacing(4),
          }}
        >
          The page you are looking for might have been removed, had its name changed,
          or is temporarily unavailable. Please check the URL or return to the homepage.
        </Typography>

        {/* Action Button */}
        <Button
          variant="contained"
          color="primary"
          onClick={handleGoHome}
          size="large"
          ariaLabel="Return to homepage"
          sx={{
            minWidth: isMobile ? '100%' : '200px',
            padding: theme.spacing(1.5, 3),
          }}
        >
          Return to Homepage
        </Button>

        {/* Current Path Display */}
        <Box
          sx={{
            marginTop: theme.spacing(4),
            padding: theme.spacing(2),
            backgroundColor: theme.palette.grey[100],
            borderRadius: theme.shape.borderRadius,
            maxWidth: '100%',
            overflow: 'hidden',
          }}
        >
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ wordBreak: 'break-all' }}
          >
            Requested Path: {location.pathname}
          </Typography>
        </Box>
      </Container>
    </MainLayout>
  );
};

export default Error404;