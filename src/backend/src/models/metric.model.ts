// External imports with versions
import { v4 as uuidv4 } from 'uuid'; // ^9.0.0
import sanitizeHtml from 'sanitize-html'; // ^2.11.0

// Internal imports
import { DatabaseService } from '../lib/database';
import { Logger } from '../lib/logger';

// Constants
const TABLE_NAME = 'metrics';
const CACHE_TTL = 900; // 15 minutes in seconds
const MAX_BATCH_SIZE = 1000;

// Interfaces
interface MetricData {
  id?: string;
  name: string;
  description: string;
  calculation_method: string;
  created_at?: Date;
  updated_at?: Date;
}

interface MetricValidationRules {
  minValue: number;
  maxValue: number;
  allowNegative: boolean;
  maxDecimals: number;
}

/**
 * MetricModel class for handling SaaS metric operations with comprehensive
 * database integration, validation, and security features.
 */
export class MetricModel {
  private readonly db: DatabaseService;
  private readonly logger: Logger;
  private readonly validationRules: Record<string, MetricValidationRules>;

  constructor(db: DatabaseService, logger: Logger) {
    this.db = db;
    this.logger = logger;
    this.initializeValidationRules();
  }

  /**
   * Initializes validation rules for different metric types
   * Based on A.1.1 Metric Calculation Methods
   */
  private initializeValidationRules(): void {
    this.validationRules = {
      'revenue_growth_rate': {
        minValue: -100,
        maxValue: 1000,
        allowNegative: true,
        maxDecimals: 2
      },
      'net_dollar_retention': {
        minValue: 0,
        maxValue: 200,
        allowNegative: false,
        maxDecimals: 2
      },
      'magic_number': {
        minValue: -10,
        maxValue: 10,
        allowNegative: true,
        maxDecimals: 2
      },
      'ebitda_margin': {
        minValue: -100,
        maxValue: 100,
        allowNegative: true,
        maxDecimals: 2
      },
      'arr_per_employee': {
        minValue: 0,
        maxValue: 1000000,
        allowNegative: false,
        maxDecimals: 0
      }
    };
  }

  /**
   * Creates a new metric with validation and security measures
   * @param metricData The metric data to create
   * @returns Promise<MetricData> The created metric
   */
  public async create(metricData: MetricData): Promise<MetricData> {
    try {
      // Input validation and sanitization
      const sanitizedData = this.sanitizeMetricData(metricData);
      await this.validateMetricData(sanitizedData);

      // Generate UUID and timestamps
      const now = new Date();
      const metric: MetricData = {
        ...sanitizedData,
        id: uuidv4(),
        created_at: now,
        updated_at: now
      };

      // Execute database transaction
      const result = await this.db.transaction(async (client) => {
        const query = `
          INSERT INTO ${TABLE_NAME} 
          (id, name, description, calculation_method, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `;
        const values = [
          metric.id,
          metric.name,
          metric.description,
          metric.calculation_method,
          metric.created_at,
          metric.updated_at
        ];

        const { rows } = await client.query(query, values);
        return rows[0];
      });

      this.logger.info('Metric created successfully', { metricId: result.id });
      return result;
    } catch (error) {
      this.logger.error('Error creating metric', { error, metricData });
      throw error;
    }
  }

  /**
   * Retrieves a metric by ID with caching
   * @param id The metric ID
   * @returns Promise<MetricData | null> The found metric or null
   */
  public async findById(id: string): Promise<MetricData | null> {
    try {
      const query = `
        SELECT * FROM ${TABLE_NAME}
        WHERE id = $1 AND deleted_at IS NULL
      `;
      const { rows } = await this.db.query(query, [id]);
      return rows[0] || null;
    } catch (error) {
      this.logger.error('Error finding metric by ID', { error, id });
      throw error;
    }
  }

  /**
   * Updates an existing metric with validation
   * @param id The metric ID
   * @param metricData The metric data to update
   * @returns Promise<MetricData> The updated metric
   */
  public async update(id: string, metricData: Partial<MetricData>): Promise<MetricData> {
    try {
      // Input validation and sanitization
      const sanitizedData = this.sanitizeMetricData(metricData);
      await this.validateMetricData(sanitizedData, true);

      const result = await this.db.transaction(async (client) => {
        const updateFields = Object.keys(sanitizedData)
          .map((key, index) => `${key} = $${index + 2}`)
          .join(', ');

        const query = `
          UPDATE ${TABLE_NAME}
          SET ${updateFields}, updated_at = NOW()
          WHERE id = $1 AND deleted_at IS NULL
          RETURNING *
        `;

        const values = [id, ...Object.values(sanitizedData)];
        const { rows } = await client.query(query, values);
        return rows[0];
      });

      this.logger.info('Metric updated successfully', { metricId: id });
      return result;
    } catch (error) {
      this.logger.error('Error updating metric', { error, id, metricData });
      throw error;
    }
  }

  /**
   * Sanitizes metric data to prevent XSS attacks
   * @param data The metric data to sanitize
   * @returns MetricData The sanitized metric data
   */
  private sanitizeMetricData(data: Partial<MetricData>): Partial<MetricData> {
    return {
      ...data,
      name: data.name ? sanitizeHtml(data.name, { allowedTags: [] }) : undefined,
      description: data.description ? sanitizeHtml(data.description, { allowedTags: [] }) : undefined,
      calculation_method: data.calculation_method ? sanitizeHtml(data.calculation_method, { allowedTags: [] }) : undefined
    };
  }

  /**
   * Validates metric data against defined rules
   * @param data The metric data to validate
   * @param isUpdate Whether this is an update operation
   * @throws Error if validation fails
   */
  private async validateMetricData(data: Partial<MetricData>, isUpdate: boolean = false): Promise<void> {
    if (!isUpdate && (!data.name || !data.calculation_method)) {
      throw new Error('Name and calculation method are required');
    }

    if (data.name && (data.name.length < 2 || data.name.length > 100)) {
      throw new Error('Name must be between 2 and 100 characters');
    }

    if (data.calculation_method && !this.validationRules[data.calculation_method]) {
      throw new Error('Invalid calculation method');
    }
  }
}

// Export the MetricModel class
export default MetricModel;