import { Context } from 'hono';
import { HonoConfiguration, PortsInputImpl, PortsOutImpl } from '.';
import { CloudflareEnv } from '../../env';
import { GetDI } from '..';

export const getDI: GetDI<CloudflareEnv> = (c) => {
  const config = new HonoConfiguration(c);
  const portsOut = new PortsOutImpl(c);
  const portsIn = new PortsInputImpl(config, portsOut);
  return { config, portsOut, portsIn };
};
