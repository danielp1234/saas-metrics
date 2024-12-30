// @version react ^18.2.0
// @version @mui/material ^5.0.0
// @version @mui/icons-material ^5.0.0

import React, { useState, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  Alert,
  FormControlLabel,
  Box,
  Typography,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';

import Table from '../../components/common/Table';
import Button from '../../components/common/Button';
import PageHeader from '../../components/common/PageHeader';
import ApiService from '../../services/api.service';
import { API_ENDPOINTS } from '../../config/constants';

// Interfaces
interface DataSource {
  id: string;
  name: string;
  description: string;
  active: boolean;
  config: Record<string, any>;
  created_at: string;
  updated_at: string;
  last_import: string | null;
}

interface DataSourceFormData {
  name: string;
  description: string;
  config: Record<string, any>;
  active: boolean;
}

interface DataSourceState {
  items: DataSource[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

const DataSources: React.FC = () => {
  // State management
  const [state, setState] = useState<DataSourceState>({
    items: [],
    loading: false,
    error: null,
    pagination: {
      page: 0,
      limit: 10,
      total: 0,
    },
  });

  const [selectedSource, setSelectedSource] = useState<DataSource | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [formData, setFormData] = useState<DataSourceFormData>({
    name: '',
    description: '',
    config: {},
    active: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Fetch data sources
  const fetchDataSources = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const response = await ApiService.get<{ data: DataSource[]; total: number }>(
        `${API_ENDPOINTS.ADMIN.SOURCES}?page=${state.pagination.page + 1}&limit=${state.pagination.limit}`
      );
      setState(prev => ({
        ...prev,
        items: response.data.data,
        pagination: {
          ...prev.pagination,
          total: response.data.total,
        },
        loading: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to fetch data sources',
        loading: false,
      }));
    }
  }, [state.pagination.page, state.pagination.limit]);

  useEffect(() => {
    fetchDataSources();
  }, [fetchDataSources]);

  // Form validation
  const validateForm = (data: DataSourceFormData): boolean => {
    const errors: Record<string, string> = {};

    if (!data.name.trim()) {
      errors.name = 'Name is required';
    } else if (data.name.length < 2 || data.name.length > 50) {
      errors.name = 'Name must be between 2 and 50 characters';
    }

    if (!data.description.trim()) {
      errors.description = 'Description is required';
    } else if (data.description.length > 200) {
      errors.description = 'Description must not exceed 200 characters';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm(formData)) return;

    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      if (selectedSource) {
        await ApiService.put(`${API_ENDPOINTS.ADMIN.SOURCES}/${selectedSource.id}`, formData);
      } else {
        await ApiService.post(API_ENDPOINTS.ADMIN.SOURCES, formData);
      }
      await fetchDataSources();
      handleCloseDialog();
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to save data source',
        loading: false,
      }));
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!selectedSource) return;

    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      await ApiService.delete(`${API_ENDPOINTS.ADMIN.SOURCES}/${selectedSource.id}`);
      await fetchDataSources();
      setIsDeleteDialogOpen(false);
      setSelectedSource(null);
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to delete data source',
        loading: false,
      }));
    }
  };

  // Dialog handlers
  const handleOpenDialog = (source?: DataSource) => {
    if (source) {
      setSelectedSource(source);
      setFormData({
        name: source.name,
        description: source.description,
        config: source.config,
        active: source.active,
      });
    } else {
      setSelectedSource(null);
      setFormData({
        name: '',
        description: '',
        config: {},
        active: true,
      });
    }
    setFormErrors({});
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedSource(null);
    setFormErrors({});
  };

  // Table columns configuration
  const columns = [
    {
      id: 'name',
      label: 'Name',
      sortable: true,
      width: '20%',
    },
    {
      id: 'description',
      label: 'Description',
      sortable: false,
      width: '30%',
    },
    {
      id: 'active',
      label: 'Status',
      sortable: true,
      width: '10%',
      format: (value: boolean) => (
        <Typography
          color={value ? 'success.main' : 'error.main'}
          variant="body2"
        >
          {value ? 'Active' : 'Inactive'}
        </Typography>
      ),
    },
    {
      id: 'last_import',
      label: 'Last Import',
      sortable: true,
      width: '20%',
      format: (value: string | null) => value ? new Date(value).toLocaleString() : 'Never',
    },
    {
      id: 'actions',
      label: 'Actions',
      sortable: false,
      width: '20%',
      format: (_: any, row: DataSource) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            startIcon={<EditIcon />}
            size="small"
            onClick={() => handleOpenDialog(row)}
            ariaLabel={`Edit ${row.name}`}
          >
            Edit
          </Button>
          <Button
            startIcon={<DeleteIcon />}
            size="small"
            color="error"
            onClick={() => {
              setSelectedSource(row);
              setIsDeleteDialogOpen(true);
            }}
            ariaLabel={`Delete ${row.name}`}
          >
            Delete
          </Button>
        </Box>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Data Sources"
        subtitle="Manage benchmark data sources and configurations"
        actions={
          <Button
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            ariaLabel="Add new data source"
          >
            Add Source
          </Button>
        }
      />

      {state.error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {state.error}
        </Alert>
      )}

      <Table
        data={state.items}
        columns={columns}
        loading={state.loading}
        pagination={state.pagination}
        onPageChange={(page) => setState(prev => ({
          ...prev,
          pagination: { ...prev.pagination, page },
        }))}
        ariaLabel="Data sources table"
      />

      {/* Create/Edit Dialog */}
      <Dialog
        open={isDialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        aria-labelledby="data-source-dialog-title"
      >
        <DialogTitle id="data-source-dialog-title">
          {selectedSource ? 'Edit Data Source' : 'Add Data Source'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              error={!!formErrors.name}
              helperText={formErrors.name}
              fullWidth
              required
            />
            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              error={!!formErrors.description}
              helperText={formErrors.description}
              fullWidth
              multiline
              rows={3}
              required
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.active}
                  onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                />
              }
              label="Active"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={state.loading}>
            {selectedSource ? 'Save Changes' : 'Create Source'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        aria-labelledby="delete-dialog-title"
      >
        <DialogTitle id="delete-dialog-title">
          Delete Data Source
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete {selectedSource?.name}? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsDeleteDialogOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleDelete} color="error" loading={state.loading}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default DataSources;