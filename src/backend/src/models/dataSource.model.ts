// External imports - versions specified
import { Model, ValidationError } from 'objection'; // ^3.0.0
import { JSONSchema } from 'json-schema-to-ts'; // ^2.0.0

// Internal imports
import { DatabaseConfig } from '../interfaces/config.interface';

// Constants
const TABLE_NAME = 'data_sources';
const DEFAULT_POOL_CONFIG = {
  min: 2,
  max: 10,
  idleTimeoutMillis: 30000,
  acquireTimeoutMillis: 60000,
  reapIntervalMillis: 1000,
  fifo: true,
  priorityRange: 1
};

/**
 * DataSourceModel class for managing SaaS metrics data sources
 * Implements comprehensive configuration validation and connection pool management
 */
export class DataSourceModel extends Model {
  // Required properties
  id!: string;
  name!: string;
  description!: string;
  active!: boolean;
  config!: Record<string, any>;
  createdAt!: Date;
  updatedAt!: Date;
  connectionPool!: Record<string, any>;
  validationRules!: Record<string, any>;

  // Static properties
  static tableName = TABLE_NAME;

  /**
   * Model timestamp fields configuration
   */
  static get timestamps() {
    return {
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    };
  }

  /**
   * Returns the JSON schema for data source validation
   */
  static get jsonSchema(): JSONSchema {
    return {
      type: 'object',
      required: ['name', 'config', 'active'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string', minLength: 1, maxLength: 255 },
        description: { type: 'string', maxLength: 1000 },
        active: { type: 'boolean' },
        config: {
          type: 'object',
          properties: {
            connectionConfig: {
              type: 'object',
              required: ['host', 'port', 'database', 'username'],
              properties: {
                host: { type: 'string' },
                port: { type: 'number', minimum: 1, maximum: 65535 },
                database: { type: 'string' },
                username: { type: 'string' },
                password: { type: 'string' },
                ssl: { type: 'boolean' }
              }
            },
            poolConfig: {
              type: 'object',
              properties: {
                min: { type: 'number', minimum: 0 },
                max: { type: 'number', minimum: 1 },
                idleTimeoutMillis: { type: 'number', minimum: 0 },
                acquireTimeoutMillis: { type: 'number', minimum: 0 },
                reapIntervalMillis: { type: 'number', minimum: 0 },
                fifo: { type: 'boolean' },
                priorityRange: { type: 'number', minimum: 1 }
              }
            }
          }
        },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' }
      }
    };
  }

  /**
   * Initializes a new DataSourceModel instance
   * @param initialConfig - Initial configuration for the data source
   */
  constructor(initialConfig?: Partial<DataSourceModel>) {
    super();
    if (initialConfig) {
      Object.assign(this, initialConfig);
    }
    this.validationRules = {
      requiredFields: ['name', 'config', 'active'],
      configValidation: true,
      connectionValidation: true
    };
    this.connectionPool = { ...DEFAULT_POOL_CONFIG };
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Validates the data source configuration
   * @param config - Configuration to validate
   * @returns Promise resolving to validation result
   * @throws ValidationError if validation fails
   */
  async validateConfig(config: Record<string, any>): Promise<boolean> {
    try {
      // Validate required fields
      const missingFields = this.validationRules.requiredFields.filter(
        field => !config[field]
      );
      if (missingFields.length > 0) {
        throw new ValidationError({
          type: 'ValidationError',
          message: `Missing required fields: ${missingFields.join(', ')}`
        });
      }

      // Validate connection configuration
      if (this.validationRules.connectionValidation && config.connectionConfig) {
        const { host, port, database, username } = config.connectionConfig;
        if (!host || !port || !database || !username) {
          throw new ValidationError({
            type: 'ValidationError',
            message: 'Invalid connection configuration'
          });
        }
      }

      // Validate pool configuration
      if (config.poolConfig) {
        const { min, max } = config.poolConfig;
        if (min >= max) {
          throw new ValidationError({
            type: 'ValidationError',
            message: 'Pool minimum size must be less than maximum size'
          });
        }
      }

      return true;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError({
        type: 'ValidationError',
        message: 'Configuration validation failed',
        data: { error }
      });
    }
  }

  /**
   * Updates the connection pool configuration
   * @param poolConfig - New pool configuration
   * @returns Promise resolving when update is complete
   */
  async updateConnectionPool(poolConfig: Partial<typeof DEFAULT_POOL_CONFIG>): Promise<void> {
    try {
      // Validate new pool configuration
      const newConfig = {
        ...this.connectionPool,
        ...poolConfig
      };

      if (newConfig.min >= newConfig.max) {
        throw new ValidationError({
          type: 'ValidationError',
          message: 'Invalid pool configuration: min must be less than max'
        });
      }

      // Update pool configuration
      this.connectionPool = newConfig;
      this.updatedAt = new Date();

      // Persist changes
      await this.$query().patch({
        connectionPool: this.connectionPool,
        updated_at: this.updatedAt
      });
    } catch (error) {
      throw new Error(`Failed to update connection pool: ${error.message}`);
    }
  }

  /**
   * Before insert hook to set timestamps
   */
  $beforeInsert() {
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Before update hook to update timestamp
   */
  $beforeUpdate() {
    this.updatedAt = new Date();
  }
}

// Export the model
export default DataSourceModel;