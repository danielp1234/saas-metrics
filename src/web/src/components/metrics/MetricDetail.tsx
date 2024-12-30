import React, { useCallback, useMemo } from 'react';
import { Box, Typography, CircularProgress, Skeleton } from '@mui/material';
import DistributionChart from '../charts/DistributionChart';
import PercentileTable from './PercentileTable';
import { useMetrics } from '../../hooks/useMetrics';
import ErrorBoundary from '../common/ErrorBoundary';
import { formatMetricValue } from '../../utils/metrics.utils';
import { MetricUnit } from '../../interfaces/metrics.interface';

/**
 * Props interface for the MetricDetail component
 */
interface MetricDetailProps {
  /** Unique identifier of the metric to display */
  metricId: string;
  /** Optional error callback handler */
  onError?: (error: Error) => void;
}

/**
 * MetricDetail component displays comprehensive information about a specific SaaS metric
 * including distribution chart, percentile data, and industry comparisons.
 * Implements WCAG 2.1 Level AA compliance for accessibility.
 */
const MetricDetail: React.FC<MetricDetailProps> = React.memo(({ metricId, onError }) => {
  // Fetch metric data using custom hook
  const {
    selectedMetric,
    loading,
    error,
    clearError
  } = useMetrics();

  // Memoized error handler
  const handleError = useCallback((error: Error) => {
    clearError();
    onError?.(error);
  }, [clearError, onError]);

  // Memoized chart data preparation
  const chartData = useMemo(() => {
    if (!selectedMetric?.distribution) return null;
    return {
      values: selectedMetric.distribution.frequencies,
      accessibilityLabel: `Distribution chart for ${selectedMetric.name}`
    };
  }, [selectedMetric]);

  // Render loading state
  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="text" width="50%" height={40} />
        <Skeleton variant="rectangular" width="100%" height={300} sx={{ my: 2 }} />
        <Skeleton variant="rectangular" width="100%" height={200} />
      </Box>
    );
  }

  // Render error state
  if (error) {
    return (
      <Box
        sx={{
          p: 3,
          textAlign: 'center',
          color: 'error.main'
        }}
        role="alert"
      >
        <Typography variant="h6" gutterBottom>
          Error Loading Metric Details
        </Typography>
        <Typography variant="body1">
          {error.message}
        </Typography>
      </Box>
    );
  }

  // Render empty state
  if (!selectedMetric) {
    return (
      <Box
        sx={{
          p: 3,
          textAlign: 'center',
          color: 'text.secondary'
        }}
      >
        <Typography variant="h6">
          No metric selected
        </Typography>
      </Box>
    );
  }

  return (
    <ErrorBoundary onError={handleError}>
      <Box
        sx={{
          p: 3,
          '& > *:not(:last-child)': {
            mb: 3
          }
        }}
      >
        {/* Metric Header */}
        <Box>
          <Typography
            variant="h4"
            component="h1"
            gutterBottom
            sx={{ fontWeight: 'medium' }}
          >
            {selectedMetric.name}
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            paragraph
          >
            {selectedMetric.description}
          </Typography>
        </Box>

        {/* Current Value */}
        <Box
          sx={{
            bgcolor: 'background.paper',
            p: 2,
            borderRadius: 1,
            boxShadow: 1
          }}
        >
          <Typography variant="subtitle1" gutterBottom>
            Current Value
          </Typography>
          <Typography variant="h3" component="p">
            {formatMetricValue(selectedMetric.value, selectedMetric.unit)}
          </Typography>
        </Box>

        {/* Distribution Chart */}
        {chartData && (
          <Box
            sx={{
              bgcolor: 'background.paper',
              p: 2,
              borderRadius: 1,
              boxShadow: 1
            }}
          >
            <Typography variant="h6" gutterBottom>
              Distribution
            </Typography>
            <DistributionChart
              values={chartData.values}
              height={300}
              ariaLabel={chartData.accessibilityLabel}
            />
          </Box>
        )}

        {/* Percentile Table */}
        <Box
          sx={{
            bgcolor: 'background.paper',
            p: 2,
            borderRadius: 1,
            boxShadow: 1
          }}
        >
          <Typography variant="h6" gutterBottom>
            Percentile Distribution
          </Typography>
          <PercentileTable
            percentiles={selectedMetric.percentiles}
            industryAverages={selectedMetric.industryAverages}
            unit={selectedMetric.unit === MetricUnit.PERCENTAGE ? '%' : '$'}
          />
        </Box>

        {/* Calculation Method */}
        <Box
          sx={{
            bgcolor: 'background.paper',
            p: 2,
            borderRadius: 1,
            boxShadow: 1
          }}
        >
          <Typography variant="h6" gutterBottom>
            Calculation Method
          </Typography>
          <Typography variant="body1">
            {selectedMetric.calculationMethod}
          </Typography>
        </Box>
      </Box>
    </ErrorBoundary>
  );
});

// Display name for debugging
MetricDetail.displayName = 'MetricDetail';

export default MetricDetail;
export type { MetricDetailProps };