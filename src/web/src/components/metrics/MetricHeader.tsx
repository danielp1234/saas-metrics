// @version react ^18.2.0
// @version @mui/material ^5.0.0
// @version @mui/material/styles ^5.0.0

import React, { memo } from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { styled } from '@mui/material/styles';
import { MetricData } from '../../interfaces/metrics.interface';
import PageHeader from '../common/PageHeader';

/**
 * Props interface for the MetricHeader component
 */
interface MetricHeaderProps {
  /** Metric data object containing name, value, and metadata */
  metric: MetricData;
  /** Callback function for handling back navigation */
  onBack: () => void;
}

/**
 * Styled container for the header section following F-pattern layout
 */
const HeaderContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
  padding: theme.spacing(3),
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[1],
}));

/**
 * Styled container for metadata chips with consistent spacing
 */
const MetadataContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing(1),
  marginTop: theme.spacing(1),
  alignItems: 'center',
}));

/**
 * Styled typography for metric value with visual emphasis
 */
const ValueText = styled(Typography)(({ theme }) => ({
  fontWeight: 500,
  fontSize: '2rem',
  color: theme.palette.primary.main,
  marginTop: theme.spacing(1),
  lineHeight: 1.2,
  letterSpacing: '-0.01em',

  [theme.breakpoints.down('sm')]: {
    fontSize: '1.5rem',
  },
}));

/**
 * Formats the metric value based on metric type and locale
 */
const formatMetricValue = (metric: MetricData): string => {
  const formatter = new Intl.NumberFormat('en-US', {
    style: metric.unit === '$' ? 'currency' : 'decimal',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  const value = formatter.format(metric.value);
  return metric.unit === '%' ? `${value}%` : value;
};

/**
 * MetricHeader component displays the header section of a metric detail view
 * Implements F-pattern layout and follows accessibility standards
 */
const MetricHeader = memo(({ metric, onBack }: MetricHeaderProps) => {
  const formattedValue = formatMetricValue(metric);

  return (
    <HeaderContainer role="banner" aria-label={`${metric.name} details`}>
      <PageHeader
        title={metric.name}
        onBack={onBack}
        subtitle={metric.description}
      />

      <Box component="section" aria-label="Metric value and metadata">
        <ValueText
          variant="h1"
          component="p"
          aria-label={`Current value: ${formattedValue}`}
        >
          {formattedValue}
        </ValueText>

        <MetadataContainer>
          <Chip
            label={`ARR Range: ${metric.metadata.arrRange}`}
            variant="outlined"
            size="small"
            aria-label={`Annual Recurring Revenue Range: ${metric.metadata.arrRange}`}
          />
          <Chip
            label={`Source: ${metric.metadata.source}`}
            variant="outlined"
            size="small"
            aria-label={`Data Source: ${metric.metadata.source}`}
          />
          <Chip
            label={`Updated: ${new Date(metric.metadata.updatedAt).toLocaleDateString()}`}
            variant="outlined"
            size="small"
            aria-label={`Last Updated: ${new Date(metric.metadata.updatedAt).toLocaleDateString()}`}
          />
          <Chip
            label={`Confidence: ${metric.metadata.confidenceLevel}%`}
            variant="outlined"
            size="small"
            color={metric.metadata.confidenceLevel >= 90 ? 'success' : 'default'}
            aria-label={`Confidence Level: ${metric.metadata.confidenceLevel}%`}
          />
        </MetadataContainer>
      </Box>
    </HeaderContainer>
  );
});

// Display name for debugging
MetricHeader.displayName = 'MetricHeader';

export default MetricHeader;