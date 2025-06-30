import {
  GetWalletResponse,
  InitTransaction,
} from 'oid4vc-verifier-frontend-core/ports.input';
import {
  createGetWalletResponseServiceInvoker,
  createInitTransactionServiceInvoker,
} from 'oid4vc-verifier-frontend-core/services';
import { PortsInput } from 'oid4vc-verifier-frontend-core/di';
import { HonoConfiguration } from './HonoConfiguration';
import { PortsOutImpl } from './PortsOutImpl';

export class PortsInputImpl implements PortsInput {
  #config: HonoConfiguration;
  #portsOut: PortsOutImpl;

  constructor(config: HonoConfiguration, portsOut: PortsOutImpl) {
    this.#config = config;
    this.#portsOut = portsOut;
  }

  getInitTransaction(): InitTransaction {
    const a = this.#config.getGetWalletResponsePath();
    console.log('a :>> ', a);
    return createInitTransactionServiceInvoker(
      this.#config.getApiBaseUrl(),
      this.#config.getInitTransactionPath(),
      this.#portsOut.getStorePresentationId(),
      this.#portsOut.getFetcher(),
    );
  }

  getGetWalletResponse(): GetWalletResponse {
    return createGetWalletResponseServiceInvoker(
      this.#config.getApiBaseUrl(),
      this.#config.getGetWalletResponsePath(),
      this.#portsOut.getLoadPresentationId(),
      this.#portsOut.getFetcher(),
    );
  }
}
