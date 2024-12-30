// @version react ^18.2.0
// @version @mui/material ^5.0.0
// @version formik ^2.4.0

import React, { useState, useEffect, useCallback } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Divider,
  Switch,
  FormControlLabel,
  TextField,
  Button,
  CircularProgress,
  Dialog,
} from '@mui/material';
import { Save as SaveIcon, Warning as WarningIcon } from '@mui/icons-material';
import AdminLayout from '../../components/layout/AdminLayout';
import PageHeader from '../../components/common/PageHeader';
import useAuth from '../../hooks/useAuth';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import useNotification from '../../hooks/useNotification';

// Validation schema for settings form
const validationSchema = Yup.object().shape({
  dataRetentionDays: Yup.number()
    .required('Data retention period is required')
    .min(1, 'Minimum retention period is 1 day')
    .max(365, 'Maximum retention period is 365 days'),
  enableAuditLogs: Yup.boolean(),
  enableCaching: Yup.boolean(),
  cacheDurationMinutes: Yup.number()
    .when('enableCaching', {
      is: true,
      then: Yup.number()
        .required('Cache duration is required when caching is enabled')
        .min(1, 'Minimum cache duration is 1 minute')
        .max(1440, 'Maximum cache duration is 24 hours (1440 minutes)')
    })
});

// Initial form values
const initialValues = {
  dataRetentionDays: 30,
  enableAuditLogs: true,
  enableCaching: true,
  cacheDurationMinutes: 15
};

/**
 * Settings page component for admin interface with comprehensive configuration options
 * and validation.
 */
const Settings: React.FC = () => {
  const { user, checkPermission } = useAuth();
  const { showNotification } = useNotification();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUnsavedChanges, setShowUnsavedChanges] = useState(false);

  // Form handling with Formik
  const formik = useFormik({
    initialValues,
    validationSchema,
    onSubmit: async (values) => {
      try {
        setIsSubmitting(true);
        // Simulate API call with timeout
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Log settings update for audit trail
        console.debug('Settings updated:', values);
        
        showNotification('Settings updated successfully', 'success');
        setIsSubmitting(false);
      } catch (error) {
        console.error('Error updating settings:', error);
        showNotification('Failed to update settings', 'error');
        setIsSubmitting(false);
      }
    }
  });

  // Handle unsaved changes warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (formik.dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [formik.dirty]);

  // Handle navigation attempt with unsaved changes
  const handleNavigationAttempt = useCallback(() => {
    if (formik.dirty) {
      setShowUnsavedChanges(true);
      return false;
    }
    return true;
  }, [formik.dirty]);

  // Render settings form
  const renderSettingsForm = () => (
    <form onSubmit={formik.handleSubmit}>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Data Management
          </Typography>
          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
              id="dataRetentionDays"
              name="dataRetentionDays"
              label="Data Retention Period (Days)"
              type="number"
              value={formik.values.dataRetentionDays}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.dataRetentionDays && Boolean(formik.errors.dataRetentionDays)}
              helperText={formik.touched.dataRetentionDays && formik.errors.dataRetentionDays}
              inputProps={{ min: 1, max: 365 }}
            />
          </Box>

          <FormControlLabel
            control={
              <Switch
                checked={formik.values.enableAuditLogs}
                onChange={formik.handleChange}
                name="enableAuditLogs"
              />
            }
            label="Enable Audit Logging"
          />
        </CardContent>
      </Card>

      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Performance Settings
          </Typography>
          <Box sx={{ mb: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={formik.values.enableCaching}
                  onChange={formik.handleChange}
                  name="enableCaching"
                />
              }
              label="Enable Data Caching"
            />
          </Box>

          {formik.values.enableCaching && (
            <TextField
              fullWidth
              id="cacheDurationMinutes"
              name="cacheDurationMinutes"
              label="Cache Duration (Minutes)"
              type="number"
              value={formik.values.cacheDurationMinutes}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.cacheDurationMinutes && Boolean(formik.errors.cacheDurationMinutes)}
              helperText={formik.touched.cacheDurationMinutes && formik.errors.cacheDurationMinutes}
              inputProps={{ min: 1, max: 1440 }}
            />
          )}
        </CardContent>
      </Card>

      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          type="submit"
          variant="contained"
          color="primary"
          disabled={!formik.dirty || isSubmitting}
          startIcon={isSubmitting ? <CircularProgress size={20} /> : <SaveIcon />}
        >
          Save Changes
        </Button>
      </Box>
    </form>
  );

  // Render unsaved changes dialog
  const renderUnsavedChangesDialog = () => (
    <Dialog
      open={showUnsavedChanges}
      onClose={() => setShowUnsavedChanges(false)}
      aria-labelledby="unsaved-changes-dialog"
    >
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          <WarningIcon color="warning" sx={{ mr: 1, verticalAlign: 'middle' }} />
          Unsaved Changes
        </Typography>
        <Typography variant="body1" gutterBottom>
          You have unsaved changes. Are you sure you want to leave?
        </Typography>
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <Button
            variant="outlined"
            onClick={() => setShowUnsavedChanges(false)}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              formik.resetForm();
              setShowUnsavedChanges(false);
            }}
          >
            Discard Changes
          </Button>
        </Box>
      </Box>
    </Dialog>
  );

  return (
    <ErrorBoundary>
      <AdminLayout>
        <PageHeader
          title="Settings"
          subtitle="Configure system-wide settings and preferences"
        />
        <Box sx={{ p: 3 }}>
          {renderSettingsForm()}
          {renderUnsavedChangesDialog()}
        </Box>
      </AdminLayout>
    </ErrorBoundary>
  );
};

export default Settings;