// External imports with versions
import React from 'react'; // v18.2.x
import { Card as MuiCard, CardContent, CardProps } from '@mui/material'; // v5.0.0
import { styled } from '@mui/material/styles'; // v5.0.0

// Interface definitions
export interface CustomCardProps extends CardProps {
  /**
   * Enables hover effects and click interactions
   */
  interactive?: boolean;
  
  /**
   * Custom shadow elevation level (0-24)
   * @default 1
   */
  elevation?: number;
  
  /**
   * Card content elements
   */
  children: React.ReactNode;
  
  /**
   * Additional CSS classes
   */
  className?: string;
  
  /**
   * Click event handler
   */
  onClick?: () => void;
}

// Styled component with enhanced visual features
const StyledCard = styled(MuiCard, {
  shouldForwardProp: (prop) => prop !== 'interactive',
})<{ interactive?: boolean }>(({ theme, interactive }) => ({
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[1], // Default elevation
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  backgroundColor: theme.palette.background.paper,
  position: 'relative',
  overflow: 'hidden',
  
  // Interactive states
  ...(interactive && {
    cursor: 'pointer',
    '&:hover': {
      boxShadow: theme.shadows[3], // Increase elevation on hover
      transform: 'translateY(-2px)',
    },
    '&:active': {
      transform: 'translateY(-1px)',
    },
    // Accessible focus states
    '&:focus-visible': {
      outline: `2px solid ${theme.palette.primary.main}`,
      outlineOffset: '2px',
    },
  }),
  
  // Ensure proper spacing using theme grid system
  padding: 0,
  margin: theme.spacing(1),
}));

/**
 * A reusable card component that provides consistent styling and interactive
 * capabilities for displaying content across the SaaS Metrics Platform.
 * 
 * @component
 * @example
 * ```tsx
 * <Card interactive elevation={2} onClick={() => console.log('clicked')}>
 *   <Typography>Card Content</Typography>
 * </Card>
 * ```
 */
export const Card: React.FC<CustomCardProps> = ({
  children,
  interactive = false,
  elevation = 1,
  className,
  onClick,
  ...props
}) => {
  // Handle keyboard interactions for accessibility
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (interactive && onClick && (event.key === 'Enter' || event.key === 'Space')) {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <StyledCard
      {...props}
      className={className}
      interactive={interactive}
      elevation={elevation}
      onClick={interactive ? onClick : undefined}
      onKeyDown={handleKeyDown}
      role="article"
      tabIndex={interactive ? 0 : undefined}
      aria-disabled={!interactive}
    >
      <CardContent>
        {children}
      </CardContent>
    </StyledCard>
  );
};

// Default export for convenient importing
export default Card;