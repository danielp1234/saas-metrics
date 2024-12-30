/**
 * @fileoverview Background worker process for handling asynchronous data import jobs
 * Implements comprehensive validation, monitoring, and error handling for benchmark data imports
 * Version: 1.0.0
 */

// External imports
import { Queue, Job, QueueScheduler } from 'bull'; // v4.10.0
import CircuitBreaker from 'opossum'; // v6.0.0

// Internal imports
import { QueueManager } from '../lib/queue';
import { ImportService } from '../services/import.service';
import { logger } from '../lib/logger';
import { MetricsCollector } from '../lib/metrics';

// Constants for worker configuration
const BATCH_SIZE = 1000;
const MAX_CONCURRENT_JOBS = 3;
const RETRY_ATTEMPTS = 3;
const CIRCUIT_BREAKER_TIMEOUT = 30000;
const VALIDATION_SUCCESS_THRESHOLD = 99.9;

/**
 * Interface for job progress tracking
 */
interface JobProgress {
  processed: number;
  total: number;
  valid: number;
  invalid: number;
  startTime: number;
}

/**
 * Enhanced job processor with comprehensive error handling and monitoring
 * @param job Bull queue job containing import data
 */
async function processImportJob(job: Job): Promise<void> {
  const startTime = Date.now();
  const importService = new ImportService();
  const metricsCollector = new MetricsCollector();

  // Initialize progress tracking
  const progress: JobProgress = {
    processed: 0,
    total: 0,
    valid: 0,
    invalid: 0,
    startTime
  };

  try {
    logger.info('Starting import job processing', {
      jobId: job.id,
      timestamp: new Date().toISOString()
    });

    // Configure circuit breaker for external service calls
    const breaker = new CircuitBreaker(importService.validateImportData, {
      timeout: CIRCUIT_BREAKER_TIMEOUT,
      errorThresholdPercentage: 50,
      resetTimeout: 30000
    });

    // Extract job data
    const { records, filename } = job.data;
    progress.total = records.length;

    // Process data in optimized batches
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);
      
      try {
        // Validate batch data with circuit breaker
        const validationResult = await breaker.fire(batch);
        
        // Process validation results
        const { valid, errors, metrics } = validationResult;
        progress.valid += metrics.validRecords;
        progress.invalid += metrics.invalidRecords;
        progress.processed += batch.length;

        // Track validation metrics
        await metricsCollector.trackJobMetrics({
          jobId: job.id,
          batchSize: batch.length,
          validCount: metrics.validRecords,
          invalidCount: metrics.invalidRecords,
          duration: metrics.validationDuration
        });

        // Update job progress
        const progressPercentage = (progress.processed / progress.total) * 100;
        await job.progress(progressPercentage);

        // Log batch completion
        logger.info('Batch processing completed', {
          jobId: job.id,
          batchNumber: Math.floor(i / BATCH_SIZE) + 1,
          validRecords: metrics.validRecords,
          invalidRecords: metrics.invalidRecords
        });

        // Store validation results
        await importService.trackValidationResults(job.id, validationResult);

      } catch (error) {
        logger.error('Batch processing error', {
          jobId: job.id,
          batchNumber: Math.floor(i / BATCH_SIZE) + 1,
          error
        });

        // Handle batch failure
        if (breaker.opened) {
          throw new Error('Circuit breaker opened - external service unavailable');
        }
      }
    }

    // Calculate final validation rate
    const validationRate = (progress.valid / progress.total) * 100;
    await metricsCollector.recordValidationRate(validationRate);

    // Verify validation success threshold
    if (validationRate < VALIDATION_SUCCESS_THRESHOLD) {
      throw new Error(`Validation rate ${validationRate}% below threshold ${VALIDATION_SUCCESS_THRESHOLD}%`);
    }

    // Log job completion
    logger.info('Import job completed successfully', {
      jobId: job.id,
      duration: Date.now() - startTime,
      validationRate,
      totalRecords: progress.total
    });

  } catch (error) {
    logger.error('Import job failed', {
      jobId: job.id,
      error,
      progress
    });
    throw error;
  }
}

/**
 * Sets up worker with comprehensive monitoring and health checks
 */
async function setupWorker(): Promise<void> {
  try {
    // Initialize queue manager
    const queueManager = QueueManager.getInstance();
    const queue = queueManager.getQueue('benchmark-import');

    // Configure queue scheduler
    const scheduler = new QueueScheduler('benchmark-import', {
      stalledInterval: 5000,
      maxStalledCount: 3
    });

    // Configure worker settings
    queue.process(MAX_CONCURRENT_JOBS, processImportJob);

    // Set up error handlers
    queue.on('error', (error) => {
      logger.error('Queue error occurred', { error });
    });

    queue.on('failed', (job, error) => {
      logger.error('Job failed', {
        jobId: job.id,
        error,
        attempts: job.attemptsMade
      });
    });

    // Set up completion handler
    queue.on('completed', (job) => {
      logger.info('Job completed successfully', {
        jobId: job.id,
        duration: Date.now() - job.timestamp
      });
    });

    // Set up stalled job handler
    queue.on('stalled', (job) => {
      logger.warn('Job stalled', { jobId: job.id });
    });

    logger.info('Import worker setup completed successfully');

  } catch (error) {
    logger.error('Failed to setup import worker', { error });
    throw error;
  }
}

// Export worker setup function
export { setupWorker };