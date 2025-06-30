import {
  LoadPresentationId,
  StorePresentationId,
} from 'oid4vc-verifier-frontend-core/ports.out.session';
import { SessionUtils } from 'oid4vc-verifier-frontend-core/adapters.out.session';
/**
 * Time-to-live duration for KV store entries (1 hours in seconds).
 * @constant {number}
 */
const ONE_HOUR_TTL = 60 * 60;

/**
 * Options for putting values in the KV store, including expiration time.
 * @constant {KVNamespacePutOptions}
 */
const putOptions: KVNamespacePutOptions = { expirationTtl: ONE_HOUR_TTL };

/**
 * In-memory storage for presentation ID session management
 *
 * Provides a simple, non-persistent storage mechanism for associating
 * session IDs with presentation IDs. Data is stored in memory using a
 * Map and will be lost when the application restarts or the instance
 * is garbage collected.
 *
 * This implementation is suitable for:
 * - Development and testing environments
 * - Single-instance applications
 * - Scenarios where session persistence is not required
 *
 * For production environments, consider using persistent storage
 * implementations such as Redis, database, or browser storage.
 *
 * @example
 * ```typescript
 * const storage = new PresentationIdInMemoryStorage();
 *
 * // Store a presentation ID
 * await storage.store('session-123', 'presentation-456');
 *
 * // Load a presentation ID
 * const presentationId = await storage.load('session-123');
 * console.log(presentationId); // 'presentation-456'
 *
 * // Check if session exists
 * const exists = storage.has('session-123');
 * console.log(exists); // true
 *
 * // Clear a specific session
 * storage.clear('session-123');
 * ```
 *
 * @public
 */
export class PresentationIdKVStore {
  #kv: KVNamespace;

  constructor(kv: KVNamespace) {
    this.#kv = kv;
  }

  /**
   * Internal storage for session ID to presentation ID mappings
   * @private
   */
  // private readonly sessions = new Map<string, string>();

  /**
   * Stores a presentation ID associated with a session ID
   *
   * @param sessionId - The unique session identifier
   * @param presentationId - The presentation ID to store
   * @returns Promise that resolves when the storage operation completes
   *
   * @throws {SessionStorageError} When the storage operation fails or validation fails
   */
  storePresentationId: StorePresentationId = async (
    sessionId,
    presentationId,
  ) => {
    return SessionUtils.safeOperation('store', sessionId, () => {
      if (!SessionUtils.validatePresentationId(presentationId)) {
        throw new Error('Invalid presentation ID');
      }
      this.#kv.put(sessionId, presentationId, putOptions);
    });
  };

  /**
   * Loads a presentation ID associated with a session ID
   *
   * @param sessionId - The unique session identifier
   * @returns Promise resolving to the presentation ID or null if not found
   *
   * @throws {SessionStorageError} When the load operation fails or validation fails
   */
  loadPresentationId: LoadPresentationId = async (sessionId) => {
    return SessionUtils.safeOperation('load', sessionId, () => {
      return this.#kv.get(sessionId);
    });
  };
}
