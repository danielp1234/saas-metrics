import React from 'react';
import { Button, ButtonProps } from '@mui/material'; // @version ^5.0.0
import { styled } from '@mui/material/styles'; // @version ^5.0.0
import { BaseProps } from '../../interfaces/common.interface';

/**
 * Extended props interface for the custom button component
 * Combines Material-UI ButtonProps with BaseProps and adds custom properties
 */
export interface CustomButtonProps extends BaseProps, ButtonProps {
  /** Indicates if button is in loading state */
  isLoading?: boolean;
  /** Text to display during loading state */
  loadingText?: string;
}

/**
 * Styled Material-UI Button component with custom theme integration
 * Implements consistent styling based on the application's design system
 */
const StyledButton = styled(Button)(({ theme }) => ({
  padding: theme.spacing(1, 2),
  borderRadius: theme.shape.borderRadius,
  textTransform: 'none',
  fontWeight: theme.typography.fontWeightMedium,
  transition: theme.transitions.create([
    'background-color',
    'box-shadow',
    'border-color',
    'color',
  ]),
  '&:focus-visible': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: '2px',
  },
  '&.Mui-disabled': {
    opacity: 0.7,
    cursor: 'not-allowed',
  },
}));

/**
 * CustomButton component with extended functionality and accessibility features
 * Implements WCAG 2.1 Level AA compliance for interactive elements
 *
 * @param props - Extended button props including loading state and custom styling
 * @param ref - Forwarded ref for direct button element access
 * @returns A styled, accessible button component
 */
export const CustomButton = React.forwardRef<HTMLButtonElement, CustomButtonProps>(
  (
    {
      children,
      className,
      disabled,
      isLoading,
      loadingText,
      variant = 'contained',
      size = 'medium',
      color = 'primary',
      ...restProps
    },
    ref
  ) => {
    // Determine button's disabled state
    const isDisabled = disabled || isLoading;

    // Determine button's content based on loading state
    const buttonContent = isLoading ? loadingText || children : children;

    return (
      <StyledButton
        ref={ref}
        className={className}
        disabled={isDisabled}
        variant={variant}
        size={size}
        color={color}
        aria-busy={isLoading}
        aria-disabled={isDisabled}
        // Add role="button" for explicit semantics
        role="button"
        // Ensure proper tab index when disabled
        tabIndex={isDisabled ? -1 : 0}
        {...restProps}
      >
        {buttonContent}
      </StyledButton>
    );
  }
);

// Set display name for debugging purposes
CustomButton.displayName = 'CustomButton';

// Default export for convenient importing
export default CustomButton;
```

This implementation:

1. Follows all specified requirements and integrates with Material-UI v5.
2. Implements WCAG 2.1 Level AA compliance with proper ARIA attributes and focus states.
3. Provides consistent styling through theme integration.
4. Supports loading states with custom loading text.
5. Implements proper TypeScript typing with exported interfaces.
6. Uses React.forwardRef for ref forwarding capability.
7. Includes proper accessibility attributes and focus management.
8. Provides extensive JSDoc documentation.
9. Implements proper component naming and display names.
10. Uses proper type imports from Material-UI and internal interfaces.

The component can be used like this:

```typescript
// Basic usage
<CustomButton>Click Me</CustomButton>

// With loading state
<CustomButton isLoading loadingText="Processing...">
  Submit
</CustomButton>

// With custom variant and color
<CustomButton variant="outlined" color="secondary">
  Secondary Action
</CustomButton>