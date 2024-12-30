import React, { useCallback, useMemo } from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  useTheme,
  useMediaQuery,
  SwipeableDrawer,
  Divider,
  Tooltip,
  Box,
  styled
} from '@mui/material'; // v5.0.0
import {
  Dashboard,
  Assessment,
  Settings,
  Source,
  CloudUpload,
  ChevronLeft,
  Security
} from '@mui/icons-material'; // v5.0.0
import { useLocation, useNavigate } from 'react-router-dom'; // v6.0.0
import { useAuth } from '../../hooks/useAuth';
import routes from '../../config/routes.config';

// Enhanced props interface with security context
interface SidebarProps {
  open: boolean;
  onClose: () => void;
  drawerWidth?: number;
}

// Styled components for enhanced UI
const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar,
  justifyContent: 'flex-end',
}));

// Navigation items with security metadata
const navigationItems = [
  {
    path: '/metrics',
    label: 'Metrics Dashboard',
    icon: <Dashboard />,
    requiresAuth: false,
    requiredRoles: ['PUBLIC'],
    auditLevel: 'INFO'
  },
  {
    path: '/metrics/analysis',
    label: 'Analysis',
    icon: <Assessment />,
    requiresAuth: false,
    requiredRoles: ['PUBLIC'],
    auditLevel: 'INFO'
  },
  {
    path: '/admin',
    label: 'Admin Dashboard',
    icon: <Security />,
    requiresAuth: true,
    requiredRoles: ['ADMIN', 'SUPER_ADMIN'],
    auditLevel: 'WARN'
  },
  {
    path: '/admin/data',
    label: 'Data Management',
    icon: <CloudUpload />,
    requiresAuth: true,
    requiredRoles: ['ADMIN', 'SUPER_ADMIN'],
    auditLevel: 'WARN'
  },
  {
    path: '/admin/sources',
    label: 'Data Sources',
    icon: <Source />,
    requiresAuth: true,
    requiredRoles: ['ADMIN', 'SUPER_ADMIN'],
    auditLevel: 'WARN'
  },
  {
    path: '/admin/settings',
    label: 'Settings',
    icon: <Settings />,
    requiresAuth: true,
    requiredRoles: ['SUPER_ADMIN'],
    auditLevel: 'WARN'
  }
];

/**
 * Enhanced Sidebar component with security controls and audit logging
 */
const Sidebar: React.FC<SidebarProps> = ({ 
  open, 
  onClose, 
  drawerWidth = 280 
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, hasRole, logNavigationEvent } = useAuth();

  // Filter navigation items based on authentication and roles
  const filteredNavItems = useMemo(() => {
    return navigationItems.filter(item => {
      if (item.requiresAuth && !isAuthenticated) return false;
      return item.requiredRoles.some(role => hasRole(role));
    });
  }, [isAuthenticated, hasRole]);

  // Enhanced navigation handler with security logging
  const handleNavigation = useCallback((path: string, item: typeof navigationItems[0]) => {
    // Security audit logging
    logNavigationEvent({
      path,
      timestamp: new Date().toISOString(),
      auditLevel: item.auditLevel,
      requiresAuth: item.requiresAuth,
      roles: item.requiredRoles
    });

    navigate(path);
    if (isMobile) {
      onClose();
    }
  }, [navigate, onClose, isMobile, logNavigationEvent]);

  // Render appropriate drawer based on device
  const drawerContent = (
    <>
      <DrawerHeader>
        <IconButton onClick={onClose}>
          <ChevronLeft />
        </IconButton>
      </DrawerHeader>
      <Divider />
      <List>
        {filteredNavItems.map((item) => (
          <Tooltip
            key={item.path}
            title={item.requiresAuth ? 'Requires Authentication' : ''}
            placement="right"
          >
            <ListItem
              button
              selected={location.pathname === item.path}
              onClick={() => handleNavigation(item.path, item)}
              sx={{
                '&.Mui-selected': {
                  backgroundColor: theme.palette.action.selected,
                  '&:hover': {
                    backgroundColor: theme.palette.action.hover,
                  },
                },
              }}
            >
              <ListItemIcon
                sx={{
                  color: location.pathname === item.path 
                    ? theme.palette.primary.main 
                    : 'inherit'
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.label}
                sx={{
                  color: location.pathname === item.path 
                    ? theme.palette.primary.main 
                    : 'inherit'
                }}
              />
            </ListItem>
          </Tooltip>
        ))}
      </List>
    </>
  );

  // Render mobile or desktop drawer
  return isMobile ? (
    <SwipeableDrawer
      anchor="left"
      open={open}
      onClose={onClose}
      onOpen={() => {}}
      swipeAreaWidth={30}
      disableBackdropTransition={!theme.palette.mode.includes('ios')}
      disableDiscovery={theme.palette.mode.includes('ios')}
      sx={{
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
        },
      }}
    >
      {drawerContent}
    </SwipeableDrawer>
  ) : (
    <Drawer
      variant="persistent"
      anchor="left"
      open={open}
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
};

export default Sidebar;