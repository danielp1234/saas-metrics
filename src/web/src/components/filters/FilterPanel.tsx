// @version react@18.2.x
import React, { useCallback } from 'react';
import { Box, Stack } from '@mui/material'; // @version @mui/material@5.x

// Internal imports
import ARRFilter from './ARRFilter';
import MetricFilter from './MetricFilter';
import SourceFilter from './SourceFilter';
import { useMetrics } from '../../hooks/useMetrics';

/**
 * Props interface for the FilterPanel component
 * Includes accessibility and styling options
 */
export interface FilterPanelProps {
  /** Optional CSS class name for styling */
  className?: string;
  /** Disable all filters */
  disabled?: boolean;
  /** Accessibility label */
  'aria-label'?: string;
  /** Test ID for component testing */
  'data-testid'?: string;
}

/**
 * FilterPanel Component
 * 
 * A unified panel containing all filter controls (ARR, Metric Category, and Data Source)
 * for filtering SaaS metrics data. Implements Material-UI components with accessibility
 * support, responsive design, and centralized state management.
 * 
 * @param props - Component props of type FilterPanelProps
 * @returns Rendered filter panel with all filter components
 */
const FilterPanel = React.memo<FilterPanelProps>(({
  className,
  disabled = false,
  'aria-label': ariaLabel = 'Metrics filter controls',
  'data-testid': dataTestId = 'metrics-filter-panel'
}) => {
  // Get metrics context including filters and loading state
  const { filters, setFilters, isLoading } = useMetrics();

  /**
   * Memoized handler for ARR range selection changes
   */
  const handleARRChange = useCallback((range: string | undefined) => {
    setFilters({
      ...filters,
      arrRange: range
    });
  }, [filters, setFilters]);

  /**
   * Memoized handler for metric category selection changes
   */
  const handleMetricChange = useCallback((category: string | undefined) => {
    setFilters({
      ...filters,
      category: category as any // Type assertion as category is validated in MetricFilter
    });
  }, [filters, setFilters]);

  /**
   * Memoized handler for data source selection changes
   */
  const handleSourceChange = useCallback((source: string | undefined) => {
    setFilters({
      ...filters,
      source
    });
  }, [filters, setFilters]);

  /**
   * Memoized handler for filter errors
   */
  const handleFilterError = useCallback((error: Error) => {
    console.error('Filter error:', error);
    // Additional error handling could be implemented here
  }, []);

  return (
    <Box
      className={className}
      role="region"
      aria-label={ariaLabel}
      data-testid={dataTestId}
    >
      <Stack spacing={2}>
        {/* ARR Range Filter */}
        <ARRFilter
          value={filters.arrRange}
          onChange={handleARRChange}
          disabled={disabled || isLoading}
          aria-label="Filter by ARR range"
          data-testid="arr-range-filter"
        />

        {/* Metric Category Filter */}
        <MetricFilter
          className="metric-filter"
          disabled={disabled || isLoading}
          aria-label="Filter by metric category"
          data-testid="metric-category-filter"
        />

        {/* Data Source Filter */}
        <SourceFilter
          className="source-filter"
          disabled={disabled || isLoading}
          onError={handleFilterError}
          aria-label="Filter by data source"
          data-testid="data-source-filter"
        />
      </Stack>
    </Box>
  );
});

// Display name for debugging
FilterPanel.displayName = 'FilterPanel';

export default FilterPanel;