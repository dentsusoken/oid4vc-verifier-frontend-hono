import { Context } from 'hono';
import { Env } from '../../../env';
import { AbstractController } from './AbstractController';
import { GetDI } from '../../../di';
import { InitProps, ErrorPageProps } from '../views';
import { FC } from 'hono/jsx';
import { PRESENTATION_DEFINITIONS } from '../../out/prex';

export class InitTransactionController<
  T extends Env
> extends AbstractController<T> {
  /**
   * Creates a new InitTransactionController instance
   *
   * @param getDI - Dependency injection function for accessing services
   * @param generatePresentationDefinition - Function to generate presentation definitions
   * @param View - React functional component for rendering the initialization view
   * @param errorView - React functional component for rendering error pages
   * @param options - Configuration options for controller behavior
   *
   * @throws {TypeError} When required dependencies are not provided
   */
  constructor(
    private readonly getDI: GetDI<T>,
    private readonly View: FC<InitProps>,
    private readonly key: keyof typeof PRESENTATION_DEFINITIONS,
    errorView: FC<ErrorPageProps>
  ) {
    // Initialize parent AbstractController with error view
    super(errorView);

    // Validate required dependencies
    if (!getDI || typeof getDI !== 'function') {
      throw new TypeError('getDI must be a function');
    }
    if (!View || typeof View !== 'function') {
      throw new TypeError('View must be a React functional component');
    }
  }

  handler() {
    return async (c: Context<T>) => {
      const { config, portsIn } = this.getDI(c);

      try {
        // Get the service instance
        const service = portsIn.initTransaction(this.key);

        const { walletRedirectUri, isMobile } = await service(c.req.raw);

        // Generate view component
        const ViewComponent = await this.View({
          redirectUrl: walletRedirectUri,
          homePath: `${c.env.PUBLIC_URL}${config.homeViewPath()}`,
          resultPath: `${c.env.PUBLIC_URL}${config.resultViewPath()}`,
          isMobile,
        });

        if (!ViewComponent) {
          throw new Error('Failed to generate view component');
        }

        return c.render(ViewComponent);
      } catch (error: any) {
        // Use inherited error handling from AbstractController
        return this.handleError(c, config, error);
      }
    };
  }
}
