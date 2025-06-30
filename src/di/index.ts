import {
  Configuration,
  PortsInput,
  PortsOut,
} from 'oid4vc-verifier-frontend-core/di';
import { Context } from 'hono';
import { Env } from '../env';

export type GetDI<T extends Env> = (c: Context<T>) => {
  portsIn: PortsInput;
  portsOut: PortsOut;
  config: Configuration;
};
