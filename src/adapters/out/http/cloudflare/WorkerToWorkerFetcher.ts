import { ZodError, type ZodSchema } from 'zod';
import type {
  Fetcher,
  GetRequest,
  PostRequest,
  HttpError,
  HttpHeaders,
  HttpRequestBody,
  HttpRequestOptions,
  HttpResponse,
  HttpResponseMetadata,
} from 'oid4vc-verifier-frontend-core';

/**
 * Custom error class for HTTP-related errors
 *
 * Provides structured error information for different types of HTTP failures
 * including network errors, timeout errors, validation errors, and HTTP status errors.
 *
 * @public
 */
export class WorkerToWorkerFetcherError extends Error implements HttpError {
  constructor(
    public readonly errorType:
      | 'NETWORK_ERROR'
      | 'TIMEOUT_ERROR'
      | 'VALIDATION_ERROR'
      | 'HTTP_ERROR',
    message: string,
    public readonly url: string,
    public readonly status?: number,
    public readonly statusText?: string,
    public readonly headers?: HttpHeaders,
    public readonly responseBody?: string,
    public readonly originalError?: Error,
  ) {
    super(message);
    this.name = 'WorkerToWorkerFetcherError';
  }
}

/**
 * Worker to Worker HTTP client implementation using the native fetch API
 *
 * Provides a production-ready implementation of the Fetcher interface using
 * the standard fetch API. Includes comprehensive error handling, timeout support,
 * request/response logging, and automatic JSON parsing with Zod validation.
 *
 * Features:
 * - Automatic JSON serialization/deserialization
 * - Zod schema validation for type safety
 * - Configurable timeout support
 * - AbortController integration
 * - Comprehensive error handling
 * - Request/response logging
 * - Custom headers support
 * - Query parameter handling
 *
 * @example
 * ```typescript
 * const fetcher = new WorkerToWorkerFetcher();
 *
 * // GET request
 * const userSchema = z.object({ id: z.string(), name: z.string() });
 * const user = await fetcher.get('https://api.example.com', '/users/123', userSchema, {
 *   headers: { 'Authorization': 'Bearer token' },
 *   timeout: 5000
 * });
 *
 * // POST request
 * const createSchema = z.object({ success: z.boolean(), id: z.string() });
 * const result = await fetcher.post('https://api.example.com', '/users',
 *   '{"name":"Alice","email":"alice@example.com"}',
 *   createSchema,
 *   { timeout: 10000 }
 * );
 * ```
 *
 * @public
 */
export class WorkerToWorkerFetcher implements Fetcher {
  #service: Service;

  constructor(service: Service) {
    this.#service = service;
  }
  /**
   * WorkerToWorker configuration for HTTP requests
   */
  private readonly WorkerToWorkerOptions: Partial<HttpRequestOptions> = {
    timeout: 30000, // 30 seconds WorkerToWorker timeout
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  };

  /**
   * Creates an AbortController with optional timeout
   *
   * @param timeout - Timeout in milliseconds
   * @returns AbortController instance
   *
   * @internal
   */
  private createAbortController(timeout?: number): AbortController {
    const controller = new AbortController();

    if (timeout && timeout > 0) {
      setTimeout(() => {
        controller.abort();
      }, timeout);
    }

    return controller;
  }

  /**
   * Merges request options with WorkerToWorkers
   *
   * @param options - Request-specific options
   * @returns Merged options
   *
   * @internal
   */
  private mergeOptions(
    options?: HttpRequestOptions,
  ): Required<Omit<HttpRequestOptions, 'signal' | 'fetchOptions'>> &
    Pick<HttpRequestOptions, 'signal' | 'fetchOptions'> {
    return {
      timeout: options?.timeout ?? this.WorkerToWorkerOptions.timeout!,
      headers: {
        ...this.WorkerToWorkerOptions.headers,
        ...options?.headers,
      },
      signal: options?.signal,
      fetchOptions: options?.fetchOptions,
    };
  }

