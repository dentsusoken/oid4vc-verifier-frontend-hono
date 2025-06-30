import { Context } from 'hono';
import { Env } from '../../../env';
import { Controller } from '.';
import { GetDI } from '../../../di';
import { ResultProps } from '../views';
import { FC } from 'hono/jsx';
import { getCookie } from 'hono/cookie';
import { MdocVerifyHandler } from 'mdoc-cbor-ts';
import { ErrorController } from './ErrorController';

export class ResultController<T extends Env> implements Controller<T> {
  constructor(
    private readonly getDI: GetDI<T>,
    private readonly View: FC<ResultProps>,
    private readonly verifier: MdocVerifyHandler,
    private readonly errorController: ErrorController<T>,
  ) {}

  handler() {
    return async (c: Context<T>) => {
      // Initialize DI
      const { config, portsIn } = this.getDI(c);
      const service = await portsIn.getGetWalletResponse();

      try {
        // Get sessionId
        const sessionId = getCookie(c, 'sessionId');

        if (!sessionId) {
          // TODO - Error handler
          throw new Error('session expired, please try again');
        }

        // Get response code
        const responseCode = c.req.query('response_code') ?? '';
        console.log('responseCode :>> ', responseCode);
        console.log('sessionId :>> ', sessionId);
        console.log('service :>> ', service);

        // Call service
        const response = await service(sessionId, responseCode);

        if (!response.vpToken) {
          // TODO - Error handler
          throw new Error('VP token not presented');
        }
        const result = await this.verifier.verify(response.vpToken);
        if (!result.valid) {
          // TODO - Error handler
          throw new Error('Invalid VP token');
        }
        const data = Object.entries(result.documents).map(([_, v]) => v);

        // Generate view component
        const ViewComponent = this.View({
          data,
          homePath: await config.getHomePath(),
          vpToken: response.vpToken,
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
