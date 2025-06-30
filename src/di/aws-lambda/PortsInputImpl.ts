import {
  GetWalletResponse,
  InitTransaction,
} from 'oid4vc-verifier-frontend-core/ports.input';
import {
  createGetWalletResponseServiceInvoker,
  createInitTransactionServiceInvoker,
} from 'oid4vc-verifier-frontend-core/services';
import { PortsInput } from 'oid4vc-verifier-frontend-core/di';
import { PortsOut } from 'oid4vc-verifier-frontend-core/di';
import { HonoConfiguration } from './HonoConfiguration';

export class PortsInputImpl implements PortsInput {
  #config: HonoConfiguration;
  #portsOut: PortsOut;

  constructor(config: HonoConfiguration, portsOut: PortsOut) {
    this.#config = config;
    this.#portsOut = portsOut;
  }

  async getInitTransaction(): Promise<InitTransaction> {
    return createInitTransactionServiceInvoker(
      await this.#config.getApiBaseUrl(),
      await this.#config.getInitTransactionPath(),
      await this.#portsOut.getStorePresentationId(),
      await this.#portsOut.getFetcher(),
    );
  }

  async getGetWalletResponse(): Promise<GetWalletResponse> {
    return createGetWalletResponseServiceInvoker(
      await this.#config.getApiBaseUrl(),
      await this.#config.getGetWalletResponsePath(),
      await this.#portsOut.getLoadPresentationId(),
      await this.#portsOut.getFetcher(),
    );
  }
}
