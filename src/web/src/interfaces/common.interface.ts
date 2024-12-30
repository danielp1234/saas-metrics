// @version react@18.2.x
import { ReactNode } from 'react';

/**
 * Base interface providing common props for all components with Material-UI compatibility.
 * Ensures consistent prop typing across the application components.
 */
export interface BaseProps {
  /** Optional CSS class name for component styling */
  className?: string;
  /** Optional React children elements */
  children?: ReactNode;
}

/**
 * Interface for standardized pagination parameters across data tables and lists.
 * Used for consistent pagination implementation throughout the application.
 */
export interface PaginationParams {
  /** Current page number (1-based indexing) */
  page: number;
  /** Number of items per page */
  limit: number;
  /** Total number of items available */
  total: number;
}

/**
 * Type defining possible component loading states for consistent state management.
 * Used to track and display component loading status across the application.
 */
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

/**
 * Type defining available application theme variants.
 * Currently supports light theme only as per Phase 1 requirements.
 * @see Technical Specification 3.1.1 Design Specifications
 */
export type Theme = 'light';