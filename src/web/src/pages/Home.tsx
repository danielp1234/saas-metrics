import React, { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // v6.x
import { 
  Box, 
  Container, 
  Typography, 
  Skeleton, 
  Alert 
} from '@mui/material'; // v5.x

// Internal imports
import MainLayout from '../components/layout/MainLayout';
import MetricGrid from '../components/metrics/MetricGrid';
import FilterPanel from '../components/filters/FilterPanel';
import { useMetrics } from '../hooks/useMetrics';

/**
 * Home page component that serves as the main landing page for the SaaS Metrics Platform.
 * Implements responsive design, accessibility standards, and interactive metric visualization.
 * 
 * @returns {JSX.Element} Rendered home page component
 */
const Home: React.FC = React.memo(() => {
  const navigate = useNavigate();
  const { 
    metrics, 
    loading, 
    error, 
    selectMetric, 
    refreshMetrics 
  } = useMetrics();

  /**
   * Effect to monitor component performance
   */
  useEffect(() => {
    const startTime = performance.now();
    return () => {
      const duration = performance.now() - startTime;
      if (duration > 100) {
        console.warn(`Slow Home component render: ${duration.toFixed(2)}ms`);
      }
    };
  }, []);

  /**
   * Handler for metric selection with navigation
   */
  const handleMetricSelect = useCallback((metricId: string) => {
    try {
      selectMetric(metricId);
      navigate(`/metrics/${metricId}`);
    } catch (error) {
      console.error('Error selecting metric:', error);
    }
  }, [navigate, selectMetric]);

  return (
    <MainLayout>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Page Header */}
        <Box mb={4}>
          <Typography 
            variant="h4" 
            component="h1" 
            gutterBottom
            sx={{ fontWeight: 'bold' }}
          >
            SaaS Metrics Dashboard
          </Typography>
          <Typography 
            variant="body1" 
            color="text.secondary"
            paragraph
          >
            Compare your SaaS metrics against industry benchmarks across different revenue ranges.
          </Typography>
        </Box>

        {/* Filters Section */}
        <Box 
          mb={4} 
          sx={{
            backgroundColor: 'background.paper',
            borderRadius: 1,
            p: 2,
            boxShadow: 1
          }}
        >
          <FilterPanel
            aria-label="Metrics filters"
            disabled={loading}
            data-testid="metrics-filter-panel"
          />
        </Box>

        {/* Loading State */}
        {loading && (
          <Box sx={{ mb: 4 }}>
            <Skeleton 
              variant="rectangular" 
              height={400} 
              sx={{ borderRadius: 1 }}
              animation="wave"
            />
          </Box>
        )}

        {/* Error State */}
        {error && (
          <Alert 
            severity="error" 
            sx={{ mb: 4 }}
            action={
              <button onClick={refreshMetrics}>
                Retry
              </button>
            }
          >
            {error}
          </Alert>
        )}

        {/* Metrics Grid */}
        {!loading && !error && (
          <MetricGrid
            onMetricSelect={handleMetricSelect}
            aria-label="SaaS metrics comparison grid"
            data-testid="metrics-grid"
          />
        )}
      </Container>
    </MainLayout>
  );
});

// Display name for debugging
Home.displayName = 'Home';

export default Home;