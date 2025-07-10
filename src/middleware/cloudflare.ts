import { createMiddleware } from 'hono/factory';
import { SessionKV } from '../adapters/out/session/cloudflare';
import { Context } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { CloudflareEnv } from '../env';

const SESSION_COOKIE_NAME = 'session';
// const EXPIRATION_TTL = 60 * 60 * 24 * 7; // 7 days

const generateAndSetSessionId = (c: Context) => {
  const sessionId = crypto.randomUUID();
  setCookie(c, SESSION_COOKIE_NAME, sessionId);
  return sessionId;
};

export const sessionMiddleware = createMiddleware(
  async (c: Context<CloudflareEnv>, next: () => Promise<void>) => {
    const sessionId =
      getCookie(c, SESSION_COOKIE_NAME) || generateAndSetSessionId(c);
    c.set('SESSION', new SessionKV(c.env.PRESENTATION_ID_KV, sessionId));
    await next();
  },
);
