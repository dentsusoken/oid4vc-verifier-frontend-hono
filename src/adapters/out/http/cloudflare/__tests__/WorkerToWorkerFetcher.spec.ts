import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { z } from 'zod';
import {
  WorkerToWorkerFetcher,
  WorkerToWorkerFetcherError,
  createWorkerToWorkerFetcher,
} from '../WorkerToWorkerFetcher';

// Mock definition for Service type (compatible with Cloudflare Workers Service)
interface Service {
  fetch: (url: string, init?: RequestInit) => Promise<Response>;
  connect: (address: string) => any;
}

describe('WorkerToWorkerFetcher', () => {
  let mockService: Service;
  let fetcher: WorkerToWorkerFetcher;
  let mockFetch: Mock;

  beforeEach(() => {
    mockFetch = vi.fn();
    mockService = {
      fetch: mockFetch,
      connect: vi.fn(),
    };
    fetcher = new WorkerToWorkerFetcher(mockService);
  });

  describe('constructor', () => {
    it('should create instance with provided service', () => {
      expect(fetcher).toBeInstanceOf(WorkerToWorkerFetcher);
    });
  });

  describe('get method', () => {
    const testSchema = z.object({
      id: z.string(),
      name: z.string(),
    });

    it('should perform successful GET request', async () => {
      const responseData = { id: '123', name: 'Test User' };
      const mockResponse = new Response(JSON.stringify(responseData), {
        status: 200,
        statusText: 'OK',
        headers: { 'Content-Type': 'application/json' },
      });

      mockFetch.mockResolvedValue(mockResponse);

      const result = await fetcher.get(
        'https://api.example.com',
        '/users/123',
        { limit: '10' },
        testSchema,
      );

      expect(result.data).toEqual(responseData);
      expect(result.metadata.status).toBe(200);
      expect(result.metadata.statusText).toBe('OK');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/users/123?limit=10',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Accept: 'application/json',
          }),
        }),
      );
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network failed');
      mockFetch.mockRejectedValue(networkError);

      await expect(
        fetcher.get('https://api.example.com', '/users/123', {}, testSchema),
      ).rejects.toThrow(WorkerToWorkerFetcherError);
    });

    it('should handle timeout errors', async () => {
      const abortError = new Error('AbortError');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValue(abortError);

      await expect(
        fetcher.get('https://api.example.com', '/users/123', {}, testSchema, {
          timeout: 1000,
        }),
      ).rejects.toThrow(WorkerToWorkerFetcherError);
    });

    it('should handle HTTP error responses', async () => {
      const mockResponse = new Response('Not Found', {
        status: 404,
        statusText: 'Not Found',
      });

      mockFetch.mockResolvedValue(mockResponse);

      await expect(
        fetcher.get('https://api.example.com', '/users/999', {}, testSchema),
      ).rejects.toThrow(WorkerToWorkerFetcherError);
    });

    it('should handle validation errors', async () => {
      const invalidData = { id: 123, name: 'Test User' }; // id should be string
      const mockResponse = new Response(JSON.stringify(invalidData), {
        status: 200,
        statusText: 'OK',
      });

      mockFetch.mockResolvedValue(mockResponse);

      await expect(
        fetcher.get('https://api.example.com', '/users/123', {}, testSchema),
      ).rejects.toThrow(WorkerToWorkerFetcherError);
    });

    it('should handle custom headers and options', async () => {
      const responseData = { id: '123', name: 'Test User' };
      const mockResponse = new Response(JSON.stringify(responseData), {
        status: 200,
        statusText: 'OK',
      });

      mockFetch.mockResolvedValue(mockResponse);

      await fetcher.get(
        'https://api.example.com',
        '/users/123',
        {},
        testSchema,
        {
          headers: { Authorization: 'Bearer token' },
          timeout: 5000,
        },
      );

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer token',
          }),
        }),
      );
    });
  });

  describe('post method', () => {
    const testSchema = z.object({
      success: z.boolean(),
      id: z.string(),
    });

    it('should perform successful POST request with string body', async () => {
      const responseData = { success: true, id: '123' };
      const mockResponse = new Response(JSON.stringify(responseData), {
        status: 201,
        statusText: 'Created',
      });

      mockFetch.mockResolvedValue(mockResponse);

      const requestBody = JSON.stringify({ name: 'New User' });
      const result = await fetcher.post(
        'https://api.example.com',
        '/users',
        requestBody,
        testSchema,
      );

      expect(result.data).toEqual(responseData);
      expect(result.metadata.status).toBe(201);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/users',
        expect.objectContaining({
          method: 'POST',
          body: requestBody,
        }),
      );
    });

    it('should perform successful POST request with object body', async () => {
      const responseData = { success: true, id: '123' };
      const mockResponse = new Response(JSON.stringify(responseData), {
        status: 201,
        statusText: 'Created',
      });

      mockFetch.mockResolvedValue(mockResponse);

      const requestBody = { name: 'New User' };
      const result = await fetcher.post(
        'https://api.example.com',
        '/users',
        requestBody,
        testSchema,
      );

      expect(result.data).toEqual(responseData);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/users',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        }),
      );
    });

    it('should handle FormData body', async () => {
      const responseData = { success: true, id: '123' };
      const mockResponse = new Response(JSON.stringify(responseData), {
        status: 201,
        statusText: 'Created',
      });

      mockFetch.mockResolvedValue(mockResponse);

      const formData = new FormData();
      formData.append('name', 'New User');

      await fetcher.post(
        'https://api.example.com',
        '/users',
        formData,
        testSchema,
      );

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/users',
        expect.objectContaining({
          method: 'POST',
          body: formData,
        }),
      );
    });

    it('should handle empty string body', async () => {
      const responseData = { success: true, id: '123' };
      const mockResponse = new Response(JSON.stringify(responseData), {
        status: 201,
        statusText: 'Created',
      });

      mockFetch.mockResolvedValue(mockResponse);

      await fetcher.post('https://api.example.com', '/users', '', testSchema);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/users',
        expect.objectContaining({
          method: 'POST',
          body: '',
        }),
      );
    });

    it('should handle POST request errors', async () => {
      const mockResponse = new Response('Internal Server Error', {
        status: 500,
        statusText: 'Internal Server Error',
      });

      mockFetch.mockResolvedValue(mockResponse);

      await expect(
        fetcher.post(
          'https://api.example.com',
          '/users',
          '{"name":"Test"}',
          testSchema,
        ),
      ).rejects.toThrow(WorkerToWorkerFetcherError);
    });
  });

  describe('createWorkerToWorkerFetcher', () => {
    it('should create WorkerToWorkerFetcher instance', () => {
      const fetcher = createWorkerToWorkerFetcher(mockService);
      expect(fetcher).toBeInstanceOf(WorkerToWorkerFetcher);
    });
  });
});

