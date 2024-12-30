// @mui/material version: 5.x
// react version: 18.2.x
// react-virtual version: 2.x

import React, { useCallback, useMemo, useState } from 'react';
import {
  Table as MuiTable,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TablePagination,
  Paper,
  Checkbox,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { useVirtual } from 'react-virtual';
import { BaseProps } from '../../interfaces/common.interface';
import { LoadingSpinner } from './LoadingSpinner';

// Column definition interface for type safety
interface ColumnDefinition<T> {
  id: keyof T;
  label: string;
  sortable?: boolean;
  width?: string | number;
  align?: 'left' | 'right' | 'center';
  render?: (value: T[keyof T], row: T) => React.ReactNode;
}

// Pagination configuration interface
interface PaginationParams {
  page: number;
  limit: number;
  total: number;
}

// Virtualization configuration interface
interface VirtualizationConfig {
  enabled: boolean;
  rowHeight: number;
  overscan?: number;
}

// Main component props interface
export interface TableProps<T> extends BaseProps {
  columns: Array<ColumnDefinition<T>>;
  data: Array<T>;
  loading?: boolean;
  pagination?: PaginationParams;
  virtualization?: VirtualizationConfig;
  selectable?: boolean;
  onSort?: (column: keyof T, direction: 'asc' | 'desc') => void;
  onPageChange?: (page: number, rowsPerPage: number) => void;
  onRowSelect?: (selectedRows: Array<T>) => void;
}

// Styled components for enhanced visual presentation
const StyledTableContainer = styled(TableContainer)(({ theme }) => ({
  boxShadow: theme.shadows[1],
  borderRadius: theme.shape.borderRadius,
  overflow: 'hidden',
  width: '100%',
  position: 'relative',
  '& .MuiTableCell-head': {
    backgroundColor: theme.palette.background.paper,
    fontWeight: theme.typography.fontWeightBold,
    position: 'sticky',
    top: 0,
    zIndex: 2,
  },
  '& .MuiTableRow-root': {
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
  },
  // Custom scrollbar styling
  '&::-webkit-scrollbar': {
    width: '8px',
    height: '8px',
  },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: theme.palette.divider,
    borderRadius: '4px',
  },
}));

const StyledTableCell = styled(TableCell)(({ theme }) => ({
  padding: theme.spacing(1.5),
  '&.selected': {
    backgroundColor: theme.palette.action.selected,
  },
}));

/**
 * A reusable table component with sorting, pagination, virtualization, and selection capabilities.
 * Implements WCAG 2.1 Level AA compliance for accessibility.
 */
