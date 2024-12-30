// @mui/material version: 5.x
// react version: 18.2.x

import React, { useCallback, useMemo } from 'react';
import { Box, useTheme } from '@mui/material';
import { Table, TableProps } from '../common/Table';
import { PercentileData } from '../../interfaces/metrics.interface';

/**
 * Props interface for the PercentileTable component with enhanced type safety
 */
interface PercentileTableProps {
  /** Current metric percentile data */
  percentiles: PercentileData;
  /** Industry average percentile data for comparison */
  industryAverages: PercentileData;
  /** Unit of measurement for the metric (%, $, ratio) */
  unit: string;
  /** Number of decimal places for display */
  precision?: number;
  /** Locale for number formatting */
  locale?: string;
}

/**
 * Formats a numeric value with the specified unit and precision
 */
const formatValue = (value: number, unit: string, precision: number = 2, locale: string = 'en-US'): string => {
  const formattedNumber = new Intl.NumberFormat(locale, {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  }).format(value);

  return unit === '%' ? `${formattedNumber}${unit}` : `${unit}${formattedNumber}`;
};

/**
 * Formats the delta between current and industry average values with unit awareness
 */
const formatDelta = (
  current: number,
  average: number,
  unit: string,
  precision: number = 2,
  locale: string = 'en-US'
): string => {
  const delta = current - average;
  const formattedDelta = new Intl.NumberFormat(locale, {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
    signDisplay: 'always',
  }).format(delta);

  return unit === '%' ? `${formattedDelta}${unit}` : `${unit}${formattedDelta}`;
};

/**
 * A specialized table component that displays percentile distribution data for SaaS metrics,
 * showing industry comparisons and deltas across different percentile ranges.
 * Implements WCAG 2.1 Level AA compliance for accessibility.
 */
export const PercentileTable: React.FC<PercentileTableProps> = React.memo(({
  percentiles,
  industryAverages,
  unit,
  precision = 2,
  locale = 'en-US',
}) => {
  const theme = useTheme();

  // Memoized column configuration
  const columns = useMemo(() => [
    {
      id: 'percentile',
      label: 'Percentile',
      align: 'left' as const,
      width: '20%',
    },
    {
      id: 'value',
      label: 'Current Value',
      align: 'right' as const,
      width: '25%',
    },
    {
      id: 'industry',
      label: 'Industry Average',
      align: 'right' as const,
      width: '25%',
    },
    {
      id: 'delta',
      label: 'Delta',
      align: 'right' as const,
      width: '30%',
    },
  ], []);

  // Transform percentile data into table rows
  const tableData = useMemo(() => {
    const percentileLabels = {
      p90: '90th',
      p75: '75th',
      p50: '50th (Median)',
      p25: '25th',
      p5: '5th',
    };

    return Object.entries(percentileLabels).map(([key, label]) => {
      const currentValue = percentiles[key as keyof PercentileData];
      const industryValue = industryAverages[key as keyof PercentileData];

      return {
        percentile: label,
        value: formatValue(currentValue, unit, precision, locale),
        industry: formatValue(industryValue, unit, precision, locale),
        delta: formatDelta(currentValue, industryValue, unit, precision, locale),
        raw: {
          value: currentValue,
          industry: industryValue,
          delta: currentValue - industryValue,
        },
      };
    });
  }, [percentiles, industryAverages, unit, precision, locale]);

  // Memoized table configuration
  const tableProps = useMemo<Partial<TableProps<typeof tableData[0]>>>(() => ({
    columns,
    data: tableData,
    'aria-label': 'Percentile distribution comparison table',
    'aria-describedby': 'Shows current values compared to industry averages across percentiles',
  }), [columns, tableData]);

  return (
    <Box
      sx={{
        width: '100%',
        overflowX: 'auto',
        marginY: 2,
        borderRadius: 1,
        boxShadow: 1,
        '& .MuiTableCell-root': {
          fontFamily: theme.typography.fontFamily,
          fontSize: theme.typography.body2.fontSize,
        },
        '& .positive-delta': {
          color: theme.palette.success.main,
        },
        '& .negative-delta': {
          color: theme.palette.error.main,
        },
      }}
    >
      <Table
        {...tableProps}
        columns={columns.map((col) => ({
          ...col,
          render: (value, row) => {
            if (col.id === 'delta') {
              const deltaClass = row.raw.delta >= 0 ? 'positive-delta' : 'negative-delta';
              return (
                <span className={deltaClass} aria-label={`Delta: ${value}`}>
                  {value}
                </span>
              );
            }
            return value;
          },
        }))}
      />
    </Box>
  );
});

PercentileTable.displayName = 'PercentileTable';

export type { PercentileTableProps };