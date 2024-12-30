import React, { useMemo } from 'react';
import { Box, Typography, Link, useTheme } from '@mui/material';
import theme from '../../assets/styles/theme';
import { APP_NAME } from '../../config/constants';

/**
 * Gets the current year for copyright text using memoization for performance
 * @returns {number} Current year
 */
const getCurrentYear = (): number => {
  return new Date().getFullYear();
};

/**
 * Footer component that appears at the bottom of all pages
 * Implements WCAG 2.1 Level AA compliance with proper semantic structure,
 * keyboard navigation, and responsive design
 * 
 * @returns {JSX.Element} Accessible footer component
 */
const Footer: React.FC = () => {
  const currentTheme = useTheme();
  const currentYear = useMemo(() => getCurrentYear(), []);

  return (
    <Box
      component="footer"
      role="contentinfo"
      aria-label="Site footer"
      sx={{
        width: '100%',
        borderTop: `1px solid ${currentTheme.palette.divider}`,
        backgroundColor: currentTheme.palette.background.paper,
        marginTop: 'auto',
        padding: {
          xs: theme.spacing(2),
          sm: theme.spacing(2, 3),
          md: theme.spacing(2, 4)
        }
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'center', sm: 'flex-start' },
          gap: theme.spacing(2),
          maxWidth: '1200px',
          margin: '0 auto',
          width: '100%'
        }}
      >
        {/* Copyright Section */}
        <Typography
          variant="body2"
          color="text.secondary"
          align={window.innerWidth < 600 ? 'center' : 'left'}
        >
          © {currentYear} {APP_NAME}. All rights reserved.
        </Typography>

        {/* Footer Navigation */}
        <Box
          component="nav"
          role="navigation"
          aria-label="Footer navigation"
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: 'center',
            gap: { xs: theme.spacing(1), sm: theme.spacing(3) }
          }}
        >
          <Link
            href="/privacy"
            color="text.secondary"
            underline="hover"
            sx={{ 
              '&:focus-visible': {
                outline: `2px solid ${currentTheme.palette.primary.main}`,
                outlineOffset: '2px'
              }
            }}
          >
            Privacy Policy
          </Link>
          <Link
            href="/terms"
            color="text.secondary"
            underline="hover"
            sx={{ 
              '&:focus-visible': {
                outline: `2px solid ${currentTheme.palette.primary.main}`,
                outlineOffset: '2px'
              }
            }}
          >
            Terms of Service
          </Link>
          <Link
            href="/contact"
            color="text.secondary"
            underline="hover"
            sx={{ 
              '&:focus-visible': {
                outline: `2px solid ${currentTheme.palette.primary.main}`,
                outlineOffset: '2px'
              }
            }}
          >
            Contact Us
          </Link>
        </Box>
      </Box>
    </Box>
  );
};

export default Footer;