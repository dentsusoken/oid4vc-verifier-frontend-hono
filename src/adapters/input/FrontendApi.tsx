import { Handler, Hono } from 'hono';
import { jsxRenderer } from 'hono/jsx-renderer';
import { MdocVerifyHandlerImpl, mdlSchema } from 'mdoc-cbor-ts';
import { Env } from '../../env';
import { ErrorPage, Home, Init, Result, Template } from './views';
import {
  ErrorControllerImpl,
  InitTransactionController,
  ResultController,
} from './controller';
import { mDLPresentationDefinition } from '../../data';
import { GetDI } from '../../di';

/**
 * Frontend API class
 */
export class FrontendApi<T extends Env> {
  #home: string;
  #init: string;
  #result: string;
  #getDI: GetDI<T>;

  /**
   * Constructor of the class
   * @param {string} homePath - The home path
   * @param {string} initPath - The init path
   * @param {string} resultPath - The result path
   */
  constructor(
    homePath: string,
    initPath: string,
    resultPath: string,
    getDI: GetDI<T>,
  ) {
    this.#home = homePath;
    this.#init = initPath;
    this.#result = resultPath;
    this.#getDI = getDI;
  }

  /**
   * Api Routes
   */
  get route(): Hono<Env> {
    const app = new Hono<Env>()
      .use(
        '*',
        jsxRenderer(({ children }) => <Template>{children}</Template>),
      )
      .get(this.#home, this.homeHandler())
      .get(this.#init, this.initHandler())
      .get(this.#result, this.resultHandler())
      .get('*', this.notFoundHandler());
    return app;
  }

  /**
   * Handler for home path
   * @returns {Handler<T>} The handler
   */
  homeHandler(): Handler<T> {
    return (c) => c.render(<Home initTransactionPath={this.#init} />);
  }

  /**
   * Handler for init path
   * @returns {Handler<T>} The handler
   */
  initHandler(): Handler<T> {
    const controller = new InitTransactionController(
      this.#getDI,
      mDLPresentationDefinition,
      Init,
      new ErrorControllerImpl(ErrorPage),
    );
    return controller.handler();
  }

  /**
   * Handler for result path
   * @returns {Handler<T>} The handler
   */
  resultHandler(): Handler<T> {
    const controller = new ResultController(
      this.#getDI,
      Result,
      new MdocVerifyHandlerImpl({
        'org.iso.18013.5.1': mdlSchema,
      }),
      new ErrorControllerImpl(ErrorPage),
    );
    return controller.handler();
  }

  /**
   * Handler for invalid path
   * @returns {Handler<Env>} The handler
   */
  notFoundHandler(): Handler<Env> {
    return (c) => {
      const controller = new ErrorControllerImpl(ErrorPage);
      return controller.handleError(c, this.#home, 'Page Not Found', 404);
    };
  }
}
