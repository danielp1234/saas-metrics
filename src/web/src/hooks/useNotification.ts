// @version react-redux@8.1.x
// @version react@18.2.x

import { useDispatch, useSelector } from 'react-redux';
import { useRef, useEffect } from 'react';
import { setNotification } from '../store/actions/ui.actions';

/**
 * Constants for notification duration constraints
 * These values ensure consistent and user-friendly notification display times
 */
const DEFAULT_NOTIFICATION_DURATION = 5000; // 5 seconds
const MIN_NOTIFICATION_DURATION = 2000; // 2 seconds minimum
const MAX_NOTIFICATION_DURATION = 10000; // 10 seconds maximum

/**
 * Type definition for notification severity levels
 * Aligned with Material-UI alert severity types
 */
export type NotificationType = 'success' | 'error' | 'info';

/**
 * Interface defining the structure of notification state
 * Includes enhanced tracking and accessibility features
 */
export interface NotificationState {
  message: string;
  type: NotificationType;
  duration: number;
  isVisible: boolean;
  autoHideTimer: number | null;
  ariaLive: 'polite' | 'assertive';
}

/**
 * Interface defining the return type of the useNotification hook
 * Provides comprehensive notification management functionality
 */
export interface UseNotificationReturn {
  notification: NotificationState | null;
  showNotification: (message: string, type: NotificationType, duration?: number) => void;
  hideNotification: () => void;
  updateNotification: (updates: Partial<NotificationState>) => void;
}

/**
 * Custom hook for managing application notifications with enhanced features
 * Implements Material-UI notifications with accessibility support and proper cleanup
 * 
 * @returns {UseNotificationReturn} Object containing notification state and control functions
 */
export const useNotification = (): UseNotificationReturn => {
  const dispatch = useDispatch();
  const notification = useSelector((state: any) => state.ui.notification);
  const timerRef = useRef<number | null>(null);

  /**
   * Cleanup effect to clear any existing timers when the component unmounts
   * Prevents memory leaks and ensures proper cleanup
   */
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  /**
   * Shows a notification with the specified parameters
   * Implements validation and proper timer management
   * 
   * @param {string} message - The notification message to display
   * @param {NotificationType} type - The type/severity of the notification
   * @param {number} [duration] - Optional duration in milliseconds
   */
  const showNotification = (
    message: string,
    type: NotificationType,
    duration: number = DEFAULT_NOTIFICATION_DURATION
  ): void => {
    // Input validation
    if (!message.trim()) {
      console.warn('Notification message cannot be empty');
      return;
    }

    // Validate and constrain duration
    const validDuration = Math.min(
      Math.max(duration, MIN_NOTIFICATION_DURATION),
      MAX_NOTIFICATION_DURATION
    );

    // Clear any existing timer
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // Set appropriate ARIA live region based on notification type
    const ariaLive = type === 'error' ? 'assertive' : 'polite';

    // Dispatch notification action
    dispatch(setNotification({
      message,
      type,
      duration: validDuration,
      isVisible: true,
      autoHideTimer: null,
      ariaLive
    }));

    // Set auto-dismiss timer
    timerRef.current = window.setTimeout(() => {
      hideNotification();
    }, validDuration);
  };

  /**
   * Hides the current notification and performs cleanup
   * Ensures proper state reset and timer cleanup
   */
  const hideNotification = (): void => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    dispatch(setNotification(null));
  };

  /**
   * Updates an existing notification with new properties
   * Maintains timer management when duration is updated
   * 
   * @param {Partial<NotificationState>} updates - Partial notification state updates
   */
  const updateNotification = (updates: Partial<NotificationState>): void => {
    if (!notification) {
      console.warn('Cannot update notification: no active notification');
      return;
    }

    const updatedNotification = {
      ...notification,
      ...updates
    };

    // Handle duration updates
    if (updates.duration && updates.duration !== notification.duration) {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = window.setTimeout(() => {
          hideNotification();
        }, updates.duration);
      }
    }

    dispatch(setNotification(updatedNotification));
  };

  return {
    notification,
    showNotification,
    hideNotification,
    updateNotification
  };
};