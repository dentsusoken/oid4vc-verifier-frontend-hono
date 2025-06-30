import { Context } from 'hono';
import { env } from 'hono/adapter';
import { Bindings, CloudflareEnv } from '../../env';
import { AbstractConfiguration } from 'oid4vc-verifier-frontend-core/di';

/**
 * Configuration error class for environment-related failures
 *
 * Represents errors that occur when required environment variables
 * are missing, invalid, or improperly formatted.
 *
 * @public
 */
export class HonoConfigurationError extends Error {
  /**
   * The name of the environment variable that caused the error
   * @readonly
   */
  public readonly variableName: string;

  /**
   * The type of configuration error that occurred
   * @readonly
   */
  public readonly errorType: 'missing' | 'invalid' | 'format_error';

  /**
   * Creates a new HonoConfigurationError
   *
   * @param message - The error message
   * @param variableName - The name of the problematic environment variable
   * @param errorType - The type of error that occurred
   */
  constructor(
    message: string,
    variableName: string,
    errorType: HonoConfigurationError['errorType'] = 'missing',
  ) {
    super(message);
    this.name = 'HonoConfigurationError';
    this.variableName = variableName;
    this.errorType = errorType;

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, HonoConfigurationError.prototype);
  }
}

/**
 * Configuration options for HonoConfiguration behavior
 *
 * @public
 */
export interface HonoConfigurationOptions {
  /** Whether to validate URLs format (default: true) */
  validateUrls?: boolean;
  /** Whether to allow empty environment variables (default: false) */
  allowEmpty?: boolean;
  /** Whether to enable debug logging (default: false) */
  enableLogging?: boolean;
  /** Custom validation rules for environment variables */
  customValidators?: Record<string, (value: string) => boolean>;
}

/**
 * Hono-based configuration implementation for Cloudflare Workers environment
 *
 * This class provides environment-based configuration management specifically
 * designed for Cloudflare Workers runtime using the Hono framework. It extends
 * the core AbstractConfiguration to provide Workers-specific functionality
 * while maintaining compatibility with the hexagonal architecture pattern.
 *
 * ## Key Features
 *
 * - **Environment Variable Management**: Secure access to Workers environment bindings
 * - **URL Validation**: Optional validation of URL format for endpoints
 * - **Error Handling**: Comprehensive error reporting for missing or invalid configuration
 * - **Type Safety**: Full TypeScript support with proper type checking
 * - **Flexible Options**: Configurable behavior for different deployment scenarios
 *
 * ## Environment Variables
 *
 * The configuration expects the following environment variables to be set
 * in the Cloudflare Workers environment:
 *
 * - `API_BASE_URL`: Base URL for the backend API service
 * - `INIT_TRANSACTION_PATH`: Path for transaction initialization endpoint
 * - `GET_WALLET_RESPONSE_PATH`: Path for wallet response retrieval endpoint
 * - `WALLET_URL`: URL for the wallet application
 * - `PUBLIC_URL`: Public URL for the verifier frontend
 *
 * @example
 * ```typescript
 * // Basic usage
 * const config = new HonoConfiguration(context);
 * const apiUrl = config.getApiBaseUrl();
 *
 * // With custom options
 * const strictConfig = new HonoConfiguration(context, {
 *   validateUrls: true,
 *   allowEmpty: false,
 *   enableLogging: true
 * });
 *
 * // Error handling
 * try {
 *   const walletUrl = config.getWalletUrl();
 * } catch (error) {
 *   if (error instanceof HonoConfigurationError) {
 *     console.error(`Config error for ${error.variableName}: ${error.message}`);
 *   }
 * }
 * ```
 *
 * @extends {AbstractConfiguration}
 * @public
 */
export class HonoConfiguration extends AbstractConfiguration {
  /**
   * Environment bindings from Cloudflare Workers
   * @private
   */
  readonly #env?: Bindings;

  /**
   * Configuration options for behavior customization
   * @private
   */
  readonly #options: Required<HonoConfigurationOptions>;

