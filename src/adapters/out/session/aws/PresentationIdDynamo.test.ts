import { describe, it, expect, vi } from 'vitest';
import { PresentationIdDynamo } from './PresentationIdDynamo';
import { DynamoDB } from 'oid4vc-core/dynamodb';

const mockDynamoDB = {
    put: vi.fn(),
    get: vi.fn(),
};

describe('PresentationIdDynamo', () => {
    const kv = mockDynamoDB as unknown as DynamoDB;
    const presentationIdDynamo = new PresentationIdDynamo(kv);

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('storePresentationId', () => {
        it('should store presentationId successfully', async () => {
            const sessionId = 'test-session-id';
            const presentationId = 'test-presentation-id';

            await presentationIdDynamo.storePresentationId(sessionId, presentationId);

            expect(kv.put).toHaveBeenCalledWith(sessionId, presentationId, { expirationTtl: 3600 });
        });

        it('should handle errors during storing presentationId', async () => {
            const sessionId = 'test-session-id';
            const presentationId = 'test-presentation-id';
            kv.put.mockRejectedValueOnce(new Error('DynamoDB error'));

            await expect(presentationIdDynamo.storePresentationId(sessionId, presentationId)).rejects.toThrow('DynamoDB error');
        });
    });

    describe('loadPresentationId', () => {
        it('should load presentationId successfully', async () => {
            const sessionId = 'test-session-id';
            const presentationId = 'test-presentation-id';
            kv.get.mockResolvedValueOnce(presentationId);

            const result = await presentationIdDynamo.loadPresentationId(sessionId);

            expect(result).toBe(presentationId);
            expect(kv.get).toHaveBeenCalledWith(sessionId);
        });

        it('should return undefined if presentationId is not found', async () => {
            const sessionId = 'test-session-id';
            kv.get.mockResolvedValueOnce(null);

            const result = await presentationIdDynamo.loadPresentationId(sessionId);

            expect(result).toBeUndefined();
            expect(kv.get).toHaveBeenCalledWith(sessionId);
        });

        it('should handle errors during loading presentationId', async () => {
            const sessionId = 'test-session-id';
            kv.get.mockRejectedValueOnce(new Error('DynamoDB error'));

            await expect(presentationIdDynamo.loadPresentationId(sessionId)).rejects.toThrow('DynamoDB error');
        });
    });
});