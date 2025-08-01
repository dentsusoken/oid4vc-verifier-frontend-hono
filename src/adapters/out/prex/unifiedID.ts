import { InputDescriptorJSON } from '@vecrea/oid4vc-prex';
import { GeneratePresentationDefinition } from '@vecrea/oid4vc-verifier-frontend-core';
import { v4 as uuidv4 } from 'uuid';

export const unifiedIDDefinition: InputDescriptorJSON = {
  id: 'com.dentsusoken.vecrea.UnifiedID',
  name: 'Unified ID',
  purpose: 'We need to verify your unified ID',
  format: {
    mso_mdoc: {
      alg: ['ES256', 'ES384', 'ES512'],
    },
  },
  constraints: {
    fields: [
      {
        path: ["$['com.dentsusoken.vecrea']['type']"],
        intent_to_retain: false,
      },
      {
        path: ["$['com.dentsusoken.vecrea']['service']"],
        intent_to_retain: false,
      },
      {
        path: ["$['com.dentsusoken.vecrea']['user_id']"],
        intent_to_retain: false,
      },
      {
        path: ["$['com.dentsusoken.vecrea']['unified_id']"],
        intent_to_retain: false,
      },
      {
        path: ["$['com.dentsusoken.vecrea']['issue_date']"],
        intent_to_retain: false,
      },
      {
        path: ["$['com.dentsusoken.vecrea']['expiry_date']"],
        intent_to_retain: false,
      },
    ],
  },
};

export const unifiedIDPresentationDefinition: GeneratePresentationDefinition =
  () => ({
    id: uuidv4(),
    input_descriptors: [unifiedIDDefinition],
  });
