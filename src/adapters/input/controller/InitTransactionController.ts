import { Context } from 'hono';
import { Env } from '../../../env';
import { AbstractController } from './AbstractController';
import { GetDI } from '../../../di';
import { UAParser } from 'ua-parser-js';
import { URLBuilder, QueryBuilder } from 'oid4vc-verifier-frontend-core/utils';
import { Configuration } from 'oid4vc-verifier-frontend-core/di';
import {
  InitTransactionRequest,
  InitTransactionResponse,
} from 'oid4vc-verifier-frontend-core/ports.input';
import { GeneratePresentationDefinition } from '../../../data';
import { v4 as uuidv4 } from 'uuid';
import { InitProps, ErrorPageProps } from '../views';
import { FC } from 'hono/jsx';
import { setCookie } from 'hono/cookie';

/**
 * Custom error class for transaction initialization failures
 *
 * Provides detailed information about what went wrong during the
 * transaction initialization process, including context about the
 * specific step that failed.
 *
 * @public
 */
export class InitTransactionControllerError extends Error {
  /**
   * The step in the initialization process where the error occurred
   * @readonly
   */
  public readonly step:
    | 'device_detection'
    | 'request_generation'
    | 'service_invocation'
    | 'cookie_setting'
    | 'view_generation'
    | 'url_generation';

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
   * Creates a new InitTransactionControllerError
   *
   * @param message - The error message
   * @param step - The step where the error occurred
   * @param context - Additional context about the error
   * @param cause - The original error that caused this error
   */
  constructor(
    message: string,
    step: InitTransactionControllerError['step'],
    context?: Record<string, unknown>,
    cause?: Error,
  ) {
    super(message);
    this.name = 'InitTransactionControllerError';
    this.step = step;
    this.context = context;
    this.cause = cause;

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, InitTransactionControllerError.prototype);
  }
}

/**
 * Configuration options for InitTransactionController behavior
 *
 * @public
 */
export interface InitTransactionControllerOptions {
  /** Whether to enable debug logging (default: false) */
  enableLogging?: boolean;
  /** Cookie expiration time in seconds (default: 604800 - 7 days) */
  cookieMaxAge?: number;
  /** Custom session ID generator function */
  sessionIdGenerator?: () => string;
  /** Whether to validate device type strictly (default: false) */
  strictDeviceValidation?: boolean;
}

/**
 * Controller for handling credential presentation transaction initialization
 *
 * This controller manages the complete workflow of initializing OID4VC
 * (OpenID for Verifiable Credentials) presentation transactions. It handles:
 *
 * 1. **Device Detection**: Identifies the client device type for optimal UX
 * 2. **Request Generation**: Creates properly formatted presentation requests
 * 3. **Service Coordination**: Delegates business logic to the core service
 * 4. **Session Management**: Establishes secure session tracking via cookies
 * 5. **View Rendering**: Generates appropriate UI responses
 * 6. **Error Handling**: Provides comprehensive error management via AbstractController
 *
 * The controller extends AbstractController to inherit standardized error handling,
 * logging, and response generation while implementing transaction-specific logic.
 *
 * ## OID4VC Flow Integration
 *
 * This controller implements the initial step of the OID4VC presentation
 * flow as defined in the OpenID for Verifiable Credentials specification:
 *
 * 1. Verifier creates a presentation request with specific requirements
 * 2. A unique session is established for tracking the transaction
 * 3. The wallet is redirected with the presentation parameters
 * 4. The user is presented with an appropriate interface
 *
 * @example
 * ```typescript
 * // Basic controller setup
 * const controller = new InitTransactionController(
 *   getDI,
 *   generatePresentationDefinition,
 *   InitView,
 *   ErrorView
 * );
 *
 * // With custom options
 * const advancedController = new InitTransactionController(
 *   getDI,
 *   generatePresentationDefinition,
 *   InitView,
 *   ErrorView,
 *   {
 *     enableLogging: true,
 *     cookieMaxAge: 86400, // 1 day
 *     strictDeviceValidation: true
 *   }
 * );
 *
 * // Integration with Hono router
 * app.get('/init', controller.handler());
 * ```
 *
 * @template T - The environment type extending the base Env interface
 * @public
 */
export class InitTransactionController<
  T extends Env,
