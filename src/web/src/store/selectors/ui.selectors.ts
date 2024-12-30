// @version @reduxjs/toolkit ^1.9.x

import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { LoadingState } from '../../interfaces/common.interface';

/**
 * Base selector for accessing UI state slice
 */
const selectUI = (state: RootState) => state.ui;

/**
 * Memoized selector for retrieving loading state for a specific key with error handling
 * @param state - Root Redux state
 * @param key - Loading state identifier
 * @returns Loading state containing loading boolean and optional error message
 */
export const selectLoadingState = createSelector(
  [selectUI, (_state: RootState, key: string) => key],
  (ui, key): LoadingState & { error: string | null } => {
    const loadingState = ui.loadingStates[key];
    return {
      status: loadingState?.status || 'idle',
      error: loadingState?.errorMessage || null
    };
  }
);

/**
 * Memoized selector for retrieving current theme mode
 * Restricted to light mode only in Phase 1 as per requirements
 * @param state - Root Redux state
 * @returns Current theme mode (light only)
 */
export const selectThemeMode = createSelector(
  [selectUI],
  (ui): 'light' => {
    // Enforce light mode restriction as per technical requirements
    return 'light';
  }
);

/**
 * Memoized selector for retrieving filter panel visibility state
 * Considers responsive behavior based on screen width
 * @param state - Root Redux state
 * @returns Current filter panel visibility state
 */
export const selectFilterPanelVisible = createSelector(
  [selectUI],
  (ui): boolean => {
    return ui.isFilterPanelOpen && ui.isFilterPanelResponsive;
  }
);

/**
 * Memoized selector for retrieving notification state
 * @param state - Root Redux state
 * @returns Current notification configuration
 */
export const selectNotification = createSelector(
  [selectUI],
  (ui) => ({
    visible: ui.notification.visible,
    message: ui.notification.message,
    type: ui.notification.type,
    duration: ui.notification.duration,
    autoHide: ui.notification.autoHide
  })
);

/**
 * Memoized selector for retrieving complete filter panel state
 * @param state - Root Redux state
 * @returns Filter panel state including visibility and responsive behavior
 */
export const selectFilterPanelState = createSelector(
  [selectUI],
  (ui) => ({
    isOpen: ui.isFilterPanelOpen,
    isResponsive: ui.isFilterPanelResponsive
  })
);