import { useTheme } from '@mui/material/styles'; // @mui/material v5.0.0
import { useMediaQuery } from '@mui/material'; // @mui/material v5.0.0
import { useState, useCallback, useEffect } from 'react'; // react v18.2.0
import theme from '../assets/styles/theme';

/**
 * Breakpoint constants based on design specifications
 * @constant {number} BREAKPOINT_MOBILE - Mobile breakpoint (320px)
 * @constant {number} BREAKPOINT_TABLET - Tablet breakpoint (768px)
 * @constant {number} BREAKPOINT_DESKTOP - Desktop breakpoint (1024px)
 */
const BREAKPOINT_MOBILE = 320;
const BREAKPOINT_TABLET = 768;
const BREAKPOINT_DESKTOP = 1024;

/**
 * Interface defining the return type of the useAppTheme hook
 */
interface UseThemeReturn {
  theme: typeof theme;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

/**
 * Custom hook that provides theme access and responsive breakpoint detection
 * for the SaaS Metrics Platform. Implements Material-UI v5 theme integration
 * and responsive breakpoint detection based on design specifications.
 * 
 * @returns {UseThemeReturn} Object containing theme object and responsive state booleans
 * 
 * @example
 * const { theme, isMobile, isTablet, isDesktop } = useAppTheme();
 * 
 * // Access theme properties
 * const primaryColor = theme.palette.primary.main;
 * 
 * // Conditional rendering based on device type
 * if (isMobile) {
 *   return <MobileLayout />;
 * }
 */
export const useAppTheme = (): UseThemeReturn => {
  // Initialize Material-UI theme
  const muiTheme = useTheme();

  // Set up media queries for responsive breakpoints
  const isMobileQuery = useMediaQuery(
    `(min-width: ${BREAKPOINT_MOBILE}px) and (max-width: ${BREAKPOINT_TABLET - 1}px)`
  );
  const isTabletQuery = useMediaQuery(
    `(min-width: ${BREAKPOINT_TABLET}px) and (max-width: ${BREAKPOINT_DESKTOP - 1}px)`
  );
  const isDesktopQuery = useMediaQuery(
    `(min-width: ${BREAKPOINT_DESKTOP}px)`
  );

  // State for responsive flags
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  /**
   * Updates responsive states based on current media query results
   */
  const updateResponsiveStates = useCallback(() => {
    setIsMobile(isMobileQuery);
    setIsTablet(isTabletQuery);
    setIsDesktop(isDesktopQuery);
  }, [isMobileQuery, isTabletQuery, isDesktopQuery]);

  /**
   * Effect to update responsive states when media queries change
   */
  useEffect(() => {
    updateResponsiveStates();
  }, [updateResponsiveStates]);

  return {
    theme: muiTheme,
    isMobile,
    isTablet,
    isDesktop,
  };
};

export default useAppTheme;