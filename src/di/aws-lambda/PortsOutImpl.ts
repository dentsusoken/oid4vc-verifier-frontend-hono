import {
  LoadPresentationId,
  StorePresentationId,
} from 'oid4vc-verifier-frontend-core/ports.out.session';
import { Fetcher } from 'oid4vc-verifier-frontend-core/ports.out.http';
import { DefaultFetcher } from 'oid4vc-verifier-frontend-core/adapters.out.http';
import { PortsOut } from 'oid4vc-verifier-frontend-core/di';
import { PresentationIdDynamo } from '../../adapters/out/session/aws/PresentationIdDynamo';
import { DynamoDB } from 'oid4vc-core/dynamodb';
import { DynamoDBClient, DynamoDBClientConfig } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { HonoConfiguration } from './HonoConfiguration';

export class PortsOutImpl implements PortsOut {
  #presentationIdStore?: PresentationIdDynamo;
  #fetcher: Fetcher;
  #config: HonoConfiguration;

  constructor(config: HonoConfiguration) {
    this.#config = config;
    this.#fetcher = new DefaultFetcher();
  }

  private async createDynamoDBClient(config?: DynamoDBClientConfig) {
    const client = new DynamoDBClient({
      endpoint: await this.#config.getDynamoDBEndpoint(),
      region: process.env.AWS_REGION,
      ...config,
    });
    return DynamoDBDocumentClient.from(client);
  }

  private async connectDynamoDB() {
    const client = await this.createDynamoDBClient();
    const dynamo = new DynamoDB(client, await this.#config.getDynamoDBTable());
    this.#presentationIdStore = new PresentationIdDynamo(dynamo);
  }

  async getStorePresentationId(): Promise<StorePresentationId> {
    if (!this.#presentationIdStore) {
      await this.connectDynamoDB();
    }
    return this.#presentationIdStore!.storePresentationId;
  }

  async getLoadPresentationId(): Promise<LoadPresentationId> {
    if (!this.#presentationIdStore) {
      await this.connectDynamoDB();
    }
    return this.#presentationIdStore!.loadPresentationId;
  }

  getFetcher(): Fetcher {
    return this.#fetcher;
  }
}
