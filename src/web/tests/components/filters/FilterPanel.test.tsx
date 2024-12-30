// @version react ^18.2.0
// @version @testing-library/react ^14.x
// @version @testing-library/user-event ^14.x
// @version jest ^29.5.x
// @version @axe-core/react ^4.7.x

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import FilterPanel from '../../src/components/filters/FilterPanel';
import { MetricType } from '../../src/interfaces/metrics.interface';
import { useMetrics } from '../../src/hooks/useMetrics';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock useMetrics hook
jest.mock('../../src/hooks/useMetrics', () => ({
  useMetrics: jest.fn(() => ({
    refreshMetrics: jest.fn(),
    getMetricsList: jest.fn(),
    getSourcesList: jest.fn()
  }))
}));

describe('FilterPanel', () => {
  // Default props for testing
  const defaultProps = {
    selectedMetric: null,
    selectedSource: null,
    selectedARRRange: undefined,
    onMetricChange: jest.fn(),
    onSourceChange: jest.fn(),
    onARRChange: jest.fn(),
    isLoading: false,
    error: null
  };

  // Setup function before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders all filter components correctly', () => {
      render(<FilterPanel {...defaultProps} />);

      // Verify presence of all filters
      expect(screen.getByRole('region', { name: /metrics filter panel/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/annual recurring revenue range filter/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/select saas metric/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/filter by data source/i)).toBeInTheDocument();
    });

    it('displays loading state correctly', () => {
      render(<FilterPanel {...defaultProps} isLoading={true} />);
      
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByLabelText(/loading filters/i)).toBeInTheDocument();
    });

    it('displays error state correctly', () => {
      const error = new Error('Test error message');
      render(<FilterPanel {...defaultProps} error={error} />);
      
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(error.message)).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('handles ARR range selection correctly', async () => {
      const user = userEvent.setup();
      render(<FilterPanel {...defaultProps} />);

      const arrFilter = screen.getByLabelText(/annual recurring revenue range filter/i);
      await user.click(arrFilter);
      
      const option = screen.getByText('$1M - $5M ARR');
      await user.click(option);

      expect(defaultProps.onARRChange).toHaveBeenCalledWith('1M-5M');
    });

    it('handles metric selection correctly', async () => {
      const user = userEvent.setup();
      render(<FilterPanel {...defaultProps} />);

      const metricFilter = screen.getByLabelText(/select saas metric/i);
      await user.click(metricFilter);
      
      const option = screen.getByText('Revenue Growth');
      await user.click(option);

      expect(defaultProps.onMetricChange).toHaveBeenCalledWith(MetricType.REVENUE_GROWTH);
    });

    it('handles source selection correctly', async () => {
      const user = userEvent.setup();
      render(<FilterPanel {...defaultProps} />);

      const sourceFilter = screen.getByLabelText(/filter by data source/i);
      await user.click(sourceFilter);
      
      const option = screen.getByText('OpenView Partners');
      await user.click(option);

      expect(defaultProps.onSourceChange).toHaveBeenCalledWith('openview');
    });

    it('refreshes metrics when filters change', async () => {
      const mockRefreshMetrics = jest.fn();
      (useMetrics as jest.Mock).mockImplementation(() => ({
        refreshMetrics: mockRefreshMetrics,
        getMetricsList: jest.fn(),
        getSourcesList: jest.fn()
      }));

      render(<FilterPanel {...defaultProps} selectedMetric={MetricType.REVENUE_GROWTH} />);

      await waitFor(() => {
        expect(mockRefreshMetrics).toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility', () => {
    it('has no accessibility violations', async () => {
      const { container } = render(<FilterPanel {...defaultProps} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<FilterPanel {...defaultProps} />);

      // Tab through filters
      await user.tab();
      expect(screen.getByLabelText(/annual recurring revenue range filter/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/select saas metric/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/filter by data source/i)).toHaveFocus();
    });

    it('announces filter changes to screen readers', async () => {
      const user = userEvent.setup();
      render(<FilterPanel {...defaultProps} />);

      const sourceFilter = screen.getByLabelText(/filter by data source/i);
      await user.click(sourceFilter);
      
      const option = screen.getByText('OpenView Partners');
      await user.click(option);

      const announcement = screen.getByRole('status');
      expect(announcement).toHaveTextContent(/data source filtered to openview partners/i);
    });
  });

  describe('Error Handling', () => {
    it('disables filters when in error state', () => {
      render(<FilterPanel {...defaultProps} error={new Error('Test error')} />);

      expect(screen.getByLabelText(/annual recurring revenue range filter/i)).toBeDisabled();
      expect(screen.getByLabelText(/select saas metric/i)).toBeDisabled();
      expect(screen.getByLabelText(/filter by data source/i)).toBeDisabled();
    });

    it('recovers from error state when error is cleared', async () => {
      const { rerender } = render(<FilterPanel {...defaultProps} error={new Error('Test error')} />);
      
      rerender(<FilterPanel {...defaultProps} error={null} />);

      expect(screen.getByLabelText(/annual recurring revenue range filter/i)).not.toBeDisabled();
      expect(screen.getByLabelText(/select saas metric/i)).not.toBeDisabled();
      expect(screen.getByLabelText(/filter by data source/i)).not.toBeDisabled();
    });
  });

  describe('Performance', () => {
    it('memoizes callbacks correctly', async () => {
      const { rerender } = render(<FilterPanel {...defaultProps} />);
      const initialOnMetricChange = defaultProps.onMetricChange;
      
      rerender(<FilterPanel {...defaultProps} />);
      
      expect(defaultProps.onMetricChange).toBe(initialOnMetricChange);
    });

    it('prevents unnecessary re-renders', () => {
      const renderCount = jest.fn();
      const TestComponent = () => {
        renderCount();
        return <FilterPanel {...defaultProps} />;
      };

      const { rerender } = render(<TestComponent />);
      rerender(<TestComponent />);

      expect(renderCount).toHaveBeenCalledTimes(1);
    });
  });
});