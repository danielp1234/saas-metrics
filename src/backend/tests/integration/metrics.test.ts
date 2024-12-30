/**
 * @fileoverview Integration tests for metrics API endpoints and service layer
 * Implements comprehensive test coverage for performance, security, and data validation
 * @version 1.0.0
 */

import request from 'supertest';
import { describe, test, expect, beforeAll, afterAll, jest } from '@jest/globals';
import app from '../../src/app';
import { MetricsService } from '../../src/services/metrics.service';
import { getClient } from '../../src/lib/cache';
import { ValidationError } from '../../utils/errors';
import { MetricType } from '../../interfaces/metrics.interface';

// Test data fixtures
const testMetrics = {
  revenueGrowth: {
    id: 'test-revenue-growth',
    name: 'Revenue Growth Rate',
    type: MetricType.REVENUE_GROWTH,
    description: 'Year over year revenue growth rate',
    calculationMethod: '((Current ARR - Previous ARR) / Previous ARR) × 100'
  },
  ndr: {
    id: 'test-ndr',
    name: 'Net Dollar Retention',
    type: MetricType.NDR,
    description: 'Net dollar retention rate',
    calculationMethod: '((Beginning ARR + Expansion - Contraction - Churn) / Beginning ARR) × 100'
  }
};

// Mock Redis client
let redisClient: any;

describe('Metrics API Integration Tests', () => {
  let metricsService: MetricsService;

  beforeAll(async () => {
    // Initialize Redis client
    redisClient = await getClient();
    await redisClient.flushall(); // Clear cache

    // Initialize metrics service
    metricsService = new MetricsService();

    // Set up test data
    await Promise.all([
      metricsService.createMetric(testMetrics.revenueGrowth),
      metricsService.createMetric(testMetrics.ndr)
    ]);
  });

  afterAll(async () => {
    // Clean up test data
    await redisClient.flushall();
    await redisClient.quit();
  });

  describe('GET /api/v1/metrics', () => {
    test('should return metrics with correct response time', async () => {
      const startTime = Date.now();
      const response = await request(app)
        .get('/api/v1/metrics')
        .expect('Content-Type', /json/)
        .expect(200);

      // Verify response time is under 2 seconds
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(2000);

      // Verify response structure
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.metadata).toHaveProperty('responseTime');
    });

    test('should properly cache responses', async () => {
      // First request - should miss cache
      const firstResponse = await request(app)
        .get('/api/v1/metrics')
        .expect(200);

      expect(firstResponse.body.metadata.cacheStatus).toBe('miss');

      // Second request - should hit cache
      const secondResponse = await request(app)
        .get('/api/v1/metrics')
        .expect(200);

      expect(secondResponse.body.metadata.cacheStatus).toBe('hit');
      expect(secondResponse.body.data).toEqual(firstResponse.body.data);
    });

    test('should handle filtering correctly', async () => {
      const response = await request(app)
        .get('/api/v1/metrics')
        .query({
          metricType: MetricType.REVENUE_GROWTH,
          arrRange: '$1M-$5M'
        })
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      response.body.data.forEach((metric: any) => {
        expect(metric.type).toBe(MetricType.REVENUE_GROWTH);
      });
    });
  });

  describe('GET /api/v1/metrics/:id', () => {
    test('should return specific metric with percentiles', async () => {
      const response = await request(app)
        .get(`/api/v1/metrics/${testMetrics.revenueGrowth.id}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('metric');
      expect(response.body.data).toHaveProperty('percentiles');
      expect(response.body.data.metric.id).toBe(testMetrics.revenueGrowth.id);
    });

    test('should handle non-existent metrics', async () => {
      await request(app)
        .get('/api/v1/metrics/non-existent')
        .expect(404);
    });

    test('should validate metric ID format', async () => {
      await request(app)
        .get('/api/v1/metrics/invalid-id-format!')
        .expect(400);
    });
  });

  describe('POST /api/v1/metrics', () => {
    test('should validate input data', async () => {
      const invalidMetric = {
        name: '', // Invalid empty name
        type: 'INVALID_TYPE',
        description: 'Test metric',
        calculationMethod: 'test'
      };

      const response = await request(app)
        .post('/api/v1/metrics')
        .send(invalidMetric)
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.details).toBeInstanceOf(Array);
    });

    test('should prevent SQL injection', async () => {
      const maliciousMetric = {
        name: "'; DROP TABLE metrics; --",
        type: MetricType.REVENUE_GROWTH,
        description: 'Malicious metric',
        calculationMethod: 'test'
      };

      await request(app)
        .post('/api/v1/metrics')
        .send(maliciousMetric)
        .expect(400);
    });

    test('should prevent XSS attacks', async () => {
      const xssMetric = {
        name: '<script>alert("XSS")</script>',
        type: MetricType.REVENUE_GROWTH,
        description: 'XSS metric',
        calculationMethod: 'test'
      };

      const response = await request(app)
        .post('/api/v1/metrics')
        .send(xssMetric)
        .expect(400);

      expect(response.body.error.message).toContain('Invalid metric name');
    });
  });

  describe('Cache Performance', () => {
    test('should maintain cache TTL', async () => {
      // Make initial request
      await request(app)
        .get('/api/v1/metrics')
        .expect(200);

      // Verify cache entry exists with correct TTL
      const ttl = await redisClient.ttl('metrics:list');
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(900); // 15 minutes
    });

    test('should handle cache invalidation', async () => {
      // Create new metric
      const newMetric = {
        name: 'Test Metric',
        type: MetricType.REVENUE_GROWTH,
        description: 'Test description',
        calculationMethod: 'test'
      };

      await request(app)
        .post('/api/v1/metrics')
        .send(newMetric)
        .expect(201);

      // Verify cache was invalidated
      const cacheExists = await redisClient.exists('metrics:list');
      expect(cacheExists).toBe(0);
    });
  });

  describe('Concurrent Operations', () => {
    test('should handle concurrent requests safely', async () => {
      const concurrentRequests = 10;
      const requests = Array(concurrentRequests).fill(null).map(() => 
        request(app).get('/api/v1/metrics')
      );

      const responses = await Promise.all(requests);
      
      // Verify all requests succeeded
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.data).toBeDefined();
      });

      // Verify response consistency
      const firstResponse = responses[0].body.data;
      responses.forEach(response => {
        expect(response.body.data).toEqual(firstResponse);
      });
    });
  });
});