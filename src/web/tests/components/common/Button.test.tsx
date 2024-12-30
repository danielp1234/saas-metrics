// @version @testing-library/react ^14.0.0
// @version @testing-library/user-event ^14.0.0
// @version @jest/globals ^29.5.0

import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import Button from '../../src/components/common/Button';

describe('Button Component', () => {
  // Mock handlers for interaction testing
  const mockHandlers = {
    onClick: jest.fn(),
    onFocus: jest.fn(),
    onBlur: jest.fn(),
  };

  // Default test props
  const defaultProps = {
    children: 'Test Button',
    onClick: mockHandlers.onClick,
  };

  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders with default props', () => {
      render(<Button {...defaultProps} />);
      const button = screen.getByRole('button', { name: /test button/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass('MuiButton-contained');
      expect(button).toHaveClass('MuiButton-containedPrimary');
    });

    it('renders with different variants', () => {
      const variants = ['contained', 'outlined', 'text'] as const;
      variants.forEach(variant => {
        const { rerender } = render(<Button {...defaultProps} variant={variant} />);
        const button = screen.getByRole('button');
        expect(button).toHaveClass(`MuiButton-${variant}`);
        rerender(<></>);
      });
    });

    it('renders with different colors', () => {
      const colors = ['primary', 'secondary', 'error', 'warning', 'info', 'success'] as const;
      colors.forEach(color => {
        const { rerender } = render(<Button {...defaultProps} color={color} />);
        const button = screen.getByRole('button');
        expect(button).toHaveClass(`MuiButton-contained${color.charAt(0).toUpperCase()}${color.slice(1)}`);
        rerender(<></>);
      });
    });

    it('renders with different sizes', () => {
      const sizes = ['small', 'medium', 'large'] as const;
      sizes.forEach(size => {
        const { rerender } = render(<Button {...defaultProps} size={size} />);
        const button = screen.getByRole('button');
        expect(button).toHaveClass(`MuiButton-size${size.charAt(0).toUpperCase()}${size.slice(1)}`);
        rerender(<></>);
      });
    });

    it('renders with icons', () => {
      const startIcon = <span data-testid="start-icon">Start</span>;
      const endIcon = <span data-testid="end-icon">End</span>;
      
      render(
        <Button {...defaultProps} startIcon={startIcon} endIcon={endIcon} />
      );
      
      expect(screen.getByTestId('start-icon')).toBeInTheDocument();
      expect(screen.getByTestId('end-icon')).toBeInTheDocument();
    });
  });

  describe('Interaction Handling', () => {
    it('handles click events', async () => {
      const user = userEvent.setup();
      render(<Button {...defaultProps} />);
      const button = screen.getByRole('button');
      
      await user.click(button);
      expect(mockHandlers.onClick).toHaveBeenCalledTimes(1);
    });

    it('prevents click when disabled', async () => {
      const user = userEvent.setup();
      render(<Button {...defaultProps} disabled />);
      const button = screen.getByRole('button');
      
      await user.click(button);
      expect(mockHandlers.onClick).not.toHaveBeenCalled();
      expect(button).toBeDisabled();
    });

    it('prevents click when loading', async () => {
      const user = userEvent.setup();
      render(<Button {...defaultProps} loading />);
      const button = screen.getByRole('button');
      
      await user.click(button);
      expect(mockHandlers.onClick).not.toHaveBeenCalled();
      expect(button).toHaveAttribute('aria-busy', 'true');
    });

    it('handles keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<Button {...defaultProps} />);
      const button = screen.getByRole('button');
      
      await user.tab();
      expect(button).toHaveFocus();
      
      await user.keyboard('{enter}');
      expect(mockHandlers.onClick).toHaveBeenCalledTimes(1);
      
      await user.keyboard(' ');
      expect(mockHandlers.onClick).toHaveBeenCalledTimes(2);
    });
  });

  describe('Accessibility', () => {
    it('has appropriate ARIA attributes', () => {
      render(<Button {...defaultProps} ariaLabel="Custom Label" />);
      const button = screen.getByRole('button');
      
      expect(button).toHaveAttribute('aria-label', 'Custom Label');
    });

    it('uses text content as aria-label when no ariaLabel prop is provided', () => {
      render(<Button {...defaultProps} />);
      const button = screen.getByRole('button');
      
      expect(button).toHaveAttribute('aria-label', 'Test Button');
    });

    it('handles disabled state with proper ARIA attributes', () => {
      render(<Button {...defaultProps} disabled />);
      const button = screen.getByRole('button');
      
      expect(button).toHaveAttribute('aria-disabled', 'true');
      expect(button).toBeDisabled();
    });

    it('handles loading state with proper ARIA attributes', () => {
      render(<Button {...defaultProps} loading />);
      const button = screen.getByRole('button');
      
      expect(button).toHaveAttribute('aria-busy', 'true');
      expect(button).toHaveAttribute('aria-disabled', 'true');
    });
  });

  describe('Styling', () => {
    it('applies custom className', () => {
      render(<Button {...defaultProps} className="custom-class" />);
      const button = screen.getByRole('button');
      
      expect(button).toHaveClass('custom-class');
    });

    it('applies custom styles', () => {
      const customStyle = { marginTop: '10px' };
      render(<Button {...defaultProps} style={customStyle} />);
      const button = screen.getByRole('button');
      
      expect(button).toHaveStyle(customStyle);
    });

    it('applies loading class when in loading state', () => {
      render(<Button {...defaultProps} loading />);
      const button = screen.getByRole('button');
      
      expect(button).toHaveClass('loading');
    });

    it('applies fullWidth styling', () => {
      render(<Button {...defaultProps} fullWidth />);
      const button = screen.getByRole('button');
      
      expect(button).toHaveClass('MuiButton-fullWidth');
    });
  });

  describe('Error Handling', () => {
    it('handles undefined onClick gracefully', async () => {
      const user = userEvent.setup();
      render(<Button>{defaultProps.children}</Button>);
      const button = screen.getByRole('button');
      
      await user.click(button);
      // Should not throw any errors
      expect(button).toBeInTheDocument();
    });

    it('handles missing children gracefully', () => {
      // @ts-expect-error - Testing invalid props
      render(<Button onClick={mockHandlers.onClick} />);
      const button = screen.getByRole('button');
      
      expect(button).toBeInTheDocument();
      expect(button).toBeEmpty();
    });
  });
});