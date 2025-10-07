import { DurableObjectBase } from '../../database/cloudflare';
import { DigitalCredentialsSession } from '../../../../ports/out/session';

/**
 * Digital Credentials session implementation using Cloudflare Durable Object
 *
 * - Stores values with `dc:<sessionId>` prefix
 * - Provides minimal API for `save`/`get`
 *
 * @since 1.0.0
 */

const DC_SESSION_PREFIX = 'dc:';

export class DCSessionDurableObject implements DigitalCredentialsSession {
  readonly #stub: DurableObjectStub<DurableObjectBase>;
  readonly #sessionId: string;

  /**
   * @param stub - Durable Object stub
   * @param sessionId - Session ID
   */
  constructor(stub: DurableObjectStub<DurableObjectBase>, sessionId: string) {
    this.#stub = stub;
    this.#sessionId = sessionId;
  }

  /**
   * Save value
   */
  async save(value: string): Promise<void> {
    await this.#stub.save(DC_SESSION_PREFIX + this.#sessionId, value);
  }

  /**
   * Get session value
   * @returns Stored value or null/undefined
   */
  async get(): Promise<string | null | undefined> {
    return this.#stub.get(DC_SESSION_PREFIX + this.#sessionId);
  }
}
