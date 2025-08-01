import {
  Configuration,
  PortsInput,
  PortsOut,
} from '@vecrea/oid4vc-verifier-frontend-core';
import { Context } from 'hono';
import { Env } from '../env';
import { PRESENTATION_DEFINITIONS } from '../adapters/out/prex';

export type GetDI<T extends Env> = (c: Context<T>) => {
  portsIn: PortsInput<typeof PRESENTATION_DEFINITIONS>;
  portsOut: PortsOut<typeof PRESENTATION_DEFINITIONS>;
  config: Configuration;
};
