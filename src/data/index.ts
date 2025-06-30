import { mDLPresentationDefinition } from './mDL';
import { PresentationDefinitionJSON } from 'oid4vc-prex';

export type GeneratePresentationDefinition = (
  id: string,
) => PresentationDefinitionJSON;

export { mDLPresentationDefinition };
