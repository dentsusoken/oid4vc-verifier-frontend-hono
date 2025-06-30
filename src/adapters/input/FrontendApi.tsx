import { Handler, Hono } from 'hono';
import { jsxRenderer } from 'hono/jsx-renderer';
import { MdocVerifyHandlerImpl, mdlSchema } from 'mdoc-cbor-ts';
import { Env } from '../../env';
import { ErrorPage, Home, Init, Result, Template } from './views';
import { InitTransactionController, ResultController } from './controller';
import { mDLPresentationDefinition } from '../../data';
import { GetDI } from '../../di';

/**
 * Configuration options for FrontendApi behavior
 *
 * @public
 */
export interface FrontendApiOptions {
  /** Whether to enable debug logging (default: false) */
  enableLogging?: boolean;
  /** Custom error message for 404 responses (default: "Page Not Found") */
  notFoundMessage?: string;
  /** Whether to include detailed error information in responses (default: false) */
  includeErrorDetails?: boolean;
  /** Custom template component for rendering pages */
  templateComponent?: typeof Template;
}

/**
 * Frontend API router for the OID4VC verifier application
 *
 * This class serves as the main HTTP routing layer for the OpenID for Verifiable
 * Credentials (OID4VC) verifier frontend. It orchestrates the complete user journey
 * from credential presentation initiation to result display, providing a cohesive
 * web interface for the verification process.
 *
 * ## Architecture Overview
 *
 * The FrontendApi follows the hexagonal architecture pattern by:
 * 1. **Input Adaptation**: Converting HTTP requests into domain operations
 * 2. **Controller Delegation**: Routing requests to appropriate business logic controllers
 * 3. **View Rendering**: Presenting results through React components
 * 4. **Error Handling**: Providing consistent error responses across all endpoints
 *
 * ## OID4VC Flow Integration
 *
 * The API supports the complete OID4VC presentation verification flow:
 *
 * 1. **Home Page** (`/`): Entry point with navigation to start verification
 * 2. **Initialization** (`/init`): Creates presentation requests and wallet redirects
 * 3. **Result Processing** (`/result`): Handles wallet responses and displays verification results
 * 4. **Error Handling**: Consistent error pages for all failure scenarios
 *
 * ## Key Features
 *
 * - **Type-Safe Routing**: Full TypeScript integration with environment-specific configurations
 * - **Component-Based Views**: React JSX components for all user interfaces
 * - **Dependency Injection**: Flexible service layer integration
 * - **Error Boundaries**: Comprehensive error handling with user-friendly messages
 * - **Mobile Optimization**: Device-aware presentation flows
 * - **Security**: Built-in CSRF protection and secure session management
 *
 * @example
 * ```typescript
 * // Basic API setup
 * const api = new FrontendApi(
 *   '/home',
 *   '/init',
 *   '/result',
 *   getDI
 * );
 *
 * // With custom options
 * const advancedApi = new FrontendApi(
 *   '/home',
 *   '/init',
 *   '/result',
 *   getDI,
 *   {
 *     enableLogging: true,
 *     notFoundMessage: 'The requested page could not be found',
 *     includeErrorDetails: false
 *   }
 * );
 *
 * // Integration with Hono application
 * const app = new Hono()
 *   .get('/', (c) => c.redirect('/home'))
 *   .route('/', api.route);
 * ```
 *
 * @template T - The environment type extending the base Env interface
 * @public
 */
export class FrontendApi<T extends Env> {
  /**
   * Home page route path
   * @private
   */
  readonly #homePath: string;

  /**
   * Transaction initialization route path
   * @private
   */
  readonly #initPath: string;

  /**
   * Result display route path
   * @private
   */
  readonly #resultPath: string;

  /**
   * Dependency injection function for accessing services
   * @private
   */
  readonly #getDI: GetDI<T>;

  /**
   * Configuration options for API behavior
   * @private
   */
  readonly #options: Required<FrontendApiOptions>;

  /**
   * Cached MDOC verifier instance for performance optimization
   * @private
   */
  readonly #mdocVerifier: MdocVerifyHandlerImpl;

