/**
 * @fileoverview Comprehensive unit test suite for BenchmarkService
 * Tests all service methods with extensive coverage of success and error cases
 * Version: 1.0.0
 */

// External imports
import { jest } from '@jest/globals';
import Redis from 'ioredis-mock'; // v8.0.0

// Internal imports
import { BenchmarkService } from '../../src/services/benchmark.service';
import { BenchmarkModel } from '../../src/models/benchmark.model';
import { 
  BenchmarkData,
  BenchmarkFilter,
  PercentileDistribution,
  ArrRangeType
} from '../../src/interfaces/benchmark.interface';
import { CacheManager } from '../../src/lib/cache';
import { logger } from '../../src/lib/logger';

// Mock implementations
jest.mock('../../src/lib/cache');
jest.mock('../../src/lib/logger');

/**
 * Mock BenchmarkModel implementation for testing
 */
class MockBenchmarkModel {
  create = jest.fn();
  findById = jest.fn();
  findByFilter = jest.fn();
  calculatePercentiles = jest.fn();
  update = jest.fn();
  delete = jest.fn();
}

describe('BenchmarkService', () => {
  let benchmarkService: BenchmarkService;
  let mockBenchmarkModel: MockBenchmarkModel;
  let mockRedisClient: Redis;
  let mockCacheManager: jest.Mocked<CacheManager>;

  // Test data constants
  const VALID_BENCHMARK_ID = '123e4567-e89b-12d3-a456-426614174000';
  const VALID_METRIC_ID = '123e4567-e89b-12d3-a456-426614174001';
  const VALID_SOURCE_ID = '123e4567-e89b-12d3-a456-426614174002';

  const mockBenchmarkData: BenchmarkData = {
    id: VALID_BENCHMARK_ID,
    metricId: VALID_METRIC_ID,
    sourceId: VALID_SOURCE_ID,
    value: 85.5,
    arrRange: '$1M-$5M' as ArrRangeType,
    percentile: 75,
    dataDate: new Date('2024-01-01'),
    metadata: {
      calculationMethod: 'standard',
      dataPoints: ['revenue', 'costs'],
      validationStatus: 'valid'
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Initialize mocks
    mockBenchmarkModel = new MockBenchmarkModel();
    mockRedisClient = new Redis();
    mockCacheManager = {
      getClient: jest.fn().mockReturnValue(mockRedisClient),
      invalidatePattern: jest.fn().mockResolvedValue(undefined)
    } as unknown as jest.Mocked<CacheManager>;

    // Create service instance
    benchmarkService = new BenchmarkService(
      mockBenchmarkModel as unknown as BenchmarkModel,
      mockCacheManager,
      logger
    );
  });

  afterEach(() => {
    mockRedisClient.flushall();
  });

  describe('createBenchmark', () => {
    const validCreateData = {
      metricId: VALID_METRIC_ID,
      sourceId: VALID_SOURCE_ID,
      value: 85.5,
      arrRange: '$1M-$5M' as ArrRangeType,
      percentile: 75,
      dataDate: new Date('2024-01-01'),
      metadata: {
        calculationMethod: 'standard',
        dataPoints: ['revenue', 'costs'],
        validationStatus: 'valid'
      }
    };

    it('should create new benchmark data with valid input', async () => {
      mockBenchmarkModel.create.mockResolvedValue(mockBenchmarkData);

      const result = await benchmarkService.createBenchmark(validCreateData);

      expect(result).toEqual(mockBenchmarkData);
      expect(mockBenchmarkModel.create).toHaveBeenCalledWith(validCreateData);
      expect(mockCacheManager.invalidatePattern).toHaveBeenCalled();
    });

    it('should validate required fields before creation', async () => {
      const invalidData = { ...validCreateData, metricId: undefined };

      await expect(benchmarkService.createBenchmark(invalidData))
        .rejects
        .toThrow('Missing required fields');
    });

    it('should handle duplicate benchmark data error', async () => {
      mockBenchmarkModel.create.mockRejectedValue(new Error('Duplicate entry'));

      await expect(benchmarkService.createBenchmark(validCreateData))
        .rejects
        .toThrow('Duplicate entry');
    });

    it('should invalidate relevant cache entries after creation', async () => {
      mockBenchmarkModel.create.mockResolvedValue(mockBenchmarkData);

      await benchmarkService.createBenchmark(validCreateData);

      expect(mockCacheManager.invalidatePattern).toHaveBeenCalledWith(
        expect.stringContaining(VALID_METRIC_ID)
      );
    });
  });

  describe('getBenchmarkById', () => {
    it('should return cached benchmark data on cache hit', async () => {
      const cachedData = JSON.stringify(mockBenchmarkData);
      await mockRedisClient.set(`benchmark:id:${VALID_BENCHMARK_ID}`, cachedData);

      const result = await benchmarkService.getBenchmarkById(VALID_BENCHMARK_ID);

      expect(result).toEqual(mockBenchmarkData);
      expect(mockBenchmarkModel.findById).not.toHaveBeenCalled();
    });

    it('should fetch and cache data on cache miss', async () => {
      mockBenchmarkModel.findById.mockResolvedValue(mockBenchmarkData);

      const result = await benchmarkService.getBenchmarkById(VALID_BENCHMARK_ID);

      expect(result).toEqual(mockBenchmarkData);
      expect(mockBenchmarkModel.findById).toHaveBeenCalledWith(VALID_BENCHMARK_ID);
      
      // Verify data was cached
      const cachedData = await mockRedisClient.get(`benchmark:id:${VALID_BENCHMARK_ID}`);
      expect(JSON.parse(cachedData!)).toEqual(mockBenchmarkData);
    });

    it('should handle non-existent benchmark ID', async () => {
      mockBenchmarkModel.findById.mockResolvedValue(null);

      await expect(benchmarkService.getBenchmarkById('non-existent-id'))
        .rejects
        .toThrow('Benchmark not found');
    });
  });

  describe('getBenchmarksByFilter', () => {
    const validFilter: BenchmarkFilter = {
      metricId: VALID_METRIC_ID,
      arrRange: '$1M-$5M',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31')
    };

    it('should return cached filtered results if available', async () => {
      const cachedResults = [mockBenchmarkData];
      const cacheKey = `benchmark:filter:${Buffer.from(JSON.stringify(validFilter)).toString('base64')}`;
      await mockRedisClient.set(cacheKey, JSON.stringify(cachedResults));

      const result = await benchmarkService.getBenchmarksByFilter(validFilter);

      expect(result).toEqual(cachedResults);
      expect(mockBenchmarkModel.findByFilter).not.toHaveBeenCalled();
    });

    it('should apply filters correctly to database query', async () => {
      const queryResults = [mockBenchmarkData];
      mockBenchmarkModel.findByFilter.mockResolvedValue(queryResults);

      const result = await benchmarkService.getBenchmarksByFilter(validFilter);

      expect(result).toEqual(queryResults);
      expect(mockBenchmarkModel.findByFilter).toHaveBeenCalledWith(validFilter);
    });
  });

  describe('getPercentileDistribution', () => {
    const validFilter: BenchmarkFilter = {
      metricId: VALID_METRIC_ID,
      arrRange: '$1M-$5M'
    };

    const mockDistribution: PercentileDistribution = {
      p5: 10,
      p25: 25,
      p50: 50,
      p75: 75,
      p90: 90
    };

    it('should calculate correct percentile distributions', async () => {
      mockBenchmarkModel.calculatePercentiles.mockResolvedValue(mockDistribution);

      const result = await benchmarkService.getPercentileDistribution(validFilter);

      expect(result).toEqual(mockDistribution);
      expect(mockBenchmarkModel.calculatePercentiles).toHaveBeenCalledWith(validFilter);
    });

    it('should cache distribution results', async () => {
      mockBenchmarkModel.calculatePercentiles.mockResolvedValue(mockDistribution);

      await benchmarkService.getPercentileDistribution(validFilter);

      const cacheKey = `benchmark:percentiles:${Buffer.from(JSON.stringify(validFilter)).toString('base64')}`;
      const cachedData = await mockRedisClient.get(cacheKey);
      expect(JSON.parse(cachedData!)).toEqual(mockDistribution);
    });
  });

  describe('updateBenchmark', () => {
    const updateData = {
      value: 90.5,
      percentile: 80
    };

    it('should update benchmark data successfully', async () => {
      const updatedBenchmark = { ...mockBenchmarkData, ...updateData };
      mockBenchmarkModel.update.mockResolvedValue(updatedBenchmark);

      const result = await benchmarkService.updateBenchmark(VALID_BENCHMARK_ID, updateData);

      expect(result).toEqual(updatedBenchmark);
      expect(mockBenchmarkModel.update).toHaveBeenCalledWith(VALID_BENCHMARK_ID, updateData);
      expect(mockCacheManager.invalidatePattern).toHaveBeenCalled();
    });

    it('should validate update payload', async () => {
      const invalidData = { percentile: 150 }; // Invalid percentile value

      await expect(benchmarkService.updateBenchmark(VALID_BENCHMARK_ID, invalidData))
        .rejects
        .toThrow('Percentile must be between 0 and 100');
    });
  });

  describe('deleteBenchmark', () => {
    it('should delete benchmark data successfully', async () => {
      mockBenchmarkModel.findById.mockResolvedValue(mockBenchmarkData);
      mockBenchmarkModel.delete.mockResolvedValue(undefined);

      await benchmarkService.deleteBenchmark(VALID_BENCHMARK_ID);

      expect(mockBenchmarkModel.delete).toHaveBeenCalledWith(VALID_BENCHMARK_ID);
      expect(mockCacheManager.invalidatePattern).toHaveBeenCalled();
    });

    it('should handle non-existent benchmark deletion', async () => {
      mockBenchmarkModel.findById.mockResolvedValue(null);

      await expect(benchmarkService.deleteBenchmark('non-existent-id'))
        .rejects
        .toThrow('Benchmark not found');
    });
  });
});