import { Context } from 'hono';
import { AwsEnv, AwsSecrets } from '../../env';
import { AbstractConfiguration } from '@vecrea/oid4vc-verifier-frontend-core';

export class ConfigurationImpl extends AbstractConfiguration {
  #secrets?: AwsSecrets;

  constructor(ctx?: Context<AwsEnv>) {
    super();
    this.#secrets = ctx?.env;
  }

  apiBaseUrl(): string {
    return this.#secrets?.API_BASE_URL ?? '';
  }

  initTransactionApiPath(): string {
    return this.#secrets?.INIT_TRANSACTION_PATH ?? '';
  }

  getWalletResponseApiPath(): string {
    return this.#secrets?.GET_WALLET_RESPONSE_PATH ?? '';
  }

  publicUrl(): string {
    return this.#secrets?.PUBLIC_URL ?? '';
  }

  walletUrl(): string {
    return this.#secrets?.WALLET_URL ?? '';
  }

  walletResponseRedirectPath(): string {
    return this.#secrets?.GET_WALLET_RESPONSE_PATH ?? '';
  }

  dynamoDBTable(): string {
    return (
      process.env.VerifierFrontendPresentationIdTable ??
      'oid4vc-verifier-endpoint-presentation-table'
    );
  }

  // homeViewPath(): string {
  //   return `/${process.env.STAGE_NAME}${super.homeViewPath()}`
  // }

  // initTransactionViewPath(additionalPath?: string): string {
  //   return `/${process.env.STAGE_NAME}${super.initTransactionViewPath(additionalPath)}`
  // }

  // resultViewPath(): string {
  //   return `/${process.env.STAGE_NAME}${super.resultViewPath()}`
  // }
}
