import React, { useEffect, useState, useCallback } from 'react';
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  useMediaQuery,
  Menu,
  MenuItem,
  Fade,
  useTheme,
  Box,
  Divider
} from '@mui/material'; // @version ^5.0.0
import {
  Menu as MenuIcon,
  Person,
  ExitToApp,
  Security
} from '@mui/icons-material'; // @version ^5.0.0
import CustomButton from '../common/Button';
import { useAuth } from '../../hooks/useAuth';
import { UserRole } from '../../interfaces/auth.interface';

/**
 * Interface for Header component props
 */
export interface HeaderProps {
  className?: string;
  securityLevel?: 'high' | 'medium' | 'low';
}

/**
 * Enhanced Header component with security features and responsive design
 * Implements role-based navigation and secure authentication controls
 */
const Header: React.FC<HeaderProps> = ({ className, securityLevel = 'high' }) => {
  // Theme and responsive breakpoints
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Authentication state and methods
  const {
    isAuthenticated,
    user,
    login,
    logout,
    hasRole,
    securityContext
  } = useAuth();

  // Mobile menu state
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState<null | HTMLElement>(null);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);

  /**
   * Session monitoring interval
   * Checks for security context updates and session validity
   */
  useEffect(() => {
    const sessionCheck = setInterval(() => {
      if (isAuthenticated && securityContext.lastActivity) {
        const inactiveTime = Date.now() - securityContext.lastActivity;
        if (inactiveTime > 30 * 60 * 1000) { // 30 minutes
          handleSecureLogout();
        }
      }
    }, 60000); // Check every minute

    return () => clearInterval(sessionCheck);
  }, [isAuthenticated, securityContext]);

  /**
   * Enhanced secure login handler
   */
  const handleSecureLogin = useCallback(async () => {
    try {
      await login();
    } catch (error) {
      console.error('Login failed:', error);
      // Additional security logging could be implemented here
    }
  }, [login]);

  /**
   * Enhanced secure logout handler
   */
  const handleSecureLogout = useCallback(async () => {
    try {
      await logout();
      setUserMenuAnchor(null);
      setMobileMenuAnchor(null);
    } catch (error) {
      console.error('Logout failed:', error);
      // Additional security logging could be implemented here
    }
  }, [logout]);

  /**
   * Mobile menu handlers
   */
  const handleMobileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMobileMenuAnchor(event.currentTarget);
  };

  const handleMobileMenuClose = () => {
    setMobileMenuAnchor(null);
  };

  /**
   * User menu handlers
   */
  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  /**
   * Renders navigation items based on user role
   */
  const renderNavItems = () => {
    const items = [
      <Typography
        key="metrics"
        variant="button"
        component="a"
        href="/metrics"
        sx={{ color: 'inherit', textDecoration: 'none', mx: 2 }}
      >
        Metrics Dashboard
      </Typography>
    ];

    // Add admin-only navigation items
    if (hasRole(UserRole.ADMIN)) {
      items.push(
        <Typography
          key="data-sources"
          variant="button"
          component="a"
          href="/admin/data-sources"
          sx={{ color: 'inherit', textDecoration: 'none', mx: 2 }}
        >
          Data Sources
        </Typography>
      );
    }

    // Add export option for all authenticated users
    if (isAuthenticated) {
      items.push(
        <Typography
          key="export"
          variant="button"
          component="a"
          href="/export"
          sx={{ color: 'inherit', textDecoration: 'none', mx: 2 }}
        >
          Export
        </Typography>
      );
    }

    return items;
  };

  return (
    <AppBar
      position="fixed"
      className={className}
      sx={{
        zIndex: theme.zIndex.drawer + 1,
        backgroundColor: theme.palette.primary.main,
      }}
    >
      <Toolbar>
        {/* Logo and Brand */}
        <Typography
          variant="h6"
          component="a"
          href="/"
          sx={{
            flexGrow: 0,
            color: 'inherit',
            textDecoration: 'none',
            mr: 2,
          }}
        >
          SaaS Metrics
        </Typography>

        {/* Mobile Menu Icon */}
        {isMobile && (
          <IconButton
            color="inherit"
            aria-label="open menu"
            edge="start"
            onClick={handleMobileMenuOpen}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
        )}

        {/* Desktop Navigation */}
        {!isMobile && (
          <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
            {renderNavItems()}
          </Box>
        )}

        {/* Authentication Actions */}
        <Box sx={{ flexGrow: 0 }}>
          {isAuthenticated ? (
            <>
              <IconButton
                color="inherit"
                onClick={handleUserMenuOpen}
                aria-label="user account"
                aria-controls="user-menu"
                aria-haspopup="true"
              >
                <Person />
                {securityLevel === 'high' && <Security fontSize="small" />}
              </IconButton>
              <Menu
                id="user-menu"
                anchorEl={userMenuAnchor}
                open={Boolean(userMenuAnchor)}
                onClose={handleUserMenuClose}
                TransitionComponent={Fade}
                keepMounted
              >
                <MenuItem disabled>
                  <Typography variant="body2">{user?.email}</Typography>
                </MenuItem>
                <Divider />
                {hasRole(UserRole.ADMIN) && (
                  <MenuItem
                    component="a"
                    href="/admin"
                    onClick={handleUserMenuClose}
                  >
                    Admin Panel
                  </MenuItem>
                )}
                <MenuItem onClick={handleSecureLogout}>
                  <ExitToApp sx={{ mr: 1 }} />
                  Logout
                </MenuItem>
              </Menu>
            </>
          ) : (
            <CustomButton
              onClick={handleSecureLogin}
              color="inherit"
              variant="outlined"
              size="small"
            >
              Login
            </CustomButton>
          )}
        </Box>

        {/* Mobile Navigation Menu */}
        <Menu
          id="mobile-menu"
          anchorEl={mobileMenuAnchor}
          open={Boolean(mobileMenuAnchor)}
          onClose={handleMobileMenuClose}
          TransitionComponent={Fade}
          keepMounted
        >
          {renderNavItems().map((item, index) => (
            <MenuItem key={index} onClick={handleMobileMenuClose}>
              {item}
            </MenuItem>
          ))}
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default Header;