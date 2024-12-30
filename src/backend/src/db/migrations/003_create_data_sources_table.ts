/**
 * @file Database migration for creating the data_sources table
 * @version 1.0.0
 * @description Creates table for storing SaaS metrics data source configurations with 
 * enhanced security and performance features including JSONB storage, indexing, and audit logging
 * @requires knex ^2.4.0
 */

import { Knex } from 'knex';

/**
 * Creates the data_sources table and associated database objects
 * @param {Knex} knex - The Knex instance
 * @returns {Promise<void>} Resolves when migration is complete
 */
export async function up(knex: Knex): Promise<void> {
  // Enable UUID generation
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

  // Create updated_at trigger function
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ language 'plpgsql';
  `);

  // Create audit logging function
  await knex.raw(`
    CREATE OR REPLACE FUNCTION audit_data_sources_changes()
    RETURNS TRIGGER AS $$
    BEGIN
      INSERT INTO audit_logs (
        table_name,
        record_id,
        action,
        old_values,
        new_values,
        user_id,
        created_at
      ) VALUES (
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END,
        current_user,
        CURRENT_TIMESTAMP
      );
      RETURN NULL;
    END;
    $$ language 'plpgsql';
  `);

  // Create data_sources table
  await knex.schema.createTable('data_sources', (table) => {
    // Primary key
    table.uuid('id')
      .primary()
      .defaultTo(knex.raw('uuid_generate_v4()'))
      .notNullable()
      .comment('Unique identifier for the data source');

    // Basic information
    table.string('name', 255)
      .unique()
      .notNullable()
      .comment('Name of the data source');
    
    table.text('description')
      .notNullable()
      .comment('Detailed description of the data source');
    
    table.boolean('active')
      .notNullable()
      .defaultTo(true)
      .comment('Flag indicating if data source is currently active');

    // Configuration storage
    table.jsonb('config')
      .notNullable()
      .comment('JSON configuration for data source including connection and validation settings');

    // Timestamps
    table.timestamp('created_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now())
      .comment('Timestamp when data source was created');
    
    table.timestamp('updated_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now())
      .comment('Timestamp when data source was last updated');
  });

  // Add column constraints
  await knex.raw(`
    ALTER TABLE data_sources 
    ADD CONSTRAINT data_sources_name_length_check 
    CHECK (length(name) >= 3);

    ALTER TABLE data_sources 
    ADD CONSTRAINT data_sources_config_check 
    CHECK (jsonb_typeof(config) = 'object');
  `);

  // Create indexes
  await knex.schema.raw(`
    CREATE INDEX data_sources_name_idx ON data_sources USING btree (name);
    CREATE INDEX data_sources_active_idx ON data_sources USING btree (active);
    CREATE INDEX data_sources_created_at_idx ON data_sources USING btree (created_at);
    CREATE INDEX data_sources_config_idx ON data_sources USING gin (config);
    CREATE INDEX data_sources_active_true_idx ON data_sources (active) WHERE active = true;
  `);

  // Create updated_at trigger
  await knex.raw(`
    CREATE TRIGGER update_data_sources_updated_at
    BEFORE UPDATE ON data_sources
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  `);

  // Create audit logging trigger
  await knex.raw(`
    CREATE TRIGGER audit_data_sources
    AFTER INSERT OR UPDATE OR DELETE ON data_sources
    FOR EACH ROW
    EXECUTE FUNCTION audit_data_sources_changes();
  `);

  // Add row level security
  await knex.raw(`
    ALTER TABLE data_sources ENABLE ROW LEVEL SECURITY;

    CREATE POLICY data_sources_read_policy ON data_sources
    FOR SELECT
    USING (true);  -- Allow read access to all authenticated users

    CREATE POLICY data_sources_write_policy ON data_sources
    FOR ALL
    USING (current_user = 'admin');  -- Restrict write access to admin users
  `);

  // Add table comment
  await knex.raw(`
    COMMENT ON TABLE data_sources IS 'Stores configuration and metadata for SaaS metrics data sources';
  `);
}

/**
 * Drops the data_sources table and associated database objects
 * @param {Knex} knex - The Knex instance
 * @returns {Promise<void>} Resolves when rollback is complete
 */
export async function down(knex: Knex): Promise<void> {
  // Drop triggers first
  await knex.raw('DROP TRIGGER IF EXISTS audit_data_sources ON data_sources');
  await knex.raw('DROP TRIGGER IF EXISTS update_data_sources_updated_at ON data_sources');

  // Drop functions
  await knex.raw('DROP FUNCTION IF EXISTS audit_data_sources_changes()');
  await knex.raw('DROP FUNCTION IF EXISTS update_updated_at_column()');

  // Drop table (this will automatically drop associated indexes and constraints)
  await knex.schema.dropTableIfExists('data_sources');
}