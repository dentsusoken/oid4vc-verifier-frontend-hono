import {
  GetWalletResponse,
  InitTransaction,
} from 'oid4vc-verifier-frontend-core/ports.input';
import {
  createGetWalletResponseServiceInvoker,
  createInitTransactionServiceInvoker,
} from 'oid4vc-verifier-frontend-core/services';
import { PortsInput } from 'oid4vc-verifier-frontend-core/di';
import { PortsOut } from 'oid4vc-verifier-frontend-core/di';
import { HonoConfiguration } from './HonoConfiguration';

/**
 * Configuration options for PortsInputImpl service behavior
 *
 * @public
 */
export interface AwsPortsInputImplOptions {
  /** Whether to enable debug logging for service operations (default: false) */
  enableLogging?: boolean;
  /** Whether to include empty response codes in wallet responses (default: true) */
  includeEmptyResponseCode?: boolean;
}

/**
 * AWS Lambda implementation of input ports for OID4VC services
 *
 * This class provides concrete implementations of the input ports (business logic
 * interfaces) for the OID4VC verifier frontend application running in AWS Lambda.
 * It serves as an adapter between the hexagonal architecture's input ports and
 * the actual service implementations from the core library.
 *
 * ## Architecture Role
 *
 * In the hexagonal architecture pattern:
 * - **Input Ports**: Define the business logic interfaces (what the application can do)
 * - **This Implementation**: Provides concrete service invokers that handle the actual work
 * - **Output Ports**: Handle external dependencies (HTTP calls, DynamoDB storage, etc.)
 *
 * ## Service Integration
 *
 * The class integrates with the `oid4vc-verifier-frontend-core` library to provide:
 *
 * 1. **InitTransaction Service**: Handles credential presentation request initialization
 * 2. **GetWalletResponse Service**: Processes wallet responses and extracts credentials
 *
 * Both services are configured with appropriate output port dependencies and
 * AWS Lambda-specific settings for optimal performance in serverless environments.
 *
 * ## AWS Lambda Optimization
 *
 * The implementation is optimized for AWS Lambda execution:
 * - Async service creation for proper Lambda lifecycle management
 * - Configuration loading from AWS Secrets Manager
 * - DynamoDB integration for session state management
 * - Proper error handling for AWS service failures
 *
 * @example
 * ```typescript
 * // Basic usage
 * const config = new HonoConfiguration();
 * const portsOut = new PortsOutImpl(config);
 * const portsIn = new PortsInputImpl(config, portsOut);
 *
 * // Initialize a transaction
 * const initService = await portsIn.getInitTransaction();
 * const response = await initService.execute({
 *   presentationDefinition: generatePD(),
 *   device: 'mobile'
 * });
 *
 * // Process wallet response
 * const walletService = await portsIn.getGetWalletResponse();
 * const result = await walletService.execute('session-123');
 *
 * // With custom options
 * const advancedPortsIn = new PortsInputImpl(config, portsOut, {
 *   enableLogging: true,
 *   includeEmptyResponseCode: false
 * });
 * ```
 *
 * @implements {PortsInput}
 * @public
 */
export class PortsInputImpl implements PortsInput {
  /**
   * Configuration instance for accessing AWS-based settings
   * @private
   */
  readonly #config: HonoConfiguration;

  /**
   * Output ports implementation for external dependencies
   * @private
   */
  readonly #portsOut: PortsOut;

  /**
   * Configuration options for service behavior
   * @private
   */
  readonly #options: Required<AwsPortsInputImplOptions>;

  /**
   * Creates a new PortsInputImpl instance
   *
   * @param config - Configuration instance providing AWS-based settings
   * @param portsOut - Output ports implementation for external dependencies
   * @param options - Optional configuration for service behavior
   *
   * @throws {TypeError} When required dependencies are not provided
   * @throws {Error} When dependencies are invalid or misconfigured
   */
  constructor(
    config: HonoConfiguration,
    portsOut: PortsOut,
    options: AwsPortsInputImplOptions = {},
  ) {
    // Validate required dependencies
    if (!config || !(config instanceof HonoConfiguration)) {
      throw new TypeError('config must be a valid HonoConfiguration instance');
    }
    if (!portsOut || typeof portsOut !== 'object') {
      throw new TypeError('portsOut must be a valid PortsOut implementation');
    }

    this.#config = config;
    this.#portsOut = portsOut;
    this.#options = {
      enableLogging: false,
      includeEmptyResponseCode: true,
      ...options,
    };

    // Log initialization in debug mode
    if (this.#options.enableLogging) {
      console.log('[AwsPortsInputImpl] Initialized with options:', {
        enableLogging: this.#options.enableLogging,
        includeEmptyResponseCode: this.#options.includeEmptyResponseCode,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Creates and configures the transaction initialization service
   *
   * This service handles the creation of OID4VC presentation requests,
   * including generating presentation definitions, managing session state
   * via DynamoDB, and coordinating with the backend API.
   *
   * @returns Promise resolving to configured InitTransaction service instance
   * @throws {Error} When service configuration fails
   * @throws {Error} When AWS configuration loading fails
   *
   * @example
   * ```typescript
   * const initService = await portsIn.getInitTransaction();
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
  async getInitTransaction(): Promise<InitTransaction> {
    try {
      return createInitTransactionServiceInvoker(
        await this.#config.getApiBaseUrl(),
        await this.#config.getInitTransactionPath(),
        await this.#portsOut.getStorePresentationId(),
        await this.#portsOut.getFetcher(),
        {
          enableLogging: this.#options.enableLogging,
        },
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error(
        '[AwsPortsInputImpl] Failed to create InitTransaction service:',
        {
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString(),
        },
      );

      throw new Error(
        `Failed to create InitTransaction service: ${errorMessage}. ` +
          'Please check AWS configuration, Secrets Manager access, and DynamoDB permissions.',
      );
    }
  }

  /**
   * Creates and configures the wallet response processing service
   *
   * This service handles the retrieval and processing of wallet responses,
   * including VP token validation, credential extraction, and session management
   * via DynamoDB storage.
   *
   * @returns Promise resolving to configured GetWalletResponse service instance
   * @throws {Error} When service configuration fails
   * @throws {Error} When AWS configuration loading fails
   *
   * @example
   * ```typescript
   * const walletService = await portsIn.getGetWalletResponse();
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
  async getGetWalletResponse(): Promise<GetWalletResponse> {
    try {
      return createGetWalletResponseServiceInvoker(
        await this.#config.getApiBaseUrl(),
        await this.#config.getGetWalletResponsePath(),
        await this.#portsOut.getLoadPresentationId(),
        await this.#portsOut.getFetcher(),
        {
          enableLogging: this.#options.enableLogging,
          includeEmptyResponseCode: this.#options.includeEmptyResponseCode,
        },
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error(
        '[AwsPortsInputImpl] Failed to create GetWalletResponse service:',
        {
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString(),
        },
      );

      throw new Error(
        `Failed to create GetWalletResponse service: ${errorMessage}. ` +
          'Please check AWS configuration, Secrets Manager access, and DynamoDB permissions.',
      );
    }
  }
}
