/**
 * @fileoverview Enhanced benchmark data model with comprehensive validation,
 * analytics, and audit capabilities for SaaS metrics platform.
 * @version 1.0.0
 * @package uuid ^9.0.0
 */

import { v4 as uuidv4 } from 'uuid';
import { BenchmarkData, BenchmarkFilters } from '../interfaces/benchmark.interface';
import { db } from '../lib/database';
import { logger } from '../lib/logger';

/**
 * Interface for percentile distribution results
 */
interface PercentileDistribution {
  metricId: string;
  arrRange: string;
  percentiles: {
    p5: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
  statistics: {
    mean: number;
    median: number;
    standardDeviation: number;
    sampleSize: number;
  };
  updatedAt: Date;
}

/**
 * Enhanced benchmark model class for managing SaaS metric benchmarks
 */
export class BenchmarkModel {
  private readonly tableName = 'benchmark_data';
  private readonly retentionDays = 30; // Soft delete retention period
  private readonly cacheKeyPrefix = 'benchmark:';
  private readonly cacheTTL = 900; // 15 minutes in seconds

  /**
   * Validates benchmark data against business rules
   * @throws Error if validation fails
   */
  private validateBenchmarkData(data: Partial<BenchmarkData>): void {
    if (!data.metricId || typeof data.metricId !== 'string') {
      throw new Error('Invalid metric ID');
    }

    if (!data.sourceId || typeof data.sourceId !== 'string') {
      throw new Error('Invalid source ID');
    }

    if (typeof data.value !== 'number' || isNaN(data.value)) {
      throw new Error('Invalid metric value');
    }

    if (!data.arrRange || typeof data.arrRange !== 'string') {
      throw new Error('Invalid ARR range');
    }

    if (typeof data.percentile !== 'number' || data.percentile < 0 || data.percentile > 100) {
      throw new Error('Invalid percentile value');
    }

    if (!(data.dataDate instanceof Date)) {
      throw new Error('Invalid data date');
    }
  }

