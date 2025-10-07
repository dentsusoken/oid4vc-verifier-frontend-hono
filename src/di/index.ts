import {
  Configuration,
  PortsInput,
  // PortsOut,
} from '@vecrea/oid4vc-verifier-frontend-core';
import { Context } from 'hono';
import { Env } from '../env';
import { PRESENTATION_DEFINITIONS } from '../adapters/out/prex';
import { AbstractExtendedPortsOut } from './AbstractExtendedPortsOut';

export type GetDI<T extends Env> = (c: Context<T>) => {
  portsIn: PortsInput<typeof PRESENTATION_DEFINITIONS>;
  portsOut: AbstractExtendedPortsOut<typeof PRESENTATION_DEFINITIONS>;
  config: Configuration;
};