  /**
   * Creates a new FrontendApi instance
   *
   * Initializes the API router with the specified paths and dependency injection
   * function. The API will handle all HTTP requests for the OID4VC verification
   * workflow, including presentation initiation, wallet interactions, and result display.
   *
   * @param homePath - The route path for the home page (e.g., '/', '/home')
   * @param initPath - The route path for transaction initialization (e.g., '/init')
   * @param resultPath - The route path for result display (e.g., '/result')
   * @param getDI - Dependency injection function for accessing services and configuration
   * @param options - Configuration options for API behavior
   *
   * @throws {TypeError} When required parameters are invalid
   * @throws {Error} When path validation fails
   *
   * @example
   * ```typescript
   * const api = new FrontendApi(
   *   '/home',
   *   '/init-transaction',
   *   '/verification-result',
   *   getDI,
   *   { enableLogging: true }
   * );
   * ```
   */
  constructor(
    homePath: string,
    initPath: string,
    resultPath: string,
    getDI: GetDI<T>,
    options: FrontendApiOptions = {},
  ) {
    // Validate required parameters
    if (!homePath || typeof homePath !== 'string') {
      throw new TypeError('homePath must be a non-empty string');
    }
    if (!initPath || typeof initPath !== 'string') {
      throw new TypeError('initPath must be a non-empty string');
    }
    if (!resultPath || typeof resultPath !== 'string') {
      throw new TypeError('resultPath must be a non-empty string');
    }
    if (!getDI || typeof getDI !== 'function') {
      throw new TypeError('getDI must be a function');
    }

    // Validate path formats
    const pathRegex = /^\/[a-zA-Z0-9\-_/]*$/;
    if (!pathRegex.test(homePath)) {
      throw new Error(`Invalid homePath format: ${homePath}`);
    }
    if (!pathRegex.test(initPath)) {
      throw new Error(`Invalid initPath format: ${initPath}`);
    }
    if (!pathRegex.test(resultPath)) {
      throw new Error(`Invalid resultPath format: ${resultPath}`);
    }

    // Ensure paths are unique
    const paths = [homePath, initPath, resultPath];
    const uniquePaths = new Set(paths);
    if (uniquePaths.size !== paths.length) {
      throw new Error('All route paths must be unique');
    }

    this.#homePath = homePath;
    this.#initPath = initPath;
    this.#resultPath = resultPath;
    this.#getDI = getDI;

    this.#options = {
      enableLogging: false,
      notFoundMessage: 'Page Not Found',
      includeErrorDetails: false,
      templateComponent: Template,
      ...options,
    };

