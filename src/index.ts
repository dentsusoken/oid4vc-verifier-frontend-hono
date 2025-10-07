import { Hono } from 'hono';
import { FrontendApi } from './adapters/input/FrontendApi';
import { ConfigurationImpl, getDI } from './di/cloudflare';
import { sessionMiddleware } from './middleware/cloudflare';
import { DigitalCredentialsApi } from './adapters/input/DigitalCredentialsApi';

const configuration = new ConfigurationImpl();
const api = new FrontendApi(
  configuration.homeViewPath(),
  configuration.initTransactionViewPath(),
  configuration.resultViewPath(),
  getDI
);

const digitalCredentialsApi = new DigitalCredentialsApi(getDI);

const app = new Hono()
  .use(sessionMiddleware)
  .get('/', (c) => c.redirect(configuration.homeViewPath()))
  .route('/', digitalCredentialsApi.route)
  .route('/', api.route);

export { DurableObjectBase } from './adapters/out/database/cloudflare';
export default app;
