import { Hono } from 'hono';
import { handle } from 'hono/aws-lambda';
import { FrontendApi } from './adapters/input/FrontendApi';
import { ConfigurationImpl, getDI } from './di/aws-lambda';
import { sessionMiddleware } from './middleware/aws-lambda';

const configuration = new ConfigurationImpl();
const api = new FrontendApi(
  configuration.homeViewPath(),
  configuration.initTransactionViewPath(),
  configuration.resultViewPath(),
  getDI,
);

const app = new Hono()
  .use(sessionMiddleware)
  .get('/', (c) => c.redirect(configuration.homeViewPath()))
  .route('/', api.route);

export const handler = handle(app);
