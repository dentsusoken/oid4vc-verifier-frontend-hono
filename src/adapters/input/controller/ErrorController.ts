import { FC } from 'hono/jsx';
import { ErrorPageProps } from '../views';
import { Context } from 'hono';
import { Env } from '../../../env';
import { StatusCode } from 'hono/utils/http-status';
import { HTTPException } from 'hono/http-exception';

export interface HandleError {
  (
    c: Context,
    homePath: string,
    error: string,
    status?: StatusCode,
  ): Response | Promise<Response>;
}

export interface ErrorController<T extends Env> {
  handleError: HandleError;
}

export class ErrorControllerImpl<T extends Env> implements ErrorController<T> {
  constructor(private readonly View: FC<ErrorPageProps>) {}

  handleError(
    c: Context<T>,
    homePath: string,
    error: string,
    status?: StatusCode,
  ) {
    const ViewComponent = this.View({ error, homePath });
    if (!ViewComponent) {
      throw new HTTPException(500, {
        message: 'Something went wrong...',
      });
    }
    c.status(status || 500);
    return c.render(ViewComponent);
  }
}
