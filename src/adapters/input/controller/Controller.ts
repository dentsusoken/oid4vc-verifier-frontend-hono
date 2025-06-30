import { Handler, Context } from 'hono';
import { Env } from '../../../env';
import { ContentfulStatusCode } from 'hono/utils/http-status';
import { Configuration } from 'oid4vc-verifier-frontend-core/di';

/**
 * Base controller interface for HTTP request handling
 *
 * Defines the contract for all controllers in the OID4VC verifier frontend
 * application. Controllers are responsible for handling HTTP requests,
 * coordinating with business logic services, and returning appropriate
 * responses.
 *
 * This interface follows the hexagonal architecture pattern by providing
 * a clear boundary between the web framework (Hono) and the application
 * core, ensuring controllers remain focused on HTTP concerns while
 * delegating business logic to appropriate services.
 *
 * @example
 * ```typescript
 * export class UserController<T extends Env> extends AbstractController<T> {
 *   constructor(errorView: FC<ErrorPageProps>) {
 *     super(errorView);
 *   }
 *
 *   handler(): Handler<T> {
 *     return async (c: Context<T>) => {
 *       try {
 *         const users = await this.userService.getAllUsers();
 *         return c.json(users);
 *       } catch (error) {
 *         return this.handleError(c, '/home', error);
 *       }
 *     };
 *   }
 * }
 * ```
 *
 * @template T - The environment type extending the base Env interface
 * @public
 */
export interface Controller<T extends Env> {
  /**
   * Returns a Hono handler function for processing HTTP requests
   *
   * The handler function should:
   * 1. Extract and validate request parameters
   * 2. Coordinate with business logic services
   * 3. Handle errors appropriately using handleError method
   * 4. Return well-formed HTTP responses
   *
   * @returns A Hono handler function that processes HTTP requests
   */
  handler(): Handler<T>;

  /**
   * Handles error responses with consistent error processing
   *
   * Provides standardized error handling across all controllers,
   * including error logging, message sanitization, and appropriate
   * HTTP status code management.
   *
   * @param context - Hono context for the current request
   * @param config - Configuration instance for accessing paths
   * @param error - Error that occurred during request processing
   * @param status - Optional HTTP status code (defaults based on error type)
   * @returns Promise resolving to an HTTP response with error page
   */
  handleError(
    context: Context<T>,
    config: Configuration,
    error: Error | string,
    status?: ContentfulStatusCode,
  ): Promise<Response>;
}
