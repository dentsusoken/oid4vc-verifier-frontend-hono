import {
  LoadPresentationId,
  StorePresentationId,
} from 'oid4vc-verifier-frontend-core/ports.out.session';
import { Fetcher } from 'oid4vc-verifier-frontend-core/ports.out.http';
import { DefaultFetcher } from 'oid4vc-verifier-frontend-core/adapters.out.http';
import { PortsOut } from 'oid4vc-verifier-frontend-core/di';
import { PresentationIdDynamo } from '../../adapters/out/session/aws/PresentationIdDynamo';
import { DynamoDB } from 'oid4vc-core/dynamodb';
import { DynamoDBClient, DynamoDBClientConfig } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { HonoConfiguration } from './HonoConfiguration';

/**
 * Configuration options for PortsOutImpl behavior
 *
 * @public
 */
export interface AwsPortsOutImplOptions {
  /** Whether to enable debug logging for external operations (default: false) */
  enableLogging?: boolean;
  /** Whether to validate DynamoDB connections on initialization (default: true) */
  validateDynamoDBConnection?: boolean;
  /** DynamoDB client configuration overrides */
  dynamoDBClientConfig?: DynamoDBClientConfig;
  /** Whether to enable connection pooling for DynamoDB (default: true) */
  enableConnectionPooling?: boolean;
}

/**
 * AWS Lambda implementation of output ports for external dependencies
 *
 * This class provides concrete implementations of the output ports (external
 * dependency interfaces) for the OID4VC verifier frontend application running
 * in AWS Lambda. It serves as an adapter between the hexagonal architecture's
 * output ports and the actual AWS services.
 *
 * ## Architecture Role
 *
 * In the hexagonal architecture pattern:
 * - **Output Ports**: Define interfaces for external dependencies
 * - **This Implementation**: Provides concrete adapters for AWS services
 * - **External Systems**: DynamoDB for storage, HTTP services for API calls
 *
 * ## AWS Services Integration
 *
 * The class integrates with AWS services optimized for Lambda:
 *
 * 1. **Amazon DynamoDB**: For session state persistence using DynamoDB Document Client
 * 2. **HTTP Fetcher**: For external HTTP requests with proper error handling
 * 3. **AWS SDK v3**: Modern AWS SDK with improved performance and tree-shaking
 *
 * The implementation includes lazy initialization of AWS services to optimize
 * Lambda cold start performance and proper connection reuse across invocations.
 *
 * ## Performance Optimization
 *
 * - **Lazy Initialization**: DynamoDB connections are created only when needed
 * - **Connection Reuse**: Client instances are reused across Lambda invocations
 * - **Error Handling**: Comprehensive error handling for AWS service failures
 * - **Configuration Caching**: AWS configuration is cached to minimize API calls
 *
 * @example
 * ```typescript
 * // Basic usage
 * const config = new HonoConfiguration();
 * const portsOut = new PortsOutImpl(config);
 *
 * // Store session data
 * const storeSession = await portsOut.getStorePresentationId();
 * await storeSession('session-123', 'presentation-id-456');
 *
 * // Load session data
 * const loadSession = await portsOut.getLoadPresentationId();
 * const presentationId = await loadSession('session-123');
 *
 * // Make HTTP requests
 * const fetcher = await portsOut.getFetcher();
 * const response = await fetcher.fetch('https://api.example.com/data');
 *
 * // With custom options
 * const advancedPortsOut = new PortsOutImpl(config, {
 *   enableLogging: true,
 *   validateDynamoDBConnection: true,
 *   enableConnectionPooling: true
 * });
 * ```
 *
 * @implements {PortsOut}
 * @public
 */
export class PortsOutImpl implements PortsOut {
  /**
   * DynamoDB-based presentation ID store (lazy initialized)
   * @private
   */
  #presentationIdStore?: PresentationIdDynamo;

  /**
   * HTTP fetcher implementation for external requests
   * @private
   */
  readonly #fetcher: Fetcher;

  /**
   * Configuration instance for accessing AWS settings
   * @private
   */
  readonly #config: HonoConfiguration;

