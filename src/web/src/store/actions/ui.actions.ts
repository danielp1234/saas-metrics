// @version @reduxjs/toolkit ^1.9.x
import { createAction, PayloadAction } from '@reduxjs/toolkit';
import { LoadingState } from '../../interfaces/common.interface';

/**
 * UI action type constants for Redux state management
 */
export const UI_ACTIONS = {
  SET_LOADING: 'ui/setLoading',
  SET_NOTIFICATION: 'ui/setNotification',
  SET_THEME_MODE: 'ui/setThemeMode',
  TOGGLE_FILTER_PANEL: 'ui/toggleFilterPanel',
  CLEAR_NOTIFICATION: 'ui/clearNotification',
} as const;

/**
 * Interface for loading state action payload with error handling
 */
export interface SetLoadingPayload {
  /** Identifier for the loading state */
  key: string;
  /** Current loading status */
  status: LoadingState['status'];
  /** Optional error message */
  error: string | null;
}

/**
 * Interface for notification action payload with enhanced message types
 */
export interface SetNotificationPayload {
  /** Visibility state of the notification */
  visible: boolean;
  /** Notification message content */
  message: string;
  /** Type of notification for styling and icon display */
  type: 'success' | 'error' | 'info' | 'warning';
  /** Duration in milliseconds before auto-hide (null for persistent) */
  duration: number | null;
  /** Whether the notification should auto-hide */
  autoHide: boolean;
}

/**
 * Action creator for setting loading state with error handling
 * @param payload Loading state information including key, status, and error
 */
export const setLoading = createAction<SetLoadingPayload>(
  UI_ACTIONS.SET_LOADING
);

/**
 * Action creator for setting notification state with auto-hide support
 * @param payload Notification configuration including message, type, and duration
 */
export const setNotification = createAction<SetNotificationPayload>(
  UI_ACTIONS.SET_NOTIFICATION
);

/**
 * Action creator for clearing current notification
 * Removes any active notification from the UI
 */
export const clearNotification = createAction(
  UI_ACTIONS.CLEAR_NOTIFICATION
);

/**
 * Action creator for toggling filter panel visibility
 * Handles responsive behavior for filter panel display
 */
export const toggleFilterPanel = createAction(
  UI_ACTIONS.TOGGLE_FILTER_PANEL
);

/**
 * Action creator for setting theme mode
 * @param payload Theme mode ('light' in Phase 1)
 */
export const setThemeMode = createAction<'light'>(
  UI_ACTIONS.SET_THEME_MODE
);

// Type exports for action creators
export type SetLoadingAction = ReturnType<typeof setLoading>;
export type SetNotificationAction = ReturnType<typeof setNotification>;
export type ClearNotificationAction = ReturnType<typeof clearNotification>;
export type ToggleFilterPanelAction = ReturnType<typeof toggleFilterPanel>;
export type SetThemeModeAction = ReturnType<typeof setThemeMode>;