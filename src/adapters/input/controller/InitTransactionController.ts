import { Context } from 'hono';
import { Env } from '../../../env';
import { Controller } from '.';
import { GetDI } from '../../../di';
import { UAParser } from 'ua-parser-js';
import { URLBuilder, QueryBuilder } from 'oid4vc-verifier-frontend-core/utils';
import { Configuration } from 'oid4vc-verifier-frontend-core/di';
import {
  InitTransactionRequest,
  InitTransactionResponse,
} from 'oid4vc-verifier-frontend-core/ports.input';
import { GeneratePresentationDefinition } from '../../../data';
import { v4 as uuidv4 } from 'uuid';
import { InitProps } from '../views';
import { FC } from 'hono/jsx';
import { setCookie } from 'hono/cookie';
import { ErrorController } from './ErrorController';

export class InitTransactionController<T extends Env> implements Controller<T> {
  constructor(
    private readonly getDI: GetDI<T>,
    private readonly generatePresentationDefinition: GeneratePresentationDefinition,
    private readonly View: FC<InitProps>,
    private readonly errorController: ErrorController<T>,
  ) {}

  async generateResultUrl(config: Configuration) {
    return decodeURIComponent(
      new URLBuilder({
        baseUrl: await config.getPublicUrl(),
        path: await config.getResultPath(),
        queryBuilder: new QueryBuilder({
          response_code: '{RESPONSE_CODE}',
        }),
      }).build(),
    );
  }

  async generateRedirectUrl(
    config: Configuration,
    response: InitTransactionResponse,
  ) {
    return new URLBuilder({
      baseUrl: await config.getWalletUrl(),
      queryBuilder: new QueryBuilder({
        ...response.toWalletRedirectParams(),
      }),
    }).build();
  }

  async generateRequest(config: Configuration, device: string | undefined) {
    return InitTransactionRequest.fromJSON({
      type: 'vp_token',
      presentation_definition: this.generatePresentationDefinition(uuidv4()),
      nonce: uuidv4(),
      wallet_response_redirect_uri_template: device
        ? await this.generateResultUrl(config)
        : undefined,
    });
  }

  handler() {
    return async (c: Context<T>) => {
      // Initialize DI
      const { config, portsIn } = this.getDI(c);
      const service = await portsIn.getInitTransaction();
      try {
        // Get device type
        const ua = new UAParser(c.req.raw.headers.get('user-agent') ?? '');
        const device = ua.getDevice().type;

        // Generate request
        const request = await this.generateRequest(config, device);

        // Call service
        const { sessionId, response } = await service(request);

        // Set sessionId cookie
        setCookie(c, 'sessionId', sessionId, {
          path: '/',
          httpOnly: true,
          // secure: true,
          sameSite: 'Lax',
          maxAge: 60 * 60 * 24 * 7,
        });

        // Generate view component
        const ViewComponent = await this.View({
          device,
          redirectUrl: await this.generateRedirectUrl(config, response),
          homePath: await config.getHomePath(),
          resultPath: await config.getResultPath(),
        });

        if (!ViewComponent) {
          throw new Error('ViewComponent is not defined');
        }

        // Return response
        return c.render(ViewComponent);
      } catch (error) {
        console.error(error);
        return this.errorController.handleError(
          c,
          await config.getHomePath(),
          error as string,
        );
      }
    };
  }
}
