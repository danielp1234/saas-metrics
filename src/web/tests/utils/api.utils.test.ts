// @version jest ^29.5.0
// @version axios ^1.4.x
// @version axios-mock-adapter ^1.21.0

import { describe, expect, jest, beforeEach, afterEach } from '@jest/globals';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import {
  createApiRequest,
  handleApiError,
  buildQueryParams,
  retryRequest
} from '../../src/utils/api.utils';
import { ApiErrorResponse } from '../../src/interfaces/api.interface';
import { apiConfig } from '../../src/config/api.config';

// Mock setup
let mockAxios: MockAdapter;
const originalConsole = { ...console };
const mockPerformanceNow = jest.fn(() => Date.now());

beforeEach(() => {
  mockAxios = new MockAdapter(axios);
  // Mock console methods for clean test output
  console.error = jest.fn();
  console.debug = jest.fn();
  // Mock performance.now
  global.performance.now = mockPerformanceNow;
  // Mock localStorage
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn()
    },
    writable: true
  });
});

afterEach(() => {
  mockAxios.reset();
  // Restore console
  console = { ...originalConsole };
  jest.clearAllMocks();
});

describe('createApiRequest', () => {
  const TEST_ENDPOINT = '/test';
  const TEST_TOKEN = 'test-token';

  test('creates instance with default configuration', async () => {
    const instance = await createApiRequest();
    expect(instance.defaults.baseURL).toBe(apiConfig.baseURL);
    expect(instance.defaults.timeout).toBe(apiConfig.timeout);
    expect(instance.defaults.headers['Content-Type']).toBe('application/json');
  });

  test('adds authentication header when token exists', async () => {
    (window.localStorage.getItem as jest.Mock).mockReturnValue(TEST_TOKEN);
    const instance = await createApiRequest();
    const response = { data: { success: true } };
    
    mockAxios.onGet(TEST_ENDPOINT).reply(config => {
      expect(config.headers?.Authorization).toBe(`Bearer ${TEST_TOKEN}`);
      return [200, response];
    });

    await instance.get(TEST_ENDPOINT);
  });

  test('skips authentication when skipAuth is true', async () => {
    (window.localStorage.getItem as jest.Mock).mockReturnValue(TEST_TOKEN);
    const instance = await createApiRequest({ skipAuth: true });
    
    mockAxios.onGet(TEST_ENDPOINT).reply(config => {
      expect(config.headers?.Authorization).toBeUndefined();
      return [200, {}];
    });

    await instance.get(TEST_ENDPOINT);
  });

  test('tracks request duration in response interceptor', async () => {
    const instance = await createApiRequest();
    const startTime = Date.now();
    mockAxios.onGet(TEST_ENDPOINT).reply(200, {});

    await instance.get(TEST_ENDPOINT);

    expect(console.debug).toHaveBeenCalledWith(
      expect.stringMatching(/completed in \d+ms/)
    );
  });
});

describe('handleApiError', () => {
  const mockError = {
    response: {
      status: 500,
      data: {
        message: 'Internal Server Error',
        validationErrors: []
      }
    },
    config: {
      url: '/test',
      method: 'GET'
    },
    message: 'Request failed'
  };

  test('formats error response correctly', () => {
    const errorResponse = handleApiError(mockError as any);
    
    expect(errorResponse).toMatchObject({
      code: 500,
      message: 'Request failed',
      details: expect.any(Object),
      timestamp: expect.any(String),
      validationErrors: expect.any(Array),
      retryable: true
    });
  });

  test('handles network errors without response', () => {
    const networkError = {
      message: 'Network Error',
      config: mockError.config
    };

    const errorResponse = handleApiError(networkError as any);
    
    expect(errorResponse).toMatchObject({
      code: 500,
      message: 'Network Error',
      retryable: false
    });
  });

  test('logs error details for monitoring', () => {
    handleApiError(mockError as any);
    
    expect(console.error).toHaveBeenCalledWith(
      '[API Error]',
      expect.objectContaining({
        url: '/test',
        method: 'GET',
        status: 500
      })
    );
  });
});

describe('buildQueryParams', () => {
  test('builds valid query string from parameters', () => {
    const params = {
      metric: 'revenue_growth',
      arr_range: '$1M-$5M',
      source: 'source1'
    };

    const queryString = buildQueryParams(params);
    expect(queryString).toBe('?metric=revenue_growth&arr_range=%241M-%245M&source=source1');
  });

  test('handles array parameters correctly', () => {
    const params = {
      metrics: ['revenue_growth', 'ndr'],
      sources: ['source1', 'source2']
    };

    const queryString = buildQueryParams(params);
    expect(queryString).toBe('?metrics=revenue_growth%2Cndr&sources=source1%2Csource2');
  });

  test('filters out null and undefined values', () => {
    const params = {
      metric: 'revenue_growth',
      arr_range: null,
      source: undefined,
      valid: 'value'
    };

    const queryString = buildQueryParams(params);
    expect(queryString).toBe('?metric=revenue_growth&valid=value');
  });

  test('handles date objects correctly', () => {
    const date = new Date('2023-01-01T00:00:00Z');
    const params = {
      date: date
    };

    const queryString = buildQueryParams(params);
    expect(queryString).toBe(`?date=${encodeURIComponent(date.toISOString())}`);
  });
});

describe('retryRequest', () => {
  const mockFn = jest.fn();
  const retryableError = new Error('Retryable Error');

  beforeEach(() => {
    jest.useFakeTimers();
    mockFn.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('retries failed requests with exponential backoff', async () => {
    mockFn
      .mockRejectedValueOnce(retryableError)
      .mockRejectedValueOnce(retryableError)
      .mockResolvedValueOnce('success');

    const promise = retryRequest(mockFn, 3);
    
    // Fast-forward through retries
    jest.runAllTimers();
    
    const result = await promise;
    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(3);
  });

  test('respects maximum retry limit', async () => {
    mockFn.mockRejectedValue(retryableError);

    try {
      const promise = retryRequest(mockFn, 2);
      jest.runAllTimers();
      await promise;
    } catch (error) {
      expect(mockFn).toHaveBeenCalledTimes(3); // Initial + 2 retries
      expect(error).toBe(retryableError);
    }
  });

  test('implements exponential backoff with jitter', async () => {
    mockFn
      .mockRejectedValueOnce(retryableError)
      .mockResolvedValueOnce('success');

    const promise = retryRequest(mockFn);
    
    // Verify delay calculation
    jest.advanceTimersByTime(1000); // Base delay
    
    await promise;
    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  test('handles non-retryable errors immediately', async () => {
    const nonRetryableError = new Error('Non-retryable Error');
    mockFn.mockRejectedValue(nonRetryableError);

    try {
      await retryRequest(mockFn);
    } catch (error) {
      expect(error).toBe(nonRetryableError);
      expect(mockFn).toHaveBeenCalledTimes(1);
    }
  });
});