describe('WorkerToWorkerFetcherError', () => {
  it('should create error with all properties', () => {
    const error = new WorkerToWorkerFetcherError(
      'HTTP_ERROR',
      'Test error',
      'https://example.com',
      404,
      'Not Found',
      { 'Content-Type': 'application/json' },
      'Error response body',
      new Error('Original error'),
    );

    expect(error.name).toBe('WorkerToWorkerFetcherError');
    expect(error.message).toBe('Test error');
    expect(error.errorType).toBe('HTTP_ERROR');
    expect(error.url).toBe('https://example.com');
    expect(error.status).toBe(404);
    expect(error.statusText).toBe('Not Found');
    expect(error.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(error.responseBody).toBe('Error response body');
    expect(error.originalError).toBeInstanceOf(Error);
  });

  it('should create error with minimal properties', () => {
    const error = new WorkerToWorkerFetcherError(
      'NETWORK_ERROR',
      'Network error',
      'https://example.com',
    );

    expect(error.name).toBe('WorkerToWorkerFetcherError');
    expect(error.message).toBe('Network error');
    expect(error.errorType).toBe('NETWORK_ERROR');
    expect(error.url).toBe('https://example.com');
    expect(error.status).toBeUndefined();
    expect(error.statusText).toBeUndefined();
  });
});
