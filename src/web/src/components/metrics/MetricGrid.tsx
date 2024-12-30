// External imports with versions
import React, { useMemo, useCallback, useRef, useEffect } from 'react'; // v18.2.0
import { Grid, Box, Alert, AlertTitle, Button } from '@mui/material'; // v5.x
import { useVirtualizer } from '@tanstack/react-virtual'; // v3.0.0
import { Skeleton } from '@mui/material'; // v5.x

// Internal imports
import MetricCard from './MetricCard';
import { useMetrics } from '../../hooks/useMetrics';
import { BREAKPOINTS, GRID_COLUMNS } from '../../config/constants';

/**
 * Props interface for MetricGrid component
 */
interface MetricGridProps {
  /** Optional filters for metrics display */
  filters?: MetricFilters;
  /** Callback when metric is selected */
  onMetricSelect?: (metricId: string) => void;
  /** Optional CSS class name */
  className?: string;
  /** Optional test ID for testing */
  testId?: string;
}

/**
 * MetricGrid component displays a responsive grid of SaaS metric cards with
 * enterprise-grade features including virtualization, accessibility, and error handling.
 * 
 * @component
 * @example
 * ```tsx
 * <MetricGrid 
 *   filters={{ category: 'GROWTH' }}
 *   onMetricSelect={(id) => console.log('Selected metric:', id)}
 * />
 * ```
 */
const MetricGrid: React.FC<MetricGridProps> = React.memo(({
  filters,
  onMetricSelect,
  className,
  testId = 'metric-grid'
}) => {
  // Get metrics data and operations from hook
  const {
    metrics,
    loading,
    error,
    selectMetric,
    refreshMetrics,
    clearError
  } = useMetrics(filters);

  // Container ref for virtualization
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate columns based on viewport width
  const columns = useMemo(() => {
    const width = window.innerWidth;
    if (width < BREAKPOINTS.TABLET) return GRID_COLUMNS.MOBILE;
    if (width < BREAKPOINTS.DESKTOP) return GRID_COLUMNS.TABLET;
    return GRID_COLUMNS.DESKTOP;
  }, []);

  // Setup virtual scrolling for performance
  const rowVirtualizer = useVirtualizer({
    count: Math.ceil(metrics.length / columns),
    getScrollElement: () => containerRef.current,
    estimateSize: () => 300, // Estimated row height
    overscan: 3 // Number of items to render outside viewport
  });

  // Memoized handler for metric selection
  const handleMetricSelect = useCallback((metricId: string) => {
    selectMetric(metricId);
    onMetricSelect?.(metricId);
  }, [selectMetric, onMetricSelect]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent, metricId: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleMetricSelect(metricId);
    }
  }, [handleMetricSelect]);

  // Effect for performance monitoring
  useEffect(() => {
    const startTime = performance.now();
    return () => {
      const duration = performance.now() - startTime;
      if (duration > 100) { // Log slow renders
        console.warn(`Slow MetricGrid render: ${duration.toFixed(2)}ms`);
      }
    };
  });

  // Render loading skeletons
  if (loading) {
    return (
      <Grid container spacing={2} className={className} data-testid={`${testId}-loading`}>
        {Array.from({ length: 6 }).map((_, index) => (
          <Grid item xs={12} sm={6} md={4} key={`skeleton-${index}`}>
            <Skeleton
              variant="rectangular"
              height={300}
              sx={{ borderRadius: 1 }}
              animation="wave"
            />
          </Grid>
        ))}
      </Grid>
    );
  }

  // Render error state
  if (error) {
    return (
      <Alert 
        severity="error"
        action={
          <Button color="inherit" onClick={refreshMetrics}>
            Retry
          </Button>
        }
        onClose={clearError}
        data-testid={`${testId}-error`}
      >
        <AlertTitle>Error Loading Metrics</AlertTitle>
        {error}
      </Alert>
    );
  }

  // Render empty state
  if (!metrics.length) {
    return (
      <Alert severity="info" data-testid={`${testId}-empty`}>
        <AlertTitle>No Metrics Available</AlertTitle>
        No metrics found for the selected filters.
      </Alert>
    );
  }

  return (
    <Box
      ref={containerRef}
      sx={{
        height: '100%',
        overflow: 'auto',
        width: '100%'
      }}
      data-testid={testId}
      role="grid"
      aria-label="Metrics grid"
    >
      <Grid 
        container 
        spacing={2}
        className={className}
        sx={{ minHeight: rowVirtualizer.getTotalSize() }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const rowStartIndex = virtualRow.index * columns;
          return (
            <React.Fragment key={virtualRow.index}>
              {Array.from({ length: columns }).map((_, columnIndex) => {
                const metricIndex = rowStartIndex + columnIndex;
                const metric = metrics[metricIndex];

                if (!metric) return null;

                return (
                  <Grid 
                    item 
                    xs={12} 
                    sm={columns === 2 ? 6 : 12} 
                    md={columns === 3 ? 4 : 6}
                    key={metric.id}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: `${100 / columns}%`,
                      transform: `translateY(${virtualRow.start}px)`
                    }}
                  >
                    <MetricCard
                      metric={metric}
                      onClick={handleMetricSelect}
                      onKeyDown={(e) => handleKeyDown(e, metric.id)}
                      aria-label={`${metric.name} metric card`}
                    />
                  </Grid>
                );
              })}
            </React.Fragment>
          );
        })}
      </Grid>
    </Box>
  );
});

// Display name for debugging
MetricGrid.displayName = 'MetricGrid';

export default MetricGrid;