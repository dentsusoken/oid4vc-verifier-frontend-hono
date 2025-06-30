import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PresentationIdKVStore } from './PresentationIdKVStore';
import { KVNamespace } from '@cloudflare/workers-types';

describe('PresentationIdKVStore', () => {
    let kvMock: KVNamespace;
    let store: PresentationIdKVStore;

    beforeEach(() => {
        kvMock = {
            put: vi.fn(),
            get: vi.fn(),
        } as unknown as KVNamespace;
        store = new PresentationIdKVStore(kvMock);
    });

    it('should store presentationId with expiration', async () => {
        const sessionId = 'session1';
        const presentationId = 'presentation1';

        await store.storePresentationId(sessionId, presentationId);

        expect(kvMock.put).toHaveBeenCalledWith(sessionId, presentationId, { expirationTtl: 3600 });
    });

    it('should load presentationId correctly', async () => {
        const sessionId = 'session1';
        const presentationId = 'presentation1';

        kvMock.get = vi.fn().mockResolvedValue(presentationId);

        const loadedPresentationId = await store.loadPresentationId(sessionId);

        expect(loadedPresentationId).toBe(presentationId);
    });

    it('should return undefined for non-existent sessionId', async () => {
        kvMock.get = vi.fn().mockResolvedValue(null);

        const loadedPresentationId = await store.loadPresentationId('nonExistentSession');

        expect(loadedPresentationId).toBeUndefined();
    });
});