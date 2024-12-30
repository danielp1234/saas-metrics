// @version @mui/material ^5.0.0
// @version @mui/material/styles ^5.0.0
// @version react ^18.2.0

import React from 'react';
import { Box, Typography, Breadcrumbs, useMediaQuery } from '@mui/material';
import { styled, useTheme } from '@mui/material/styles';
import { BaseComponentProps } from '../../interfaces/common.interface';
import Button from './Button';

/**
 * Props interface for the PageHeader component extending BaseComponentProps
 * with header-specific functionality
 */
export interface PageHeaderProps extends BaseComponentProps {
  /** Main title of the page */
  title: string;
  /** Optional subtitle text */
  subtitle?: string;
  /** Optional breadcrumb navigation items */
  breadcrumbs?: Array<{ label: string; path: string }>;
  /** Optional action buttons or components */
  actions?: React.ReactNode;
  /** Optional test id for the title element */
  titleTestId?: string;
  /** Optional test id for the subtitle element */
  subtitleTestId?: string;
  /** Optional test id for the header container */
  headerTestId?: string;
}

/**
 * Styled header container component implementing the F-pattern layout
 * and following the 8px grid system
 */
const StyledHeader = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(3),
  backgroundColor: theme.palette.background.paper,
  borderBottom: `1px solid ${theme.palette.divider}`,
  boxShadow: theme.shadows[1],
  position: 'relative',
  width: '100%',
  boxSizing: 'border-box',

  // Responsive padding adjustments
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },

  // Container layout
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1),

  // Handle overflow
  '& .MuiTypography-root': {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  // Actions container
  '& .header-actions': {
    display: 'flex',
    gap: theme.spacing(1),
    marginLeft: 'auto',
    [theme.breakpoints.down('sm')]: {
      width: '100%',
      marginTop: theme.spacing(1),
    },
  },

  // Top section layout
  '& .header-top': {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    [theme.breakpoints.down('sm')]: {
      flexDirection: 'column',
      alignItems: 'flex-start',
    },
  },
}));

/**
 * PageHeader component providing consistent header styling and layout
 * across the application with responsive design and accessibility features
 */
const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  breadcrumbs,
  actions,
  className,
  style,
  titleTestId = 'page-header-title',
  subtitleTestId = 'page-header-subtitle',
  headerTestId = 'page-header',
  ...rest
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <StyledHeader
      className={className}
      style={style}
      data-testid={headerTestId}
      {...rest}
    >
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumbs
          aria-label="page navigation"
          sx={{ mb: 1 }}
          data-testid="page-header-breadcrumbs"
        >
          {breadcrumbs.map((crumb, index) => (
            <Typography
              key={`${crumb.path}-${index}`}
              color="text.secondary"
              variant="body2"
              component="a"
              href={crumb.path}
              sx={{
                textDecoration: 'none',
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              {crumb.label}
            </Typography>
          ))}
        </Breadcrumbs>
      )}

      <div className="header-top">
        <div>
          <Typography
            variant="h4"
            component="h1"
            color="text.primary"
            gutterBottom={Boolean(subtitle)}
            data-testid={titleTestId}
            sx={{
              fontWeight: 600,
              fontSize: {
                xs: '1.5rem',
                sm: '2rem',
              },
            }}
          >
            {title}
          </Typography>

          {subtitle && (
            <Typography
              variant="subtitle1"
              color="text.secondary"
              data-testid={subtitleTestId}
              sx={{
                maxWidth: '800px',
                lineHeight: 1.5,
              }}
            >
              {subtitle}
            </Typography>
          )}
        </div>

        {actions && (
          <div className="header-actions">
            {React.Children.map(actions, (action, index) => {
              if (React.isValidElement(action) && action.type === Button) {
                return React.cloneElement(action, {
                  size: isMobile ? 'small' : 'medium',
                  fullWidth: isMobile,
                  key: index,
                });
              }
              return action;
            })}
          </div>
        )}
      </div>
    </StyledHeader>
  );
};

export default PageHeader;
```

This implementation includes:

1. Comprehensive TypeScript interfaces extending BaseComponentProps with header-specific properties.
2. Styled components using Material-UI's styled utility following the 8px grid system.
3. Responsive design with mobile-first approach using useMediaQuery hook.
4. Accessibility features including proper ARIA labels and semantic HTML.
5. Support for breadcrumb navigation with proper styling and interaction states.
6. Flexible action buttons area with responsive layout adjustments.
7. Proper handling of text overflow with ellipsis.
8. Data test IDs for testing purposes.
9. Theme-aware styling using Material-UI's theme system.
10. Proper TypeScript typing for all props and components.

The component follows the F-pattern layout specified in the requirements and implements all the necessary styling patterns from Material-UI. It's fully responsive and handles various screen sizes appropriately.

The component can be used as follows:

```typescript
<PageHeader
  title="Dashboard"
  subtitle="View and analyze your metrics"
  breadcrumbs={[
    { label: 'Home', path: '/' },
    { label: 'Dashboard', path: '/dashboard' }
  ]}
  actions={
    <>
      <Button variant="contained" color="primary">
        Export Data
      </Button>
      <Button variant="outlined" color="secondary">
        Settings
      </Button>
    </>
  }
/>