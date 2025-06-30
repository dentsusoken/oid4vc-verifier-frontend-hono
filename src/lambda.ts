import { Hono } from 'hono';
import { FrontendApi } from './adapters/input/FrontendApi';
import { HonoConfiguration } from './di/aws-lambda/HonoConfiguration';
import { getDI } from './di/aws-lambda';
import { handle } from 'hono/aws-lambda';

const configuration = new HonoConfiguration();
const api = new FrontendApi(
  configuration.getHomePath(),
  configuration.getInitPath(),
  configuration.getResultPath(),
  getDI,
);

const app = new Hono()
  .get('/', (c) => c.redirect(configuration.getHomePath()))
  .route('/', api.route);

// export default app;
export const handler = handle(app);
