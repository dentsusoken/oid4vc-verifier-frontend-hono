import { Context } from 'hono';
import { Env } from '../../../env';
import { AbstractController } from './AbstractController';
import { GetDI } from '../../../di';
import { ResultProps, ErrorPageProps } from '../views';
import { FC } from 'hono/jsx';
import { getCookie } from 'hono/cookie';
import { MdocVerifyHandler } from 'mdoc-cbor-ts';
import { ContentfulStatusCode } from 'hono/utils/http-status';

/**
 * Custom error class for session-related failures
 *
 * Represents errors that occur when session data is invalid, expired,
 * or missing during wallet response processing.
 *
 * @public
 */
export class SessionExpiredError extends Error {
  /**
   * Additional context about the session error
   * @readonly
   */
  public readonly context?: Record<string, unknown>;

  /**
   * Creates a new SessionExpiredError
   *
   * @param message - Optional custom error message
   * @param context - Additional context about the error
   */
  constructor(message?: string, context?: Record<string, unknown>) {
    super(message || 'Session has expired. Please try again.');
    this.name = 'SessionExpiredError';
    this.context = context;

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, SessionExpiredError.prototype);
  }
}

/**
 * Custom error class for VP token validation failures
 *
 * Represents errors that occur during verifiable presentation token
 * processing, including missing tokens, invalid formats, or verification failures.
 *
 * @public
 */
export class VPTokenError extends Error {
  /**
   * The type of VP token error that occurred
   * @readonly
   */
  public readonly errorType: 'missing' | 'invalid' | 'verification_failed';

  /**
   * Additional context about the VP token error
   * @readonly
   */
  public readonly context?: Record<string, unknown>;

  /**
   * Creates a new VPTokenError
   *
   * @param message - The error message
   * @param errorType - The specific type of VP token error
   * @param context - Additional context about the error
   */
  constructor(
    message: string,
    errorType: VPTokenError['errorType'] = 'invalid',
    context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'VPTokenError';
    this.errorType = errorType;
    this.context = context;

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, VPTokenError.prototype);
  }
}

/**
 * Custom error class for wallet response processing failures
 *
 * Provides detailed information about what went wrong during the
 * wallet response processing workflow, including context about the
 * specific step that failed.
 *
 * @public
 */
export class ResultControllerError extends Error {
  /**
   * The step in the processing workflow where the error occurred
   * @readonly
   */
  public readonly step:
    | 'session_validation'
    | 'service_invocation'
    | 'token_verification'
    | 'data_extraction'
    | 'view_generation';

  /**
   * Additional context about the error
   * @readonly
   */
  public readonly context?: Record<string, unknown>;

  /**
   * The original error that caused this error (if any)
   * @readonly
   */
  public readonly cause?: Error;

  /**
   * Creates a new ResultControllerError
   *
   * @param message - The error message
   * @param step - The step where the error occurred
   * @param context - Additional context about the error
   * @param cause - The original error that caused this error
   */
  constructor(
    message: string,
    step: ResultControllerError['step'],
    context?: Record<string, unknown>,
    cause?: Error,
  ) {
    super(message);
    this.name = 'ResultControllerError';
    this.step = step;
    this.context = context;
    this.cause = cause;

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, ResultControllerError.prototype);
  }
}

/**
 * Configuration options for ResultController behavior
 *
 * @public
 */
export interface ResultControllerOptions {
  /** Whether to enable debug logging (default: false) */
  enableLogging?: boolean;
  /** Whether to validate session ID format strictly (default: true) */
  strictSessionValidation?: boolean;
  /** Whether to include detailed VP token information in logs (default: false) */
  logVPTokenDetails?: boolean;
  /** Maximum allowed age for sessions in seconds (default: 3600 - 1 hour) */
  maxSessionAge?: number;
}

