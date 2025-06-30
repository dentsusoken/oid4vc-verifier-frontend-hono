import { Context } from 'hono';
import { PresentationIdKVStore } from '../../adapters/out/session/cloudflare';
import { CloudflareEnv } from '../../env';
import {
  LoadPresentationId,
  StorePresentationId,
} from 'oid4vc-verifier-frontend-core/ports.out.session';
import { Fetcher } from 'oid4vc-verifier-frontend-core/ports.out.http';
import { DefaultFetcher } from 'oid4vc-verifier-frontend-core/adapters.out.http';
import { PortsOut } from 'oid4vc-verifier-frontend-core/di';
import { WorkerToWorkerFetcher } from '../../adapters/out/http/cloudflare/WorkerToWorkerFetcher';

export class PortsOutImpl implements PortsOut {
  #presentationIdStore: PresentationIdKVStore;
  #fetcher: Fetcher;

  constructor(ctx: Context<CloudflareEnv>) {
    this.#presentationIdStore = new PresentationIdKVStore(
      ctx.env.PRESENTATION_ID_KV,
    );
    this.#fetcher = ctx.env.BACKEND
      ? new WorkerToWorkerFetcher(ctx.env.BACKEND)
      : new DefaultFetcher();
  }

  getStorePresentationId(): StorePresentationId {
    return this.#presentationIdStore.storePresentationId;
  }

  getLoadPresentationId(): LoadPresentationId {
    return this.#presentationIdStore.loadPresentationId;
  }

  getFetcher(): Fetcher {
    return this.#fetcher;
  }
}
