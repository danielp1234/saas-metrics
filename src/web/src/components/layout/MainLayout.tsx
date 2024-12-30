import React, { Suspense } from 'react';
import { Box, Container } from '@mui/material'; // @version ^5.0.0
import { useTheme, styled } from '@mui/material/styles'; // @version ^5.0.0
import { Header } from './Header';
import { Footer } from './Footer';
import { Notification } from '../common/Notification';
import { ErrorBoundary } from '../common/ErrorBoundary';

/**
 * Props interface for MainLayout component
 */
export interface MainLayoutProps {
  /** Child components to render in the main content area */
  children: React.ReactNode;
  /** Flag to control visibility of notification component */
  showNotifications?: boolean;
}

/**
 * Styled Box component for the root layout container
 * Implements a flex column layout with full viewport height
 */
const StyledBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  minHeight: '100vh',
  backgroundColor: theme.palette.background.default,
  position: 'relative',
}));

/**
 * Styled Box component for the main content area
 * Implements responsive padding and proper semantic structure
 */
const StyledMain = styled(Box)(({ theme }) => ({
  flexGrow: 1,
  padding: theme.spacing(2),
  width: '100%',
  maxWidth: '100%',
  boxSizing: 'border-box',
  outline: 'none',
  [theme.breakpoints.up('sm')]: {
    padding: theme.spacing(3),
  },
  [theme.breakpoints.up('md')]: {
    padding: theme.spacing(4),
  },
}));

/**
 * Styled Container component for content width constraints
 * Implements responsive max-width based on breakpoints
 */
const StyledContainer = styled(Container)(({ theme }) => ({
  maxWidth: {
    xs: '100%',
    sm: '600px',
    md: '960px',
    lg: '1280px',
    xl: '1920px',
  }[theme.breakpoints.values],
  margin: '0 auto',
}));

/**
 * MainLayout component implementing F-pattern layout with responsive design
 * and accessibility features. Provides the base structure for all public pages.
 *
 * @param {MainLayoutProps} props - Component props
 * @returns {JSX.Element} Rendered layout component with proper semantic structure
 */
const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  showNotifications = true,
}) => {
  const theme = useTheme();

  return (
    <ErrorBoundary>
      <StyledBox>
        {/* Header with banner role for accessibility */}
        <Header role="banner" />

        {/* Main content area with proper semantic structure */}
        <StyledMain
          component="main"
          role="main"
          tabIndex={-1}
          id="main-content"
          aria-label="Main content"
        >
          <StyledContainer>
            <Suspense
              fallback={
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: '200px',
                  }}
                >
                  {/* Add your loading spinner component here */}
                </Box>
              }
            >
              {children}
            </Suspense>
          </StyledContainer>
        </StyledMain>

        {/* Footer with contentinfo role for accessibility */}
        <Footer role="contentinfo" />

        {/* Global notification system */}
        {showNotifications && <Notification />}
      </StyledBox>
    </ErrorBoundary>
  );
};

// Set display name for debugging purposes
MainLayout.displayName = 'MainLayout';

export default MainLayout;