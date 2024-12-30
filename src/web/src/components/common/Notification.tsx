// @version react@18.2.x
// @version @mui/material@5.x

import React, { useCallback, useEffect } from 'react';
import { Alert, AlertProps, Snackbar, SnackbarProps } from '@mui/material';
import { useNotification } from '../../hooks/useNotification';

/**
 * Props interface for the Notification component
 * Allows for custom styling through className prop
 */
export interface NotificationProps {
  /** Optional CSS class name for custom styling */
  className?: string;
}

/**
 * Configuration for notification display position and animation
 * Follows Material Design guidelines for optimal user experience
 */
const SNACKBAR_CONFIG: Partial<SnackbarProps> = {
  anchorOrigin: {
    vertical: 'top',
    horizontal: 'right',
  },
  autoHideDuration: 5000,
};

/**
 * Alert severity to ARIA role mapping for accessibility
 * Ensures proper screen reader announcements based on notification type
 */
const SEVERITY_TO_ROLE: Record<AlertProps['severity'], 'alert' | 'status'> = {
  error: 'alert',
  warning: 'alert',
  info: 'status',
  success: 'status',
};

/**
 * A reusable notification component that displays alerts and messages
 * with different severity levels using Material-UI's Alert component.
 * Implements auto-dismiss functionality and enhanced accessibility features.
 * 
 * @param {NotificationProps} props - Component props
 * @returns {JSX.Element} Rendered notification component
 */
const Notification: React.FC<NotificationProps> = React.memo(({ className }) => {
  const { notification, hideNotification } = useNotification();

  /**
   * Effect to handle cleanup of notification timers
   * Prevents memory leaks and ensures proper component cleanup
   */
  useEffect(() => {
    return () => {
      if (notification?.autoHideTimer) {
        window.clearTimeout(notification.autoHideTimer);
      }
    };
  }, [notification]);

  /**
   * Handler for closing the notification
   * Implements proper cleanup and state management
   * 
   * @param {React.SyntheticEvent | Event} event - The event triggering the close
   * @param {string} reason - The reason for closing
   */
  const handleClose = useCallback((
    event: React.SyntheticEvent | Event,
    reason?: string
  ) => {
    if (reason === 'clickaway') {
      return;
    }

    if (notification?.autoHideTimer) {
      window.clearTimeout(notification.autoHideTimer);
    }

    hideNotification();
  }, [hideNotification, notification]);

  /**
   * Handler for keyboard events to support accessibility
   * Allows closing notification with Escape key
   * 
   * @param {React.KeyboardEvent} event - Keyboard event
   */
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      handleClose(event);
    }
  }, [handleClose]);

  if (!notification) {
    return null;
  }

  return (
    <Snackbar
      {...SNACKBAR_CONFIG}
      open={notification.isVisible}
      onClose={handleClose}
      className={className}
      TransitionProps={{
        onExited: hideNotification,
      }}
      data-testid="notification-snackbar"
    >
      <Alert
        onClose={handleClose}
        severity={notification.type}
        variant="filled"
        elevation={6}
        onKeyDown={handleKeyDown}
        role={SEVERITY_TO_ROLE[notification.type]}
        aria-live={notification.ariaLive}
        sx={{ width: '100%' }}
        data-testid="notification-alert"
      >
        {notification.message}
      </Alert>
    </Snackbar>
  );
});

// Display name for debugging and dev tools
Notification.displayName = 'Notification';

export default Notification;