/**
 * Controller for handling wallet response processing and result display
 *
 * This controller manages the complete workflow of processing wallet responses
 * in the OID4VC (OpenID for Verifiable Credentials) presentation flow. It handles:
 *
 * 1. **Session Validation**: Verifies that the session is valid and active
 * 2. **Response Retrieval**: Fetches the wallet response using core services
 * 3. **Token Verification**: Validates VP tokens using cryptographic verification
 * 4. **Data Extraction**: Processes verified credentials into displayable format
 * 5. **Result Presentation**: Renders the verification results to the user
 * 6. **Error Handling**: Provides comprehensive error management with detailed context
 *
 * The controller follows the hexagonal architecture pattern by depending
 * on abstractions (ports) rather than concrete implementations, ensuring
 * high testability and flexibility across different deployment environments.
 *
 * ## OID4VC Flow Integration
 *
 * This controller implements the final step of the OID4VC presentation
 * flow as defined in the OpenID for Verifiable Credentials specification:
 *
 * 1. Wallet redirects back to the verifier with a response code
 * 2. Verifier exchanges the response code for the actual presentation
 * 3. VP tokens are cryptographically verified for authenticity
 * 4. Credential data is extracted and presented to the user
 *
 * @example
 * ```typescript
 * // Basic controller setup
 * const controller = new ResultController(
 *   getDI,
 *   ResultView,
 *   mdocVerifier,
 *   errorController
 * );
 *
 * // With custom options
 * const advancedController = new ResultController(
 *   getDI,
 *   ResultView,
 *   mdocVerifier,
 *   errorController,
 *   {
 *     enableLogging: true,
 *     strictSessionValidation: true,
 *     logVPTokenDetails: false,
 *     maxSessionAge: 1800 // 30 minutes
 *   }
 * );
 *
 * // Integration with Hono router
 * app.get('/result', controller.handler());
 * ```
 *
 * @template T - The environment type extending the base Env interface
 * @public
 */
export class ResultController<T extends Env> extends AbstractController<T> {
  /**
   * Configuration options for controller behavior
   * @private
   */
  readonly #options: Required<ResultControllerOptions>;

