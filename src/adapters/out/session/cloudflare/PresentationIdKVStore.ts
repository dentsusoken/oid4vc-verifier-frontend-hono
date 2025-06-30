import {
  LoadPresentationId,
  StorePresentationId,
} from '../../../ports/out/session';

/**
 * Time-to-live duration for KV store entries (1 hours in seconds).
 * @constant {number}
 */
const ONE_HOUR_TTL = 60 * 60;

/**
 * Options for putting values in the KV store, including expiration time.
 * @constant {KVNamespacePutOptions}
 */
const putOptions: KVNamespacePutOptions = { expirationTtl: ONE_HOUR_TTL };

/**
 * KV Store for Presentation Id
 */
export class PresentationIdKVStore {
  constructor(private kv: KVNamespace) {}

  storePresentationId: StorePresentationId = async (
    sessionId,
    presentationId
  ) => {
    await this.kv.put(sessionId, presentationId, putOptions);
  };

  loadPresentationId: LoadPresentationId = async (sessionId) => {
    return (await this.kv.get(sessionId)) ?? undefined;
  };
}
