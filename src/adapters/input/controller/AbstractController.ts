import { Context, Handler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { ContentfulStatusCode } from 'hono/utils/http-status';
import { Controller } from './Controller';
import { Env } from '../../../env';
import { Configuration } from '@vecrea/oid4vc-verifier-frontend-core';
import { FC } from 'hono/jsx';
import { ErrorPageProps } from '../views';

/**
 * Abstract base controller providing common error handling functionality.
 *
 * This class implements the shared error handling logic that is common across
 * all controllers in the application, following the DRY principle and ensuring
 * consistent error responses with proper error page rendering.
 *
 * @abstract
 * @implements {Controller}
 *
 * @example
 * ```typescript
 * class MyController<T extends Env> extends AbstractController<T> {
 *   constructor(errorView: FC<ErrorPageProps>) {
 *     super(errorView);
 *   }
 *
 *   handler(): Handler<T> {
 *     return async (c: Context<T>) => {
 *       try {
 *         // Controller-specific logic
 *         return c.json({ success: true });
 *       } catch (error) {
 *         return await this.handleError(c, config, error);
 *       }
 *     };
 *   }
 * }
 * ```
 */
export abstract class AbstractController<T extends Env>
  implements Controller<T>
{
  /**
   * Creates a new AbstractController instance
   *
   * @param errorView - React functional component for rendering error pages
   */
  constructor(protected readonly errorView: FC<ErrorPageProps>) {
    if (!errorView || typeof errorView !== 'function') {
      throw new TypeError('errorView must be a React functional component');
    }
  }
  /**
   * Returns a Hono handler function for processing HTTP requests
   * Must be implemented by concrete controller classes.
   *
   * @returns A Hono handler function that processes HTTP requests
   */
  abstract handler(): Handler<T>;

  /**
   * Handles errors consistently across all controllers.
   *
   * This method provides centralized error handling with:
   * - Appropriate HTTP status code determination
   * - Error message sanitization for production
   * - Structured error logging
   * - Consistent error response format
   *
   * @param context - The Hono context object
   * @param config - Configuration instance for accessing paths
   * @param error - The error that occurred
   * @param status - Optional HTTP status code
   * @returns Promise resolving to HTTP error response
   *
   * @example
   * ```typescript
   * try {
   *   // Some operation that might fail
   * } catch (error) {
   *   return await this.handleError(c, config, error);
   * }
   * ```
   */
  async handleError(
    context: Context<T>,
    config: Configuration,
    error: Error | string,
    status?: ContentfulStatusCode
  ): Promise<Response> {
    // Determine appropriate status code
    let errorStatus: ContentfulStatusCode = status || 500;
    let message = 'Internal Server Error';

    if (error instanceof HTTPException) {
      errorStatus = error.status;
      message = error.message;
    } else if (error instanceof Error) {
      // Map specific error types to appropriate status codes
      if (
        error.message.includes('Session expired') ||
        error.message.includes('Invalid session')
      ) {
        errorStatus = 401;
        message = 'Session expired';
      } else if (
        error.message.includes('Invalid') ||
        error.message.includes('Missing')
      ) {
        errorStatus = 400;
        message = 'Bad Request';
      } else if (error.message.includes('Not found')) {
        errorStatus = 404;
        message = 'Not Found';
      } else {
        message = error.message;
      }
    } else if (typeof error === 'string') {
      message = error;
    }

    // Log error with context
    const isDevelopment = process.env.NODE_ENV === 'development';
    if (isDevelopment) {
      console.error(`[${this.constructor.name}] Error:`, {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        status: errorStatus,
        timestamp: new Date().toISOString(),
      });
    } else {
      // Production logging - sanitized
      console.error(`[${this.constructor.name}] Error occurred`, {
        status: errorStatus,
        timestamp: new Date().toISOString(),
      });
    }

    // Sanitize error message for production
    if (!isDevelopment && errorStatus === 500) {
      message = 'Internal Server Error';
    }

    try {
      // Get home path (may be async)
      const homePath = await config.homeViewPath();

      // Generate error view component
      const ViewComponent = this.errorView({
        error: message,
        homePath,
      });

      if (!ViewComponent) {
        console.error('Failed to generate error view component', {
          error: message,
          homePath,
          statusCode: errorStatus,
          timestamp: new Date().toISOString(),
        });

        throw new HTTPException(500, {
          message: 'Internal server error: Unable to render error page',
        });
      }

      // Set status code and return rendered response
      context.status(errorStatus);
      return context.render(ViewComponent);
    } catch (renderError) {
      // Critical error handling - last resort
      console.error('Critical error in AbstractController:', {
        originalError: message,
        renderError:
          renderError instanceof Error
            ? renderError.message
            : String(renderError),
        statusCode: errorStatus,
        path: context.req.path,
        timestamp: new Date().toISOString(),
        stack: renderError instanceof Error ? renderError.stack : undefined,
      });

      // Throw HTTP exception as final fallback
      throw new HTTPException(500, {
        message: isDevelopment
          ? `Critical error: ${
              renderError instanceof Error
                ? renderError.message
                : String(renderError)
            }`
          : 'Critical system error occurred',
      });
    }
  }
}
