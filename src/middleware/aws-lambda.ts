import { createMiddleware } from 'hono/factory';
import { SessionDynamoDB } from '../adapters/out/session/aws';
import { Context } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { AwsEnv } from '../env';
import { ConfigurationImpl } from '../di/aws-lambda';
import { DynamoDB } from '@vecrea/oid4vc-core';

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
    c.set(
      'SESSION',
      new SessionDynamoDB(
        new DynamoDB(config.dynamoDBClient(), config.dynamoDBTable()),
        sessionId,
        EXPIRATION_TTL,
      ),
    );
    await next();
  },
);
