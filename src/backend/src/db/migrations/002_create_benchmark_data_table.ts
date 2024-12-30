// knex: ^2.4.0 - SQL query builder for creating and managing database migrations
import { Knex } from 'knex';

/**
 * Creates the benchmark_data table with comprehensive fields, constraints, indexes and documentation
 * This table stores SaaS metrics benchmark data with high performance and data integrity
 */
export async function up(knex: Knex): Promise<void> {
  // Enable uuid-ossp extension if not already enabled
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

  // Create benchmark_data table
  await knex.schema.createTable('benchmark_data', (table) => {
    // Primary key
    table.uuid('id')
      .primary()
      .defaultTo(knex.raw('uuid_generate_v4()'))
      .notNullable()
      .comment('Unique identifier for benchmark data entry');

    // Foreign keys
    table.uuid('metric_id')
      .notNullable()
      .references('id')
      .inTable('metrics')
      .onDelete('CASCADE')
      .onUpdate('CASCADE')
      .comment('Foreign key reference to metrics table');

    table.uuid('source_id')
      .notNullable() 
      .references('id')
      .inTable('data_sources')
      .onDelete('CASCADE')
      .onUpdate('CASCADE')
      .comment('Foreign key reference to data_sources table');

    // Data fields
    table.decimal('value', 15, 5)
      .notNullable()
      .comment('High-precision benchmark value for the metric');

    table.string('arr_range', 50)
      .notNullable()
      .comment('ARR range category for benchmark segmentation');

    table.integer('percentile')
      .notNullable()
      .comment('Statistical percentile value with range validation');

    table.timestamp('data_date', { useTz: true })
      .notNullable()
      .comment('Timezone-aware timestamp of benchmark data point');

    // Timestamps
    table.timestamp('created_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now())
      .comment('Timestamp of record creation');

    table.timestamp('updated_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now())
      .comment('Timestamp of last record update');

    // Table comment
    table.comment('Stores SaaS metrics benchmark data with high performance and data integrity');
  });

  // Add CHECK constraint for percentile range
  await knex.raw(`
    ALTER TABLE benchmark_data 
    ADD CONSTRAINT benchmark_data_percentile_check 
    CHECK (percentile >= 0 AND percentile <= 100)
  `);

  // Create optimized indexes
  await knex.schema.raw(`
    CREATE INDEX benchmark_data_metric_arr_idx 
    ON benchmark_data (metric_id, arr_range);

    CREATE INDEX benchmark_data_source_idx 
    ON benchmark_data (source_id);

    CREATE INDEX benchmark_data_date_idx 
    ON benchmark_data (data_date);

    CREATE INDEX benchmark_data_value_percentile_idx 
    ON benchmark_data (value, percentile);
  `);

  // Create updated_at trigger function
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_benchmark_data_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ language 'plpgsql';
  `);

  // Create trigger
  await knex.raw(`
    CREATE TRIGGER update_benchmark_data_updated_at
    BEFORE UPDATE ON benchmark_data
    FOR EACH ROW
    EXECUTE FUNCTION update_benchmark_data_updated_at();
  `);
}

/**
 * Drops the benchmark_data table and related objects for clean rollback
 */
export async function down(knex: Knex): Promise<void> {
  // Drop trigger first
  await knex.raw('DROP TRIGGER IF EXISTS update_benchmark_data_updated_at ON benchmark_data');
  await knex.raw('DROP FUNCTION IF EXISTS update_benchmark_data_updated_at');

  // Drop table with CASCADE to automatically remove constraints and indexes
  await knex.schema.dropTableIfExists('benchmark_data');
}