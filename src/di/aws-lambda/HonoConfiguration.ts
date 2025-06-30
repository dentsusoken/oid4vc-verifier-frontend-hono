import { AbstractConfiguration } from 'oid4vc-verifier-frontend-core/di';
import * as Aws from 'aws-sdk';

/**
 * Configuration class from Hono that implements the Configuration interface
 * @extends {AbstractConfiguration}
 */
export class HonoConfiguration extends AbstractConfiguration {
  #secrets: Record<string, string> = {};
  #loaded = false;

  async loadSecrets(): Promise<void> {
    if (this.#loaded) {
      return;
    }

    const secretId = process.env.SECRET_ID;
    if (!secretId) {
      throw new Error('SECRET_ID is not set');
    }

    const client = new Aws.SecretsManager({
      region: process.env.AWS_REGION,
      endpoint: process.env.SECRETS_MANAGER_ENDPOINT,
    });
    try {
      const data = await client
        .getSecretValue({ SecretId: secretId })
        .promise();
      this.#secrets = JSON.parse(data.SecretString ?? '{}');
      this.#loaded = true;
    } catch (err) {
      console.error(`Error retrieving secret: ${err}`);
    }
  }

  constructor() {
    super();
  }

  async getApiBaseUrl(): Promise<string> {
    await this.loadSecrets();

    return this.assertEnvExists('API_BASE_URL', this.#secrets.API_BASE_URL);
  }

  async getInitTransactionPath(): Promise<string> {
    await this.loadSecrets();

    return this.assertEnvExists(
      'INIT_TRANSACTION_PATH',
      this.#secrets.INIT_TRANSACTION_PATH,
    );
  }

  async getGetWalletResponsePath(): Promise<string> {
    await this.loadSecrets();

    return this.assertEnvExists(
      'GET_WALLET_RESPONSE_PATH',
      this.#secrets.GET_WALLET_RESPONSE_PATH,
    );
  }

  async getWalletUrl(): Promise<string> {
    await this.loadSecrets();

    return this.assertEnvExists('WALLET_URL', this.#secrets.WALLET_URL);
  }

  async getPublicUrl(): Promise<string> {
    await this.loadSecrets();

    return this.assertEnvExists('PUBLIC_URL', this.#secrets.PUBLIC_URL);
  }

  async getDynamoDBTable(): Promise<string> {
    await this.loadSecrets();

    return this.assertEnvExists('DYNAMODB_TABLE', this.#secrets.DYNAMODB_TABLE);
  }

  async getDynamoDBEndpoint(): Promise<string> {
    await this.loadSecrets();

    return this.assertEnvExists(
      'DYNAMODB_ENDPOINT',
      this.#secrets.DYNAMODB_ENDPOINT,
    );
  }
}
