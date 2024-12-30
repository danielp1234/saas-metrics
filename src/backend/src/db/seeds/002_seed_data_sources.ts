// External imports
import { Knex } from 'knex'; // ^2.4.0

// Internal imports
import { DataSourceModel } from '../../models/dataSource.model';

/**
 * Initial data sources configuration with comprehensive validation rules and import settings
 * Follows the schema defined in DataSourceModel and includes all required configurations
 */
const INITIAL_DATA_SOURCES: Partial<DataSourceModel>[] = [
  {
    id: '550e8400-e29b-41d4-a716-446655440000', // OpenView Partners Data
    name: 'OpenView Partners SaaS Metrics',
    description: 'Annual SaaS metrics benchmark data from OpenView Partners research',
    active: true,
    config: {
      type: 'csv',
      format: 'standard',
      validation_rules: {
        required_fields: ['metric_name', 'arr_range', 'value', 'year'],
        data_types: {
          metric_name: 'string',
          arr_range: 'string',
          value: 'number',
          year: 'number'
        },
        value_ranges: {
          year: { min: 2015, max: new Date().getFullYear() },
          value: { min: 0, max: 1000 }
        },
        custom_validators: [
          'validateMetricName',
          'validateARRRange',
          'validatePercentageMetrics'
        ]
      },
      import_settings: {
        batch_size: 1000,
        retry_attempts: 3,
        timeout: 30000,
        error_threshold: 0.01 // 1% error tolerance
      }
    }
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440001', // SaaS Capital Data
    name: 'SaaS Capital Benchmarks',
    description: 'Quarterly SaaS metrics from SaaS Capital research database',
    active: true,
    config: {
      type: 'json',
      format: 'nested',
      validation_rules: {
        required_fields: ['metric_name', 'arr_range', 'value', 'quarter', 'year'],
        data_types: {
          metric_name: 'string',
          arr_range: 'string',
          value: 'number',
          quarter: 'number',
          year: 'number'
        },
        value_ranges: {
          quarter: { min: 1, max: 4 },
          year: { min: 2015, max: new Date().getFullYear() },
          value: { min: -100, max: 1000 }
        },
        custom_validators: [
          'validateMetricName',
          'validateARRRange',
          'validateQuarterlyData'
        ]
      },
      import_settings: {
        batch_size: 500,
        retry_attempts: 5,
        timeout: 45000,
        error_threshold: 0.005 // 0.5% error tolerance
      }
    }
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002', // Internal Research Data
    name: 'Internal SaaS Benchmarks',
    description: 'Proprietary SaaS metrics research and analysis',
    active: true,
    config: {
      type: 'excel',
      format: 'custom',
      validation_rules: {
        required_fields: [
          'metric_name',
          'arr_range',
          'value',
          'year',
          'source_detail',
          'confidence_score'
        ],
        data_types: {
          metric_name: 'string',
          arr_range: 'string',
          value: 'number',
          year: 'number',
          source_detail: 'string',
          confidence_score: 'number'
        },
        value_ranges: {
          year: { min: 2015, max: new Date().getFullYear() },
          value: { min: -200, max: 2000 },
          confidence_score: { min: 1, max: 10 }
        },
        custom_validators: [
          'validateMetricName',
          'validateARRRange',
          'validateConfidenceScore',
          'validateSourceDetail'
        ]
      },
      import_settings: {
        batch_size: 250,
        retry_attempts: 3,
        timeout: 60000,
        error_threshold: 0.001 // 0.1% error tolerance
      }
    }
  }
];

/**
 * Seeds the data_sources table with initial configurations
 * Implements comprehensive validation rules and import settings for each data source
 * 
 * @param knex - Knex instance for database operations
 * @returns Promise resolving when seeding is complete
 */
export async function seed(knex: Knex): Promise<void> {
  try {
    // Begin transaction
    await knex.transaction(async (trx) => {
      // Clear existing records
      await trx('data_sources').del();

      // Prepare seed data with timestamps
      const seedData = INITIAL_DATA_SOURCES.map(source => ({
        ...source,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      // Validate seed data against model schema
      for (const source of seedData) {
        const model = new DataSourceModel();
        await model.validateConfig(source.config);
      }

      // Insert seed data
      await trx('data_sources').insert(seedData);

      // Verify insertion
      const count = await trx('data_sources').count('id as count').first();
      if (count?.count !== INITIAL_DATA_SOURCES.length) {
        throw new Error('Seed data insertion verification failed');
      }
    });

    console.log('Data sources seeded successfully');
  } catch (error) {
    console.error('Error seeding data sources:', error);
    throw error;
  }
}