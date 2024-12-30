// @version react@18.2.x
import React, { useCallback, useMemo } from 'react';

// Internal imports
import Dropdown, { DropdownProps } from '../common/Dropdown';
import { useMetrics } from '../../hooks/useMetrics';
import { MetricFilters } from '../../interfaces/metrics.interface';

/**
 * Interface for source filter options
 */
interface SourceOption {
  value: string;
  label: string;
  description?: string;
}

/**
 * Props interface for the SourceFilter component
 */
interface SourceFilterProps {
  /** Optional CSS class name */
  className?: string;
  /** Disable the filter */
  disabled?: boolean;
  /** Accessibility label */
  ariaLabel?: string;
  /** Error callback handler */
  onError?: (error: Error) => void;
}

/**
 * Available data source options
 * Memoized to prevent unnecessary re-renders
 */
const SOURCE_OPTIONS: SourceOption[] = [
  { value: 'source1', label: 'Source 1', description: 'Primary data source' },
  { value: 'source2', label: 'Source 2', description: 'Secondary data source' },
  { value: 'source3', label: 'Source 3', description: 'Tertiary data source' }
] as const;

/**
 * Default ARIA label for accessibility
 */
const DEFAULT_ARIA_LABEL = 'Filter metrics by data source';

/**
 * Error messages for source filter operations
 */
const ERROR_MESSAGES = {
  INVALID_SOURCE: 'Invalid source selection',
  LOADING_ERROR: 'Error loading sources'
} as const;

/**
 * SourceFilter Component
 * 
 * A React component that provides an accessible dropdown filter for selecting data sources
 * in the SaaS metrics platform. Implements caching, validation, and error handling while
 * integrating with the metrics filtering system.
 * 
 * @param props - Component props
 * @returns Rendered source filter component
 */
const SourceFilter = React.memo<SourceFilterProps>(({
  className,
  disabled = false,
  ariaLabel = DEFAULT_ARIA_LABEL,
  onError
}) => {
  // Get metrics context including filters and loading state
  const { filters, setFilters, isLoading } = useMetrics();

  /**
   * Memoized dropdown options to prevent unnecessary re-renders
   */
  const dropdownOptions = useMemo(() => SOURCE_OPTIONS.map(option => ({
    value: option.value,
    label: option.label
  })), []);

  /**
   * Validates source selection against available options
   * @param source - Selected source value
   * @returns boolean indicating validity
   */
  const validateSource = useCallback((source: string): boolean => {
    return SOURCE_OPTIONS.some(option => option.value === source);
  }, []);

  /**
   * Handles source selection changes with validation
   */
  const handleSourceChange = useCallback((source: string | number | string[]) => {
    try {
      // Handle source deselection
      if (!source) {
        setFilters({ ...filters, source: undefined });
        return;
      }

      // Validate source selection
      const sourceValue = String(source);
      if (!validateSource(sourceValue)) {
        throw new Error(ERROR_MESSAGES.INVALID_SOURCE);
      }

      // Update filters with new source
      setFilters({
        ...filters,
        source: sourceValue
      });
    } catch (error) {
      console.error('Source filter error:', error);
      onError?.(error as Error);
    }
  }, [filters, setFilters, validateSource, onError]);

  /**
   * Dropdown props configuration
   */
  const dropdownProps: DropdownProps = {
    label: 'Data Source',
    value: filters.source || '',
    options: dropdownOptions,
    onChange: handleSourceChange,
    disabled: disabled || isLoading,
    required: false,
    fullWidth: true,
    className
  };

  return (
    <Dropdown
      {...dropdownProps}
      aria-label={ariaLabel}
      aria-busy={isLoading}
      aria-disabled={disabled}
    />
  );
});

// Display name for debugging
SourceFilter.displayName = 'SourceFilter';

export default SourceFilter;