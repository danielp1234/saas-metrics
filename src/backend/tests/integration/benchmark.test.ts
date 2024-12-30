/**
 * @fileoverview Integration tests for benchmark data operations
 * Validates core functionality, performance, and data integrity
 * @version 1.0.0
 */

// External imports
import { jest } from '@jest/globals'; // ^29.0.0
import supertest from 'supertest'; // ^6.3.0
import { Knex } from 'knex'; // ^2.4.0
import RedisMock from 'redis-mock'; // ^0.56.3

// Internal imports
import { BenchmarkService } from '../../src/services/benchmark.service';
import { BenchmarkData, ArrRangeType } from '../../src/interfaces/benchmark.interface';
import { logger } from '../../src/lib/logger';
import { CacheManager } from '../../src/lib/cache';

// Test configuration
const TEST_TIMEOUT = 10000;
const PERFORMANCE_THRESHOLD_MS = 2000; // 2 seconds as per requirements

// Mock implementations
jest.mock('../../src/lib/logger');
const mockCacheManager = {
  getClient: jest.fn().mockReturnValue(RedisMock.createClient()),
  invalidatePattern: jest.fn(),
};

describe('BenchmarkService Integration Tests', () => {
  let benchmarkService: BenchmarkService;
  let knexInstance: Knex;
  let testData: Partial<BenchmarkData>;

  // Setup test environment
  beforeAll(async () => {
    // Initialize database connection
    knexInstance = require('knex')({
      client: 'pg',
      connection: process.env.TEST_DATABASE_URL,
      pool: { min: 0, max: 7 }
    });

    // Initialize service with mocks
    benchmarkService = new BenchmarkService(
      knexInstance,
      mockCacheManager as any,
      logger
    );

    // Verify database connection
    await knexInstance.raw('SELECT 1');
  }, TEST_TIMEOUT);

  // Cleanup test environment
  afterAll(async () => {
    await knexInstance.destroy();
    jest.clearAllMocks();
  });

  // Reset state before each test
  beforeEach(async () => {
    // Clear test data
    await knexInstance('benchmark_data').truncate();
    
    // Initialize test data
    testData = {
      metricId: '123e4567-e89b-12d3-a456-426614174000',
      sourceId: '123e4567-e89b-12d3-a456-426614174001',
      value: 85.5,
      arrRange: '$1M-$5M' as ArrRangeType,
      percentile: 75,
      dataDate: new Date(),
      metadata: {
        calculationMethod: 'average',
        dataPoints: ['revenue', 'costs'],
        validationStatus: 'valid'
      }
    };

    // Reset cache
    mockCacheManager.getClient().flushall();
  });

  describe('CRUD Operations', () => {
    test('should create new benchmark data with validation', async () => {
      const startTime = process.hrtime();

      // Create benchmark
      const result = await benchmarkService.createBenchmark(testData);

      // Verify response time
      const [seconds, nanoseconds] = process.hrtime(startTime);
      const duration = seconds * 1000 + nanoseconds / 1000000;
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD_MS);

      // Verify created data
      expect(result).toMatchObject({
        ...testData,
        id: expect.any(String),
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      });

      // Verify database entry
      const dbEntry = await knexInstance('benchmark_data')
        .where('id', result.id)
        .first();
      expect(dbEntry).toBeTruthy();
    });

    test('should retrieve benchmark by ID with caching', async () => {
      // Create test data
      const created = await benchmarkService.createBenchmark(testData);

      // First retrieval (cache miss)
      const startTime1 = process.hrtime();
      const result1 = await benchmarkService.getBenchmarkById(created.id);
      const [s1, ns1] = process.hrtime(startTime1);
      const duration1 = s1 * 1000 + ns1 / 1000000;

      // Second retrieval (cache hit)
      const startTime2 = process.hrtime();
      const result2 = await benchmarkService.getBenchmarkById(created.id);
      const [s2, ns2] = process.hrtime(startTime2);
      const duration2 = s2 * 1000 + ns2 / 1000000;

      // Verify cache effectiveness
      expect(duration2).toBeLessThan(duration1);
      expect(result1).toEqual(result2);
    });

    test('should update benchmark data with validation', async () => {
      // Create initial data
      const created = await benchmarkService.createBenchmark(testData);

      // Update data
      const updateData = {
        value: 90.5,
        percentile: 80
      };

      const result = await benchmarkService.updateBenchmark(created.id, updateData);

      // Verify update
      expect(result).toMatchObject({
        ...created,
        ...updateData,
        updatedAt: expect.any(Date)
      });
    });

    test('should delete benchmark data and invalidate cache', async () => {
      // Create test data
      const created = await benchmarkService.createBenchmark(testData);

      // Delete data
      await benchmarkService.deleteBenchmark(created.id);

      // Verify deletion
      const dbEntry = await knexInstance('benchmark_data')
        .where('id', created.id)
        .first();
      expect(dbEntry).toBeUndefined();

      // Verify cache invalidation
      await expect(
        benchmarkService.getBenchmarkById(created.id)
      ).rejects.toThrow('Benchmark not found');
    });
  });

  describe('Filtering and Analytics', () => {
    test('should retrieve benchmarks by filter criteria', async () => {
      // Create multiple test entries
      const testEntries = [
        { ...testData },
        { ...testData, arrRange: '$5M-$10M' as ArrRangeType, value: 92.5 },
        { ...testData, arrRange: '$10M-$20M' as ArrRangeType, value: 95.5 }
      ];

      await Promise.all(
        testEntries.map(entry => benchmarkService.createBenchmark(entry))
      );

      // Test filtering
      const filter = {
        arrRange: ['$1M-$5M', '$5M-$10M'] as ArrRangeType[],
        metricId: testData.metricId
      };

      const results = await benchmarkService.getBenchmarksByFilter(filter);

      // Verify results
      expect(results).toHaveLength(2);
      expect(results.every(r => filter.arrRange.includes(r.arrRange))).toBe(true);
    });

    test('should calculate percentile distribution correctly', async () => {
      // Create test data with known distribution
      const values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      await Promise.all(
        values.map(value => 
          benchmarkService.createBenchmark({
            ...testData,
            value
          })
        )
      );

      const distribution = await benchmarkService.getPercentileDistribution({
        metricId: testData.metricId
      });

      // Verify percentile calculations
      expect(distribution).toMatchObject({
        p5: expect.any(Number),
        p25: expect.any(Number),
        p50: expect.any(Number),
        p75: expect.any(Number),
        p90: expect.any(Number)
      });

      // Verify specific percentiles
      expect(distribution.p50).toBeCloseTo(55, 1); // Median
      expect(distribution.p90).toBeCloseTo(90, 1);
    });
  });

  describe('Performance and Error Handling', () => {
    test('should handle concurrent operations correctly', async () => {
      const operations = Array(10).fill(null).map(() => ({
        ...testData,
        value: Math.random() * 100
      }));

      // Execute concurrent creations
      const results = await Promise.all(
        operations.map(op => benchmarkService.createBenchmark(op))
      );

      // Verify all operations succeeded
      expect(results).toHaveLength(operations.length);
      expect(results.every(r => r.id)).toBe(true);
    });

    test('should handle invalid data gracefully', async () => {
      const invalidData = {
        ...testData,
        value: -1 // Invalid value
      };

      await expect(
        benchmarkService.createBenchmark(invalidData)
      ).rejects.toThrow('Value must be between 0 and 1,000,000');
    });

    test('should maintain performance under load', async () => {
      const startTime = process.hrtime();

      // Create multiple benchmarks in sequence
      for (let i = 0; i < 50; i++) {
        await benchmarkService.createBenchmark({
          ...testData,
          value: Math.random() * 100
        });
      }

      const [seconds, nanoseconds] = process.hrtime(startTime);
      const totalDuration = seconds * 1000 + nanoseconds / 1000000;

      // Verify overall performance
      expect(totalDuration).toBeLessThan(PERFORMANCE_THRESHOLD_MS * 50);
    });
  });
});