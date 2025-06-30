import { Context } from 'hono';
import { PresentationIdKVStore } from '../../adapters/out/session/cloudflare';
import { CloudflareEnv } from '../../env';
import {
  LoadPresentationId,
  StorePresentationId,
} from 'oid4vc-verifier-frontend-core/ports.out.session';
import { Fetcher } from 'oid4vc-verifier-frontend-core/ports.out.http';
import { DefaultFetcher } from 'oid4vc-verifier-frontend-core/adapters.out.http';
import { PortsOut } from 'oid4vc-verifier-frontend-core/di';
import { WorkerToWorkerFetcher } from '../../adapters/out/http/cloudflare/WorkerToWorkerFetcher';

/**
 * Configuration options for PortsOutImpl behavior
 *
 * @public
 */
export interface PortsOutImplOptions {
  /** Whether to enable debug logging for external operations (default: false) */
  enableLogging?: boolean;
  /** Whether to prefer Worker-to-Worker communication when available (default: true) */
  preferWorkerToWorker?: boolean;
  /** Fallback timeout for HTTP operations in milliseconds (default: 30000) */
  httpTimeout?: number;
  /** Whether to validate KV operations (default: true) */
  validateKVOperations?: boolean;
}

/**
 * Cloudflare Workers implementation of output ports for external dependencies
 *
 * This class provides concrete implementations of the output ports (external
 * dependency interfaces) for the OID4VC verifier frontend application running
 * in Cloudflare Workers. It serves as an adapter between the hexagonal
 * architecture's output ports and the actual Cloudflare Workers APIs.
 *
 * ## Architecture Role
 *
 * In the hexagonal architecture pattern:
 * - **Output Ports**: Define interfaces for external dependencies
 * - **This Implementation**: Provides concrete adapters for Cloudflare Workers APIs
 * - **External Systems**: KV storage, HTTP services, Worker-to-Worker communication
 *
 * ## Cloudflare Workers Integration
 *
 * The class integrates with Cloudflare Workers-specific APIs:
 *
 * 1. **KV Storage**: For session state persistence using `PRESENTATION_ID_KV`
 * 2. **Service Bindings**: For Worker-to-Worker communication via `BACKEND` binding
 * 3. **HTTP Fetcher**: For external HTTP requests with fallback to standard fetch
 *
 * The implementation automatically selects the most appropriate transport
 * mechanism based on available environment bindings, preferring Worker-to-Worker
 * communication when available for better performance and reliability.
 *
 * @example
 * ```typescript
 * // Basic usage
 * const portsOut = new PortsOutImpl(context);
 *
 * // Store session data
 * const storeSession = portsOut.getStorePresentationId();
 * await storeSession('session-123', 'presentation-id-456');
 *
 * // Load session data
 * const loadSession = portsOut.getLoadPresentationId();
 * const presentationId = await loadSession('session-123');
 *
 * // Make HTTP requests
 * const fetcher = portsOut.getFetcher();
 * const response = await fetcher.fetch('https://api.example.com/data');
 *
 * // With custom options
 * const advancedPortsOut = new PortsOutImpl(context, {
 *   enableLogging: true,
 *   preferWorkerToWorker: false,
 *   httpTimeout: 60000
 * });
 * ```
 *
 * @implements {PortsOut}
 * @public
 */
export class PortsOutImpl implements PortsOut {
  /**
   * KV store implementation for session persistence
   * @private
   */
  readonly #presentationIdStore: PresentationIdKVStore;

  /**
   * HTTP fetcher implementation for external requests
   * @private
   */
  readonly #fetcher: Fetcher;

  /**
   * Configuration options for output port behavior
   * @private
   */
  readonly #options: Required<PortsOutImplOptions>;

