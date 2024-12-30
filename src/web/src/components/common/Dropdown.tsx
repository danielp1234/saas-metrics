// @version react@18.2.x
// @version @mui/material@5.x
import React, { useCallback } from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
} from '@mui/material';
import { BaseProps } from '../../interfaces/common.interface';

/**
 * Interface defining the structure of dropdown options
 */
export interface DropdownOption {
  /** Unique identifier for the option */
  value: string | number;
  /** Display text for the option */
  label: string;
}

/**
 * Props interface for the Dropdown component
 * Extends BaseProps for consistent prop typing across components
 */
export interface DropdownProps extends BaseProps {
  /** Label text for the dropdown */
  label: string;
  /** Current selected value(s) */
  value: string | number | string[];
  /** Array of options to display in dropdown */
  options: DropdownOption[];
  /** Callback function when selection changes */
  onChange: (value: string | number | string[]) => void;
  /** Enable multiple selection mode */
  multiple?: boolean;
  /** Disable the dropdown */
  disabled?: boolean;
  /** Make the dropdown full width */
  fullWidth?: boolean;
  /** Mark the dropdown as required */
  required?: boolean;
}

/**
 * A reusable dropdown component built on Material-UI's Select component.
 * Provides standardized dropdown functionality with consistent styling and behavior.
 * Supports both single and multiple selection modes with enhanced accessibility.
 * 
 * @param props - Component props extending BaseProps
 * @returns Rendered dropdown component
 */
const Dropdown = React.memo<DropdownProps>(({
  label,
  value,
  options,
  onChange,
  multiple = false,
  disabled = false,
  fullWidth = true,
  required = false,
  className,
}) => {
  /**
   * Memoized handler for dropdown selection changes
   * Processes the selection event and calls the onChange callback
   */
  const handleChange = useCallback((event: SelectChangeEvent<unknown>) => {
    const newValue = event.target.value;
    
    // Handle multiple selection array if multiple mode is enabled
    if (multiple) {
      onChange(newValue as string[]);
    } else {
      // Convert value to appropriate type (string or number)
      const processedValue = typeof value === 'number' 
        ? Number(newValue) 
        : String(newValue);
      onChange(processedValue);
    }
  }, [multiple, onChange, value]);

  // Generate unique ID for ARIA labelling
  const labelId = `dropdown-label-${label.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <FormControl 
      className={className}
      fullWidth={fullWidth}
      disabled={disabled}
      required={required}
      variant="outlined"
    >
      <InputLabel 
        id={labelId}
        required={required}
      >
        {label}
      </InputLabel>
      
      <Select
        labelId={labelId}
        id={`${labelId}-select`}
        value={value}
        label={label}
        onChange={handleChange}
        multiple={multiple}
        aria-label={label}
        aria-required={required}
        MenuProps={{
          // Improve performance for long option lists
          anchorOrigin: {
            vertical: 'bottom',
            horizontal: 'left',
          },
          transformOrigin: {
            vertical: 'top',
            horizontal: 'left',
          },
          // Ensure menu items are properly visible
          PaperProps: {
            style: {
              maxHeight: 300,
            },
          },
        }}
      >
        {options.map((option) => (
          <MenuItem 
            key={option.value} 
            value={option.value}
          >
            {option.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
});

// Display name for debugging purposes
Dropdown.displayName = 'Dropdown';

export default Dropdown;