import { HonoConfiguration, PortsInputImpl, PortsOutImpl } from '.';
import { AwsEnv } from '../../env';
import { GetDI } from '..';

export const getDI: GetDI<AwsEnv> = (_) => {
  const config = new HonoConfiguration();
  const portsOut = new PortsOutImpl(config);
  const portsIn = new PortsInputImpl(config, portsOut);
  return { config, portsOut, portsIn };
};
