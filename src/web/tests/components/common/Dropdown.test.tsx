// @version @testing-library/react ^14.0.0
// @version @testing-library/user-event ^14.0.0
// @version @jest/globals ^29.0.0
// @version @mui/material ^5.14.0

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { ThemeProvider, createTheme } from '@mui/material';
import Dropdown from '../../src/components/common/Dropdown';
import type { DropdownProps } from '../../src/components/common/Dropdown';

// Create a basic theme for Material-UI components
const theme = createTheme();

// Default test props
const defaultProps: DropdownProps = {
  value: null,
  onChange: jest.fn(),
  options: [
    { value: '1', label: 'Option 1' },
    { value: '2', label: 'Option 2' },
    { value: '3', label: 'Option 3' }
  ],
  placeholder: 'Select an option',
  id: 'test-dropdown',
  ariaLabel: 'Test Dropdown'
};

// Helper function to render Dropdown with theme
const renderDropdown = (props: Partial<DropdownProps> = {}) => {
  const mergedProps = { ...defaultProps, ...props };
  return render(
    <ThemeProvider theme={theme}>
      <Dropdown {...mergedProps} />
    </ThemeProvider>
  );
};

describe('Dropdown Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Rendering', () => {
    it('renders with placeholder when no value selected', () => {
      renderDropdown();
      
      const select = screen.getByRole('combobox', { name: /test dropdown/i });
      expect(select).toBeInTheDocument();
      expect(screen.getByText('Select an option')).toBeInTheDocument();
      expect(select).toHaveAttribute('aria-label', 'Test Dropdown');
    });

    it('renders with selected value when provided', () => {
      renderDropdown({ value: '1' });
      
      expect(screen.getByText('Option 1')).toBeInTheDocument();
    });

    it('renders in disabled state when disabled prop is true', () => {
      renderDropdown({ disabled: true });
      
      const select = screen.getByRole('combobox');
      expect(select).toBeDisabled();
    });

    it('renders with error state and message', () => {
      renderDropdown({
        error: true,
        errorMessage: 'Error message'
      });
      
      const select = screen.getByRole('combobox');
      expect(select).toHaveAttribute('aria-describedby', 'test-dropdown-error-text');
      expect(screen.getByText('Error message')).toBeInTheDocument();
    });
  });

  describe('Interaction Handling', () => {
    it('handles option selection', async () => {
      const onChange = jest.fn();
      const user = userEvent.setup();
      
      renderDropdown({ onChange });
      
      const select = screen.getByRole('combobox');
      await user.click(select);
      
      const option = screen.getByText('Option 1');
      await user.click(option);
      
      expect(onChange).toHaveBeenCalledWith('1');
    });

    it('handles null selection when clearing value', async () => {
      const onChange = jest.fn();
      const user = userEvent.setup();
      
      renderDropdown({ onChange, value: '1' });
      
      const select = screen.getByRole('combobox');
      await user.click(select);
      
      // Click placeholder to clear
      const placeholder = screen.getByText('Select an option');
      await user.click(placeholder);
      
      expect(onChange).toHaveBeenCalledWith(null);
    });

    it('handles error in change handler gracefully', async () => {
      const onChange = jest.fn();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const user = userEvent.setup();
      
      renderDropdown({
        onChange,
        options: [{ value: {}, label: 'Invalid' } as any] // Invalid option to trigger error
      });
      
      const select = screen.getByRole('combobox');
      await user.click(select);
      
      const option = screen.getByText('Invalid');
      await user.click(option);
      
      expect(consoleSpy).toHaveBeenCalled();
      expect(onChange).toHaveBeenCalledWith(null);
      
      consoleSpy.mockRestore();
    });
  });

  describe('Keyboard Navigation', () => {
    it('supports keyboard navigation of options', async () => {
      const onChange = jest.fn();
      const user = userEvent.setup();
      
      renderDropdown({ onChange });
      
      const select = screen.getByRole('combobox');
      await user.tab(); // Focus the select
      expect(select).toHaveFocus();
      
      // Open dropdown with space
      await user.keyboard(' ');
      
      // Navigate to first option
      await user.keyboard('{ArrowDown}');
      
      // Select with enter
      await user.keyboard('{Enter}');
      
      expect(onChange).toHaveBeenCalledWith('1');
    });

    it('handles escape key to close dropdown', async () => {
      const user = userEvent.setup();
      
      renderDropdown();
      
      const select = screen.getByRole('combobox');
      await user.click(select);
      
      // Verify dropdown is open
      expect(screen.getByText('Option 1')).toBeVisible();
      
      // Press escape
      await user.keyboard('{Escape}');
      
      // Verify dropdown is closed
      await waitFor(() => {
        expect(screen.queryByText('Option 1')).not.toBeVisible();
      });
    });
  });

  describe('Accessibility', () => {
    it('provides appropriate ARIA attributes', () => {
      renderDropdown();
      
      const select = screen.getByRole('combobox');
      expect(select).toHaveAttribute('aria-label', 'Test Dropdown');
      expect(select).toHaveAttribute('aria-expanded', 'false');
    });

    it('updates ARIA attributes when opened', async () => {
      const user = userEvent.setup();
      
      renderDropdown();
      
      const select = screen.getByRole('combobox');
      await user.click(select);
      
      expect(select).toHaveAttribute('aria-expanded', 'true');
      expect(select).toHaveAttribute('aria-haspopup', 'listbox');
    });

    it('provides accessible error messages', () => {
      renderDropdown({
        error: true,
        errorMessage: 'Required field'
      });
      
      const select = screen.getByRole('combobox');
      const errorMessage = screen.getByText('Required field');
      
      expect(select).toHaveAttribute('aria-describedby', 'test-dropdown-error-text');
      expect(errorMessage).toHaveAttribute('id', 'test-dropdown-error-text');
    });
  });

  describe('Material-UI Integration', () => {
    it('applies custom theme styles', () => {
      const customTheme = createTheme({
        components: {
          MuiSelect: {
            styleOverrides: {
              root: {
                minWidth: '200px'
              }
            }
          }
        }
      });
      
      render(
        <ThemeProvider theme={customTheme}>
          <Dropdown {...defaultProps} />
        </ThemeProvider>
      );
      
      const select = screen.getByRole('combobox');
      expect(select).toHaveStyle({ minWidth: '200px' });
    });

    it('integrates with FormControl for error states', () => {
      renderDropdown({
        error: true,
        errorMessage: 'Error message'
      });
      
      const formControl = screen.getByTestId('test-dropdown-select')
        .closest('.MuiFormControl-root');
      
      expect(formControl).toHaveClass('Mui-error');
    });

    it('handles fullWidth prop correctly', () => {
      renderDropdown({ fullWidth: false });
      
      const formControl = screen.getByTestId('test-dropdown-select')
        .closest('.MuiFormControl-root');
      
      expect(formControl).not.toHaveClass('MuiFormControl-fullWidth');
    });
  });
});