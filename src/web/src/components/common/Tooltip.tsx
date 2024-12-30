import React, { memo } from 'react';
import { Tooltip } from '@mui/material'; // v5.0.0
import { styled } from '@mui/material/styles'; // v5.0.0
import { Theme } from '../../assets/styles/theme';

// Constants for tooltip timing configurations
const TOOLTIP_SHOW_DELAY = 200;
const TOOLTIP_HIDE_DELAY = 100;
const TOOLTIP_TOUCH_DELAY = 1000;

/**
 * Interface for CustomTooltip component props with accessibility and styling options
 */
interface CustomTooltipProps {
  children: React.ReactElement;
  title: string | React.ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right' | string;
  arrow?: boolean;
  className?: string;
  enterDelay?: number;
  leaveDelay?: number;
}

/**
 * StyledTooltip component with enhanced theme integration and accessibility features
 */
const StyledTooltip = styled(Tooltip)(({ theme }: { theme: Theme }) => ({
  '& .MuiTooltip-tooltip': {
    backgroundColor: theme.palette.background.paper,
    color: theme.palette.text.primary,
    fontSize: '0.875rem', // 14px for better readability
    padding: theme.spacing(1, 1.5),
    maxWidth: 300,
    borderRadius: theme.shape.borderRadius,
    boxShadow: theme.shadows[2],
    border: `1px solid ${theme.palette.divider}`,
    zIndex: theme.zIndex.tooltip,
    
    // High contrast mode support
    '@media (forced-colors: active)': {
      border: '1px solid ButtonText',
    },

    // Responsive font size adjustments
    [theme.breakpoints.down('sm')]: {
      fontSize: '0.8125rem', // 13px for mobile
      padding: theme.spacing(0.75, 1.25),
    },
  },

  '& .MuiTooltip-arrow': {
    color: theme.palette.background.paper,
    '&::before': {
      border: `1px solid ${theme.palette.divider}`,
    },
  },

  // Focus visible styles for keyboard navigation
  '& .MuiTooltip-focusVisible': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: 2,
  },
}));

/**
 * CustomTooltip component with comprehensive accessibility features
 * and performance optimizations
 * 
 * @param props - CustomTooltipProps
 * @returns JSX.Element - Rendered tooltip component
 */
const CustomTooltip = memo(({
  children,
  title,
  placement = 'top',
  arrow = true,
  className,
  enterDelay = TOOLTIP_SHOW_DELAY,
  leaveDelay = TOOLTIP_HIDE_DELAY,
}: CustomTooltipProps) => {
  // Don't render tooltip if no title is provided
  if (!title) {
    return children;
  }

  return (
    <StyledTooltip
      title={title}
      placement={placement}
      arrow={arrow}
      className={className}
      enterDelay={enterDelay}
      leaveDelay={leaveDelay}
      enterTouchDelay={TOOLTIP_TOUCH_DELAY}
      leaveTouchDelay={TOOLTIP_HIDE_DELAY}
      
      // Accessibility enhancements
      PopperProps={{
        role: 'tooltip',
        'aria-live': 'polite',
        modifiers: [{
          name: 'preventOverflow',
          options: {
            boundary: 'window',
          },
        }],
      }}
      
      // Enhanced touch device support
      onTouchStart={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      
      // Keyboard navigation support
      componentsProps={{
        tooltip: {
          role: 'tooltip',
          'aria-hidden': 'false',
          tabIndex: -1,
        },
        popper: {
          'data-popper-placement': placement,
        },
      }}
    >
      {React.cloneElement(children, {
        'aria-describedby': title ? 'tooltip' : undefined,
        role: 'button',
        tabIndex: children.props.tabIndex ?? 0,
      })}
    </StyledTooltip>
  );
});

// Display name for debugging
CustomTooltip.displayName = 'CustomTooltip';

export default CustomTooltip;