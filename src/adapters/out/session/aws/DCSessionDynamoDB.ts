import { DynamoDB } from '@vecrea/oid4vc-core';
import { DigitalCredentialsSession } from '../../../../ports/out/session';

/**
 * Digital Credentials session implementation using DynamoDB
 *
 * - Stores values with `dc:<sessionId>` as key
 * - Uses TTL for expiration management
 *
 * @since 1.0.0
 */

const DC_SESSION_PREFIX = 'dc:';

export class DCSessionDynamoDB implements DigitalCredentialsSession {
  readonly #dynamoDB: DynamoDB;
  readonly #sessionId: string;
  readonly #ttl: number;

  /**
   * @param dynamoDB - Wrapped DynamoDB client
   * @param sessionId - Session ID
   * @param ttl - Expiration time (seconds)
   */
  constructor(dynamoDB: DynamoDB, sessionId: string, ttl: number) {
    this.#dynamoDB = dynamoDB;
    this.#sessionId = sessionId;
    this.#ttl = ttl;
  }

  /**
   * Save value (with TTL)
   */
  async save(value: string): Promise<void> {
    await this.#dynamoDB.put(DC_SESSION_PREFIX + this.#sessionId, value, {
      expirationTtl: this.#ttl,
    });
  }

  /**
   * Get value
   */
  async get(): Promise<string | null | undefined> {
    return await this.#dynamoDB.get(DC_SESSION_PREFIX + this.#sessionId);
  }
}
