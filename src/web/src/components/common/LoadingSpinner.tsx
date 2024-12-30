// @mui/material version: ^5.0.0
// react version: 18.2.x

import React from 'react';
import { CircularProgress, Box } from '@mui/material';
import { styled } from '@mui/material/styles';

// Interface for component props with comprehensive customization options
interface LoadingSpinnerProps {
  /**
   * Size of the spinner in pixels
   * @default 40
   */
  size?: number;
  
  /**
   * Theme-based color for the spinner
   * @default 'primary'
   */
  color?: 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
  
  /**
   * Centers the spinner in the viewport
   * @default false
   */
  fullScreen?: boolean;
  
  /**
   * Thickness of the circular progress
   * @default 3.6
   */
  thickness?: number;
  
  /**
   * Custom aria-label for screen readers
   * @default 'Loading content'
   */
  ariaLabel?: string;
}

// Styled container component with responsive centering
const SpinnerContainer = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'fullScreen',
})<{ fullScreen?: boolean }>(({ theme, fullScreen }) => ({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  width: '100%',
  padding: theme.spacing(2),
  minHeight: fullScreen ? '100vh' : 'auto',
  position: fullScreen ? 'fixed' : 'relative',
  top: fullScreen ? 0 : 'auto',
  left: fullScreen ? 0 : 'auto',
  right: fullScreen ? 0 : 'auto',
  bottom: fullScreen ? 0 : 'auto',
  backgroundColor: fullScreen ? 'rgba(255, 255, 255, 0.9)' : 'transparent',
  zIndex: fullScreen ? theme.zIndex.modal : 1,
  
  // Ensure proper spacing in different containers
  '& > *': {
    margin: theme.spacing(1),
  },
  
  // Responsive behavior
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(1),
  },
}));

/**
 * A reusable loading spinner component with enhanced accessibility
 * and customization options.
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 40,
  color = 'primary',
  fullScreen = false,
  thickness = 3.6,
  ariaLabel = 'Loading content',
}) => {
  // Check for reduced motion preference
  const prefersReducedMotion = window.matchMedia?.(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  return (
    <SpinnerContainer fullScreen={fullScreen}>
      <CircularProgress
        size={size}
        color={color}
        thickness={thickness}
        // Slower animation for reduced motion preference
        disableShrink={prefersReducedMotion}
        // Accessibility attributes
        role="progressbar"
        aria-label={ariaLabel}
        aria-busy="true"
        // Ensure proper tab focus management
        tabIndex={-1}
        sx={{
          // Respect user's animation preferences
          animation: prefersReducedMotion ? 'none' : undefined,
        }}
      />
    </SpinnerContainer>
  );
};

// Export the props interface for type safety
export type { LoadingSpinnerProps };