import { createTheme, Theme } from '@mui/material/styles';
import './variables.css';

/**
 * Creates a custom Material-UI theme with WCAG 2.1 Level AA compliance
 * Version: Material-UI v5.0.0
 * 
 * Features:
 * - Accessible color contrast ratios
 * - Consistent 8px spacing grid
 * - Responsive typography
 * - Enhanced focus states
 * - Component-level customization
 */
const createCustomTheme = (): Theme => {
  return createTheme({
    // Color palette configuration with WCAG 2.1 Level AA compliant contrast ratios
    palette: {
      primary: {
        main: 'var(--color-primary)',
        light: 'var(--color-primary-light)',
        dark: 'var(--color-primary-dark)',
        contrastText: '#ffffff', // Ensures 4.5:1 contrast ratio
      },
      secondary: {
        main: 'var(--color-secondary)',
        light: 'var(--color-secondary-light)',
        dark: 'var(--color-secondary-dark)',
        contrastText: '#ffffff', // Ensures 4.5:1 contrast ratio
      },
      error: {
        main: 'var(--color-error)',
        contrastText: '#ffffff', // Ensures 4.5:1 contrast ratio
      },
      warning: {
        main: 'var(--color-warning)',
        contrastText: '#000000', // Ensures 4.5:1 contrast ratio
      },
      info: {
        main: 'var(--color-info)',
        contrastText: '#ffffff', // Ensures 4.5:1 contrast ratio
      },
      success: {
        main: 'var(--color-success)',
        contrastText: '#ffffff', // Ensures 4.5:1 contrast ratio
      },
      text: {
        primary: 'var(--color-text-primary)',
        secondary: 'var(--color-text-secondary)',
        disabled: 'var(--color-text-disabled)',
      },
      background: {
        default: 'var(--color-background-default)',
        paper: 'var(--color-background-paper)',
      },
      divider: 'var(--color-divider)',
    },

    // Typography configuration with accessible line heights and font sizes
    typography: {
      fontFamily: 'var(--font-family-primary)',
      fontSize: 16, // Base font size for rem calculations
      fontWeightLight: 'var(--font-weight-light)',
      fontWeightRegular: 'var(--font-weight-regular)',
      fontWeightMedium: 'var(--font-weight-medium)',
      fontWeightBold: 'var(--font-weight-bold)',
      h1: {
        fontSize: '2.5rem',
        fontWeight: 'var(--font-weight-bold)',
        lineHeight: 1.2,
        letterSpacing: '-0.01562em',
      },
      h2: {
        fontSize: '2rem',
        fontWeight: 'var(--font-weight-bold)',
        lineHeight: 1.3,
        letterSpacing: '-0.00833em',
      },
      h3: {
        fontSize: '1.75rem',
        fontWeight: 'var(--font-weight-medium)',
        lineHeight: 1.4,
        letterSpacing: '0em',
      },
      h4: {
        fontSize: '1.5rem',
        fontWeight: 'var(--font-weight-medium)',
        lineHeight: 1.4,
        letterSpacing: '0.00735em',
      },
      h5: {
        fontSize: '1.25rem',
        fontWeight: 'var(--font-weight-medium)',
        lineHeight: 1.5,
        letterSpacing: '0em',
      },
      h6: {
        fontSize: '1rem',
        fontWeight: 'var(--font-weight-medium)',
        lineHeight: 1.6,
        letterSpacing: '0.0075em',
      },
      body1: {
        fontSize: '1rem',
        lineHeight: 1.5,
        letterSpacing: '0.00938em',
      },
      body2: {
        fontSize: '0.875rem',
        lineHeight: 1.43,
        letterSpacing: '0.01071em',
      },
    },

    // 8px spacing system
    spacing: (factor: number) => `${8 * factor}px`,

    // Responsive breakpoints
    breakpoints: {
      values: {
        xs: 0,
        sm: 320,
        md: 768,
        lg: 1024,
        xl: 1200,
      },
    },

    // Component customization with accessibility enhancements
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: '4px',
            padding: '8px 16px',
            fontWeight: 'var(--font-weight-medium)',
            transition: 'var(--transition-duration) var(--transition-timing)',
            '&:focus-visible': {
              outline: '2px solid var(--color-primary)',
              outlineOffset: '2px',
            },
          },
        },
        defaultProps: {
          disableElevation: true, // Improves accessibility by removing shadows
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: '4px',
              '&:focus-within': {
                '& > fieldset': {
                  borderColor: 'var(--color-primary)',
                  borderWidth: '2px',
                },
              },
            },
          },
        },
        defaultProps: {
          variant: 'outlined',
        },
      },
      MuiLink: {
        styleOverrides: {
          root: {
            textDecoration: 'underline', // Enhanced accessibility for links
            '&:focus-visible': {
              outline: '2px solid var(--color-primary)',
              outlineOffset: '2px',
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: '16px',
            '&:focus-visible': {
              outline: '2px solid var(--color-primary)',
              outlineOffset: '2px',
            },
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: 'var(--color-text-primary)',
            fontSize: '0.875rem',
            padding: '8px 16px',
          },
        },
      },
      MuiSnackbar: {
        styleOverrides: {
          root: {
            '& .MuiSnackbarContent-root': {
              backgroundColor: 'var(--color-text-primary)',
            },
          },
        },
      },
    },
  });
};

// Create and export the theme instance
const theme = createCustomTheme();

export default theme;