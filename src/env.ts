import { LambdaEvent, LambdaContext } from 'hono/aws-lambda';

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

export type AwsBindings = BaseBindings & {
  event: LambdaEvent;
  lambdaContext: LambdaContext;
};

export type Bindings = CloudflareBindings | AwsBindings;

export type CloudflareEnv = {
  Bindings: CloudflareBindings;
};

export type AwsEnv = {
  Bindings: AwsBindings;
};

export type Env = CloudflareEnv | AwsEnv;
