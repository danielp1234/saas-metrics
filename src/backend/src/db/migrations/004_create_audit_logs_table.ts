/**
 * @fileoverview Database migration for creating the audit_logs table with comprehensive security tracking,
 * compliance controls, and data retention policies. Implements immutable audit trail with user action tracking.
 * @version 1.0.0
 */

import { Knex } from 'knex'; // v2.4.0
import { AuditAction, AuditResource } from '../../interfaces/audit.interface';

/**
 * Creates the audit_logs table with comprehensive security tracking and compliance features
 */
export async function up(knex: Knex): Promise<void> {
  // Create enum types for strict type checking
  await knex.raw(`
    DO $$ BEGIN
      CREATE TYPE audit_action AS ENUM (
        '${AuditAction.CREATE}', '${AuditAction.UPDATE}', '${AuditAction.DELETE}',
        '${AuditAction.IMPORT}', '${AuditAction.EXPORT}',
        '${AuditAction.LOGIN}', '${AuditAction.LOGOUT}'
      );
      
      CREATE TYPE audit_resource AS ENUM (
        '${AuditResource.METRIC}', '${AuditResource.BENCHMARK}',
        '${AuditResource.DATA_SOURCE}', '${AuditResource.USER}',
        '${AuditResource.SYSTEM}'
      );
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  // Create the audit_logs table with all required columns and constraints
  await knex.schema.createTable('audit_logs', (table) => {
    // Primary key and identification
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users');
    table.string('user_role', 50).notNullable();

    // Action tracking
    table.specificType('action', 'audit_action').notNullable();
    table.specificType('resource', 'audit_resource').notNullable();
    table.uuid('resource_id').notNullable();

    // Change tracking with JSONB validation
    table.jsonb('changes').notNullable().checkValid(
      "changes ? 'previous' AND changes ? 'current'"
    );

    // Security tracking
    table.string('ip_address', 45).notNullable(); // IPv6 length
    table.text('user_agent').notNullable();
    
    // Timestamp with automatic setting
    table.timestamp('created_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());

    // Add table comment for documentation
    table.comment(
      'Immutable audit log for tracking all system actions with security and compliance controls'
    );
  });

  // Create optimized indexes for common query patterns
  await knex.schema.raw(`
    -- Composite index for filtering and sorting
    CREATE INDEX idx_audit_logs_created_action_resource 
    ON audit_logs (created_at DESC, action, resource);

    -- Index for user activity lookups
    CREATE INDEX idx_audit_logs_user_id 
    ON audit_logs (user_id);

    -- Partial index for security analysis
    CREATE INDEX idx_audit_logs_ip_security 
    ON audit_logs (ip_address, created_at) 
    WHERE action IN ('LOGIN', 'LOGOUT');

    -- Implement table partitioning for retention management
    CREATE TABLE audit_logs_partition_template (LIKE audit_logs INCLUDING ALL)
    PARTITION BY RANGE (created_at);

    -- Create initial partition
    CREATE TABLE audit_logs_current 
    PARTITION OF audit_logs_partition_template
    FOR VALUES FROM (CURRENT_DATE - INTERVAL '3 years') 
    TO (CURRENT_DATE + INTERVAL '1 year');
  `);

  // Create trigger to prevent modifications (immutability)
  await knex.schema.raw(`
    CREATE OR REPLACE FUNCTION prevent_audit_modification()
    RETURNS TRIGGER AS $$
    BEGIN
      RAISE EXCEPTION 'Audit logs cannot be modified or deleted';
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER enforce_audit_immutability
    BEFORE UPDATE OR DELETE ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_modification();
  `);

  // Create function and trigger for meta-auditing
  await knex.schema.raw(`
    CREATE OR REPLACE FUNCTION log_audit_access()
    RETURNS TRIGGER AS $$
    BEGIN
      -- Log attempts to modify audit logs in a separate meta-audit table
      INSERT INTO meta_audit_logs (
        action_type,
        attempted_by,
        attempted_at,
        details
      ) VALUES (
        TG_OP,
        current_user,
        current_timestamp,
        jsonb_build_object('audit_log_id', OLD.id)
      );
      RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER track_audit_access
    AFTER UPDATE OR DELETE ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION log_audit_access();
  `);
}

/**
 * Drops the audit_logs table and all related objects
 */
export async function down(knex: Knex): Promise<void> {
  // Drop triggers first
  await knex.schema.raw(`
    DROP TRIGGER IF EXISTS track_audit_access ON audit_logs;
    DROP TRIGGER IF EXISTS enforce_audit_immutability ON audit_logs;
    DROP FUNCTION IF EXISTS log_audit_access();
    DROP FUNCTION IF EXISTS prevent_audit_modification();
  `);

  // Drop partitioned tables
  await knex.schema.raw(`
    DROP TABLE IF EXISTS audit_logs_current;
    DROP TABLE IF EXISTS audit_logs_partition_template;
  `);

  // Drop the main table
  await knex.schema.dropTableIfExists('audit_logs');

  // Drop custom enum types
  await knex.schema.raw(`
    DROP TYPE IF EXISTS audit_action;
    DROP TYPE IF EXISTS audit_resource;
  `);
}