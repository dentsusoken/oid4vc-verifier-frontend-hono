import { mDLPresentationDefinition } from './mDL';
import { unifiedIDPresentationDefinition } from './unifiedID';

export const PRESENTATION_DEFINITIONS = {
  mDL: mDLPresentationDefinition,
  unifiedID: unifiedIDPresentationDefinition,
} as const;
