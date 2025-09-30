import { Hono } from 'hono';
import { handle } from 'hono/aws-lambda';
import { FrontendApi } from './adapters/input/FrontendApi';
import { ConfigurationImpl, getDI } from './di/aws-lambda';
import {
  sessionMiddleware,
  setupLambdaMiddleware,
} from './middleware/aws-lambda';
import { dynamoDBMiddleware } from '@squilla/hono-aws-middlewares/dynamodb';
import { secretsManagerMiddleware } from '@squilla/hono-aws-middlewares/secrets-manager';
import { AwsEnv } from './env';

const configuration = new ConfigurationImpl();
const api = new FrontendApi(
  configuration.homeViewPath(),
  configuration.initTransactionViewPath(),
  configuration.resultViewPath(),
  getDI,
);

const app = new Hono<AwsEnv>()
  .use(secretsManagerMiddleware())
  .use(dynamoDBMiddleware())
  .use(setupLambdaMiddleware)
  .use(sessionMiddleware)
  .get('/', (c) => c.redirect(`${c.env.PUBLIC_URL}${configuration.homeViewPath()}`))
  .route('/', api.route);

export const handler = handle(app);
