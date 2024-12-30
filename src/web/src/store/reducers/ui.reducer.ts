// @version @reduxjs/toolkit@1.9.x
import { createReducer, PayloadAction } from '@reduxjs/toolkit';
import { LoadingState, Theme } from '../../interfaces/common.interface';
import { UI_ACTION_TYPES } from '../actions/ui.actions';

/**
 * Interface defining the notification payload structure with strict typing
 */
export interface NotificationPayload {
  readonly message: string;
  readonly type: 'success' | 'error' | 'info' | 'warning';
  readonly duration?: number;
}

/**
 * Interface defining the UI state shape with strict typing and immutability
 */
export interface UIState {
  readonly loadingState: LoadingState;
  readonly notification: NotificationPayload | null;
  readonly isFilterPanelOpen: boolean;
  readonly theme: Theme;
}

/**
 * Initial UI state with default values
 * Theme is set to light mode as per Phase 1 requirements
 * @see Technical Specification 3.1.1 Design Specifications
 */
const initialState: UIState = {
  loadingState: 'idle',
  notification: null,
  isFilterPanelOpen: false,
  theme: 'light'
};

/**
 * Type-safe Redux reducer for managing UI state
 * Implements strict validation and immutability checks
 */
export const uiReducer = createReducer(initialState, (builder) => {
  builder
    .addCase(
      UI_ACTION_TYPES.SET_LOADING_STATE,
      (state, action: PayloadAction<LoadingState>) => {
        // Validate loading state value
        if (!['idle', 'loading', 'success', 'error'].includes(action.payload)) {
          console.error('Invalid loading state:', action.payload);
          return state;
        }
        state.loadingState = action.payload;
      }
    )
    .addCase(
      UI_ACTION_TYPES.SET_NOTIFICATION,
      (state, action: PayloadAction<NotificationPayload | null>) => {
        // Validate notification payload structure
        if (action.payload !== null) {
          const { message, type, duration } = action.payload;
          if (
            typeof message !== 'string' ||
            !['success', 'error', 'info', 'warning'].includes(type) ||
            (duration !== undefined && typeof duration !== 'number')
          ) {
            console.error('Invalid notification payload:', action.payload);
            return state;
          }
        }
        state.notification = action.payload;
      }
    )
    .addCase(UI_ACTION_TYPES.TOGGLE_FILTER_PANEL, (state) => {
      state.isFilterPanelOpen = !state.isFilterPanelOpen;
    })
    .addCase(
      UI_ACTION_TYPES.SET_THEME_MODE,
      (state, action: PayloadAction<Theme>) => {
        // Validate theme value (only 'light' supported in Phase 1)
        if (action.payload !== 'light') {
          console.error('Invalid theme mode:', action.payload);
          return state;
        }
        state.theme = action.payload;
      }
    );
});

export default uiReducer;