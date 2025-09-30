import { LambdaEvent, LambdaContext } from 'hono/aws-lambda';
import { Session, SessionSchemas } from '@vecrea/oid4vc-verifier-frontend-core';
import { Env as DynamoDBEnv } from '@squilla/hono-aws-middlewares/dynamodb';
import { Env as SecretsManagerEnv } from '@squilla/hono-aws-middlewares/secrets-manager';

export type BaseBindings = {
  API_BASE_URL: string;
  INIT_TRANSACTION_PATH: string;
  GET_WALLET_RESPONSE_PATH: string;
  WALLET_URL: string;
  PUBLIC_URL: string;
};

export type CloudflareBindings = BaseBindings & {
  PRESENTATION_ID_KV: KVNamespace;
  BACKEND: Service;
};

export type AwsSecrets = BaseBindings;

export type AwsBindings = {
  event: LambdaEvent;
  lambdaContext: LambdaContext;
};

export type Bindings = CloudflareBindings | AwsBindings;

export type Variables = {
  SESSION: Session<SessionSchemas>;
};

export type CloudflareEnv = {
  Bindings: CloudflareBindings;
  Variables: Variables;
};

export type AwsEnv = {
  Bindings: AwsBindings & AwsSecrets;
  Variables: Variables;
} & DynamoDBEnv &
  SecretsManagerEnv;

export type Env = CloudflareEnv | AwsEnv;
