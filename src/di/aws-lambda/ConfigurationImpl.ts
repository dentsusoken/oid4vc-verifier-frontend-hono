import { Context } from 'hono';
import { AwsEnv, AwsSecrets } from '../../env';
import { AbstractConfiguration } from '@vecrea/oid4vc-verifier-frontend-core';
import SecretsManager from 'aws-sdk/clients/secretsmanager';
import { createDynamoDBClient } from '../../adapters/out/session/aws';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

export class ConfigurationImpl extends AbstractConfiguration {
  #secrets?: AwsSecrets;

  constructor(_?: Context<AwsEnv>) {
    super();
  }

  async loadSecrets() {
    const secretsManager = new SecretsManager({
      region: process.env.AWS_REGION,
      endpoint: process.env.SECRETS_MANAGER_ENDPOINT,
    });

    const data = await secretsManager
      .getSecretValue({ SecretId: process.env.SECRETS_MANAGER_SECRET_ID || '' })
      .promise();

    this.#secrets = JSON.parse(data.SecretString ?? '{}');
  }

  apiBaseUrl(): string {
    if (!this.#secrets) {
      this.loadSecrets();
    }
    return this.#secrets?.API_BASE_URL ?? '';
  }

  initTransactionApiPath(): string {
    if (!this.#secrets) {
      this.loadSecrets();
    }
    return this.#secrets?.INIT_TRANSACTION_PATH ?? '';
  }

  getWalletResponseApiPath(): string {
    if (!this.#secrets) {
      this.loadSecrets();
    }
    return this.#secrets?.GET_WALLET_RESPONSE_PATH ?? '';
  }

  publicUrl(): string {
    if (!this.#secrets) {
      this.loadSecrets();
    }
    return this.#secrets?.PUBLIC_URL ?? '';
  }

  walletUrl(): string {
    if (!this.#secrets) {
      this.loadSecrets();
    }
    return this.#secrets?.WALLET_URL ?? '';
  }

  walletResponseRedirectPath(): string {
    if (!this.#secrets) {
      this.loadSecrets();
    }
    return this.#secrets?.GET_WALLET_RESPONSE_PATH ?? '';
  }

  dynamoDBClient(): DynamoDBDocumentClient {
    if (!this.#secrets) {
      this.loadSecrets();
    }
    return createDynamoDBClient(
      this.#secrets?.DYNAMODB_ENDPOINT ?? '',
      process.env.AWS_REGION ?? ''
    );
  }

  dynamoDBTable(): string {
    if (!this.#secrets) {
      this.loadSecrets();
    }
    return this.#secrets?.DYNAMODB_TABLE ?? '';
  }
}
