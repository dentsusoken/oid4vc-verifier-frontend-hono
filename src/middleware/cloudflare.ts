import { createMiddleware } from 'hono/factory';
import {
  SessionDurableObject,
  DCSessionDurableObject,
} from '../adapters/out/session/cloudflare';
import { Context } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { CloudflareEnv } from '../env';

const SESSION_COOKIE_NAME = 'session';

const generateAndSetSessionId = (c: Context) => {
  const sessionId = crypto.randomUUID();
  setCookie(c, SESSION_COOKIE_NAME, sessionId);
  return sessionId;
};

export const sessionMiddleware = createMiddleware(
  async (c: Context<CloudflareEnv>, next: () => Promise<void>) => {
    const sessionId =
      getCookie(c, SESSION_COOKIE_NAME) || generateAndSetSessionId(c);
    const stub = c.env.SESSION.get(c.env.SESSION.idFromName(sessionId));
    c.set('SESSION', new SessionDurableObject(stub, sessionId));
    c.set('DC_SESSION', new DCSessionDurableObject(stub, sessionId));
    await next();
  }
);