export function Table<T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  pagination,
  virtualization,
  selectable = false,
  className,
  onSort,
  onPageChange,
  onRowSelect,
}: TableProps<T>): React.ReactElement {
  const [sortConfig, setSortConfig] = useState<{
    column: keyof T | null;
    direction: 'asc' | 'desc';
  }>({ column: null, direction: 'asc' });
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  // Virtual list configuration
  const parentRef = React.useRef<HTMLDivElement>(null);
  const rowVirtualizer = virtualization?.enabled
    ? useVirtual({
        size: data.length,
        parentRef,
        estimateSize: useCallback(() => virtualization.rowHeight, [virtualization]),
        overscan: virtualization.overscan || 5,
      })
    : null;

  // Memoized sort handler
  const handleSort = useCallback(
    (column: keyof T) => {
      const newDirection =
        sortConfig.column === column && sortConfig.direction === 'asc'
          ? 'desc'
          : 'asc';
      setSortConfig({ column, direction: newDirection });
      onSort?.(column, newDirection);
    },
    [sortConfig, onSort]
  );

  // Row selection handlers
  const handleSelectAll = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (event.target.checked) {
        const newSelected = new Set(data.map((_, index) => index));
        setSelectedRows(newSelected);
        onRowSelect?.(data);
      } else {
        setSelectedRows(new Set());
        onRowSelect?.([]);
      }
    },
    [data, onRowSelect]
  );

  const handleSelectRow = useCallback(
    (index: number) => {
      const newSelected = new Set(selectedRows);
      if (selectedRows.has(index)) {
        newSelected.delete(index);
      } else {
        newSelected.add(index);
      }
      setSelectedRows(newSelected);
      onRowSelect?.(
        Array.from(newSelected).map((idx) => data[idx])
      );
    },
    [selectedRows, data, onRowSelect]
  );

  // Render table content
  const tableContent = useMemo(() => {
    if (loading) {
      return (
        <TableRow>
          <TableCell
            colSpan={columns.length + (selectable ? 1 : 0)}
            align="center"
            sx={{ height: '200px' }}
          >
            <LoadingSpinner size={40} />
          </TableCell>
        </TableRow>
      );
    }

    if (!data.length) {
      return (
        <TableRow>
          <TableCell
            colSpan={columns.length + (selectable ? 1 : 0)}
            align="center"
          >
            No data available
          </TableCell>
        </TableRow>
      );
    }

    const renderRow = (index: number, style?: React.CSSProperties) => {
      const row = data[index];
      const isSelected = selectedRows.has(index);

      return (
        <TableRow
          key={index}
          hover
          role="row"
          selected={isSelected}
          style={style}
          aria-selected={isSelected}
        >
          {selectable && (
            <StyledTableCell padding="checkbox">
              <Checkbox
                checked={isSelected}
                onChange={() => handleSelectRow(index)}
                inputProps={{ 'aria-label': `Select row ${index + 1}` }}
              />
            </StyledTableCell>
          )}
          {columns.map((column) => (
            <StyledTableCell
              key={String(column.id)}
              align={column.align}
              className={isSelected ? 'selected' : undefined}
              style={{ width: column.width }}
            >
              {column.render
                ? column.render(row[column.id], row)
                : row[column.id]}
            </StyledTableCell>
          ))}
        </TableRow>
      );
    };

    if (rowVirtualizer) {
      return rowVirtualizer.virtualItems.map((virtualRow) => (
        renderRow(virtualRow.index, {
          height: `${virtualization!.rowHeight}px`,
          transform: `translateY(${virtualRow.start}px)`,
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
        })
      ));
    }

    return data.map((_, index) => renderRow(index));
  }, [loading, data, columns, selectable, selectedRows, rowVirtualizer, virtualization]);

  return (
    <StyledTableContainer
      component={Paper}
      className={className}
      ref={parentRef}
      role="region"
      aria-label="Data table"
    >
      <MuiTable stickyHeader aria-label="sticky table">
        <TableHead>
          <TableRow>
            {selectable && (
              <StyledTableCell padding="checkbox">
                <Checkbox
                  indeterminate={
                    selectedRows.size > 0 && selectedRows.size < data.length
                  }
                  checked={selectedRows.size === data.length}
                  onChange={handleSelectAll}
                  inputProps={{ 'aria-label': 'Select all rows' }}
                />
              </StyledTableCell>
            )}
            {columns.map((column) => (
              <StyledTableCell
                key={String(column.id)}
                align={column.align}
                style={{ width: column.width }}
                sortDirection={
                  sortConfig.column === column.id ? sortConfig.direction : false
                }
              >
                {column.sortable ? (
                  <TableSortLabel
                    active={sortConfig.column === column.id}
                    direction={
                      sortConfig.column === column.id
                        ? sortConfig.direction
                        : 'asc'
                    }
                    onClick={() => handleSort(column.id)}
                  >
                    {column.label}
                  </TableSortLabel>
                ) : (
                  column.label
                )}
              </StyledTableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {tableContent}
        </TableBody>
      </MuiTable>
      {pagination && (
        <TablePagination
          component="div"
          count={pagination.total}
          page={pagination.page - 1}
          rowsPerPage={pagination.limit}
          onPageChange={(_, newPage) =>
            onPageChange?.(newPage + 1, pagination.limit)
          }
          onRowsPerPageChange={(event) =>
            onPageChange?.(1, parseInt(event.target.value, 10))
          }
          rowsPerPageOptions={[10, 25, 50, 100]}
        />
      )}
    </StyledTableContainer>
  );
}