  /**
   * Creates a new benchmark data entry with validation and audit logging
   */
  public async create(benchmarkData: Omit<BenchmarkData, 'id'>): Promise<BenchmarkData> {
    try {
      this.validateBenchmarkData(benchmarkData);

      const id = uuidv4();
      const now = new Date();
      const newBenchmark: BenchmarkData = {
        id,
        ...benchmarkData,
        version: 1,
        createdAt: now,
        updatedAt: now,
        deletedAt: null
      };

      const query = `
        INSERT INTO ${this.tableName}
        (id, metric_id, source_id, value, arr_range, percentile, data_date, 
         version, created_at, updated_at, deleted_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;

      const values = [
        newBenchmark.id,
        newBenchmark.metricId,
        newBenchmark.sourceId,
        newBenchmark.value,
        newBenchmark.arrRange,
        newBenchmark.percentile,
        newBenchmark.dataDate,
        newBenchmark.version,
        newBenchmark.createdAt,
        newBenchmark.updatedAt,
        newBenchmark.deletedAt
      ];

      const result = await db.query<BenchmarkData>(query, values);

      await logger.auditLog(
        'BENCHMARK_CREATED',
        { id: newBenchmark.id, metricId: newBenchmark.metricId },
        'system'
      );

      return result.rows[0];
    } catch (error) {
      logger.error('Failed to create benchmark', { error });
      throw error;
    }
  }

  /**
   * Creates multiple benchmark entries in a transaction with validation
   */
  public async bulkCreate(benchmarks: Omit<BenchmarkData, 'id'>[]): Promise<BenchmarkData[]> {
    return await db.transaction(async (client) => {
      try {
        const createdBenchmarks: BenchmarkData[] = [];
        const now = new Date();

        for (const benchmark of benchmarks) {
          this.validateBenchmarkData(benchmark);
          
          const id = uuidv4();
          const newBenchmark: BenchmarkData = {
            id,
            ...benchmark,
            version: 1,
            createdAt: now,
            updatedAt: now,
            deletedAt: null
          };

          const query = `
            INSERT INTO ${this.tableName}
            (id, metric_id, source_id, value, arr_range, percentile, data_date,
             version, created_at, updated_at, deleted_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
          `;

          const values = [
            newBenchmark.id,
            newBenchmark.metricId,
            newBenchmark.sourceId,
            newBenchmark.value,
            newBenchmark.arrRange,
            newBenchmark.percentile,
            newBenchmark.dataDate,
            newBenchmark.version,
            newBenchmark.createdAt,
            newBenchmark.updatedAt,
            newBenchmark.deletedAt
          ];

          const result = await client.query<BenchmarkData>(query, values);
          createdBenchmarks.push(result.rows[0]);
        }

        await logger.auditLog(
          'BENCHMARK_BULK_CREATED',
          { count: createdBenchmarks.length },
          'system'
        );

        return createdBenchmarks;
      } catch (error) {
        logger.error('Failed to bulk create benchmarks', { error });
        throw error;
      }
    });
  }

  /**
   * Retrieves benchmark data with comprehensive filtering
   */
  public async find(filters: BenchmarkFilters): Promise<{ data: BenchmarkData[]; total: number }> {
    try {
      let whereClause = 'WHERE deleted_at IS NULL';
      const values: any[] = [];
      let paramCount = 1;

      if (filters.metricId) {
        whereClause += ` AND metric_id = $${paramCount}`;
        values.push(filters.metricId);
        paramCount++;
      }

      if (filters.sourceId) {
        whereClause += ` AND source_id = $${paramCount}`;
        values.push(filters.sourceId);
        paramCount++;
      }

      if (filters.arrRange) {
        whereClause += ` AND arr_range = $${paramCount}`;
        values.push(filters.arrRange);
        paramCount++;
      }

      if (filters.dateRange) {
        whereClause += ` AND data_date BETWEEN $${paramCount} AND $${paramCount + 1}`;
        values.push(filters.dateRange.startDate, filters.dateRange.endDate);
        paramCount += 2;
      }

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM ${this.tableName}
        ${whereClause}
      `;
      const countResult = await db.query(countQuery, values);
      const total = parseInt(countResult.rows[0].total);

      // Get paginated data
      const limit = filters.pageSize || 10;
      const offset = ((filters.page || 1) - 1) * limit;

      const query = `
        SELECT *
        FROM ${this.tableName}
        ${whereClause}
        ORDER BY data_date DESC
        LIMIT $${paramCount} OFFSET $${paramCount + 1}
      `;
      values.push(limit, offset);

      const result = await db.query<BenchmarkData>(query, values);

      return {
        data: result.rows,
        total
      };
    } catch (error) {
      logger.error('Failed to find benchmarks', { error, filters });
      throw error;
    }
  }

  /**
   * Calculates detailed percentile distribution for metrics with caching
   */
  public async getPercentileDistribution(
    metricId: string,
    arrRange: string
  ): Promise<PercentileDistribution> {
    try {
      const cacheKey = `${this.cacheKeyPrefix}distribution:${metricId}:${arrRange}`;

      const query = `
        SELECT 
          metric_id,
          arr_range,
          PERCENTILE_CONT(0.05) WITHIN GROUP (ORDER BY value) as p5,
          PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY value) as p25,
          PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY value) as p50,
          PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY value) as p75,
          PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY value) as p90,
          AVG(value) as mean,
          STDDEV(value) as std_dev,
          COUNT(*) as sample_size
        FROM ${this.tableName}
        WHERE metric_id = $1 
        AND arr_range = $2 
        AND deleted_at IS NULL
        GROUP BY metric_id, arr_range
      `;

      const result = await db.query(query, [metricId, arrRange]);

      if (result.rows.length === 0) {
        throw new Error('No data available for distribution calculation');
      }

      const row = result.rows[0];
      const distribution: PercentileDistribution = {
        metricId,
        arrRange,
        percentiles: {
          p5: row.p5,
          p25: row.p25,
          p50: row.p50,
          p75: row.p75,
          p90: row.p90
        },
        statistics: {
          mean: row.mean,
          median: row.p50,
          standardDeviation: row.std_dev,
          sampleSize: row.sample_size
        },
        updatedAt: new Date()
      };

      return distribution;
    } catch (error) {
      logger.error('Failed to calculate percentile distribution', { error, metricId, arrRange });
      throw error;
    }
  }
}

// Export singleton instance
export const benchmarkModel = new BenchmarkModel();