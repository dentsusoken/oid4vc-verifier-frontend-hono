/**
 * Minimal session store abstraction for Digital Credentials
 *
 * - Values are stored/retrieved as JSON strings
 * - Implementation is delegated to Cloudflare Durable Object / DynamoDB etc.
 *
 * @public
 */
export interface DigitalCredentialsSession {
  /** Save value */
  save(value: string): Promise<void>;
  /** Get value */
  get(): Promise<string | null | undefined>;
}
