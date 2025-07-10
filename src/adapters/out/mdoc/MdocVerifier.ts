import { MdocVerifyHandlerImpl } from 'mdoc-cbor-ts';
import { mdlSchema } from 'mdoc-cbor-ts';

export const mdocVerifier = new MdocVerifyHandlerImpl({
  'org.iso.18013.5.1': mdlSchema,
});
