import { InputDescriptorJSON } from '@vecrea/oid4vc-prex';
import { GeneratePresentationDefinition } from 'oid4vc-verifier-frontend-core';

export const mDLDifinition: InputDescriptorJSON = {
  id: 'org.iso.18013.5.1.mDL',
  name: 'Mobile Driving Licence',
  purpose: 'We need to verify your mobile driving licence',
  format: {
    mso_mdoc: {
      alg: ['ES256', 'ES384', 'ES512'],
    },
  },
  constraints: {
    fields: [
      {
        path: ["$['org.iso.18013.5.1']['family_name']"],
        intent_to_retain: false,
      },
      {
        path: ["$['org.iso.18013.5.1']['given_name']"],
        intent_to_retain: false,
      },
      {
        path: ["$['org.iso.18013.5.1']['birth_date']"],
        intent_to_retain: false,
      },
      {
        path: ["$['org.iso.18013.5.1']['issue_date']"],
        intent_to_retain: false,
      },
      {
        path: ["$['org.iso.18013.5.1']['expiry_date']"],
        intent_to_retain: false,
      },
      {
        path: ["$['org.iso.18013.5.1']['age_over_18']"],
        intent_to_retain: false,
      },
      {
        path: ["$['org.iso.18013.5.1']['age_over_21']"],
        intent_to_retain: false,
      },
      {
        path: ["$['org.iso.18013.5.1']['age_in_years']"],
        intent_to_retain: false,
      },
      {
        path: ["$['org.iso.18013.5.1']['age_birth_year']"],
        intent_to_retain: false,
      },
      {
        path: ["$['org.iso.18013.5.1']['issuing_authority']"],
        intent_to_retain: false,
      },
      {
        path: ["$['org.iso.18013.5.1']['document_number']"],
        intent_to_retain: false,
      },
      {
        path: ["$['org.iso.18013.5.1']['portrait']"],
        intent_to_retain: false,
      },
      {
        path: ["$['org.iso.18013.5.1']['driving_privileges']"],
        intent_to_retain: false,
      },
      {
        path: ["$['org.iso.18013.5.1']['un_distinguishing_sign']"],
        intent_to_retain: false,
      },
      {
        path: ["$['org.iso.18013.5.1']['sex']"],
        intent_to_retain: false,
      },
      {
        path: ["$['org.iso.18013.5.1']['height']"],
        intent_to_retain: false,
      },
      {
        path: ["$['org.iso.18013.5.1']['weight']"],
        intent_to_retain: false,
      },
      {
        path: ["$['org.iso.18013.5.1']['eye_colour']"],
        intent_to_retain: false,
      },
      {
        path: ["$['org.iso.18013.5.1']['hair_colour']"],
        intent_to_retain: false,
      },
      {
        path: ["$['org.iso.18013.5.1']['birth_place']"],
        intent_to_retain: false,
      },
      {
        path: ["$['org.iso.18013.5.1']['portrait_capture_date']"],
        intent_to_retain: false,
      },
      {
        path: ["$['org.iso.18013.5.1']['nationality']"],
        intent_to_retain: false,
      },
      {
        path: ["$['org.iso.18013.5.1']['resident_city']"],
        intent_to_retain: false,
      },
      {
        path: ["$['org.iso.18013.5.1']['resident_state']"],
        intent_to_retain: false,
      },
      {
        path: ["$['org.iso.18013.5.1']['resident_postal_code']"],
        intent_to_retain: false,
      },
      {
        path: ["$['org.iso.18013.5.1']['resident_country']"],
        intent_to_retain: false,
      },
      {
        path: ["$['org.iso.18013.5.1']['family_name_national_character']"],
        intent_to_retain: false,
      },
      {
        path: ["$['org.iso.18013.5.1']['given_name_national_character']"],
        intent_to_retain: false,
      },
      {
        path: ["$['org.iso.18013.5.1']['signature_usual_mark']"],
        intent_to_retain: false,
      },
    ],
  },
};

export const mDLPresentationDefinition: GeneratePresentationDefinition =
  () => ({
    id: 'org.iso.18013.5.1.mDL',
    input_descriptors: [mDLDifinition],
  });
