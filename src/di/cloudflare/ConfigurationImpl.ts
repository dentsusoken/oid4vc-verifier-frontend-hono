import { Context } from 'hono';
import { CloudflareEnv } from '../../env';
import { AbstractConfiguration } from 'oid4vc-verifier-frontend-core';
import {
  LoggerConfig,
  DEVELOPMENT_LOGGER_CONFIG,
} from 'oid4vc-verifier-frontend-core';

export class ConfigurationImpl extends AbstractConfiguration {
  readonly #ctx?: Context<CloudflareEnv>;

  constructor(ctx?: Context<CloudflareEnv>) {
    super();
    this.#ctx = ctx;
  }

  apiBaseUrl(): string {
    return this.#ctx?.env.API_BASE_URL ?? '';
  }

  initTransactionApiPath(): string {
    return this.#ctx?.env.INIT_TRANSACTION_PATH ?? '';
  }

  getWalletResponseApiPath(): string {
    return this.#ctx?.env.GET_WALLET_RESPONSE_PATH ?? '';
  }

  publicUrl(): string {
    return this.#ctx?.env.PUBLIC_URL ?? '';
  }

  walletUrl(): string {
    return this.#ctx?.env.WALLET_URL ?? '';
  }

  walletResponseRedirectPath(): string {
    return this.#ctx?.env.GET_WALLET_RESPONSE_PATH ?? '';
  }

  loggerConfig(): LoggerConfig {
    return DEVELOPMENT_LOGGER_CONFIG;
  }
}