  /**
   * Performs the actual HTTP request
   *
   * @param url - Request URL
   * @param init - Fetch init options
   * @param timeout - Request timeout
   * @returns Promise<Response>
   *
   * @internal
   */
  private async performRequest(
    url: string,
    init: RequestInit,
    timeout?: number,
  ): Promise<Response> {
    const controller = this.createAbortController(timeout);

    try {
      const response = await this.#service.fetch(url, {
        ...init,
        signal: init.signal || controller.signal,
      });

      return response;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new WorkerToWorkerFetcherError(
            'TIMEOUT_ERROR',
            `Request timeout after ${timeout}ms`,
            url,
            undefined,
            undefined,
            undefined,
            undefined,
            error,
          );
        }

        throw new WorkerToWorkerFetcherError(
          'NETWORK_ERROR',
          `Network request failed: ${error.message}`,
          url,
          undefined,
          undefined,
          undefined,
          undefined,
          error,
        );
      }

      throw new WorkerToWorkerFetcherError(
        'NETWORK_ERROR',
        'Unknown network error occurred',
        url,
        undefined,
        undefined,
        undefined,
        undefined,
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  /**
   * Processes the response and validates it against the schema
   *
   * @param response - Fetch response object
   * @param schema - Zod schema for validation
   * @param url - Original request URL
   * @returns Validated and typed response data
   *
   * @internal
   */
  private async processResponse<T>(
    response: Response,
    schema: ZodSchema<T>,
    url: string,
  ): Promise<HttpResponse<T>> {
    // Check if response is ok
    if (!response.ok) {
      let errorData: string | undefined;

      try {
        errorData = await response.text();
      } catch {
        errorData = undefined;
      }

      throw new WorkerToWorkerFetcherError(
        'HTTP_ERROR',
        `HTTP ${response.status}: ${response.statusText}`,
        url,
        response.status,
        response.statusText,
        Object.fromEntries(response.headers.entries()),
        errorData,
      );
    }

    // Parse response body
    let responseData: unknown;
    try {
      const responseText = await response.text();
      responseData = responseText ? JSON.parse(responseText) : null;
    } catch (error) {
      throw new WorkerToWorkerFetcherError(
        'VALIDATION_ERROR',
        'Failed to parse response as JSON',
        url,
        response.status,
        response.statusText,
        Object.fromEntries(response.headers.entries()),
        undefined,
        error instanceof Error ? error : new Error(String(error)),
      );
    }

    // Validate response data against schema
    try {
      const validatedData = schema.parse(responseData);

      const metadata: HttpResponseMetadata = {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        url: response.url,
        ok: response.ok,
      };

      return {
        data: validatedData,
        metadata,
      };
    } catch (error) {
      if (error instanceof ZodError) {
        throw new WorkerToWorkerFetcherError(
          'VALIDATION_ERROR',
          `Response validation failed: ${error.message}`,
          url,
          response.status,
          response.statusText,
          Object.fromEntries(response.headers.entries()),
          JSON.stringify(responseData),
          error,
        );
      }

      throw new WorkerToWorkerFetcherError(
        'VALIDATION_ERROR',
        'Unknown validation error occurred',
        url,
        response.status,
        response.statusText,
        Object.fromEntries(response.headers.entries()),
        JSON.stringify(responseData),
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  /**
   * HTTP GET request implementation
   *
   * Performs a GET request with automatic response validation and comprehensive
   * error handling. Supports query parameters, custom headers, and timeout configuration.
   *
   * @param baseUrl - Base URL for the request
   * @param path - API path
   * @param schema - Zod schema for response validation
   * @param options - Request options
   * @returns Promise resolving to validated response data
   *
   * @throws {WorkerToWorkerFetcherError} When network, timeout, or validation errors occur
   *
   * @example
   * ```typescript
   * const userSchema = z.object({ id: z.string(), name: z.string() });
   * const user = await fetcher.get('https://api.example.com', '/users/123', userSchema, {
   *   headers: { 'Authorization': 'Bearer token' },
   *   timeout: 5000
   * });
   * ```
   */
  get: GetRequest = async <T>(
    baseUrl: string,
    path: string,
    query: Record<string, string>,
    schema: ZodSchema<T>,
    options?: HttpRequestOptions,
  ): Promise<HttpResponse<T>> => {
    const mergedOptions = this.mergeOptions(options);
    const fullUrl = `${baseUrl}${path}?${new URLSearchParams(
      query,
    ).toString()}`;

    const response = await this.performRequest(
      fullUrl,
      {
        method: 'GET',
        headers: mergedOptions.headers,
        signal: mergedOptions.signal,
        ...mergedOptions.fetchOptions,
      },
      mergedOptions.timeout,
    );

    return this.processResponse(response, schema, fullUrl);
  };

  /**
   * HTTP POST request implementation
   *
   * Performs a POST request with automatic JSON serialization, response validation,
   * and comprehensive error handling. Supports various body types, custom headers,
   * and timeout configuration.
   *
   * @param baseUrl - Base URL for the request
   * @param path - API path
   * @param body - Request body (string)
   * @param schema - Zod schema for response validation
   * @param options - Request options
   * @returns Promise resolving to validated response data
   *
   * @throws {WorkerToWorkerFetcherError} When network, timeout, or validation errors occur
   *
   * @example
   * ```typescript
   * const createSchema = z.object({ success: z.boolean(), id: z.string() });
   * const result = await fetcher.post('https://api.example.com', '/users',
   *   '{"name":"Alice","email":"alice@example.com"}',
   *   createSchema,
   *   {
   *     headers: { 'Authorization': 'Bearer token' },
   *     timeout: 10000
   *   }
   * );
   * ```
   */
  post: PostRequest = async <T>(
    baseUrl: string,
    path: string,
    body: HttpRequestBody,
    schema: ZodSchema<T>,
    options?: HttpRequestOptions,
  ): Promise<HttpResponse<T>> => {
    const mergedOptions = this.mergeOptions(options);
    const fullUrl = `${baseUrl}${path}`;

    // Convert body to BodyInit type based on HttpRequestBody
    let requestBody: BodyInit | undefined;

    if (body === undefined || body === null) {
      requestBody = undefined;
    } else if (typeof body === 'string') {
      requestBody = body;
    } else if (body instanceof FormData) {
      requestBody = body;
    } else if (body instanceof URLSearchParams) {
      requestBody = body;
    } else if (body instanceof ArrayBuffer) {
      requestBody = body;
    } else if (body instanceof Blob) {
      requestBody = body;
    } else if (body instanceof ReadableStream) {
      requestBody = body;
    } else if (typeof body === 'object') {
      // JSON.stringify for object type
      requestBody = JSON.stringify(body);
      // Ensure Content-Type is set to JSON for object serialization
      if (!mergedOptions.headers['Content-Type']) {
        mergedOptions.headers['Content-Type'] = 'application/json';
      }
    } else {
      // Fallback: convert to string
      requestBody = String(body);
    }

    const response = await this.performRequest(
      fullUrl,
      {
        method: 'POST',
        headers: mergedOptions.headers,
        body: requestBody,
        signal: mergedOptions.signal,
        ...mergedOptions.fetchOptions,
      },
      mergedOptions.timeout,
    );

    return this.processResponse(response, schema, fullUrl);
  };
}

/**
 * Factory function to create a WorkerToWorkerFetcher instance
 *
 * Provides a convenient way to create a WorkerToWorkerFetcher instance with
 * optional custom configuration.
 * @param service - Service to use for the fetcher
 *
 * @returns WorkerToWorkerFetcher instance
 *
 * @example
 * ```typescript
 * // Create with WorkerToWorkers
 * const fetcher = createWorkerToWorkerFetcher(service);
 * ```
 *
 * @public
 */
export function createWorkerToWorkerFetcher(
  service: Service,
): WorkerToWorkerFetcher {
  return new WorkerToWorkerFetcher(service);
}
