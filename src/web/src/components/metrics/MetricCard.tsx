// External imports with versions
import React from 'react'; // v18.2.0
import { 
  Typography, 
  Box, 
  Tooltip, 
  useTheme 
} from '@mui/material'; // v5.x
import { InfoOutlined } from '@mui/icons-material'; // v5.x

// Internal imports
import Card from '../common/Card';
import { Metric } from '../../interfaces/metrics.interface';

// Interface definitions
interface MetricCardProps {
  /** Metric data to display */
  metric: Metric;
  /** Click handler for card interaction */
  onClick: (metricId: string) => void;
  /** Optional CSS class name for custom styling */
  className?: string;
  /** Accessibility label for screen readers */
  ariaLabel?: string;
}

/**
 * Formats metric value based on metric type, unit, and locale settings
 * @param value - Numeric value to format
 * @param unit - Unit type from MetricUnit enum
 * @param locale - Locale string for number formatting
 * @returns Formatted string with appropriate unit
 */
const formatValue = (value: number, unit: string, locale: string = 'en-US'): string => {
  if (!Number.isFinite(value)) return 'N/A';

  const formatter = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });

  switch (unit) {
    case 'PERCENTAGE':
      return `${formatter.format(value)}%`;
    case 'CURRENCY':
      return formatter.format(value);
    case 'RATIO':
      return formatter.format(value) + 'x';
    default:
      return formatter.format(value);
  }
};

/**
 * Formats percentile value with proper accessibility considerations
 * @param value - Percentile value
 * @param percentile - Percentile level
 * @returns Formatted percentile string
 */
const formatPercentile = (value: number, percentile: number): string => {
  return `${percentile}th percentile: ${formatValue(value, 'NUMBER')}`;
};

/**
 * MetricCard component displays a single SaaS metric in a card format with
 * enhanced accessibility and interactive features.
 */
export const MetricCard: React.FC<MetricCardProps> = React.memo(({
  metric,
  onClick,
  className,
  ariaLabel
}) => {
  const theme = useTheme();

  // Styles using theme spacing and palette
  const styles = {
    card: {
      minWidth: 300,
      height: 200,
      margin: theme.spacing(1),
      transition: 'all 0.3s ease',
      cursor: 'pointer',
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: theme.shadows[4],
      },
      '&:focus': {
        outline: `2px solid ${theme.palette.primary.main}`,
        outlineOffset: '2px',
      },
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing(2),
      padding: theme.spacing(2),
    },
    value: {
      fontSize: '2rem',
      fontWeight: 'bold',
      color: theme.palette.primary.main,
      lineHeight: 1.2,
    },
    percentiles: {
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing(1),
      padding: theme.spacing(0, 2, 2),
    },
  };

  // Handle keyboard interactions
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick(metric.id);
    }
  };

  return (
    <Card
      interactive
      elevation={2}
      className={className}
      onClick={() => onClick(metric.id)}
      onKeyDown={handleKeyDown}
      aria-label={ariaLabel || `${metric.name} metric card`}
      role="button"
    >
      <Box sx={styles.header}>
        <Typography
          variant="h6"
          component="h2"
          color="textPrimary"
          aria-label={`${metric.name} metric name`}
        >
          {metric.name}
          <Tooltip
            title={metric.description}
            arrow
            placement="top"
            aria-label={`${metric.name} description`}
          >
            <InfoOutlined
              fontSize="small"
              sx={{ ml: 1, verticalAlign: 'middle', color: theme.palette.text.secondary }}
            />
          </Tooltip>
        </Typography>
      </Box>

      <Box sx={{ px: 2 }}>
        <Typography
          sx={styles.value}
          component="p"
          aria-label={`${metric.name} current value`}
        >
          {formatValue(metric.value, metric.unit)}
        </Typography>
      </Box>

      <Box sx={styles.percentiles}>
        {metric.percentiles && (
          <>
            <Typography
              variant="caption"
              color="textSecondary"
              component="p"
              aria-label="Percentile distribution"
            >
              Distribution
            </Typography>
            {Object.entries(metric.percentiles).map(([percentile, value]) => (
              <Typography
                key={percentile}
                variant="body2"
                color="textSecondary"
                aria-label={`${formatPercentile(value, parseInt(percentile.slice(1)))}`}
              >
                {formatPercentile(value, parseInt(percentile.slice(1)))}
              </Typography>
            ))}
          </>
        )}
      </Box>
    </Card>
  );
});

// Display name for debugging
MetricCard.displayName = 'MetricCard';

// Default export
export default MetricCard;