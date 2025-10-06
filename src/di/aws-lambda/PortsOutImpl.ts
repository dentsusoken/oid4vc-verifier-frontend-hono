import {
  AbstractPortsOut,
  GenerateWalletResponseRedirectUriTemplate,
} from '@vecrea/oid4vc-verifier-frontend-core';
import { Context } from 'hono';
import { AwsEnv } from '../../env';
import { PRESENTATION_DEFINITIONS } from '../../adapters/out/prex';
import { mdocVerifier } from '../../adapters/out/mdoc/MdocVerifier';

export class PortsOutImpl extends AbstractPortsOut<
  typeof PRESENTATION_DEFINITIONS
> {
  readonly #ctx: Context<AwsEnv>;

  constructor(ctx: Context<AwsEnv>) {
    super();
    this.#ctx = ctx;
  }

  generateWalletResponseRedirectUriTemplate(): GenerateWalletResponseRedirectUriTemplate {
    return (baseUrl, path, placeholder) => {
      const url = new URL(`${baseUrl}${path}`);
      url.searchParams.set('response_code', placeholder);
      return decodeURIComponent(url.toString());
    };
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
}
