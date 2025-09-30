import {
  Session,
  SessionSchemas,
  SessionBatch,
  SessionDeleteResult,
} from '@vecrea/oid4vc-verifier-frontend-core';
import { DurableObject } from 'cloudflare:workers';
import { Env } from 'hono';
import { z } from 'zod';

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

export class SessionDurableObject implements Session<SessionSchemas> {
  readonly #stub: DurableObjectStub<DurableObjectBase>;
  readonly #sessionId: string;
  readonly #ttl: number;

  #loaded?: SessionSchemas;

  constructor(
    stub: DurableObjectStub<DurableObjectBase>,
    sessionId: string,
    ttl: number
  ) {
    this.#stub = stub;
    this.#sessionId = sessionId;
    this.#ttl = ttl;
  }

  /**
   * Retrieves a value from the session storage
   */
  async get<K extends keyof SessionSchemas>(
    key: K
  ): Promise<SessionSchemas[K] | undefined> {
    await this.load();
    return this.#loaded?.[key];
  }

  /**
   * Retrieves multiple values from the session storage in a single operation
   */
  async getBatch<K extends keyof SessionSchemas>(
    ...keys: K[]
  ): Promise<Partial<SessionBatch<SessionSchemas, K>>> {
    await this.load();
    const result: Partial<SessionBatch<SessionSchemas, K>> = {};

    for (const key of keys) {
      if (this.#loaded && key in this.#loaded) {
        (result as any)[key] = this.#loaded[key];
      }
    }

    return result;
  }

  /**
   * Stores a value in the session storage
   */
  async set<K extends keyof SessionSchemas>(
    key: K,
    value: SessionSchemas[K]
  ): Promise<void> {
    await this.load();

    if (!this.#loaded) {
      this.#loaded = {} as SessionSchemas;
    }

    (this.#loaded as any)[key] = value;
    await this.save();
  }

  /**
   * Stores multiple key-value pairs in the session storage in a single operation
   */
  async setBatch<K extends keyof SessionSchemas>(
    batch: Partial<SessionBatch<SessionSchemas, K>>
  ): Promise<void> {
    await this.load();

    if (!this.#loaded) {
      this.#loaded = {} as SessionSchemas;
    }

    for (const [key, value] of Object.entries(batch)) {
      if (value !== undefined) {
        (this.#loaded as any)[key] = value;
      }
    }

    await this.save();
  }

  /**
   * Removes a value from the session storage
   */
  async delete<K extends keyof SessionSchemas>(
    key: K
  ): Promise<SessionSchemas[K] | undefined> {
    await this.load();

    if (!this.#loaded || !(key in this.#loaded)) {
      return undefined;
    }

    const removedValue = this.#loaded[key];
    delete (this.#loaded as any)[key];
    await this.save();

    return removedValue;
  }

  /**
   * Removes multiple values from the session storage in a single operation
   */
  async deleteBatch<K extends keyof SessionSchemas>(
    ...keys: K[]
  ): Promise<SessionDeleteResult<SessionSchemas, K>> {
    await this.load();
    const result: SessionDeleteResult<SessionSchemas, K> =
      {} as SessionDeleteResult<SessionSchemas, K>;

    if (!this.#loaded) {
      return result;
    }

    for (const key of keys) {
      if (key in this.#loaded) {
        (result as any)[key] = this.#loaded[key];
        delete (this.#loaded as any)[key];
      }
    }

    await this.save();
    return result;
  }

  /**
   * Removes all data from the session storage
   */
  async clear(): Promise<void> {
    this.#loaded = {} as SessionSchemas;
    await this.save();
  }

  /**
   * Checks if a key exists in the session storage
   */
  async has<K extends keyof SessionSchemas>(key: K): Promise<boolean> {
    await this.load();
    return this.#loaded ? key in this.#loaded : false;
  }

  /**
   * Gets all keys currently stored in the session
   */
  async keys(): Promise<Array<keyof SessionSchemas>> {
    await this.load();
    return this.#loaded
      ? (Object.keys(this.#loaded) as Array<keyof SessionSchemas>)
      : [];
  }

  /**
   * Gets the number of items stored in the session
   */
  async size(): Promise<number> {
    await this.load();
    return this.#loaded ? Object.keys(this.#loaded).length : 0;
  }

  async save(): Promise<void> {
    await this.#stub.save(this.#sessionId, JSON.stringify(this.#loaded));
  }

  async load(): Promise<void> {
    if (this.#loaded) {
      return;
    }

    const value = await this.#stub.get(this.#sessionId);
    if (!value) {
      return;
    }

    this.#loaded = JSON.parse(value);
  }
}
