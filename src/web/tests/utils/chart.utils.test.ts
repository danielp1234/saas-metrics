// @version jest ^29.5.0
// @version @mui/material ^5.0.0
import { describe, it, expect } from '@jest/globals';
import { Theme } from '@mui/material';
import {
  createChartConfig,
  createDistributionChartConfig,
  formatChartDataForA11y,
  calculateChartDimensions,
  formatTooltipContent
} from '../../src/utils/chart.utils';
import { ChartDataPoint } from '../../src/interfaces/chart.interface';

describe('Chart Utilities', () => {
  // Mock theme object based on the application's theme configuration
  const mockTheme: Partial<Theme> = {
    palette: {
      chart: {
        p90: '#1976d2',
        p75: '#42a5f5',
        p50: '#90caf9',
        p25: '#bbdefb',
        p05: '#e3f2fd'
      },
      grey: {
        200: '#eeeeee'
      },
      background: {
        paper: '#ffffff'
      }
    },
    typography: {
      fontFamily: 'Roboto, sans-serif',
      body2: {
        fontSize: '14px'
      }
    },
    spacing: (factor: number) => factor * 8,
    shape: {
      borderRadius: '8px'
    }
  };

  describe('createChartConfig', () => {
    const mockDatasets = [{
      label: 'Revenue Growth',
      data: [{ x: 'Q1', y: 25 }],
      backgroundColor: '#1976d2',
      borderColor: '#1976d2',
      fill: false,
      tension: 0.4,
      pointRadius: 4,
      pointHoverRadius: 6
    }];

    it('should create base chart configuration with theme integration', () => {
      const config = createChartConfig(mockDatasets);
      
      expect(config.data.datasets).toBeDefined();
      expect(config.options).toBeDefined();
      expect(config.options?.responsive).toBe(true);
      expect(config.options?.maintainAspectRatio).toBe(false);
    });

    it('should apply correct theme-based styling', () => {
      const config = createChartConfig(mockDatasets);
      const options = config.options!;

      expect(options.plugins?.legend?.labels?.font?.family).toBe(mockTheme.typography.fontFamily);
      expect(options.plugins?.tooltip?.backgroundColor).toBe(mockTheme.palette.background.paper);
    });

    it('should apply correct grid system spacing (8px)', () => {
      const config = createChartConfig(mockDatasets);
      const layout = config.options?.layout?.padding;

      expect(layout).toEqual({
        top: mockTheme.spacing(2),
        right: mockTheme.spacing(2),
        bottom: mockTheme.spacing(2),
        left: mockTheme.spacing(2)
      });
    });

    it('should merge custom options correctly', () => {
      const customOptions = {
        plugins: {
          legend: {
            display: false
          }
        }
      };
      const config = createChartConfig(mockDatasets, customOptions);

      expect(config.options?.plugins?.legend?.display).toBe(false);
    });
  });

  describe('createDistributionChartConfig', () => {
    const mockDistributionData = [{
      label: 'Revenue Distribution',
      data: [
        { x: 0, y: 5 },
        { x: 25, y: 15 },
        { x: 50, y: 25 },
        { x: 75, y: 15 },
        { x: 100, y: 5 }
      ],
      backgroundColor: '#1976d2',
      borderColor: '#1976d2',
      fill: true,
      tension: 0.4,
      pointRadius: 4,
      pointHoverRadius: 6
    }];

    it('should create distribution chart configuration with percentile markers', () => {
      const config = createDistributionChartConfig(mockDistributionData, {
        showPercentiles: true,
        percentileLines: [25, 50, 75]
      });

      expect(config.type).toBe('line');
      expect(config.options?.plugins?.annotation?.annotations).toHaveLength(3);
    });

    it('should configure distribution curve correctly', () => {
      const config = createDistributionChartConfig(mockDistributionData, {
        showDistributionCurve: true
      });

      expect(config.data.datasets[0].fill).toBe(true);
      expect(config.data.datasets[0].tension).toBe(0.4);
    });

    it('should handle benchmark data integration', () => {
      const benchmarkData = {
        p25: 15,
        p50: 25,
        p75: 35
      };
      const config = createDistributionChartConfig(mockDistributionData, {
        showPercentiles: true,
        benchmarkData
      });

      const annotations = config.options?.plugins?.annotation?.annotations;
      expect(annotations).toBeDefined();
      expect(annotations![0].value).toBe(benchmarkData.p25);
    });
  });

  describe('Accessibility and Formatting Functions', () => {
    it('should format chart data for screen readers', () => {
      const dataPoint: ChartDataPoint = {
        x: 'Revenue Growth',
        y: 25
      };
      const formatted = formatChartDataForA11y(dataPoint);
      expect(formatted).toBe('Value: 25, Revenue Growth');
    });

    it('should calculate responsive chart dimensions', () => {
      const dimensions = calculateChartDimensions(1024, 768);
      expect(dimensions.width).toBe(1024);
      expect(dimensions.height).toBeLessThanOrEqual(768);
      expect(dimensions.height).toBeGreaterThan(0);
    });

    it('should format tooltip content with additional data', () => {
      const context = {
        dataset: { label: 'Revenue Growth' },
        raw: {
          x: 'Q1',
          y: 25,
          tooltipData: {
            'YoY Change': '+5%',
            'Industry Avg': '20%'
          }
        }
      };
      const content = formatTooltipContent(context);
      expect(content).toContain('Revenue Growth: 25');
      expect(content).toContain('YoY Change: +5%');
      expect(content).toContain('Industry Avg: 20%');
    });
  });

  describe('Chart Responsiveness', () => {
    it('should handle mobile breakpoint configuration', () => {
      const config = createChartConfig([], undefined, {
        rules: [{
          maxWidth: 767,
          options: {
            legend: { display: false }
          }
        }]
      });
      expect(config.options?.responsive).toBeDefined();
    });

    it('should handle tablet breakpoint configuration', () => {
      const config = createChartConfig([], undefined, {
        rules: [{
          minWidth: 768,
          maxWidth: 1023,
          options: {
            legend: { position: 'bottom' }
          }
        }]
      });
      expect(config.options?.responsive).toBeDefined();
    });

    it('should handle desktop breakpoint configuration', () => {
      const config = createChartConfig([], undefined, {
        rules: [{
          minWidth: 1024,
          options: {
            legend: { position: 'right' }
          }
        }]
      });
      expect(config.options?.responsive).toBeDefined();
    });
  });
});