  /**
   * Creates a new HonoConfiguration instance
   *
   * @param ctx - Optional Hono context containing environment bindings
   * @param options - Configuration options for customizing behavior
   *
   * @throws {TypeError} When context is provided but invalid
   */
  constructor(
    ctx?: Context<CloudflareEnv>,
    options: HonoConfigurationOptions = {},
  ) {
    super();

    // Validate context if provided
    if (ctx !== undefined && (ctx === null || typeof ctx !== 'object')) {
      throw new TypeError('Context must be a valid Hono context object');
    }

    this.#env = ctx ? env<Bindings>(ctx) : undefined;
    this.#options = {
      validateUrls: true,
      allowEmpty: false,
      enableLogging: false,
      customValidators: {},
      ...options,
    };

    // Log configuration initialization in debug mode
    if (this.#options.enableLogging) {
      console.log('[HonoConfiguration] Initialized with options:', {
        validateUrls: this.#options.validateUrls,
        allowEmpty: this.#options.allowEmpty,
        hasContext: !!ctx,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Gets the API base URL with validation
   *
   * @returns The API base URL
   * @throws {HonoConfigurationError} When URL is missing or invalid
   */
  getApiBaseUrl(): string {
    const value = this.#getAndValidateEnvVar(
      'API_BASE_URL',
      this.#env?.API_BASE_URL,
    );
    return this.#validateUrl(value, 'API_BASE_URL');
  }

  /**
   * Gets the transaction initialization path
   *
   * @returns The init transaction path
   * @throws {HonoConfigurationError} When path is missing or invalid
   */
  getInitTransactionPath(): string {
    return this.#getAndValidateEnvVar(
      'INIT_TRANSACTION_PATH',
      this.#env?.INIT_TRANSACTION_PATH,
    );
  }

  /**
   * Gets the wallet response retrieval path
   *
   * @returns The wallet response path
   * @throws {HonoConfigurationError} When path is missing or invalid
   */
  getGetWalletResponsePath(): string {
    return this.#getAndValidateEnvVar(
      'GET_WALLET_RESPONSE_PATH',
      this.#env?.GET_WALLET_RESPONSE_PATH,
    );
  }

  /**
   * Gets the wallet application URL with validation
   *
   * @returns The wallet URL
   * @throws {HonoConfigurationError} When URL is missing or invalid
   */
  getWalletUrl(): string {
    const value = this.#getAndValidateEnvVar(
      'WALLET_URL',
      this.#env?.WALLET_URL,
    );
    return this.#validateUrl(value, 'WALLET_URL');
  }

  /**
   * Gets the public frontend URL with validation
   *
   * @returns The public URL
   * @throws {HonoConfigurationError} When URL is missing or invalid
   */
  getPublicUrl(): string {
    const value = this.#getAndValidateEnvVar(
      'PUBLIC_URL',
      this.#env?.PUBLIC_URL,
    );
    return this.#validateUrl(value, 'PUBLIC_URL');
  }

  /**
   * Validates and retrieves environment variable value
   *
   * @param varName - Name of the environment variable
   * @param value - Value from environment bindings
   * @returns Validated environment variable value
   * @throws {HonoConfigurationError} When validation fails
   * @private
   */
  #getAndValidateEnvVar(varName: string, value: string | undefined): string {
    // Check if value exists
    if (value === undefined || value === null) {
      throw new HonoConfigurationError(
        `Environment variable '${varName}' is not defined. Please ensure it is set in your Cloudflare Workers environment.`,
        varName,
        'missing',
      );
    }

    // Check if empty values are allowed
    if (!this.#options.allowEmpty && value.trim() === '') {
      throw new HonoConfigurationError(
        `Environment variable '${varName}' is empty. Empty values are not allowed with current configuration.`,
        varName,
        'invalid',
      );
    }

    // Apply custom validation if defined
    const customValidator = this.#options.customValidators[varName];
    if (customValidator && !customValidator(value)) {
      throw new HonoConfigurationError(
        `Environment variable '${varName}' failed custom validation.`,
        varName,
        'invalid',
      );
    }

    // Log successful retrieval in debug mode
    if (this.#options.enableLogging) {
      console.log(
        `[HonoConfiguration] Retrieved ${varName}: ${value.substring(0, 20)}...`,
      );
    }

    return value;
  }

  /**
   * Validates URL format if validation is enabled
   *
   * @param url - URL to validate
   * @param varName - Name of the environment variable (for error reporting)
   * @returns The validated URL
   * @throws {HonoConfigurationError} When URL format is invalid
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
      throw new HonoConfigurationError(
        `Environment variable '${varName}' contains an invalid URL format: ${url}`,
        varName,
        'format_error',
      );
    }
  }
}