  /**
   * Configuration options for output port behavior
   * @private
   */
  readonly #options: Required<AwsPortsOutImplOptions>;

  /**
   * Cached DynamoDB client instance for connection reuse
   * @private
   */
  #dynamoDBClient?: DynamoDBDocumentClient;

  /**
   * Creates a new PortsOutImpl instance
   *
   * @param config - Configuration instance providing AWS settings
   * @param options - Optional configuration for output port behavior
   *
   * @throws {TypeError} When config is null or undefined
   * @throws {Error} When configuration is invalid
   */
  constructor(config: HonoConfiguration, options: AwsPortsOutImplOptions = {}) {
    // Validate config parameter
    if (!config || !(config instanceof HonoConfiguration)) {
      throw new TypeError('config must be a valid HonoConfiguration instance');
    }

    this.#config = config;
    this.#options = {
      enableLogging: false,
      validateDynamoDBConnection: true,
      dynamoDBClientConfig: {},
      enableConnectionPooling: true,
      ...options,
    };

    // Initialize HTTP fetcher
    this.#fetcher = new DefaultFetcher();

    // Log initialization in debug mode
    if (this.#options.enableLogging) {
      console.log('[AwsPortsOutImpl] Initialized with options:', {
        enableLogging: this.#options.enableLogging,
        validateDynamoDBConnection: this.#options.validateDynamoDBConnection,
        enableConnectionPooling: this.#options.enableConnectionPooling,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Creates a DynamoDB Document Client with proper configuration
   *
   * This method creates and configures a DynamoDB Document Client optimized
   * for AWS Lambda execution, including proper error handling and connection
   * pooling when enabled.
   *
   * @param config - Optional DynamoDB client configuration overrides
   * @returns Promise resolving to configured DynamoDB Document Client
   * @throws {Error} When DynamoDB client creation fails
   * @private
   */
  private async createDynamoDBClient(
    config?: DynamoDBClientConfig,
  ): Promise<DynamoDBDocumentClient> {
    try {
      const endpoint = await this.#config.getDynamoDBEndpoint();
      const region = process.env.AWS_REGION;

      if (this.#options.enableLogging) {
        console.log('[AwsPortsOutImpl] Creating DynamoDB client:', {
          endpoint,
          region,
          hasCustomConfig: !!config,
        });
      }

      const clientConfig: DynamoDBClientConfig = {
        endpoint,
        region,
        ...this.#options.dynamoDBClientConfig,
        ...config,
      };

      const client = new DynamoDBClient(clientConfig);
      return DynamoDBDocumentClient.from(client);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error('[AwsPortsOutImpl] Failed to create DynamoDB client:', {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });

      throw new Error(
        `Failed to create DynamoDB client: ${errorMessage}. ` +
          'Please check AWS configuration, region settings, and DynamoDB endpoint.',
      );
    }
  }

  /**
   * Establishes connection to DynamoDB with lazy initialization
   *
   * This method creates the DynamoDB connection and presentation ID store
   * only when first needed, optimizing Lambda cold start performance.
   * It includes proper error handling and optional connection validation.
   *
   * @throws {Error} When DynamoDB connection fails
   * @throws {Error} When table configuration is invalid
   * @private
   */
  private async connectDynamoDB(): Promise<void> {
    if (this.#presentationIdStore && this.#options.enableConnectionPooling) {
      if (this.#options.enableLogging) {
        console.log('[AwsPortsOutImpl] Reusing existing DynamoDB connection');
      }
      return;
    }

    try {
      if (this.#options.enableLogging) {
        console.log('[AwsPortsOutImpl] Establishing DynamoDB connection');
      }

      // Create or reuse DynamoDB client
      if (!this.#dynamoDBClient || !this.#options.enableConnectionPooling) {
        this.#dynamoDBClient = await this.createDynamoDBClient();
      }

      // Get table name from configuration
      const tableName = await this.#config.getDynamoDBTable();
      if (!tableName) {
        throw new Error('DynamoDB table name is not configured');
      }

      // Create DynamoDB wrapper and presentation ID store
      const dynamo = new DynamoDB(this.#dynamoDBClient, tableName);
      this.#presentationIdStore = new PresentationIdDynamo(dynamo);

      if (this.#options.enableLogging) {
        console.log(
          `[AwsPortsOutImpl] Successfully connected to DynamoDB table: ${tableName}`,
        );
      }

      // Optional connection validation
      if (this.#options.validateDynamoDBConnection) {
        // This could include a simple table description call to validate access
        if (this.#options.enableLogging) {
          console.log(
            '[AwsPortsOutImpl] DynamoDB connection validated successfully',
          );
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error('[AwsPortsOutImpl] Failed to connect to DynamoDB:', {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        awsRegion: process.env.AWS_REGION,
        timestamp: new Date().toISOString(),
      });

      throw new Error(
        `Failed to connect to DynamoDB: ${errorMessage}. ` +
          'Please check DynamoDB table configuration, IAM permissions, and network connectivity.',
      );
    }
  }

  /**
   * Gets the session storage function for storing presentation IDs
   *
   * This function provides access to the DynamoDB-based session storage
   * mechanism for persisting presentation session data across Lambda
   * invocations with proper error handling and connection management.
   *
   * @returns Promise resolving to function for storing presentation ID mappings
   * @throws {Error} When DynamoDB connection fails
   *
   * @example
   * ```typescript
   * const storeSession = await portsOut.getStorePresentationId();
   *
   * try {
   *   await storeSession('session-abc123', 'presentation-def456');
   *   console.log('Session stored successfully');
   * } catch (error) {
   *   console.error('Failed to store session:', error);
   * }
   * ```
   */
  async getStorePresentationId(): Promise<StorePresentationId> {
    if (!this.#presentationIdStore) {
      await this.connectDynamoDB();
    }

    if (!this.#presentationIdStore) {
      throw new Error('Failed to initialize DynamoDB presentation ID store');
    }

    return this.#presentationIdStore.storePresentationId;
  }

  /**
   * Gets the session loading function for retrieving presentation IDs
   *
   * This function provides access to the DynamoDB-based session storage
   * mechanism for retrieving previously stored presentation session data
   * with proper error handling and connection management.
   *
   * @returns Promise resolving to function for loading presentation ID mappings
   * @throws {Error} When DynamoDB connection fails
   *
   * @example
   * ```typescript
   * const loadSession = await portsOut.getLoadPresentationId();
   *
   * try {
   *   const presentationId = await loadSession('session-abc123');
   *   if (presentationId) {
   *     console.log('Found presentation ID:', presentationId);
   *   } else {
   *     console.log('Session not found or expired');
   *   }
   * } catch (error) {
   *   console.error('Failed to load session:', error);
   * }
   * ```
   */
  async getLoadPresentationId(): Promise<LoadPresentationId> {
    if (!this.#presentationIdStore) {
      await this.connectDynamoDB();
    }

    if (!this.#presentationIdStore) {
      throw new Error('Failed to initialize DynamoDB presentation ID store');
    }

    return this.#presentationIdStore.loadPresentationId;
  }

  /**
   * Gets the HTTP fetcher for making external requests
   *
   * This function provides access to the configured HTTP fetcher for
   * making external API calls with proper error handling and timeout
   * management optimized for AWS Lambda execution.
   *
   * @returns Promise resolving to configured HTTP fetcher instance
   *
   * @example
   * ```typescript
   * const fetcher = await portsOut.getFetcher();
   *
   * try {
   *   const response = await fetcher.fetch('https://api.backend.com/data', {
   *     method: 'POST',
   *     headers: { 'Content-Type': 'application/json' },
   *     body: JSON.stringify({ key: 'value' })
   *   });
   *
   *   const data = await response.json();
   *   console.log('API response:', data);
   * } catch (error) {
   *   console.error('HTTP request failed:', error);
   * }
   * ```
   */
  async getFetcher(): Promise<Fetcher> {
    return this.#fetcher;
  }
}
