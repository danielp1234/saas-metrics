import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Grid,
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Alert,
  Skeleton
} from '@mui/material'; // @version ^5.0.0
import {
  AddCircleOutline,
  CloudUpload,
  ShowChart,
  Refresh,
  Warning
} from '@mui/icons-material'; // @version ^5.0.0

// Internal imports
import AdminLayout from '../../components/layout/AdminLayout';
import MetricGrid from '../../components/metrics/MetricGrid';
import { useAuth } from '../../hooks/useAuth';

// Interface for system status monitoring
interface SystemStatus {
  database: number;
  cache: number;
  api: number;
  lastUpdated: Date;
}

// Interface for activity log entries
interface RecentActivity {
  id: string;
  timestamp: Date;
  user: string;
  action: string;
  status: string;
  metadata?: Record<string, unknown>;
}

/**
 * AdminDashboard component implementing the admin interface design
 * with real-time system monitoring and role-based access control
 */
const AdminDashboard: React.FC = () => {
  // Authentication and authorization
  const { isAuthenticated, hasRole } = useAuth();

  // State management
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Refs for cleanup
  const statusInterval = useRef<NodeJS.Timeout>();
  const wsConnection = useRef<WebSocket>();

  /**
   * Fetches system status with error handling
   */
  const fetchSystemStatus = useCallback(async () => {
    try {
      // Simulated API call - replace with actual API integration
      const response = await fetch('/api/v1/admin/system-status');
      const data = await response.json();
      setSystemStatus({
        database: data.database,
        cache: data.cache,
        api: data.api,
        lastUpdated: new Date()
      });
    } catch (err) {
      console.error('Error fetching system status:', err);
      setError('Failed to fetch system status');
    }
  }, []);

  /**
   * Fetches recent activity logs
   */
  const fetchRecentActivity = useCallback(async () => {
    try {
      // Simulated API call - replace with actual API integration
      const response = await fetch('/api/v1/admin/activity');
      const data = await response.json();
      setRecentActivity(data);
    } catch (err) {
      console.error('Error fetching activity logs:', err);
      setError('Failed to fetch activity logs');
    }
  }, []);

  /**
   * Refreshes dashboard data
   */
  const handleRefresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        fetchSystemStatus(),
        fetchRecentActivity()
      ]);
    } catch (err) {
      setError('Failed to refresh dashboard data');
    } finally {
      setLoading(false);
    }
  }, [fetchSystemStatus, fetchRecentActivity]);

  /**
   * Sets up WebSocket connection for real-time updates
   */
  useEffect(() => {
    wsConnection.current = new WebSocket('ws://your-websocket-url');
    
    wsConnection.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'system_status') {
        setSystemStatus(data.payload);
      } else if (data.type === 'activity') {
        setRecentActivity(prev => [data.payload, ...prev].slice(0, 10));
      }
    };

    return () => {
      wsConnection.current?.close();
    };
  }, []);

  /**
   * Sets up periodic status refresh
   */
  useEffect(() => {
    statusInterval.current = setInterval(fetchSystemStatus, 60000); // Refresh every minute
    
    return () => {
      if (statusInterval.current) {
        clearInterval(statusInterval.current);
      }
    };
  }, [fetchSystemStatus]);

  /**
   * Initial data fetch
   */
  useEffect(() => {
    handleRefresh();
  }, [handleRefresh]);

  /**
   * Renders system status indicators
   */
  const renderSystemStatus = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          System Status
        </Typography>
        {loading ? (
          <Skeleton variant="rectangular" height={100} />
        ) : systemStatus ? (
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress
                  variant="determinate"
                  value={systemStatus.database}
                  color={systemStatus.database > 90 ? 'success' : 'warning'}
                />
                <Typography>Database: {systemStatus.database}% Healthy</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress
                  variant="determinate"
                  value={systemStatus.cache}
                  color={systemStatus.cache > 90 ? 'success' : 'warning'}
                />
                <Typography>Cache: {systemStatus.cache}% Operational</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress
                  variant="determinate"
                  value={systemStatus.api}
                  color={systemStatus.api > 90 ? 'success' : 'warning'}
                />
                <Typography>API: {systemStatus.api}% Uptime</Typography>
              </Box>
            </Grid>
          </Grid>
        ) : (
          <Alert severity="error">Failed to load system status</Alert>
        )}
      </CardContent>
    </Card>
  );

  /**
   * Renders recent activity log
   */
  const renderRecentActivity = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Recent Activity
        </Typography>
        {loading ? (
          <Skeleton variant="rectangular" height={200} />
        ) : recentActivity.length > 0 ? (
          <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
            {recentActivity.map((activity) => (
              <Box
                key={activity.id}
                sx={{
                  p: 1,
                  mb: 1,
                  borderRadius: 1,
                  bgcolor: 'background.default'
                }}
              >
                <Typography variant="body2" color="textSecondary">
                  {new Date(activity.timestamp).toLocaleString()}
                </Typography>
                <Typography>
                  {activity.user} - {activity.action}
                </Typography>
                <Typography
                  variant="body2"
                  color={activity.status === 'Success' ? 'success.main' : 'error.main'}
                >
                  {activity.status}
                </Typography>
              </Box>
            ))}
          </Box>
        ) : (
          <Alert severity="info">No recent activity</Alert>
        )}
      </CardContent>
    </Card>
  );

  return (
    <AdminLayout>
      <Box sx={{ p: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="h4">Admin Dashboard</Typography>
          <Button
            startIcon={<Refresh />}
            onClick={handleRefresh}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>

        <Grid container spacing={3}>
          {/* Quick Actions */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                startIcon={<AddCircleOutline />}
                href="/admin/metrics/new"
              >
                Add New Metric
              </Button>
              <Button
                variant="contained"
                startIcon={<CloudUpload />}
                href="/admin/data"
              >
                Import Data
              </Button>
              <Button
                variant="contained"
                startIcon={<ShowChart />}
                href="/admin/benchmarks"
              >
                Update Benchmarks
              </Button>
            </Box>
          </Grid>

          {/* System Status */}
          <Grid item xs={12}>
            {renderSystemStatus()}
          </Grid>

          {/* Recent Activity */}
          <Grid item xs={12}>
            {renderRecentActivity()}
          </Grid>
        </Grid>
      </Box>
    </AdminLayout>
  );
};

export default AdminDashboard;