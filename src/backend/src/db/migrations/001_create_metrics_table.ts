import { Knex } from 'knex'; // ^2.4.0

// Enum type for metric types
const METRIC_TYPES = [
  'REVENUE_GROWTH',
  'NDR', 
  'MAGIC_NUMBER',
  'EBITDA_MARGIN',
  'ARR_PER_EMPLOYEE'
] as const;

export async function up(knex: Knex): Promise<void> {
  // Create uuid-ossp extension if it doesn't exist for UUID generation
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

  // Create enum type for metric types
  await knex.raw(`
    DO $$ 
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'metric_type') THEN
        CREATE TYPE metric_type AS ENUM (${METRIC_TYPES.map(t => `'${t}'`).join(',')});
      END IF;
    END
    $$;
  `);

  // Create metrics table
  await knex.schema.createTable('metrics', (table) => {
    // Primary key using UUID
    table.uuid('id')
      .primary()
      .notNullable()
      .defaultTo(knex.raw('uuid_generate_v4()'))
      .comment('Unique identifier for the metric using UUID v4');

    // Core metric fields
    table.string('name', 255)
      .unique()
      .notNullable()
      .comment('Unique name of the metric, limited to 255 characters');
    
    table.text('description')
      .notNullable()
      .comment('Detailed description of the metric and its business context');
    
    table.text('calculation_method')
      .notNullable()
      .comment('Formula or method used to calculate the metric with examples');
    
    // Use raw SQL for enum type column since Knex doesn't directly support PostgreSQL enums
    table.specificType('type', 'metric_type')
      .notNullable()
      .comment('Type of metric using custom enum for type safety');

    // Audit timestamps
    table.timestamp('created_at')
      .notNullable()
      .defaultTo(knex.fn.now())
      .comment('Timestamp when metric was created, automatically set');
    
    table.timestamp('updated_at')
      .notNullable()
      .defaultTo(knex.fn.now())
      .comment('Timestamp when metric was last updated, automatically maintained by trigger');

    // Add table comment
    table.comment('Stores SaaS metric definitions with calculation methods and metadata');
  });

  // Create indexes
  await knex.schema.alterTable('metrics', (table) => {
    table.index(['name'], 'metrics_name_idx', { indexType: 'btree' });
    table.index(['type'], 'metrics_type_idx', { indexType: 'btree' });
    table.index(['created_at'], 'metrics_created_at_idx', { indexType: 'btree' });
  });

  // Create trigger for automatically updating updated_at timestamp
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_metrics_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ language 'plpgsql';

    CREATE TRIGGER update_metrics_updated_at_trigger
      BEFORE UPDATE ON metrics
      FOR EACH ROW
      EXECUTE FUNCTION update_metrics_updated_at();
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Drop trigger and function
  await knex.raw('DROP TRIGGER IF EXISTS update_metrics_updated_at_trigger ON metrics');
  await knex.raw('DROP FUNCTION IF EXISTS update_metrics_updated_at');

  // Drop table
  await knex.schema.dropTableIfExists('metrics');

  // Drop enum type
  await knex.raw('DROP TYPE IF EXISTS metric_type');
}