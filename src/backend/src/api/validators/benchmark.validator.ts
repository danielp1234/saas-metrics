/**
 * @fileoverview Validation middleware for benchmark data requests and inputs
 * Implements comprehensive validation chains with caching and security features
 * @version 1.0.0
 */

import { IsString, IsNumber, IsDate, IsOptional, Min, Max, Validate } from 'class-validator'; // v0.14.x
import { createClient } from 'redis'; // v4.x
import { BenchmarkData, BenchmarkFilter, ArrRangeType } from '../../interfaces/benchmark.interface';
import { ValidationUtils } from '../../utils/validation';
import { ValidationError } from '../../utils/errors';

// Initialize Redis client for validation caching
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => console.error('Redis Client Error:', err));

// Connect to Redis
(async () => {
  await redisClient.connect();
})();

/**
 * Custom decorator for validation result caching
 */
function ValidateCache(ttlSeconds: number = 300) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheKey = `validation:${target.constructor.name}:${JSON.stringify(args)}`;
      
      try {
        // Check cache first
        const cachedResult = await redisClient.get(cacheKey);
        if (cachedResult) {
          return JSON.parse(cachedResult);
        }

        // Execute validation
        const result = await originalMethod.apply(this, args);

        // Cache the result
        await redisClient.setEx(cacheKey, ttlSeconds, JSON.stringify(result));
        return result;
      } catch (error) {
        throw error;
      }
    };
    return descriptor;
  };
}

/**
 * DTO for creating new benchmark data with comprehensive validation
 */
export class CreateBenchmarkDataDTO implements Partial<BenchmarkData> {
  @IsString()
  @Validate(ValidationUtils.validateMetricId)
  metricId: string;

  @IsString()
  @Validate(ValidationUtils.validateMetricId)
  sourceId: string;

  @IsNumber()
  @Min(-999999999)
  @Max(999999999)
  @Validate(ValidationUtils.validateNumericValue)
  value: number;

  @IsString()
  @Validate(ValidationUtils.validateARRRange)
  arrRange: ArrRangeType;

  @IsNumber()
  @Min(0)
  @Max(100)
  percentile: number;

  @IsDate()
  dataDate: Date;

  /**
   * Validates the DTO instance with enhanced validation chain and caching
   */
  @ValidateCache(300)
  async validate(): Promise<{ isValid: boolean; errors: string[] }> {
    try {
      // Sanitize string inputs
      this.metricId = ValidationUtils.sanitizeInput(this.metricId);
      this.sourceId = ValidationUtils.sanitizeInput(this.sourceId);
      this.arrRange = ValidationUtils.sanitizeInput(this.arrRange) as ArrRangeType;

      // Create validation chain
      const validationChain = ValidationUtils.createValidationChain([
        () => ValidationUtils.validateMetricId(this.metricId),
        () => ValidationUtils.validateMetricId(this.sourceId),
        () => ValidationUtils.validateNumericValue(this.value),
        () => ValidationUtils.validateARRRange(this.arrRange),
        () => this.percentile >= 0 && this.percentile <= 100,
        () => this.dataDate instanceof Date && !isNaN(this.dataDate.getTime())
      ]);

      // Execute validation chain
      await validationChain(this);
      return { isValid: true, errors: [] };
    } catch (error) {
      if (error instanceof ValidationError) {
        return { isValid: false, errors: [error.message, ...(error.details || [])] };
      }
      throw error;
    }
  }
}

/**
 * DTO for filtering benchmark data with optional field handling
 */
export class BenchmarkFilterDTO implements Partial<BenchmarkFilter> {
  @IsOptional()
  @IsString()
  @Validate(ValidationUtils.validateMetricId)
  metricId?: string;

  @IsOptional()
  @IsString()
  @Validate(ValidationUtils.validateARRRange)
  arrRange?: ArrRangeType;

  @IsOptional()
  @IsString()
  @Validate(ValidationUtils.validateMetricId)
  sourceId?: string;

  @IsOptional()
  @IsDate()
  startDate?: Date;

  @IsOptional()
  @IsDate()
  endDate?: Date;

  /**
   * Validates the filter DTO with optional field handling
   */
  @ValidateCache(300)
  async validate(): Promise<{ isValid: boolean; errors: string[] }> {
    try {
      // Sanitize optional string inputs
      if (this.metricId) this.metricId = ValidationUtils.sanitizeInput(this.metricId);
      if (this.sourceId) this.sourceId = ValidationUtils.sanitizeInput(this.sourceId);
      if (this.arrRange) this.arrRange = ValidationUtils.sanitizeInput(this.arrRange) as ArrRangeType;

      // Validate date range if provided
      if (this.startDate && this.endDate && this.startDate > this.endDate) {
        throw new ValidationError('Start date must be before end date');
      }

      // Create validation chain for present fields
      const validators = [];
      if (this.metricId) validators.push(() => ValidationUtils.validateMetricId(this.metricId!));
      if (this.sourceId) validators.push(() => ValidationUtils.validateMetricId(this.sourceId!));
      if (this.arrRange) validators.push(() => ValidationUtils.validateARRRange(this.arrRange!));
      if (this.startDate) validators.push(() => this.startDate instanceof Date && !isNaN(this.startDate!.getTime()));
      if (this.endDate) validators.push(() => this.endDate instanceof Date && !isNaN(this.endDate!.getTime()));

      const validationChain = ValidationUtils.createValidationChain(validators);

      // Execute validation chain if there are validators
      if (validators.length > 0) {
        await validationChain(this);
      }

      return { isValid: true, errors: [] };
    } catch (error) {
      if (error instanceof ValidationError) {
        return { isValid: false, errors: [error.message, ...(error.details || [])] };
      }
      throw error;
    }
  }
}

/**
 * Validates benchmark data with enhanced validation chain and caching
 */
export async function validateBenchmarkData(data: BenchmarkData): Promise<{ isValid: boolean; errors: string[] }> {
  const dto = new CreateBenchmarkDataDTO();
  Object.assign(dto, data);
  return dto.validate();
}

/**
 * Validates benchmark filter with optional field handling
 */
export async function validateBenchmarkFilter(filter: BenchmarkFilter): Promise<{ isValid: boolean; errors: string[] }> {
  const dto = new BenchmarkFilterDTO();
  Object.assign(dto, filter);
  return dto.validate();
}