    // Initialize MDOC verifier once for reuse
    this.#mdocVerifier = new MdocVerifyHandlerImpl({
      'org.iso.18013.5.1': mdlSchema,
    });

    if (this.#options.enableLogging) {
      console.log('FrontendApi initialized:', {
        homePath: this.#homePath,
        initPath: this.#initPath,
        resultPath: this.#resultPath,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Gets the configured route paths
   *
   * @returns Object containing all configured route paths
   * @public
   */
  get paths() {
    return {
      home: this.#homePath,
      init: this.#initPath,
      result: this.#resultPath,
    } as const;
  }

  /**
   * Creates and configures the Hono application with all routes
   *
   * Sets up the complete routing structure for the OID4VC verifier frontend,
   * including middleware for JSX rendering, route handlers for each endpoint,
   * and error handling for invalid routes.
   *
   * The route structure includes:
   * - **Template Middleware**: Wraps all responses in the application template
   * - **Home Route**: Landing page with navigation options
   * - **Init Route**: Transaction initialization and wallet redirection
   * - **Result Route**: Wallet response processing and verification display
   * - **Catch-All Route**: 404 error handling for invalid paths
   *
   * @returns Configured Hono application instance ready for use
   *
   * @example
   * ```typescript
   * const api = new FrontendApi('/home', '/init', '/result', getDI);
   * const app = new Hono().route('/', api.route);
   * ```
   */
  get route(): Hono<Env> {
    try {
      const TemplateComponent = this.#options.templateComponent;

      const app = new Hono<Env>()
        .use(
          '*',
          jsxRenderer(({ children }) => (
            <TemplateComponent>{children}</TemplateComponent>
          )),
        )
        .get(this.#homePath, this.homeHandler())
        .get(this.#initPath, this.initHandler())
        .get(this.#resultPath, this.resultHandler())
        .get('*', this.notFoundHandler());

      if (this.#options.enableLogging) {
        console.log('Route configuration completed:', {
          routes: [this.#homePath, this.#initPath, this.#resultPath, '*'],
          timestamp: new Date().toISOString(),
        });
      }

      return app;
    } catch (error) {
      console.error('Failed to configure routes:', {
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  /**
   * Creates a handler for the home page route
   *
   * The home page serves as the entry point for the OID4VC verification process,
   * providing users with navigation options to start credential presentation.
   * It renders a welcoming interface with clear calls-to-action.
   *
   * @returns Hono handler function for processing home page requests
   *
   * @example
   * ```typescript
   * // The home handler renders a page with:
   * // - Welcome message and instructions
   * // - "Start Verification" button linking to init path
   * // - Application branding and navigation
   * ```
   */
  homeHandler(): Handler<T> {
    return (c) => {
      try {
        if (this.#options.enableLogging) {
          console.log('Home page accessed:', {
            path: c.req.path,
            userAgent: c.req.raw.headers.get('user-agent'),
            timestamp: new Date().toISOString(),
          });
        }

        return c.render(<Home initTransactionPath={this.#initPath} />);
      } catch (error) {
        console.error('Home handler error:', {
          error: error instanceof Error ? error.message : String(error),
          path: c.req.path,
          timestamp: new Date().toISOString(),
        });

        return c.render(
          <ErrorPage
            error="Failed to load home page"
            homePath={this.#homePath}
          />,
        );
      }
    };
  }

  /**
   * Creates a handler for the transaction initialization route
   *
   * This handler manages the complete transaction initialization workflow by
   * delegating to the InitTransactionController. It handles device detection,
   * presentation request generation, service coordination, and wallet redirection.
   *
   * The initialization process includes:
   * 1. Device type detection for optimal user experience
   * 2. Presentation definition generation with security parameters
   * 3. Session establishment with secure cookie management
   * 4. Wallet redirect URL generation with embedded parameters
   * 5. User interface rendering with appropriate options
   *
   * @returns Hono handler function for processing initialization requests
   *
   * @example
   * ```typescript
   * // The init handler processes requests and:
   * // 1. Creates a new presentation transaction
   * // 2. Generates wallet redirect URLs
   * // 3. Sets up session tracking
   * // 4. Renders the initialization page with QR codes or direct links
   * ```
   */
  initHandler(): Handler<T> {
    try {
      const controller = new InitTransactionController(
        this.#getDI,
        mDLPresentationDefinition,
        Init,
        ErrorPage,
        {
          enableLogging: this.#options.enableLogging,
        },
      );

      if (this.#options.enableLogging) {
        console.log('InitTransactionController created successfully');
      }

      return controller.handler();
    } catch (error) {
      console.error('Failed to create InitTransactionController:', {
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });

      // Return fallback handler
      return (c) =>
        c.render(
          <ErrorPage
            error="Transaction initialization is currently unavailable"
            homePath={this.#homePath}
          />,
        );
    }
  }

  /**
   * Creates a handler for the result display route
   *
   * This handler manages the complete wallet response processing workflow by
   * delegating to the ResultController. It handles session validation, response
   * retrieval, token verification, and result presentation.
   *
   * The result processing includes:
   * 1. Session validation from HTTP cookies
   * 2. Wallet response retrieval using core services
   * 3. VP token cryptographic verification
   * 4. Credential data extraction and formatting
   * 5. Verification result presentation with detailed information
   *
   * @returns Hono handler function for processing result requests
   *
   * @example
   * ```typescript
   * // The result handler processes wallet responses and:
   * // 1. Validates the user session
   * // 2. Retrieves the wallet response data
   * // 3. Verifies VP tokens cryptographically
   * // 4. Displays the verification results with credential details
   * ```
   */
  resultHandler(): Handler<T> {
    try {
      const controller = new ResultController(
        this.#getDI,
        Result,
        this.#mdocVerifier,
        ErrorPage,
        {
          enableLogging: this.#options.enableLogging,
        },
      );

      if (this.#options.enableLogging) {
        console.log('ResultController created successfully');
      }

      return controller.handler();
    } catch (error) {
      console.error('Failed to create ResultController:', {
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });

      // Return fallback handler
      return (c) =>
        c.render(
          <ErrorPage
            error="Result processing is currently unavailable"
            homePath={this.#homePath}
          />,
        );
    }
  }

  /**
   * Creates a handler for invalid route requests (404 errors)
   *
   * Provides a user-friendly 404 error page when users access routes that
   * don't exist in the application. The error page includes navigation back
   * to the home page and helpful messaging.
   *
   * @returns Hono handler function for processing 404 requests
   *
   * @example
   * ```typescript
   * // The 404 handler renders a page with:
   * // - Clear "Page Not Found" message
   * // - Navigation back to home page
   * // - Suggested valid routes (optional)
   * ```
   */
  notFoundHandler(): Handler<Env> {
    return (c) => {
      try {
        if (this.#options.enableLogging) {
          console.log('404 error:', {
            path: c.req.path,
            method: c.req.method,
            userAgent: c.req.raw.headers.get('user-agent'),
            referer: c.req.raw.headers.get('referer'),
            timestamp: new Date().toISOString(),
          });
        }

        c.status(404);
        return c.render(
          <ErrorPage
            error={this.#options.notFoundMessage}
            homePath={this.#homePath}
          />,
        );
      } catch (error) {
        console.error('NotFound handler error:', {
          error: error instanceof Error ? error.message : String(error),
          path: c.req.path,
          timestamp: new Date().toISOString(),
        });

        // Last resort fallback
        c.status(500);
        return c.text('Internal Server Error');
      }
    };
  }
}
