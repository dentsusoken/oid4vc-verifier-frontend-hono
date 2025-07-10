import { Context } from 'hono';
import { Env } from '../../../env';
import { AbstractController } from './AbstractController';
import { GetDI } from '../../../di';
import { ResultProps, ErrorPageProps } from '../views';
import { FC } from 'hono/jsx';

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
    errorView: FC<ErrorPageProps>,
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
        const responseCode = c.req.query('response_code') ?? '';

        const service = portsIn.getWalletResponse();
        const response = await service(responseCode);

        if (!response.valid) {
          throw new Error(`Wallet returned error: ${response}`);
        }

        // Generate view component
        const ViewComponent = this.View({
          data: response.documents,
          homePath: await config.homeViewPath(),
          vpToken: response.vpToken!,
        });

        if (!ViewComponent) {
          throw new Error(`Wallet returned error: ${response}`);
        }

        return c.render(ViewComponent);
      } catch (error: any) {
        return this.handleError(c, config, error);
      }
    };
  }
}
