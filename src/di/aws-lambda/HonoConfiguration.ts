import { AbstractConfiguration } from 'oid4vc-verifier-frontend-core/di';
import * as Aws from 'aws-sdk';

/**
 * Configuration error class for AWS-related failures
 *
 * Represents errors that occur when interacting with AWS services
 * like Secrets Manager, or when required environment variables
 * are missing or invalid.
 *
 * @public
 */
export class AwsConfigurationError extends Error {
  /**
   * The AWS service that caused the error
   * @readonly
   */
  public readonly awsService: string;

  /**
   * The type of configuration error that occurred
   * @readonly
   */
  public readonly errorType:
    | 'missing_env'
    | 'aws_service'
    | 'invalid_secret'
    | 'permission_denied';

  /**
   * Additional context about the error
   * @readonly
   */
  public readonly context?: Record<string, unknown>;

  /**
   * Creates a new AwsConfigurationError
   *
   * @param message - The error message
   * @param awsService - The AWS service that caused the error
   * @param errorType - The type of error that occurred
   * @param context - Additional context about the error
   */
  constructor(
    message: string,
    awsService: string,
    errorType: AwsConfigurationError['errorType'] = 'aws_service',
    context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AwsConfigurationError';
    this.awsService = awsService;
    this.errorType = errorType;
    this.context = context;

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, AwsConfigurationError.prototype);
  }
}

/**
 * Configuration options for HonoConfiguration behavior
 *
 * @public
 */
export interface AwsHonoConfigurationOptions {
  /** Whether to enable debug logging (default: false) */
  enableLogging?: boolean;
  /** Whether to cache secrets in memory (default: true) */
  enableSecretCaching?: boolean;
  /** Secret cache TTL in milliseconds (default: 300000 - 5 minutes) */
  secretCacheTtl?: number;
  /** Whether to validate URLs format (default: true) */
  validateUrls?: boolean;
}

/**
 * AWS Lambda-based configuration implementation using AWS Secrets Manager
 *
 * This class provides configuration management specifically designed for
 * AWS Lambda runtime using AWS Secrets Manager for secure secret storage.
 * It extends the core AbstractConfiguration to provide AWS-specific
 * functionality while maintaining compatibility with the hexagonal
 * architecture pattern.
 *
 * ## Key Features
 *
 * - **AWS Secrets Manager Integration**: Secure retrieval of configuration values
 * - **Secret Caching**: In-memory caching to minimize AWS API calls and improve performance
 * - **Error Handling**: Comprehensive error reporting for AWS service failures
 * - **Lambda Optimization**: Optimized for AWS Lambda cold starts and execution model
 *
 * ## Environment Variables
 *
 * The configuration expects the following environment variables:
 *
 * - `SECRET_ID`: AWS Secrets Manager secret identifier
 * - `AWS_REGION`: AWS region for service calls
 * - `SECRETS_MANAGER_ENDPOINT`: (Optional) Custom endpoint for local development
 *
 * ## Secret Structure
 *
 * The AWS Secrets Manager secret should contain a JSON object with:
 *
 * ```json
 * {
 *   "API_BASE_URL": "https://api.backend.com",
 *   "INIT_TRANSACTION_PATH": "/api/init",
 *   "GET_WALLET_RESPONSE_PATH": "/api/wallet-response",
 *   "WALLET_URL": "https://wallet.example.com",
 *   "PUBLIC_URL": "https://verifier.example.com",
 *   "DYNAMODB_TABLE": "verifier-sessions",
 *   "DYNAMODB_ENDPOINT": "https://dynamodb.region.amazonaws.com"
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Basic usage
 * const config = new HonoConfiguration();
 * await config.loadSecrets();
 * const apiUrl = await config.getApiBaseUrl();
 *
 * // With custom options
 * const config = new HonoConfiguration({
 *   enableLogging: true,
 *   enableSecretCaching: true,
 *   secretCacheTtl: 600000, // 10 minutes
 * });
 *
 * // Error handling
 * try {
 *   await config.loadSecrets();
 *   const walletUrl = await config.getWalletUrl();
 * } catch (error) {
 *   if (error instanceof AwsConfigurationError) {
 *     console.error(`AWS ${error.awsService} error: ${error.message}`);
 *   }
 * }
 * ```
 *
 * @extends {AbstractConfiguration}
 * @public
 */
export class HonoConfiguration extends AbstractConfiguration {
  /**
   * Cached secrets from AWS Secrets Manager
   * @private
   */
  readonly #secrets: Record<string, string> = {};

  /**
   * Whether secrets have been loaded
   * @private
   */
  #loaded = false;

  /**
   * Timestamp when secrets were last loaded
   * @private
   */
  #lastLoadTime = 0;

