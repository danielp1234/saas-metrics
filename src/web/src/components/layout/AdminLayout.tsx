import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  useTheme, 
  useMediaQuery, 
  styled,
  CircularProgress,
  Container,
  Alert
} from '@mui/material'; // @version ^5.0.0
import { Navigate, useLocation } from 'react-router-dom'; // @version ^6.0.0
import Header from './Header';
import Sidebar from './Sidebar';
import { useAuth } from '../../hooks/useAuth';

/**
 * Props interface for AdminLayout component
 */
export interface AdminLayoutProps {
  children: React.ReactNode;
}

/**
 * Styled components for enhanced layout management
 */
const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' })<{
  open?: boolean;
  drawerWidth?: number;
}>(({ theme, open, drawerWidth = 280 }) => ({
  flexGrow: 1,
  padding: theme.spacing(3),
  transition: theme.transitions.create('margin', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  marginLeft: `-${drawerWidth}px`,
  ...(open && {
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
    marginLeft: 0,
  }),
}));

/**
 * Enhanced AdminLayout component with security features and responsive design
 * Implements role-based access control and audit logging
 */
const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  // Theme and responsive setup
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const location = useLocation();
  
  // Authentication and security
  const { 
    isAuthenticated, 
    hasRole, 
    logAdminAccess,
    user,
    isLoading 
  } = useAuth();

  // Sidebar state management
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [error, setError] = useState<string | null>(null);

  /**
   * Enhanced sidebar toggle with touch support
   */
  const handleSidebarToggle = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  /**
   * Security audit logging for admin access
   */
  useEffect(() => {
    if (isAuthenticated && user) {
      logAdminAccess({
        userId: user.id,
        path: location.pathname,
        timestamp: new Date().toISOString(),
        action: 'ADMIN_ACCESS',
        details: {
          route: location.pathname,
          method: 'GET',
          userAgent: navigator.userAgent
        }
      });
    }
  }, [isAuthenticated, user, location.pathname, logAdminAccess]);

  /**
   * Mobile sidebar auto-close
   */
  useEffect(() => {
    if (isMobile && sidebarOpen) {
      setSidebarOpen(false);
    }
  }, [isMobile]);

  // Loading state
  if (isLoading) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh' 
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Authentication check
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role-based access control
  if (!hasRole('ADMIN')) {
    return <Navigate to="/unauthorized" replace />;
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Enhanced Header with security features */}
      <Header 
        securityLevel="high"
      />

      {/* Responsive Sidebar with role-based navigation */}
      <Sidebar
        open={sidebarOpen}
        onClose={handleSidebarToggle}
        drawerWidth={280}
      />

      {/* Main content area with responsive padding */}
      <Main
        open={sidebarOpen}
        drawerWidth={280}
        sx={{
          backgroundColor: theme.palette.background.default,
          pt: { xs: 8, sm: 9 },
          pb: { xs: 8, sm: 9 },
          px: { xs: 2, sm: 3 },
          width: '100%',
          minHeight: '100vh',
          position: 'relative'
        }}
      >
        {/* Error handling */}
        {error && (
          <Alert 
            severity="error" 
            onClose={() => setError(null)}
            sx={{ mb: 2 }}
          >
            {error}
          </Alert>
        )}

        {/* Content container with max width */}
        <Container maxWidth="xl">
          {children}
        </Container>
      </Main>
    </Box>
  );
};

export default AdminLayout;