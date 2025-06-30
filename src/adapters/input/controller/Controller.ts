import { Handler } from 'hono';
import { Env } from '../../../env';

export interface Controller<T extends Env> {
  handler(): Handler<T>;
}
