import {
  GetWalletResponse,
  InitTransaction,
} from 'oid4vc-verifier-frontend-core/ports.input';
import {
  createGetWalletResponseServiceInvoker,
  createInitTransactionServiceInvoker,
} from 'oid4vc-verifier-frontend-core/services';
import { PortsInput } from 'oid4vc-verifier-frontend-core/di';
import { HonoConfiguration } from './HonoConfiguration';
import { PortsOutImpl } from './PortsOutImpl';

/**
 * Configuration options for PortsInputImpl service behavior
 *
 * @public
 */
export interface PortsInputImplOptions {
  /** Whether to enable debug logging for service operations (default: false) */
  enableLogging?: boolean;
  /** Whether to include empty response codes in wallet responses (default: true) */
  includeEmptyResponseCode?: boolean;
  /** Timeout for service operations in milliseconds (default: 30000) */
  operationTimeout?: number;
  /** Whether to retry failed operations (default: true) */
  enableRetry?: boolean;
  /** Number of retry attempts for failed operations (default: 3) */
  maxRetryAttempts?: number;
}

/**
 * Cloudflare Workers implementation of input ports for OID4VC services
 *
 * This class provides concrete implementations of the input ports (business logic
 * interfaces) for the OID4VC verifier frontend application running in Cloudflare
 * Workers. It serves as an adapter between the hexagonal architecture's input
 * ports and the actual service implementations from the core library.
 *
 * ## Architecture Role
 *
 * In the hexagonal architecture pattern:
 * - **Input Ports**: Define the business logic interfaces (what the application can do)
 * - **This Implementation**: Provides concrete service invokers that handle the actual work
 * - **Output Ports**: Handle external dependencies (HTTP calls, storage, etc.)
 *
 * ## Service Integration
 *
 * The class integrates with the `oid4vc-verifier-frontend-core` library to provide:
 *
 * 1. **InitTransaction Service**: Handles credential presentation request initialization
 * 2. **GetWalletResponse Service**: Processes wallet responses and extracts credentials
 *
 * Both services are configured with appropriate output port dependencies and
 * environment-specific settings for optimal performance in Cloudflare Workers.
 *
 * @example
 * ```typescript
 * // Basic usage
 * const config = new HonoConfiguration(context);
 * const portsOut = new PortsOutImpl(context);
 * const portsIn = new PortsInputImpl(config, portsOut);
 *
 * // Initialize a transaction
 * const initService = portsIn.getInitTransaction();
 * const response = await initService.execute({
 *   presentationDefinition: generatePD(),
 *   device: 'mobile'
 * });
 *
 * // Process wallet response
 * const walletService = portsIn.getGetWalletResponse();
 * const result = await walletService.execute('session-123');
 *
 * // With custom options
 * const advancedPortsIn = new PortsInputImpl(config, portsOut, {
 *   enableLogging: true,
 *   operationTimeout: 60000,
 *   maxRetryAttempts: 5
 * });
 * ```
 *
 * @implements {PortsInput}
 * @public
 */
export class PortsInputImpl implements PortsInput {
  /**
   * Configuration instance for accessing environment settings
   * @private
   */
  readonly #config: HonoConfiguration;

  /**
   * Output ports implementation for external dependencies
   * @private
   */
  readonly #portsOut: PortsOutImpl;

  /**
   * Configuration options for service behavior
   * @private
   */
  readonly #options: Required<PortsInputImplOptions>;

  /**
   * Creates a new PortsInputImpl instance
   *
   * @param config - Configuration instance providing environment settings
   * @param portsOut - Output ports implementation for external dependencies
   * @param options - Optional configuration for service behavior
   *
   * @throws {TypeError} When required dependencies are not provided
   * @throws {Error} When dependencies are invalid or misconfigured
   */
  constructor(
    config: HonoConfiguration,
    portsOut: PortsOutImpl,
    options: PortsInputImplOptions = {},
  ) {
    // Validate required dependencies
    if (!config || !(config instanceof HonoConfiguration)) {
      throw new TypeError('config must be a valid HonoConfiguration instance');
    }
    if (!portsOut || !(portsOut instanceof PortsOutImpl)) {
      throw new TypeError('portsOut must be a valid PortsOutImpl instance');
    }

    this.#config = config;
    this.#portsOut = portsOut;
    this.#options = {
      enableLogging: false,
      includeEmptyResponseCode: true,
      operationTimeout: 30000,
      enableRetry: true,
      maxRetryAttempts: 3,
      ...options,
    };

    // Log initialization in debug mode
    if (this.#options.enableLogging) {
      console.log('[PortsInputImpl] Initialized with options:', {
        enableLogging: this.#options.enableLogging,
        includeEmptyResponseCode: this.#options.includeEmptyResponseCode,
        operationTimeout: this.#options.operationTimeout,
        enableRetry: this.#options.enableRetry,
        maxRetryAttempts: this.#options.maxRetryAttempts,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Creates and configures the transaction initialization service
   *
   * This service handles the creation of OID4VC presentation requests,
   * including generating presentation definitions, managing session state,
   * and coordinating with the backend API.
   *
   * @returns Configured InitTransaction service instance
   * @throws {Error} When service configuration fails
   *
   * @example
   * ```typescript
   * const initService = portsIn.getInitTransaction();
   *
   * const request = {
   *   presentationDefinition: {
   *     id: 'example-pd',
   *     input_descriptors: [...]
   *   },
   *   device: 'mobile'
   * };
   *
   * const response = await initService.execute(request);
   * console.log('Transaction ID:', response.transactionId);
   * ```
   */
  getInitTransaction(): InitTransaction {
    try {
      return createInitTransactionServiceInvoker(
        this.#config.getApiBaseUrl(),
        this.#config.getInitTransactionPath(),
        this.#portsOut.getStorePresentationId(),
        this.#portsOut.getFetcher(),
        {
          enableLogging: this.#options.enableLogging,
        },
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new Error(
        `Failed to create InitTransaction service: ${errorMessage}. ` +
          'Please check configuration and output port dependencies.',
      );
    }
  }

  /**
   * Creates and configures the wallet response processing service
   *
   * This service handles the retrieval and processing of wallet responses,
   * including VP token validation, credential extraction, and session management.
   *
   * @returns Configured GetWalletResponse service instance
   * @throws {Error} When service configuration fails
   *
   * @example
   * ```typescript
   * const walletService = portsIn.getGetWalletResponse();
   *
   * try {
   *   const result = await walletService.execute('session-123');
   *
   *   if (result.vpToken) {
   *     console.log('Received VP token:', result.vpToken);
   *     console.log('Presentation submission:', result.presentationSubmission);
   *   } else {
   *     console.log('No response yet, continue polling');
   *   }
   * } catch (error) {
   *   console.error('Wallet response processing failed:', error);
   * }
   * ```
   */
  getGetWalletResponse(): GetWalletResponse {
    try {
      return createGetWalletResponseServiceInvoker(
        this.#config.getApiBaseUrl(),
        this.#config.getGetWalletResponsePath(),
        this.#portsOut.getLoadPresentationId(),
        this.#portsOut.getFetcher(),
        {
          enableLogging: this.#options.enableLogging,
          includeEmptyResponseCode: this.#options.includeEmptyResponseCode,
        },
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new Error(
        `Failed to create GetWalletResponse service: ${errorMessage}. ` +
          'Please check configuration and output port dependencies.',
      );
    }
  }
}