  /**
   * Configuration options for behavior customization
   * @private
   */
  readonly #options: Required<AwsHonoConfigurationOptions>;

  /**
   * Creates a new HonoConfiguration instance
   *
   * @param options - Configuration options for customizing behavior
   */
  constructor(options: AwsHonoConfigurationOptions = {}) {
    super();

    this.#options = {
      enableLogging: false,
      enableSecretCaching: true,
      secretCacheTtl: 300000, // 5 minutes
      validateUrls: true,
      ...options,
    };

    // Log initialization in debug mode
    if (this.#options.enableLogging) {
      console.log('[AwsHonoConfiguration] Initialized with options:', {
        enableSecretCaching: this.#options.enableSecretCaching,
        secretCacheTtl: this.#options.secretCacheTtl,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Loads secrets from AWS Secrets Manager with caching and error handling
   *
   * This method retrieves configuration values from AWS Secrets Manager
   * and caches them in memory for subsequent calls. It includes comprehensive
   * error handling for common AWS service failures.
   *
   * @throws {AwsConfigurationError} When SECRET_ID environment variable is missing
   * @throws {AwsConfigurationError} When AWS Secrets Manager call fails
   * @throws {AwsConfigurationError} When secret value is invalid JSON
   *
   * @example
   * ```typescript
   * const config = new HonoConfiguration();
   *
   * try {
   *   await config.loadSecrets();
   *   console.log('Secrets loaded successfully');
   * } catch (error) {
   *   if (error instanceof AwsConfigurationError) {
   *     console.error(`Failed to load secrets: ${error.message}`);
   *     console.error(`AWS Service: ${error.awsService}`);
   *     console.error(`Error Type: ${error.errorType}`);
   *   }
   * }
   * ```
   */
  async loadSecrets(): Promise<void> {
    // Check if secrets are already loaded and still valid
    if (this.#loaded && this.#options.enableSecretCaching) {
      const now = Date.now();
      if (now - this.#lastLoadTime < this.#options.secretCacheTtl) {
        if (this.#options.enableLogging) {
          console.log('[AwsHonoConfiguration] Using cached secrets');
        }
        return;
      }
    }

    // Validate required environment variables
    const secretId = process.env.SECRET_ID;
    if (!secretId) {
      throw new AwsConfigurationError(
        'SECRET_ID environment variable is not set. Please configure the AWS Secrets Manager secret identifier.',
        'SecretsManager',
        'missing_env',
        { requiredEnvVar: 'SECRET_ID' },
      );
    }

    const client = new Aws.SecretsManager({
      region: process.env.AWS_REGION,
      endpoint: process.env.SECRETS_MANAGER_ENDPOINT,
    });

    try {
      if (this.#options.enableLogging) {
        console.log(
          `[AwsHonoConfiguration] Loading secrets from AWS Secrets Manager: ${secretId}`,
        );
      }

      const data = await client
        .getSecretValue({ SecretId: secretId })
        .promise();

      if (!data.SecretString) {
        throw new AwsConfigurationError(
          `Secret '${secretId}' does not contain a string value. Please ensure the secret contains JSON configuration.`,
          'SecretsManager',
          'invalid_secret',
          { secretId },
        );
      }

      // Parse the secret JSON
      try {
        const parsedSecrets = JSON.parse(data.SecretString);
        Object.assign(this.#secrets, parsedSecrets);
      } catch (parseError) {
        throw new AwsConfigurationError(
          `Secret '${secretId}' contains invalid JSON. Please ensure the secret value is properly formatted JSON.`,
          'SecretsManager',
          'invalid_secret',
          {
            secretId,
            parseError:
              parseError instanceof Error
                ? parseError.message
                : 'Unknown parse error',
          },
        );
      }

      // Update load status
      this.#loaded = true;
      this.#lastLoadTime = Date.now();

      if (this.#options.enableLogging) {
        console.log(
          `[AwsHonoConfiguration] Successfully loaded ${Object.keys(this.#secrets).length} configuration values`,
        );
      }
    } catch (err) {
      // Handle AWS service errors
      if (err instanceof AwsConfigurationError) {
        throw err; // Re-throw our custom errors
      }

      // Handle AWS SDK errors
      const awsError = err as any;
      let errorType: AwsConfigurationError['errorType'] = 'aws_service';
      let errorMessage = `Failed to retrieve secret '${secretId}' from AWS Secrets Manager: ${awsError.message || 'Unknown AWS error'}`;

      // Classify AWS errors
      if (awsError.code === 'ResourceNotFoundException') {
        errorMessage = `Secret '${secretId}' not found in AWS Secrets Manager. Please verify the secret exists and the SECRET_ID is correct.`;
      } else if (awsError.code === 'AccessDeniedException') {
        errorType = 'permission_denied';
        errorMessage = `Access denied when retrieving secret '${secretId}'. Please check IAM permissions for AWS Secrets Manager.`;
      } else if (awsError.code === 'InvalidParameterException') {
        errorMessage = `Invalid parameter when retrieving secret '${secretId}'. Please check the SECRET_ID format.`;
      }

      console.error(`Error retrieving secret: ${errorMessage}`, {
        secretId,
        awsErrorCode: awsError.code,
        awsErrorMessage: awsError.message,
        awsRegion: process.env.AWS_REGION,
      });

      throw new AwsConfigurationError(
        errorMessage,
        'SecretsManager',
        errorType,
        {
          secretId,
          awsErrorCode: awsError.code,
          awsErrorMessage: awsError.message,
          awsRegion: process.env.AWS_REGION,
        },
      );
    }
  }

  /**
   * Gets the API base URL with validation
   *
   * @returns Promise resolving to the API base URL
   * @throws {AwsConfigurationError} When URL is missing or invalid
   */
  async getApiBaseUrl(): Promise<string> {
    await this.loadSecrets();
    const value = this.assertEnvExists(
      'API_BASE_URL',
      this.#secrets.API_BASE_URL,
    );
    return this.#validateUrl(value, 'API_BASE_URL');
  }

  /**
   * Gets the transaction initialization path
   *
   * @returns Promise resolving to the init transaction path
   * @throws {AwsConfigurationError} When path is missing
   */
  async getInitTransactionPath(): Promise<string> {
    await this.loadSecrets();
    return this.assertEnvExists(
      'INIT_TRANSACTION_PATH',
      this.#secrets.INIT_TRANSACTION_PATH,
    );
  }

  /**
   * Gets the wallet response retrieval path
   *
   * @returns Promise resolving to the wallet response path
   * @throws {AwsConfigurationError} When path is missing
   */
  async getGetWalletResponsePath(): Promise<string> {
    await this.loadSecrets();
    return this.assertEnvExists(
      'GET_WALLET_RESPONSE_PATH',
      this.#secrets.GET_WALLET_RESPONSE_PATH,
    );
  }

  /**
   * Gets the wallet application URL with validation
   *
   * @returns Promise resolving to the wallet URL
   * @throws {AwsConfigurationError} When URL is missing or invalid
   */
  async getWalletUrl(): Promise<string> {
    await this.loadSecrets();
    const value = this.assertEnvExists('WALLET_URL', this.#secrets.WALLET_URL);
    return this.#validateUrl(value, 'WALLET_URL');
  }

  /**
   * Gets the public frontend URL with validation
   *
   * @returns Promise resolving to the public URL
   * @throws {AwsConfigurationError} When URL is missing or invalid
   */
  async getPublicUrl(): Promise<string> {
    await this.loadSecrets();
    const value = this.assertEnvExists('PUBLIC_URL', this.#secrets.PUBLIC_URL);
    return this.#validateUrl(value, 'PUBLIC_URL');
  }

  /**
   * Gets the DynamoDB table name
   *
   * @returns Promise resolving to the DynamoDB table name
   * @throws {AwsConfigurationError} When table name is missing
   */
  async getDynamoDBTable(): Promise<string> {
    await this.loadSecrets();
    return this.assertEnvExists('DYNAMODB_TABLE', this.#secrets.DYNAMODB_TABLE);
  }

  /**
   * Gets the DynamoDB endpoint URL
   *
   * @returns Promise resolving to the DynamoDB endpoint
   * @throws {AwsConfigurationError} When endpoint is missing or invalid
   */
  async getDynamoDBEndpoint(): Promise<string> {
    await this.loadSecrets();
    const value = this.assertEnvExists(
      'DYNAMODB_ENDPOINT',
      this.#secrets.DYNAMODB_ENDPOINT,
    );
    return this.#validateUrl(value, 'DYNAMODB_ENDPOINT');
  }

  /**
   * Validates URL format if validation is enabled
   *
   * @param url - URL to validate
   * @param varName - Name of the configuration variable (for error reporting)
   * @returns The validated URL
   * @throws {AwsConfigurationError} When URL format is invalid
   * @private
   */
  #validateUrl(url: string, varName: string): string {
    if (!this.#options.validateUrls) {
      return url;
    }

    try {
      new URL(url);
      return url;
    } catch (error) {
      throw new AwsConfigurationError(
        `Configuration variable '${varName}' contains an invalid URL format: ${url}`,
        'Configuration',
        'invalid_secret',
        { variableName: varName, invalidUrl: url },
      );
    }
  }
}
