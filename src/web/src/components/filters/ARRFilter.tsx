// @version react@18.2.x
import React, { useMemo, useCallback } from 'react';
import Dropdown, { DropdownProps, DropdownOption } from '../common/Dropdown';
import { ARR_RANGES } from '../../config/constants';
import { MetricFilter } from '../../interfaces/metrics.interface';

/**
 * Props interface for the ARRFilter component
 * Extends common accessibility and styling properties
 */
export interface ARRFilterProps {
  /** Currently selected ARR range value */
  value?: MetricFilter['arrRange'];
  /** Callback function when ARR range selection changes */
  onChange: (range: MetricFilter['arrRange']) => void;
  /** Optional CSS class name for styling */
  className?: string;
  /** Accessibility label for screen readers */
  'aria-label'?: string;
  /** Test ID for component testing */
  'data-testid'?: string;
}

/**
 * ARRFilter component provides a dropdown for selecting Annual Recurring Revenue (ARR) ranges
 * Implements enterprise-grade features including:
 * - Accessibility support with ARIA attributes
 * - Performance optimization through memoization
 * - Type-safe interactions with TypeScript
 * - Consistent Material-UI styling
 * 
 * @param props - Component props of type ARRFilterProps
 * @returns Memoized ARR filter dropdown component
 */
const ARRFilter = React.memo<ARRFilterProps>(({
  value,
  onChange,
  className,
  'aria-label': ariaLabel = 'Filter by ARR range',
  'data-testid': dataTestId = 'arr-filter',
}) => {
  /**
   * Memoized transformation of ARR ranges into dropdown options
   * Adds 'All' option and ensures consistent option format
   */
  const options: DropdownOption[] = useMemo(() => {
    const rangeOptions = ARR_RANGES.map((range) => ({
      value: range,
      label: range === 'All' ? 'All ARR Ranges' : range,
    }));

    // Ensure 'All' option is first in the list
    return rangeOptions.sort((a, b) => 
      a.value === 'All' ? -1 : b.value === 'All' ? 1 : 0
    );
  }, []);

  /**
   * Memoized handler for ARR range selection changes
   * Validates selection and provides type-safe value to parent
   */
  const handleChange = useCallback((selectedValue: string | number | string[]) => {
    const stringValue = String(selectedValue);
    
    // Validate if selected value is a valid ARR range
    if (!ARR_RANGES.includes(stringValue as typeof ARR_RANGES[number])) {
      console.error('Invalid ARR range selected:', stringValue);
      return;
    }

    // Convert 'All' selection to undefined as per MetricFilter type
    const newValue = stringValue === 'All' ? undefined : stringValue;
    
    // Invoke parent callback with type-safe value
    onChange(newValue);

    // Log selection for analytics tracking
    console.debug('ARR range selected:', newValue ?? 'All');
  }, [onChange]);

  /**
   * Dropdown props configuration with proper typing
   * and accessibility attributes
   */
  const dropdownProps: DropdownProps = {
    label: 'ARR Range',
    value: value || 'All',
    options,
    onChange: handleChange,
    className,
    'aria-label': ariaLabel,
    fullWidth: true,
    required: false,
  };

  return (
    <Dropdown
      {...dropdownProps}
      data-testid={dataTestId}
    />
  );
});

// Component display name for debugging
ARRFilter.displayName = 'ARRFilter';

export default ARRFilter;