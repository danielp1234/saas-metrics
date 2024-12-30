// @version jest ^29.x
// @version axios-mock-adapter ^1.21.x
// @version axios ^1.4.x

import { describe, beforeAll, beforeEach, afterEach, it, expect, jest } from '@jest/globals';
import MockAdapter from 'axios-mock-adapter';
import axios from 'axios';
import ApiService from '../../src/services/api.service';
import { ApiRequestConfig } from '../../src/interfaces/api.interface';
import { apiConfig } from '../../src/config/api.config';
import { AuthErrorCode } from '../../src/interfaces/auth.interface';

// Test constants
const TEST_TIMEOUT = 5000;
const MOCK_BASE_URL = 'http://localhost:3000';
const DEFAULT_TEST_CONFIG: ApiRequestConfig = {
  headers: { 'Content-Type': 'application/json' },
  timeout: 2000
};
const MOCK_AUTH_TOKEN = 'test-auth-token';

describe('ApiService', () => {
  let mockAxios: MockAdapter;
  let apiService: typeof ApiService;

  beforeAll(() => {
    jest.setTimeout(TEST_TIMEOUT);
  });

  beforeEach(() => {
    mockAxios = new MockAdapter(axios);
    apiService = ApiService.getInstance();
    localStorage.clear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockAxios.reset();
    mockAxios.restore();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance when getInstance is called multiple times', () => {
      const instance1 = ApiService.getInstance();
      const instance2 = ApiService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should maintain configuration across instances', () => {
      const instance = ApiService.getInstance();
      instance.clearCache();
      const instance2 = ApiService.getInstance();
      expect(instance2).toBe(instance);
    });
  });

  describe('HTTP Methods', () => {
    it('should make successful GET requests', async () => {
      const testData = { id: 1, name: 'test' };
      mockAxios.onGet(`${MOCK_BASE_URL}/test`).reply(200, testData);

      const response = await apiService.get('/test');
      expect(response.data).toEqual(testData);
      expect(response.success).toBe(true);
    });

    it('should make successful POST requests with data', async () => {
      const testData = { name: 'test' };
      mockAxios.onPost(`${MOCK_BASE_URL}/test`, testData).reply(201, testData);

      const response = await apiService.post('/test', testData);
      expect(response.data).toEqual(testData);
      expect(response.success).toBe(true);
    });

    it('should make successful PUT requests with data', async () => {
      const testData = { id: 1, name: 'updated' };
      mockAxios.onPut(`${MOCK_BASE_URL}/test/1`, testData).reply(200, testData);

      const response = await apiService.put('/test/1', testData);
      expect(response.data).toEqual(testData);
      expect(response.success).toBe(true);
    });

    it('should make successful DELETE requests', async () => {
      mockAxios.onDelete(`${MOCK_BASE_URL}/test/1`).reply(204);

      const response = await apiService.delete('/test/1');
      expect(response.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      mockAxios.onGet(`${MOCK_BASE_URL}/test`).networkError();

      await expect(apiService.get('/test')).rejects.toMatchObject({
        code: 500,
        message: expect.any(String)
      });
    });

    it('should handle timeout errors', async () => {
      mockAxios.onGet(`${MOCK_BASE_URL}/test`).timeout();

      await expect(apiService.get('/test', { timeout: 100 })).rejects.toMatchObject({
        code: 500,
        message: expect.stringContaining('timeout')
      });
    });

    it('should handle rate limiting responses', async () => {
      mockAxios.onGet(`${MOCK_BASE_URL}/test`).reply(429, {
        message: 'Too Many Requests'
      });

      await expect(apiService.get('/test')).rejects.toMatchObject({
        code: 429,
        retryable: true
      });
    });

    it('should handle validation errors', async () => {
      const validationError = {
        code: 400,
        message: 'Validation Error',
        validationErrors: [{ field: 'name', message: 'Required' }]
      };
      mockAxios.onPost(`${MOCK_BASE_URL}/test`).reply(400, validationError);

      await expect(apiService.post('/test', {})).rejects.toMatchObject({
        code: 400,
        validationErrors: expect.arrayContaining([
          expect.objectContaining({ field: 'name' })
        ])
      });
    });
  });

  describe('Authentication', () => {
    it('should include authentication token in requests', async () => {
      const testData = { id: 1 };
      mockAxios.onGet(`${MOCK_BASE_URL}/test`).reply(config => {
        expect(config.headers?.Authorization).toBe(`Bearer ${MOCK_AUTH_TOKEN}`);
        return [200, testData];
      });

      await apiService.get('/test', {
        headers: { Authorization: `Bearer ${MOCK_AUTH_TOKEN}` }
      });
    });

    it('should handle unauthorized errors', async () => {
      mockAxios.onGet(`${MOCK_BASE_URL}/test`).reply(401, {
        code: AuthErrorCode.INVALID_TOKEN
      });

      await expect(apiService.get('/test')).rejects.toMatchObject({
        code: 401,
        message: expect.any(String)
      });
    });

    it('should skip authentication when skipAuth is true', async () => {
      const testData = { id: 1 };
      mockAxios.onGet(`${MOCK_BASE_URL}/test`).reply(config => {
        expect(config.headers?.Authorization).toBeUndefined();
        return [200, testData];
      });

      await apiService.get('/test', { skipAuth: true });
    });
  });

  describe('Performance', () => {
    it('should respect timeout configuration', async () => {
      const testTimeout = 100;
      mockAxios.onGet(`${MOCK_BASE_URL}/test`).reply(() => {
        return new Promise(resolve => setTimeout(() => resolve([200, {}]), testTimeout * 2));
      });

      await expect(apiService.get('/test', { timeout: testTimeout }))
        .rejects.toMatchObject({
          message: expect.stringContaining('timeout')
        });
    });

    it('should cache GET requests when configured', async () => {
      const testData = { id: 1 };
      let requestCount = 0;

      mockAxios.onGet(`${MOCK_BASE_URL}/test`).reply(() => {
        requestCount++;
        return [200, testData];
      });

      // First request
      await apiService.get('/test', { cache: true });
      // Second request should use cache
      await apiService.get('/test', { cache: true });

      expect(requestCount).toBe(1);
    });

    it('should handle concurrent requests efficiently', async () => {
      const testData = { id: 1 };
      mockAxios.onGet(`${MOCK_BASE_URL}/test`).reply(200, testData);

      const requests = Array(5).fill(null).map(() => 
        apiService.get('/test')
      );

      const responses = await Promise.all(requests);
      responses.forEach(response => {
        expect(response.data).toEqual(testData);
      });
    });

    it('should implement retry logic for failed requests', async () => {
      let attempts = 0;
      mockAxios.onGet(`${MOCK_BASE_URL}/test`).reply(() => {
        attempts++;
        return attempts < 3 ? [500, {}] : [200, { success: true }];
      });

      const response = await apiService.get('/test', {
        retries: 3
      });

      expect(attempts).toBe(3);
      expect(response.success).toBe(true);
    });
  });

  describe('Cache Management', () => {
    it('should clear specific cache entries', async () => {
      const testData = { id: 1 };
      let requestCount = 0;

      mockAxios.onGet(`${MOCK_BASE_URL}/test`).reply(() => {
        requestCount++;
        return [200, testData];
      });

      await apiService.get('/test', { cache: true });
      apiService.clearCache('/test');
      await apiService.get('/test', { cache: true });

      expect(requestCount).toBe(2);
    });

    it('should clear all cache entries', async () => {
      const testData = { id: 1 };
      let requestCount = 0;

      mockAxios.onGet(`${MOCK_BASE_URL}/test`).reply(() => {
        requestCount++;
        return [200, testData];
      });

      await apiService.get('/test', { cache: true });
      apiService.clearCache();
      await apiService.get('/test', { cache: true });

      expect(requestCount).toBe(2);
    });
  });
});