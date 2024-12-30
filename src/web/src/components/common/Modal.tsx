import React, { ReactNode, useCallback, useEffect, useMemo } from 'react'; // react v18.2.0
import { Modal as MuiModal, Box, IconButton } from '@mui/material'; // @mui/material v5.0.0
import { Close } from '@mui/icons-material'; // @mui/material v5.0.0
import useAppTheme from '../../hooks/useTheme';

// Interface for Modal component props
interface ModalProps {
  open: boolean;
  children: ReactNode;
  onClose: () => void;
  title?: string;
  maxWidth?: string | number;
  fullScreen?: boolean;
  disableBackdropClick?: boolean;
  disableEscapeKeyDown?: boolean;
  keepMounted?: boolean;
  closeButtonAriaLabel?: string;
  transitionDuration?: number;
  className?: string;
  BackdropProps?: {
    invisible?: boolean;
    className?: string;
    onClick?: (event: React.MouseEvent) => void;
  };
  onBackdropClick?: (event: React.MouseEvent) => void;
  onKeyDown?: (event: React.KeyboardEvent) => void;
}

/**
 * Enhanced Modal component with comprehensive accessibility and responsive features.
 * Implements WCAG 2.1 Level AA compliance and Material-UI design patterns.
 *
 * @param {ModalProps} props - Modal component properties
 * @returns {JSX.Element} Rendered modal component with accessibility features
 */
const Modal = React.memo(({
  open,
  children,
  onClose,
  title,
  maxWidth = '600px',
  fullScreen = false,
  disableBackdropClick = false,
  disableEscapeKeyDown = false,
  keepMounted = false,
  closeButtonAriaLabel = 'Close modal',
  transitionDuration = 225,
  className,
  BackdropProps,
  onBackdropClick,
  onKeyDown,
}: ModalProps): JSX.Element => {
  const { theme, isMobile, isTablet } = useAppTheme();

  // Calculate modal dimensions based on screen size and maxWidth
  const modalWidth = useMemo(() => {
    if (fullScreen) return '100%';
    if (isMobile) return '100%';
    if (isTablet) return '80%';
    return maxWidth;
  }, [fullScreen, isMobile, isTablet, maxWidth]);

  // Handle keyboard events for accessibility
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (onKeyDown) {
      onKeyDown(event);
    }
    
    // Handle escape key if not disabled
    if (!disableEscapeKeyDown && event.key === 'Escape') {
      onClose();
    }
  }, [disableEscapeKeyDown, onClose, onKeyDown]);

  // Handle backdrop click
  const handleBackdropClick = useCallback((event: React.MouseEvent) => {
    if (onBackdropClick) {
      onBackdropClick(event);
    }
    
    if (!disableBackdropClick) {
      onClose();
    }
  }, [disableBackdropClick, onClose, onBackdropClick]);

  // Set up focus trap when modal opens
  useEffect(() => {
    if (open) {
      const focusableElements = document.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstFocusable = focusableElements[0] as HTMLElement;
      if (firstFocusable) {
        firstFocusable.focus();
      }
    }
  }, [open]);

  return (
    <MuiModal
      open={open}
      onClose={onClose}
      keepMounted={keepMounted}
      aria-labelledby={title ? 'modal-title' : undefined}
      aria-describedby="modal-description"
      className={className}
      BackdropProps={{
        ...BackdropProps,
        onClick: handleBackdropClick,
      }}
      onKeyDown={handleKeyDown}
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Box
        role="dialog"
        aria-modal="true"
        sx={{
          position: 'relative',
          width: modalWidth,
          maxHeight: fullScreen ? '100vh' : '90vh',
          bgcolor: 'background.paper',
          borderRadius: fullScreen ? 0 : theme.shape.borderRadius,
          boxShadow: theme.shadows[5],
          p: theme.spacing(3),
          outline: 'none',
          overflow: 'auto',
          transition: theme.transitions.create(['width', 'height'], {
            duration: transitionDuration,
          }),
        }}
      >
        {/* Close button */}
        <IconButton
          aria-label={closeButtonAriaLabel}
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: theme.spacing(1),
            top: theme.spacing(1),
            zIndex: theme.zIndex.modal + 1,
          }}
        >
          <Close />
        </IconButton>

        {/* Modal title */}
        {title && (
          <Box
            id="modal-title"
            component="h2"
            sx={{
              mb: theme.spacing(2),
              pr: theme.spacing(4),
              typography: 'h6',
            }}
          >
            {title}
          </Box>
        )}

        {/* Modal content */}
        <Box
          id="modal-description"
          sx={{
            maxHeight: fullScreen ? 'calc(100vh - 128px)' : 'calc(90vh - 128px)',
            overflow: 'auto',
          }}
        >
          {children}
        </Box>
      </Box>
    </MuiModal>
  );
});

Modal.displayName = 'Modal';

export default Modal;