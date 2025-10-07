import { Fetcher } from '@vecrea/oid4vc-verifier-frontend-core';
import { Context } from 'hono';
import { CloudflareEnv } from '../../env';
import { PRESENTATION_DEFINITIONS } from '../../adapters/out/prex';
import { mdocVerifier } from '../../adapters/out/mdoc/MdocVerifier';
import { WorkerToWorkerFetcher } from '../../adapters/out/http/cloudflare';
import { AbstractExtendedPortsOut } from '../AbstractExtendedPortsOut';
import { DigitalCredentialsSession } from '../../ports/out/session';

export class PortsOutImpl extends AbstractExtendedPortsOut<
  typeof PRESENTATION_DEFINITIONS
> {
  readonly #ctx: Context<CloudflareEnv>;

  constructor(ctx: Context<CloudflareEnv>) {
    super();
    this.#ctx = ctx;
  }

  generatePresentationDefinition(key: keyof typeof PRESENTATION_DEFINITIONS) {
    return PRESENTATION_DEFINITIONS[key];
  }

  mdocVerifier() {
    return mdocVerifier;
  }

  session() {
    return this.#ctx.get('SESSION');
  }

  dcSession(): DigitalCredentialsSession {
    return this.#ctx.get('DC_SESSION');
  }

  fetcher(): Fetcher {
    if (this.#ctx.env.BACKEND) {
      return new WorkerToWorkerFetcher(this.#ctx.env.BACKEND);
    }
    return super.fetcher();
  }
}
