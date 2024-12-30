// @version react ^18.2.0
// @version @testing-library/react ^14.0.0
// @version vitest ^0.34.0

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { vi, beforeEach, describe, it, expect } from 'vitest';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from '../../../src/pages/admin/Dashboard';
import MetricsService from '../../../src/services/metrics.service';
import { createTestStore } from '../../utils/testStore';
import { UserRole } from '../../../src/interfaces/auth.interface';

// Mock dependencies
vi.mock('../../../src/services/metrics.service');
vi.mock('../../../src/hooks/useAuth', () => ({
  default: vi.fn(() => ({
    isAuthenticated: true,
    user: { role: UserRole.ADMIN },
    loading: false
  }))
}));

// Mock data
const mockSystemStatus = {
  database: 98,
  cache: 100,
  api: 99,
  thresholds: {
    warning: 90,
    critical: 80
  }
};

const mockActivityLogs = [
  {
    id: '1',
    timestamp: '2023-09-20T10:15:00Z',
    user: 'admin1',
    action: 'Import Data',
    status: 'Success'
  },
  {
    id: '2',
    timestamp: '2023-09-20T09:30:00Z',
    user: 'admin2',
    action: 'Update Metric',
    status: 'Success'
  }
];

describe('Dashboard Component', () => {
  let store: any;

  beforeEach(() => {
    store = createTestStore();
    vi.clearAllMocks();

    // Mock MetricsService methods
    (MetricsService.getInstance as any).mockImplementation(() => ({
      getSystemStatus: vi.fn().mockResolvedValue(mockSystemStatus),
      getRecentActivity: vi.fn().mockResolvedValue(mockActivityLogs)
    }));
  });

  const renderDashboard = () => {
    return render(
      <Provider store={store}>
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      </Provider>
    );
  };

  it('should render system status with correct thresholds', async () => {
    renderDashboard();

    // Wait for system status to load
    await waitFor(() => {
      expect(screen.getByText('System Status')).toBeInTheDocument();
    });

    // Verify database status
    const dbStatus = screen.getByText('Database').parentElement;
    expect(within(dbStatus!).getByText('98%')).toBeInTheDocument();
    expect(dbStatus).toHaveStyle({ color: 'success.main' });

    // Verify cache status
    const cacheStatus = screen.getByText('Cache').parentElement;
    expect(within(cacheStatus!).getByText('100%')).toBeInTheDocument();
    expect(cacheStatus).toHaveStyle({ color: 'success.main' });

    // Verify API status
    const apiStatus = screen.getByText('API').parentElement;
    expect(within(apiStatus!).getByText('99%')).toBeInTheDocument();
    expect(apiStatus).toHaveStyle({ color: 'success.main' });
  });

  it('should display recent activity logs with correct formatting', async () => {
    renderDashboard();

    // Wait for activity logs to load
    await waitFor(() => {
      expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    });

    // Verify activity log entries
    const activities = screen.getAllByRole('listitem');
    expect(activities).toHaveLength(2);

    // Verify first activity
    const firstActivity = activities[0];
    expect(firstActivity).toHaveTextContent('admin1');
    expect(firstActivity).toHaveTextContent('Import Data');
    expect(firstActivity).toHaveTextContent('Success');
    expect(firstActivity).toHaveTextContent('10:15');

    // Verify second activity
    const secondActivity = activities[1];
    expect(secondActivity).toHaveTextContent('admin2');
    expect(secondActivity).toHaveTextContent('Update Metric');
    expect(secondActivity).toHaveTextContent('Success');
    expect(secondActivity).toHaveTextContent('09:30');
  });

  it('should handle quick actions correctly', async () => {
    renderDashboard();

    // Test Add Metric action
    const addButton = screen.getByText('Add Metric');
    fireEvent.click(addButton);
    expect(await screen.findByText('Add metric feature coming soon')).toBeInTheDocument();

    // Test Upload Data action
    const uploadButton = screen.getByText('Upload Data');
    fireEvent.click(uploadButton);
    expect(await screen.findByText('Upload data feature coming soon')).toBeInTheDocument();

    // Test Refresh action
    const refreshButton = screen.getByText('Refresh');
    fireEvent.click(refreshButton);
    await waitFor(() => {
      expect(MetricsService.getInstance().getSystemStatus).toHaveBeenCalled();
    });
  });

  it('should enforce role-based access control', async () => {
    // Mock useAuth to return non-admin user
    vi.mocked(useAuth).mockImplementation(() => ({
      isAuthenticated: true,
      user: { role: UserRole.PUBLIC },
      loading: false
    }));

    renderDashboard();

    // Verify redirect or access denied message
    await waitFor(() => {
      expect(screen.queryByText('Admin Dashboard')).not.toBeInTheDocument();
    });
  });

  it('should meet performance requirements', async () => {
    const startTime = performance.now();
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('System Status')).toBeInTheDocument();
    });

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Verify render time is under 2 seconds
    expect(renderTime).toBeLessThan(2000);
  });

  it('should handle error states gracefully', async () => {
    // Mock service error
    (MetricsService.getInstance as any).mockImplementation(() => ({
      getSystemStatus: vi.fn().mockRejectedValue(new Error('Failed to fetch status')),
      getRecentActivity: vi.fn().mockRejectedValue(new Error('Failed to fetch activity'))
    }));

    renderDashboard();

    // Verify error message display
    await waitFor(() => {
      expect(screen.getByText('Failed to fetch status')).toBeInTheDocument();
    });
  });

  it('should update status periodically', async () => {
    vi.useFakeTimers();
    renderDashboard();

    // Verify initial call
    await waitFor(() => {
      expect(MetricsService.getInstance().getSystemStatus).toHaveBeenCalledTimes(1);
    });

    // Advance timer by 30 seconds
    vi.advanceTimersByTime(30000);

    // Verify subsequent call
    expect(MetricsService.getInstance().getSystemStatus).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });
});