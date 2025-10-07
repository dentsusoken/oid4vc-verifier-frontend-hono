import { createMiddleware } from 'hono/factory';
import { SessionDynamoDB } from '../adapters/out/session/aws';
import { Context } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { AwsEnv } from '../env';
import { ConfigurationImpl } from '../di/aws-lambda';
import { DynamoDB } from '@vecrea/oid4vc-core';
import { Env as SecretsManagerEnv } from '@squilla/hono-aws-middlewares/secrets-manager';
import { Env } from '../env';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { DCSessionDynamoDB } from '../adapters/out/session/aws/DCSessionDynamoDB';

const SESSION_COOKIE_NAME = 'session';
const EXPIRATION_TTL = 60 * 60 * 24; // 1 day

const generateAndSetSessionId = (c: Context) => {
  const sessionId = crypto.randomUUID();
  setCookie(c, SESSION_COOKIE_NAME, sessionId);
  return sessionId;
};

export const sessionMiddleware = createMiddleware(
  async (c: Context<AwsEnv>, next: () => Promise<void>) => {
    const config = new ConfigurationImpl(c);
    const sessionId =
      getCookie(c, SESSION_COOKIE_NAME) || generateAndSetSessionId(c);
    const dynamoDB = new DynamoDB(
      DynamoDBDocumentClient.from(c.get('DynamoDB')),
      config.dynamoDBTable()
    );
    c.set('SESSION', new SessionDynamoDB(dynamoDB, sessionId, EXPIRATION_TTL));
    c.set(
      'DC_SESSION',
      new DCSessionDynamoDB(dynamoDB, sessionId, EXPIRATION_TTL)
    );
    await next();
  }
);

/**
 * Middleware that sets up environment variables for AWS Lambda.
 * Retrieves secrets and sets them in the context environment.
 */
export const setupLambdaMiddleware = createMiddleware<SecretsManagerEnv & Env>(
  async (c, next) => {
    const secretsManager = c.get('SecretsManager');
    const response = await secretsManager.getSecretValue({
      SecretId: process.env.SECRET_NAME || 'verifier-frontend-secrets',
    });
    const secret = JSON.parse(response.SecretString || '{}');

    c.env = {
      ...c.env,
      ...secret,
    };
    return next();
  }
);
