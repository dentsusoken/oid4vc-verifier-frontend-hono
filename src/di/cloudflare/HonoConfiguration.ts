import { Context } from 'hono';
import { env } from 'hono/adapter';
import { Bindings, CloudflareEnv } from '../../env';
import { AbstractConfiguration } from 'oid4vc-verifier-frontend-core/di';

/**
 * Configuration class from Hono that implements the Configuration interface
 * @extends {AbstractConfiguration}
 */
export class HonoConfiguration extends AbstractConfiguration {
  #env?: Bindings;

  /**
   * Constructor of the class
   * @param {Context<CloudflareEnv>} ctx - The context
   */
  constructor(ctx?: Context<CloudflareEnv>) {
    super();
    this.#env = ctx ? env<Bindings>(ctx) : undefined;
  }

  getApiBaseUrl() {
    return this.assertEnvExists('API_BASE_URL', this.#env?.API_BASE_URL);
  }

  getInitTransactionPath(): string {
    return this.assertEnvExists(
      'INIT_TRANSACTION_PATH',
      this.#env?.INIT_TRANSACTION_PATH,
    );
  }

  getGetWalletResponsePath(): string {
    return this.assertEnvExists(
      'GET_WALLET_RESPONSE_PATH',
      this.#env?.GET_WALLET_RESPONSE_PATH,
    );
  }

  getWalletUrl(): string {
    return this.assertEnvExists('WALLET_URL', this.#env?.WALLET_URL);
  }

  getPublicUrl(): string {
    return this.assertEnvExists('PUBLIC_URL', this.#env?.PUBLIC_URL);
  }
}