> extends AbstractController<T> {
  /**
   * Configuration options for controller behavior
   * @private
   */
  readonly #controllerOptions: Required<InitTransactionControllerOptions>;

  /**
   * Creates a new InitTransactionController instance
   *
   * @param getDI - Dependency injection function for accessing services
   * @param generatePresentationDefinition - Function to generate presentation definitions
   * @param View - React functional component for rendering the initialization view
   * @param errorView - React functional component for rendering error pages
   * @param options - Configuration options for controller behavior
   *
   * @throws {TypeError} When required dependencies are not provided
   */
  constructor(
    private readonly getDI: GetDI<T>,
    private readonly generatePresentationDefinition: GeneratePresentationDefinition,
    private readonly View: FC<InitProps>,
    errorView: FC<ErrorPageProps>,
    options: InitTransactionControllerOptions = {},
  ) {
    // Initialize parent AbstractController with error view
    super(errorView);

    // Validate required dependencies
    if (!getDI || typeof getDI !== 'function') {
      throw new TypeError('getDI must be a function');
    }
    if (
      !generatePresentationDefinition ||
      typeof generatePresentationDefinition !== 'function'
    ) {
      throw new TypeError('generatePresentationDefinition must be a function');
    }
    if (!View || typeof View !== 'function') {
      throw new TypeError('View must be a React functional component');
    }

    this.#controllerOptions = {
      enableLogging: false,
      cookieMaxAge: 60 * 60 * 24 * 7, // 7 days
      sessionIdGenerator: uuidv4,
      strictDeviceValidation: false,
      ...options,
    };
  }

  /**
   * Generates a result URL for wallet response redirection
   *
   * Creates the URL where wallets should redirect users after completing
   * the credential presentation. The URL includes a response code template
   * that will be replaced by the wallet with the actual response code.
   *
   * @param config - Configuration instance for URL generation
   * @returns Promise resolving to the complete result URL
   *
   * @throws {InitTransactionControllerError} When URL generation fails
   *
   * @private
   */
  private async generateResultUrl(config: Configuration): Promise<string> {
    try {
      return decodeURIComponent(
        new URLBuilder({
          baseUrl: await config.getPublicUrl(),
          path: await config.getResultPath(),
          queryBuilder: new QueryBuilder({
            response_code: '{RESPONSE_CODE}',
          }),
        }).build(),
      );
    } catch (error) {
      throw new InitTransactionControllerError(
        'Failed to generate result URL',
        'url_generation',
        {
          error: error instanceof Error ? error.message : String(error),
        },
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  /**
   * Generates a wallet redirect URL with presentation parameters
   *
   * Creates the URL that will redirect users to their wallet application
   * with all necessary parameters for credential presentation.
   *
   * @param config - Configuration instance for URL generation
   * @param response - Transaction response containing wallet parameters
   * @returns Promise resolving to the complete wallet redirect URL
   *
   * @throws {InitTransactionControllerError} When URL generation fails
   *
   * @private
   */
  private async generateRedirectUrl(
    config: Configuration,
    response: InitTransactionResponse,
  ): Promise<string> {
    try {
      return new URLBuilder({
        baseUrl: await config.getWalletUrl(),
        queryBuilder: new QueryBuilder({
          ...response.toWalletRedirectParams(),
        }),
      }).build();
    } catch (error) {
      let walletUrl: string;
      try {
        walletUrl = await config.getWalletUrl();
      } catch {
        walletUrl = 'unknown';
      }
      throw new InitTransactionControllerError(
        'Failed to generate redirect URL',
        'url_generation',
        {
          walletUrl,
          presentationId: response.presentationId,
          clientId: response.clientId,
        },
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  /**
   * Generates a transaction initialization request
   *
   * Creates a properly formatted InitTransactionRequest with presentation
   * definition, nonce, and optional wallet response redirect URI.
   *
   * @param config - Configuration instance for request generation
   * @param device - Detected device type for conditional URL inclusion
   * @returns Promise resolving to the complete initialization request
   *
   * @throws {InitTransactionControllerError} When request generation fails
   *
   * @private
   */
  private async generateRequest(
    config: Configuration,
    device: string | undefined,
  ): Promise<InitTransactionRequest> {
    try {
      const presentationId = this.#controllerOptions.sessionIdGenerator();
      const nonce = this.#controllerOptions.sessionIdGenerator();

      return InitTransactionRequest.fromJSON({
        type: 'vp_token',
        presentation_definition:
          this.generatePresentationDefinition(presentationId),
        nonce,
        wallet_response_redirect_uri_template: device
          ? await this.generateResultUrl(config)
          : undefined,
      });
    } catch (error) {
      throw new InitTransactionControllerError(
        'Failed to generate initialization request',
        'request_generation',
        { device, hasDevice: !!device },
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  /**
   * Detects the client device type from user agent string
   *
   * Uses UAParser to analyze the user agent and determine if the client
   * is a mobile device, which affects the presentation flow.
   *
   * @param userAgent - User agent string from HTTP headers
   * @returns The detected device type or undefined if not detected
   *
   * @throws {InitTransactionControllerError} When device detection fails
   *
   * @private
   */
  private detectDevice(userAgent: string | null): string | undefined {
    try {
      if (!userAgent) {
        if (this.#controllerOptions.enableLogging) {
          console.warn('No user agent provided for device detection');
        }
        return undefined;
      }

      const ua = new UAParser(userAgent);
      const device = ua.getDevice().type;

      if (this.#controllerOptions.enableLogging) {
        console.log('Device detection result:', {
          userAgent: userAgent.substring(0, 50) + '...',
          device,
          browser: ua.getBrowser().name,
          os: ua.getOS().name,
        });
      }

      return device;
    } catch (error) {
      if (this.#controllerOptions.strictDeviceValidation) {
        throw new InitTransactionControllerError(
          'Failed to detect device type',
          'device_detection',
          { userAgent: userAgent?.substring(0, 100) },
          error instanceof Error ? error : new Error(String(error)),
        );
      }

      if (this.#controllerOptions.enableLogging) {
        console.warn(
          'Device detection failed, continuing without device info:',
          error,
        );
      }
      return undefined;
    }
  }

  /**
   * Sets a secure session cookie with environment-appropriate settings
   *
   * Configures cookie security settings based on the current environment,
   * ensuring proper security in production while maintaining usability
   * in development.
   *
   * @param context - Hono context for cookie operations
   * @param sessionId - Session identifier to store in the cookie
   *
   * @throws {InitTransactionControllerError} When cookie setting fails
   *
   * @private
   */
  private setSessionCookie(context: Context<T>, sessionId: string): void {
    try {
      const isProduction = process.env.NODE_ENV === 'production';

      setCookie(context, 'sessionId', sessionId, {
        path: '/',
        httpOnly: true,
        secure: isProduction,
        sameSite: 'Lax',
        maxAge: this.#controllerOptions.cookieMaxAge,
      });

      if (this.#controllerOptions.enableLogging) {
        console.log('Session cookie set:', {
          sessionId: sessionId.substring(0, 8) + '...',
          secure: isProduction,
          maxAge: this.#controllerOptions.cookieMaxAge,
        });
      }
    } catch (error) {
      throw new InitTransactionControllerError(
        'Failed to set session cookie',
        'cookie_setting',
        { sessionId: sessionId.substring(0, 8) + '...' },
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  /**
   * Returns a Hono handler for processing transaction initialization requests
   *
   * The handler orchestrates the complete initialization workflow:
   * 1. Detects client device type for optimal user experience
   * 2. Generates a properly formatted presentation request
   * 3. Invokes the core service to initialize the transaction
   * 4. Establishes a secure session via HTTP cookies
   * 5. Renders the appropriate user interface
   * 6. Handles errors gracefully using inherited error handling
   *
   * @returns A Hono handler function for processing HTTP requests
   *
   * @example
   * ```typescript
   * // Integration with Hono application
   * const app = new Hono();
   * app.get('/init', controller.handler());
   *
   * // The handler will process GET requests to /init and:
   * // 1. Initialize a new credential presentation transaction
   * // 2. Set up session tracking
   * // 3. Render the initialization page with wallet redirect options
   * ```
   */
  handler() {
    return async (c: Context<T>) => {
      const { config, portsIn } = this.getDI(c);

      try {
        if (this.#controllerOptions.enableLogging) {
          console.log('Starting transaction initialization:', {
            path: c.req.path,
            method: c.req.method,
            timestamp: new Date().toISOString(),
          });
        }

        // Get the service instance
        const service = await portsIn.getInitTransaction();

        // Detect device type
        const device = this.detectDevice(c.req.raw.headers.get('user-agent'));

        // Generate initialization request
        const request = await this.generateRequest(config, device);

        // Invoke the core service
        const { sessionId, response } = await service(request);

        // Set secure session cookie
        this.setSessionCookie(c, sessionId);

        // Generate view component
        const ViewComponent = await this.View({
          device,
          redirectUrl: await this.generateRedirectUrl(config, response),
          homePath: await config.getHomePath(),
          resultPath: await config.getResultPath(),
        });

        if (!ViewComponent) {
          throw new InitTransactionControllerError(
            'Failed to generate view component',
            'view_generation',
            { device, sessionId: sessionId.substring(0, 8) + '...' },
          );
        }

        if (this.#controllerOptions.enableLogging) {
          console.log('Transaction initialization completed successfully:', {
            sessionId: sessionId.substring(0, 8) + '...',
            presentationId: response.presentationId,
            device,
          });
        }

        return c.render(ViewComponent);
      } catch (error: any) {
        // Use inherited error handling from AbstractController
        return this.handleError(c, config, error);
      }
    };
  }
}
