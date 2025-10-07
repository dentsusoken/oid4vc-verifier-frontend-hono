import { DurableObject } from 'cloudflare:workers';
import { Env } from 'hono';

/** Default session expiration time in seconds (24 hours) */
const EXPIRATION_TTL = 24 * 60 * 60;

/**
 * Duration for setting the next alarm for garbage collection (24 hours in milliseconds).
 * @constant {number}
 */
const ALARM_DURATION_MS = 24 * 60 * 60 * 1000;

/**
 * Presentation information stored within the Durable Object
 *
 * @interface StoredSession
 */
interface StoredSession {
  /** Presentation JSON data or string format */
  data: string;

  /** Expiration timestamp in milliseconds */
  expiresAt: number;
}

export class DurableObjectBase extends DurableObject {
  /**
   * Creates a new PresentationDurableObject instance
   *
   * @param ctx - Durable Object state context
   * @param env - Environment variables and bindings
   */
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

  /**
   * Saves presentation data
   *
   * @param key - The key to store under
   * @param data - Presentation JSON data or string
   * @returns Promise that resolves when save is complete
   *
   * @example
   * ```typescript
   * await durableObject.save('presentation:123', presentationJson);
   * ```
   */
  async save(key: string, data: string): Promise<void> {
    // Store data with expiration timestamp
    await this.ctx.storage.put<StoredSession>(key, {
      data,
      expiresAt: Date.now() + EXPIRATION_TTL,
    });

    // Ensure garbage collection alarm is set
    await this.setNextAlarm();
  }

  /**
   * Retrieves presentation data for the specified key
   *
   * @param key - The key to retrieve
   * @returns Presentation data or undefined if not found
   *
   * @example
   * ```typescript
   * const data = await durableObject.get('presentation:123');
   * if (data) {
   *   // Handle data if it exists
   * }
   * ```
   */
  async get(key: string): Promise<string | undefined> {
    // Retrieve stored data from Durable Object storage
    const storedData = await this.ctx.storage.get<StoredSession>(key);

    // Return undefined if data doesn't exist
    if (!storedData) {
      return undefined;
    }

    // Return the actual presentation data
    return storedData.data;
  }

  /**
   * Sets the next alarm for garbage collection
   *
   * Does nothing if an alarm is already set.
   * Sets an alarm 24 hours from now for garbage collection.
   *
   * @private
   */
  private async setNextAlarm() {
    // Check if an alarm is already scheduled
    const alarm = await this.ctx.storage.getAlarm();
    if (alarm && alarm > 0) {
      return; // Alarm already exists, nothing to do
    }

    // Schedule the next garbage collection alarm
    await this.ctx.storage.setAlarm(Date.now() + ALARM_DURATION_MS);
  }

  /**
   * Alarm handler for garbage collection of expired data
   *
   * Executed periodically to automatically delete presentation data
   * that has passed its expiration time. Sets the next alarm after completion.
   *
   * @async
   */
  async alarm(): Promise<void> {
    const now = Date.now();

    // Get all stored data for expiration check
    const allData = await this.ctx.storage.list<StoredSession>();

    // Delete expired entries
    for (const [key, value] of allData) {
      if (value.expiresAt < now) {
        await this.ctx.storage.delete(key);
      }
    }

    // Schedule the next garbage collection cycle
    await this.setNextAlarm();
  }
}
