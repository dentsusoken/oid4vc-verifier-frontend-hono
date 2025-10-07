import {
  AbstractPortsOut,
  GeneratePresentationDefinition,
} from '@vecrea/oid4vc-verifier-frontend-core';
import { DigitalCredentialsSession } from '../ports/out/session';

export abstract class AbstractExtendedPortsOut<
  T extends Record<string, GeneratePresentationDefinition>
> extends AbstractPortsOut<T> {
  abstract dcSession(): DigitalCredentialsSession;
}
