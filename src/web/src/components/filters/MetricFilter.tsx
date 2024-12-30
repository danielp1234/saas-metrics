// @version react@18.2.x
import React, { useCallback, useMemo } from 'react';

// Internal imports
import Dropdown from '../common/Dropdown';
import { MetricCategory } from '../../interfaces/metrics.interface';
import { useMetrics } from '../../hooks/useMetrics';

/**
 * Props interface for the MetricFilter component
 */
export interface MetricFilterProps {
  /** Optional CSS class name for styling */
  className?: string;
}

/**
 * A memoized component that provides a dropdown filter for selecting SaaS metrics by category.
 * Implements performance optimization through memoization and includes comprehensive error handling.
 * 
 * @param props - Component props
 * @returns Rendered metric filter dropdown with accessibility support
 */
const MetricFilter = React.memo<MetricFilterProps>(({ className }) => {
  // Get filters and setFilters from metrics hook
  const { filters, setFilters } = useMetrics();

  /**
   * Memoized options array for metric categories
   * Transforms enum values into dropdown options
   */
  const categoryOptions = useMemo(() => {
    return Object.values(MetricCategory).map(category => ({
      value: category,
      label: category.charAt(0) + category.slice(1).toLowerCase().replace('_', ' ')
    }));
  }, []);

  /**
   * Memoized handler for category selection changes
   * Includes validation and error handling
   */
  const handleCategoryChange = useCallback((value: string | number | string[]) => {
    try {
      // Validate that value is a valid MetricCategory
      if (typeof value === 'string' && Object.values(MetricCategory).includes(value as MetricCategory)) {
        // Update filters while preserving other filter values
        setFilters({
          ...filters,
          category: value as MetricCategory
        });
      } else {
        console.error('Invalid metric category selected:', value);
      }
    } catch (error) {
      console.error('Error handling category change:', error);
    }
  }, [filters, setFilters]);

  return (
    <Dropdown
      className={className}
      label="Metric Category"
      value={filters.category || ''}
      options={categoryOptions}
      onChange={handleCategoryChange}
      required={false}
      fullWidth={true}
      aria-label="Filter metrics by category"
      aria-controls="metrics-grid"
      data-testid="metric-category-filter"
    />
  );
});

// Display name for debugging purposes
MetricFilter.displayName = 'MetricFilter';

export default MetricFilter;