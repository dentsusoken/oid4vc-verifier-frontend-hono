import {
  Fetcher,
  GetRequestOptions,
  PostRequestOptions,
} from 'oid4vc-verifier-frontend-core/ports.out.http';
import { z } from 'zod';
import {
  HttpError,
  HttpUtils,
} from 'oid4vc-verifier-frontend-core/adapters.out.http';

export class WorkerToWorkerFetcher implements Fetcher {
  #backend: Service;

  constructor(backend: Service) {
    this.#backend = backend;
  }
  /**
   * Performs an HTTP GET request with response validation
   *
   * Sends a GET request to the specified URL and validates the response
   * against the provided Zod schema. Automatically sets appropriate
   * Accept headers for JSON content negotiation and supports custom
   * configuration options.
   *
   * @param url - The URL to send the GET request to
   * @param schema - Zod schema for validating the response data
   * @param options - Optional configuration for request behavior
   * @returns Promise resolving to the validated response data
   *
   * @throws {HttpError} When the HTTP response status indicates an error (not 2xx)
   * @throws {z.ZodError} When the response data doesn't match the provided schema
   * @throws {TypeError} When network request fails or response is not valid JSON
   *
   * @typeParam T - The expected type of the response data
   */
  get<T>(
    url: string,
    schema: z.ZodSchema<T>,
    options?: GetRequestOptions,
  ): Promise<T> {
    const executeRequest = () => {
      const headers = HttpUtils.createJsonHeaders(false, options?.headers);
      const controller = new AbortController();

      // Set timeout if specified
      if (options?.timeout) {
        setTimeout(() => controller.abort(), options.timeout);
      }

      return this.#backend
        .fetch(url, {
          method: 'GET',
          headers,
          signal: controller.signal,
        })
        .then((response) => {
          HttpUtils.checkStatus(response, url, 'GET');
          return HttpUtils.parseJsonResponse(response);
        })
        .then((data) => schema.parse(data))
        .catch((error) => {
          if (error instanceof HttpError || error instanceof z.ZodError) {
            throw error;
          }
          if (error instanceof Error && error.name === 'AbortError') {
            throw new Error(`Request to ${url} timed out`);
          }
          throw new Error(
            `Failed to get from ${url}: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`,
          );
        });
    };

    return HttpUtils.executeWithRetry(
      executeRequest,
      options?.retryAttempts ?? 0,
    );
  }

  /**
   * Performs an HTTP POST request with response validation
   *
   * Sends a POST request to the specified URL with the provided body
   * and validates the response against the provided Zod schema.
   * Automatically sets Content-Type and Accept headers for JSON communication
   * and supports custom configuration options.
   *
   * @param url - The URL to send the POST request to
   * @param body - The request body as a string (typically JSON)
   * @param schema - Zod schema for validating the response data
   * @param options - Optional configuration for request behavior
   * @returns Promise resolving to the validated response data
   *
   * @throws {HttpError} When the HTTP response status indicates an error (not 2xx)
   * @throws {z.ZodError} When the response data doesn't match the provided schema
   * @throws {TypeError} When network request fails or response is not valid JSON
   *
   * @typeParam T - The expected type of the response data
   */
  post<T>(
    url: string,
    body: string,
    schema: z.ZodSchema<T>,
    options?: PostRequestOptions,
  ): Promise<T> {
    const executeRequest = () => {
      const contentType = options?.contentType ?? 'application/json';
      const headers = HttpUtils.createJsonHeaders(
        true,
        options?.headers,
        contentType,
      );
      const controller = new AbortController();

      // Set timeout if specified
      if (options?.timeout) {
        setTimeout(() => controller.abort(), options.timeout);
      }

      console.log('body :>> ', body);

      return this.#backend
        .fetch(url, {
          method: 'POST',
          headers,
          body,
          signal: controller.signal,
        })
        .then((response) => {
          HttpUtils.checkStatus(response, url, 'POST');
          return HttpUtils.parseJsonResponse(response);
        })
        .then((data) => schema.parse(data))
        .catch((error) => {
          if (error instanceof HttpError || error instanceof z.ZodError) {
            throw error;
          }
          if (error instanceof Error && error.name === 'AbortError') {
            throw new Error(`Request to ${url} timed out`);
          }
          throw new Error(
            `Failed to post to ${url}: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`,
          );
        });
    };

    return HttpUtils.executeWithRetry(
      executeRequest,
      options?.retryAttempts ?? 0,
    );
  }
}