  /**
   * Creates a new PortsOutImpl instance
   *
   * @param ctx - Hono context containing Cloudflare Workers environment bindings
   * @param options - Optional configuration for output port behavior
   *
   * @throws {TypeError} When context is null or undefined
   * @throws {Error} When required environment bindings are missing
   */
  constructor(ctx: Context<CloudflareEnv>, options: PortsOutImplOptions = {}) {
    // Validate context parameter
    if (!ctx) {
      throw new TypeError(
        'Context parameter is required for PortsOutImpl initialization',
      );
    }

    // Validate required environment bindings
    if (!ctx.env) {
      throw new Error('Environment bindings are missing from context');
    }

    if (!ctx.env.PRESENTATION_ID_KV) {
      throw new Error(
        'PRESENTATION_ID_KV binding is required but not found in environment. ' +
          'Please ensure the KV namespace is properly configured in wrangler.toml.',
      );
    }

    this.#options = {
      enableLogging: false,
      preferWorkerToWorker: true,
      httpTimeout: 30000,
      validateKVOperations: true,
      ...options,
    };

    try {
      // Initialize KV store with validation
      this.#presentationIdStore = new PresentationIdKVStore(
        ctx.env.PRESENTATION_ID_KV,
      );

      // Initialize HTTP fetcher with appropriate implementation
      this.#fetcher = this.#initializeFetcher(ctx);

      // Log initialization in debug mode
      if (this.#options.enableLogging) {
        console.log('[PortsOutImpl] Initialized successfully:', {
          hasKVBinding: !!ctx.env.PRESENTATION_ID_KV,
          hasBackendBinding: !!ctx.env.BACKEND,
          fetcherType: ctx.env.BACKEND
            ? 'WorkerToWorkerFetcher'
            : 'DefaultFetcher',
          options: this.#options,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new Error(
        `Failed to initialize PortsOutImpl: ${errorMessage}. ` +
          'Please check that all required Cloudflare Workers bindings are configured.',
      );
    }
  }

  /**
   * Gets the session storage function for storing presentation IDs
   *
   * This function provides access to the KV-based session storage mechanism
   * for persisting presentation session data across Worker invocations.
   *
   * @returns Function for storing presentation ID mappings
   *
   * @example
   * ```typescript
   * const storeSession = portsOut.getStorePresentationId();
   *
   * try {
   *   await storeSession('session-abc123', 'presentation-def456');
   *   console.log('Session stored successfully');
   * } catch (error) {
   *   console.error('Failed to store session:', error);
   * }
   * ```
   */
  getStorePresentationId(): StorePresentationId {
    return this.#presentationIdStore.storePresentationId;
  }

  /**
   * Gets the session loading function for retrieving presentation IDs
   *
   * This function provides access to the KV-based session storage mechanism
   * for retrieving previously stored presentation session data.
   *
   * @returns Function for loading presentation ID mappings
   *
   * @example
   * ```typescript
   * const loadSession = portsOut.getLoadPresentationId();
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
  getLoadPresentationId(): LoadPresentationId {
    return this.#presentationIdStore.loadPresentationId;
  }

  /**
   * Gets the HTTP fetcher for making external requests
   *
   * This function provides access to the configured HTTP fetcher, which
   * automatically selects the most appropriate transport mechanism based
   * on available Cloudflare Workers bindings.
   *
   * @returns Configured HTTP fetcher instance
   *
   * @example
   * ```typescript
   * const fetcher = portsOut.getFetcher();
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
  getFetcher(): Fetcher {
    return this.#fetcher;
  }

  /**
   * Initializes the appropriate HTTP fetcher based on available bindings
   *
   * @param ctx - Hono context containing environment bindings
   * @returns Configured HTTP fetcher instance
   * @private
   */
  #initializeFetcher(ctx: Context<CloudflareEnv>): Fetcher {
    // Prefer Worker-to-Worker communication when available and enabled
    if (
      this.#options.preferWorkerToWorker &&
      ctx.env.BACKEND &&
      typeof ctx.env.BACKEND === 'object'
    ) {
      if (this.#options.enableLogging) {
        console.log(
          '[PortsOutImpl] Using WorkerToWorkerFetcher for backend communication',
        );
      }
      return new WorkerToWorkerFetcher(ctx.env.BACKEND);
    }

    // Fallback to standard HTTP fetcher
    if (this.#options.enableLogging) {
      console.log('[PortsOutImpl] Using DefaultFetcher for HTTP communication');
    }
    return new DefaultFetcher();
  }
}
