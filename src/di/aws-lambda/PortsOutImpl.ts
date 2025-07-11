import { AbstractPortsOut, Configuration } from 'oid4vc-verifier-frontend-core';
import { Context } from 'hono';
import { AwsEnv } from '../../env';
import { mDLPresentationDefinition } from '../../adapters/out/prex';
import { mdocVerifier } from '../../adapters/out/mdoc/MdocVerifier';

export class PortsOutImpl extends AbstractPortsOut {
  readonly #ctx: Context<AwsEnv>;

  constructor(ctx: Context<AwsEnv>, config: Configuration) {
    super(config);
    this.#ctx = ctx;
  }

  generatePresentationDefinition() {
    return mDLPresentationDefinition;
  }

  mdocVerifier() {
    return mdocVerifier;
  }

  session() {
    return this.#ctx.get('SESSION');
  }
}