  /**
   * Creates a new ResultController instance
   *
   * @param getDI - Dependency injection function for accessing services
   * @param View - React functional component for rendering the result view
   * @param verifier - MDOC verifier for VP token validation
   * @param errorView - React functional component for rendering error pages
   * @param options - Configuration options for controller behavior
   *
   * @throws {TypeError} When required dependencies are not provided
   */
  constructor(
    private readonly getDI: GetDI<T>,
    private readonly View: FC<ResultProps>,
    private readonly verifier: MdocVerifyHandler,
    errorView: FC<ErrorPageProps>,
    options: ResultControllerOptions = {},
  ) {
    // Initialize parent AbstractController with error view
    super(errorView);

    // Validate required dependencies
    if (!getDI || typeof getDI !== 'function') {
      throw new TypeError('getDI must be a function');
    }
    if (!View || typeof View !== 'function') {
      throw new TypeError('View must be a React functional component');
    }
    if (!verifier || typeof verifier.verify !== 'function') {
      throw new TypeError(
        'verifier must implement MdocVerifyHandler interface',
      );
    }

    this.#options = {
      enableLogging: false,
      strictSessionValidation: true,
      logVPTokenDetails: false,
      maxSessionAge: 60 * 60, // 1 hour
      ...options,
    };
  }

  /**
   * Validates the session ID from the request cookie
   *
   * Checks that a valid session ID exists in the request cookies
   * and optionally validates its format according to configuration.
   *
   * @param context - Hono context containing request cookies
   * @returns The validated session ID
   *
   * @throws {SessionExpiredError} When session ID is missing or invalid
   *
   * @private
   */
  private validateSession(context: Context<T>): string {
    try {
      const sessionId = getCookie(context, 'sessionId');

      if (!sessionId) {
        throw new SessionExpiredError('No session cookie found', {
          cookieNames: Object.keys(context.req.raw.headers.get('cookie') || {}),
        });
      }

      if (this.#options.strictSessionValidation) {
        // Basic UUID format validation (can be enhanced based on session ID format)
        const uuidRegex =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(sessionId)) {
          throw new SessionExpiredError('Invalid session ID format', {
            sessionIdLength: sessionId.length,
            sessionIdPrefix: sessionId.substring(0, 8),
          });
        }
      }

      if (this.#options.enableLogging) {
        console.log('Session validation successful:', {
          sessionId: sessionId.substring(0, 8) + '...',
          timestamp: new Date().toISOString(),
        });
      }

      return sessionId;
    } catch (error) {
      if (error instanceof SessionExpiredError) {
        throw error;
      }
      throw new ResultControllerError(
        'Failed to validate session',
        'session_validation',
        { error: error instanceof Error ? error.message : String(error) },
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  /**
   * Processes and verifies the VP token from wallet response
   *
   * Validates the verifiable presentation token using cryptographic
   * verification and extracts the credential data for display.
   *
   * @param vpToken - The VP token string from the wallet response
   * @returns The extracted and verified credential data
   *
   * @throws {VPTokenError} When VP token is missing, invalid, or verification fails
   *
   * @private
   */
  private async processVPToken(vpToken: string): Promise<any[]> {
    try {
      if (!vpToken || typeof vpToken !== 'string') {
        throw new VPTokenError(
          'VP token not presented or invalid format',
          'missing',
          { tokenType: typeof vpToken, tokenLength: vpToken?.length },
        );
      }

      if (this.#options.enableLogging && this.#options.logVPTokenDetails) {
        console.log('Processing VP token:', {
          tokenLength: vpToken.length,
          tokenPrefix: vpToken.substring(0, 20) + '...',
          timestamp: new Date().toISOString(),
        });
      }

      const result = await this.verifier.verify(vpToken);

      if (!result.valid) {
        throw new VPTokenError(
          'VP token verification failed',
          'verification_failed',
          {
            verificationResult: result,
          },
        );
      }

      const data = Object.entries(result.documents).map(([_, v]) => v);

      if (this.#options.enableLogging) {
        console.log('VP token verification successful:', {
          documentCount: data.length,
          documentTypes: data.map((doc) => doc?.type || 'unknown'),
          timestamp: new Date().toISOString(),
        });
      }

      return data;
    } catch (error) {
      if (error instanceof VPTokenError) {
        throw error;
      }
      throw new ResultControllerError(
        'Failed to process VP token',
        'token_verification',
        {
          tokenLength: vpToken?.length,
          error: error instanceof Error ? error.message : String(error),
        },
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  /**
   * Determines the appropriate HTTP status code for different error types
   *
   * Maps specific error types to HTTP status codes for proper client
   * communication and debugging.
   *
   * @param error - The error that occurred
   * @returns The appropriate HTTP status code
   *
   * @private
   */
  private getErrorStatusCode(error: Error): ContentfulStatusCode {
    if (error instanceof SessionExpiredError) {
      return 401; // Unauthorized - session expired
    }
    if (error instanceof VPTokenError) {
      switch (error.errorType) {
        case 'missing':
          return 400; // Bad Request - missing required data
        case 'invalid':
          return 422; // Unprocessable Entity - invalid format
        case 'verification_failed':
          return 403; // Forbidden - verification failed
        default:
          return 400;
      }
    }
    if (error instanceof ResultControllerError) {
      switch (error.step) {
        case 'session_validation':
          return 401;
        case 'service_invocation':
          return 502; // Bad Gateway - upstream service error
        case 'token_verification':
          return 422;
        case 'data_extraction':
        case 'view_generation':
          return 500; // Internal Server Error
        default:
          return 500;
      }
    }
    return 500; // Default to Internal Server Error
  }

  /**
   * Returns a Hono handler for processing wallet response results
   *
   * The handler orchestrates the complete result processing workflow:
   * 1. Validates the session from HTTP cookies
   * 2. Retrieves the wallet response using the core service
   * 3. Verifies VP tokens cryptographically
   * 4. Extracts credential data from verified tokens
   * 5. Renders the verification results to the user
   * 6. Handles errors gracefully with appropriate HTTP status codes
   *
   * @returns A Hono handler function for processing HTTP requests
   *
   * @example
   * ```typescript
   * // Integration with Hono application
   * const app = new Hono();
   * app.get('/result', controller.handler());
   *
   * // The handler will process GET requests to /result and:
   * // 1. Validate the session from cookies
   * // 2. Retrieve the wallet response
   * // 3. Verify the VP tokens
   * // 4. Display the verification results
   * ```
   */
  handler() {
    return async (c: Context<T>) => {
      const { config, portsIn } = this.getDI(c);

      try {
        if (this.#options.enableLogging) {
          console.log('Starting wallet response processing:', {
            path: c.req.path,
            method: c.req.method,
            timestamp: new Date().toISOString(),
          });
        }

        // Validate session
        const sessionId = this.validateSession(c);

        // Get response code from query parameters
        const responseCode = c.req.query('response_code') ?? '';

        if (this.#options.enableLogging) {
          console.log('Processing wallet response:', {
            responseCode: responseCode || 'none',
            sessionId: sessionId.substring(0, 8) + '...',
            timestamp: new Date().toISOString(),
          });
        }

        // Get the service instance and retrieve wallet response
        const service = await portsIn.getGetWalletResponse();
        const response = await service(sessionId, responseCode);

        // Check for wallet response errors
        if (response.error) {
          throw new VPTokenError(
            `Wallet returned error: ${response.error}${response.error_description ? ` - ${response.error_description}` : ''}`,
            'invalid',
            {
              walletError: response.error,
              walletErrorDescription: response.error_description,
            },
          );
        }

        // Process and verify VP token
        if (!response.vpToken) {
          throw new VPTokenError('VP token not presented', 'missing');
        }

        const data = await this.processVPToken(response.vpToken);

        // Generate view component
        const ViewComponent = this.View({
          data,
          homePath: await config.getHomePath(),
          vpToken: response.vpToken,
        });

        if (!ViewComponent) {
          throw new ResultControllerError(
            'Failed to generate view component',
            'view_generation',
            {
              dataCount: data.length,
              sessionId: sessionId.substring(0, 8) + '...',
            },
          );
        }

        if (this.#options.enableLogging) {
          console.log('Wallet response processing completed successfully:', {
            sessionId: sessionId.substring(0, 8) + '...',
            documentCount: data.length,
            timestamp: new Date().toISOString(),
          });
        }

        return c.render(ViewComponent);
      } catch (error: any) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        const statusCode = this.getErrorStatusCode(error);
        const errorContext = {
          path: c.req.path,
          method: c.req.method,
          responseCode: c.req.query('response_code'),
          timestamp: new Date().toISOString(),
        };

        // Log detailed error information
        if (error instanceof SessionExpiredError) {
          console.error('Session validation error:', {
            message: error.message,
            context: { ...error.context, ...errorContext },
          });
        } else if (error instanceof VPTokenError) {
          console.error('VP token processing error:', {
            message: error.message,
            errorType: error.errorType,
            context: { ...error.context, ...errorContext },
          });
        } else if (error instanceof ResultControllerError) {
          console.error('Result controller error:', {
            step: error.step,
            message: error.message,
            context: { ...error.context, ...errorContext },
            cause: error.cause?.message,
          });
        } else {
          console.error('ResultController unexpected error:', {
            message: errorMessage,
            context: errorContext,
            stack: error instanceof Error ? error.stack : undefined,
          });
        }

        return this.handleError(c, config, errorMessage, statusCode);
      }
    };
  }
}
