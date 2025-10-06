import {
  Session,
  SessionSchemas,
  SessionBatch,
  SessionDeleteResult,
} from '@vecrea/oid4vc-verifier-frontend-core';
import { DynamoDB } from '@vecrea/oid4vc-core';
import { DynamoDBClient, DynamoDBClientConfig } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

export const createDynamoDBClient = (
  endpoint: string,
  region: string,
  config?: DynamoDBClientConfig
) => {
  const client = new DynamoDBClient({
    endpoint,
    region,
    ...config,
  });
  return DynamoDBDocumentClient.from(client);
};

export class SessionDynamoDB implements Session<SessionSchemas> {
  readonly #dynamoDB: DynamoDB;
  readonly #sessionId: string;
  readonly #ttl: number;

  #loaded?: SessionSchemas;

  constructor(dynamoDB: DynamoDB, sessionId: string, ttl: number) {
    this.#dynamoDB = dynamoDB;
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
    await this.#dynamoDB.put(this.#sessionId, JSON.stringify(this.#loaded), {
      expirationTtl: this.#ttl,
    });
  }

  async load(): Promise<void> {
    if (this.#loaded) {
      return;
    }

    const value = await this.#dynamoDB.get(this.#sessionId);
    if (!value) {
      return;
    }

    this.#loaded = JSON.parse(value);
  }
}
