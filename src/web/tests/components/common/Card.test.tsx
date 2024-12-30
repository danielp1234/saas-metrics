import React from 'react';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, useTheme } from '@mui/material/styles';
import { axe, toHaveNoViolations } from 'jest-axe';
import Card from '../../../src/components/common/Card';
import theme from '../../../src/assets/styles/theme';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Mock intersection observer for visibility tests
const mockIntersectionObserver = jest.fn();
mockIntersectionObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null
});
window.IntersectionObserver = mockIntersectionObserver;

// Helper function to render components with theme
const renderWithTheme = (ui: React.ReactElement, options = {}) => {
  const { dir = 'ltr', ...rest } = options;
  return render(
    <ThemeProvider theme={{ ...theme, direction: dir }}>
      {ui}
    </ThemeProvider>,
    rest
  );
};

describe('Card Component', () => {
  // Basic Rendering Tests
  describe('Rendering', () => {
    it('should render without crashing', () => {
      renderWithTheme(<Card>Test Content</Card>);
      expect(screen.getByTestId('card')).toBeInTheDocument();
    });

    it('should render children correctly', () => {
      renderWithTheme(
        <Card>
          <div data-testid="child">Child Content</div>
        </Card>
      );
      expect(screen.getByTestId('child')).toBeInTheDocument();
      expect(screen.getByText('Child Content')).toBeInTheDocument();
    });

    it('should handle RTL layout', () => {
      renderWithTheme(<Card>RTL Content</Card>, { dir: 'rtl' });
      const card = screen.getByTestId('card');
      expect(card).toHaveStyle({ marginRight: '0' });
      expect(card).toHaveStyle({ marginLeft: `${theme.spacing(2)}` });
    });
  });

  // Theme Integration Tests
  describe('Theming', () => {
    it('should apply correct default elevation', () => {
      renderWithTheme(<Card>Content</Card>);
      const card = screen.getByTestId('card');
      expect(card).toHaveStyle({ boxShadow: theme.shadows[2] });
    });

    it('should apply custom elevation when provided', () => {
      renderWithTheme(<Card elevation={4}>Content</Card>);
      const card = screen.getByTestId('card');
      expect(card).toHaveStyle({ boxShadow: theme.shadows[4] });
    });

    it('should use theme spacing for padding', () => {
      renderWithTheme(<Card>Content</Card>);
      const content = within(screen.getByTestId('card')).getByRole('region');
      expect(content).toHaveStyle({ padding: theme.spacing(2) });
    });
  });

  // Interaction Tests
  describe('Interactions', () => {
    it('should handle click events when interactive', async () => {
      const handleClick = jest.fn();
      renderWithTheme(
        <Card interactive onClick={handleClick}>
          Interactive Card
        </Card>
      );
      
      const card = screen.getByTestId('card');
      await userEvent.click(card);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should not trigger click events when not interactive', async () => {
      const handleClick = jest.fn();
      renderWithTheme(
        <Card onClick={handleClick}>
          Non-interactive Card
        </Card>
      );
      
      const card = screen.getByTestId('card');
      await userEvent.click(card);
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should handle keyboard navigation when interactive', async () => {
      const handleClick = jest.fn();
      renderWithTheme(
        <Card interactive onClick={handleClick}>
          Interactive Card
        </Card>
      );
      
      const card = screen.getByTestId('card');
      card.focus();
      fireEvent.keyDown(card, { key: 'Enter' });
      expect(handleClick).toHaveBeenCalledTimes(1);

      fireEvent.keyDown(card, { key: ' ' });
      expect(handleClick).toHaveBeenCalledTimes(2);
    });
  });

  // Accessibility Tests
  describe('Accessibility', () => {
    it('should meet WCAG accessibility guidelines', async () => {
      const { container } = renderWithTheme(
        <Card interactive aria-label="Test card">
          Accessible Content
        </Card>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have correct ARIA attributes when interactive', () => {
      renderWithTheme(
        <Card interactive aria-label="Interactive card">
          Content
        </Card>
      );
      const card = screen.getByTestId('card');
      expect(card).toHaveAttribute('role', 'button');
      expect(card).toHaveAttribute('tabIndex', '0');
      expect(card).toHaveAttribute('aria-label', 'Interactive card');
    });

    it('should not have button role when non-interactive', () => {
      renderWithTheme(<Card>Content</Card>);
      const card = screen.getByTestId('card');
      expect(card).not.toHaveAttribute('role', 'button');
      expect(card).not.toHaveAttribute('tabIndex');
    });
  });

  // Style Tests
  describe('Styling', () => {
    it('should apply hover styles when interactive', async () => {
      renderWithTheme(
        <Card interactive>
          Hover Content
        </Card>
      );
      
      const card = screen.getByTestId('card');
      await userEvent.hover(card);
      
      expect(card).toHaveStyle({
        transform: 'translateY(-2px)',
        boxShadow: theme.shadows[4]
      });
    });

    it('should apply focus styles when interactive', () => {
      renderWithTheme(
        <Card interactive>
          Focus Content
        </Card>
      );
      
      const card = screen.getByTestId('card');
      card.focus();
      
      expect(card).toHaveStyle({
        outline: `2px solid ${theme.palette.primary.main}`,
        outlineOffset: '2px'
      });
    });

    it('should apply custom className when provided', () => {
      const customClass = 'custom-card';
      renderWithTheme(
        <Card className={customClass}>
          Custom Styled Content
        </Card>
      );
      
      expect(screen.getByTestId('card')).toHaveClass(customClass);
    });
  });

  // Edge Cases
  describe('Edge Cases', () => {
    it('should handle empty children', () => {
      renderWithTheme(<Card />);
      const card = screen.getByTestId('card');
      expect(card).toBeEmptyDOMElement();
    });

    it('should handle long content without breaking layout', () => {
      const longText = 'a'.repeat(1000);
      renderWithTheme(<Card>{longText}</Card>);
      const card = screen.getByTestId('card');
      expect(card).toBeVisible();
      expect(card).toHaveStyle({ overflowWrap: 'break-word' });
    });

    it('should maintain consistent spacing with nested cards', () => {
      renderWithTheme(
        <Card>
          <Card>Nested Card</Card>
        </Card>
      );
      
      const cards = screen.getAllByTestId('card');
      expect(cards).toHaveLength(2);
      expect(cards[1]).toHaveStyle({ marginBottom: theme.spacing(2) });
    });
  });
});