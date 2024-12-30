import React, { useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Box, CircularProgress, Alert } from '@mui/material'; // @version ^5.0.0

// Internal components
import PageHeader from '../../components/common/PageHeader';
import MetricDetail from '../../components/metrics/MetricDetail';
import FilterPanel from '../../components/filters/FilterPanel';
import ErrorBoundary from '../../components/common/ErrorBoundary';

// Hooks and utilities
import { useMetrics } from '../../hooks/useMetrics';

/**
 * Interface for URL parameters
 */
interface MetricDetailPageParams {
  id: string;
}

/**
 * Interface for component props
 */
interface MetricDetailPageProps {
  className?: string;
}

/**
 * MetricDetailPage Component
 * 
 * Displays detailed information about a specific SaaS metric, including its
 * distribution chart, percentile data, and industry comparisons. Implements
 * comprehensive error handling and loading states.
 * 
 * @param props - Component props
 * @returns Rendered metric detail page
 */
const MetricDetailPage: React.FC<MetricDetailPageProps> = ({ className }) => {
  // Get metric ID from URL parameters
  const { id } = useParams<MetricDetailPageParams>();

  // Get metrics context including loading and error states
  const {
    selectedMetric,
    loading,
    error,
    clearError,
    selectMetric,
    refreshMetrics
  } = useMetrics();

  // Effect to load metric data when ID changes
  useEffect(() => {
    if (id) {
      selectMetric(id);
    }

    // Cleanup on unmount or ID change
    return () => {
      clearError();
    };
  }, [id, selectMetric, clearError]);

  /**
   * Handles errors from child components
   */
  const handleError = useCallback((error: Error) => {
    console.error('Error in metric detail:', error);
    clearError();
  }, [clearError]);

  /**
   * Renders loading state
   */
  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '400px'
        }}
        role="status"
        aria-label="Loading metric details"
      >
        <CircularProgress size={40} />
      </Box>
    );
  }

  /**
   * Renders error state
   */
  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert 
          severity="error"
          onClose={clearError}
          sx={{ mb: 2 }}
        >
          {error.message || 'Failed to load metric details'}
        </Alert>
      </Box>
    );
  }

  /**
   * Renders not found state
   */
  if (!selectedMetric) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          Metric not found
        </Alert>
      </Box>
    );
  }

  return (
    <ErrorBoundary onError={handleError}>
      <Box className={className}>
        {/* Page Header */}
        <PageHeader
          title={selectedMetric.name}
          subtitle={selectedMetric.description}
          backButton
          helpText="View detailed metric information including distribution and percentile data"
        />

        {/* Main Content */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              md: '280px 1fr'
            },
            gap: 3,
            p: 3
          }}
        >
          {/* Filter Panel */}
          <Box
            sx={{
              display: { xs: 'none', md: 'block' },
              position: 'sticky',
              top: 0
            }}
          >
            <FilterPanel
              aria-label="Metric filters"
              data-testid="metric-detail-filters"
            />
          </Box>

          {/* Metric Detail */}
          <Box>
            <MetricDetail
              metricId={id}
              onError={handleError}
            />
          </Box>
        </Box>
      </Box>
    </ErrorBoundary>
  );
};

// Display name for debugging
MetricDetailPage.displayName = 'MetricDetailPage';

export default MetricDetailPage;