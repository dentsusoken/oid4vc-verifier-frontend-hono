import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { SessionKV } from '../SessionKV';
import {
  SessionSchemas,
  presentationIdSchema,
  nonceSchema,
  PresentationId,
  Nonce,
} from '@vecrea/oid4vc-verifier-frontend-core';

// Mock for KVNamespace
interface MockKVNamespace {
  get: Mock;
  put: Mock;
}

describe('SessionKV', () => {
  let mockKv: MockKVNamespace;
  let sessionKV: SessionKV;
  const sessionId = 'test-session-id';
  const ttl = 3600;

  beforeEach(() => {
    mockKv = {
      get: vi.fn(),
      put: vi.fn(),
    };
    sessionKV = new SessionKV(mockKv as any, sessionId, ttl);
  });

  describe('constructor', () => {
    it('should create instance with provided parameters', () => {
      expect(sessionKV).toBeInstanceOf(SessionKV);
    });
  });

  describe('get method', () => {
    it('should return value from session storage', async () => {
      const testPresentationId = presentationIdSchema.parse(
        'test-presentation-id'
      );
      const testData = { presentationId: testPresentationId };
      mockKv.get.mockResolvedValue(JSON.stringify(testData));

      const result = await sessionKV.get('presentationId');

      expect(result).toBe(testPresentationId);
      expect(mockKv.get).toHaveBeenCalledWith(sessionId);
    });

    it('should return undefined for non-existent key', async () => {
      const testData = { otherKey: 'other-value' };
      mockKv.get.mockResolvedValue(JSON.stringify(testData));

      const result = await sessionKV.get(
        'presentationId' as keyof SessionSchemas
      );

      expect(result).toBeUndefined();
    });

    it('should return undefined when session does not exist', async () => {
      mockKv.get.mockResolvedValue(null);

      const result = await sessionKV.get('presentationId');

      expect(result).toBeUndefined();
    });
  });

  describe('getBatch method', () => {
    it('should return multiple values from session storage', async () => {
      const testData = {
        presentationId: 'test-presentation-id',
        nonce: 'test-nonce',
      };
      mockKv.get.mockResolvedValue(JSON.stringify(testData));

      const result = await sessionKV.getBatch('presentationId', 'nonce');

      expect(result).toEqual({
        presentationId: 'test-presentation-id',
        nonce: 'test-nonce',
      });
    });

    it('should return partial results for existing keys only', async () => {
      const testData = {
        presentationId: 'test-presentation-id',
      };
      mockKv.get.mockResolvedValue(JSON.stringify(testData));

      const result = await sessionKV.getBatch('presentationId', 'nonce');

      expect(result).toEqual({
        presentationId: 'test-presentation-id',
      });
    });

    it('should return empty object when session does not exist', async () => {
      mockKv.get.mockResolvedValue(null);

      const result = await sessionKV.getBatch('presentationId', 'nonce');

      expect(result).toEqual({});
    });
  });

  describe('set method', () => {
    it('should store value in session storage', async () => {
      mockKv.get.mockResolvedValue(null);

      await sessionKV.set(
        'presentationId',
        'new-presentation-id' as PresentationId
      );

      expect(mockKv.put).toHaveBeenCalledWith(
        sessionId,
        JSON.stringify({ presentationId: 'new-presentation-id' }),
        { expirationTtl: ttl }
      );
    });

    it('should update existing session storage', async () => {
      const existingData = { nonce: 'existing-nonce' };
      mockKv.get.mockResolvedValue(JSON.stringify(existingData));

      await sessionKV.set(
        'presentationId',
        'new-presentation-id' as PresentationId
      );

      expect(mockKv.put).toHaveBeenCalledWith(
        sessionId,
        JSON.stringify({
          nonce: 'existing-nonce',
          presentationId: 'new-presentation-id',
        }),
        { expirationTtl: ttl }
      );
    });
  });

  describe('setBatch method', () => {
    it('should store multiple values in session storage', async () => {
      mockKv.get.mockResolvedValue(null);

      await sessionKV.setBatch({
        presentationId: 'test-presentation-id' as PresentationId,
        nonce: 'test-nonce' as Nonce,
      });

      expect(mockKv.put).toHaveBeenCalledWith(
        sessionId,
        JSON.stringify({
          presentationId: 'test-presentation-id',
          nonce: 'test-nonce',
        }),
        { expirationTtl: ttl }
      );
    });

    it('should update existing session with new values', async () => {
      const existingData = { existingKey: 'existing-value' };
      mockKv.get.mockResolvedValue(JSON.stringify(existingData));

      await sessionKV.setBatch({
        presentationId: 'test-presentation-id' as PresentationId,
        nonce: 'test-nonce' as Nonce,
      });

      expect(mockKv.put).toHaveBeenCalledWith(
        sessionId,
        JSON.stringify({
          existingKey: 'existing-value',
          presentationId: 'test-presentation-id',
          nonce: 'test-nonce',
        }),
        { expirationTtl: ttl }
      );
    });

    it('should skip undefined values', async () => {
      mockKv.get.mockResolvedValue(null);

      await sessionKV.setBatch({
        presentationId: 'test-presentation-id' as PresentationId,
        nonce: undefined,
      });

      expect(mockKv.put).toHaveBeenCalledWith(
        sessionId,
        JSON.stringify({
          presentationId: 'test-presentation-id',
        }),
        { expirationTtl: ttl }
      );
    });
  });

  describe('delete method', () => {
    it('should remove value from session storage', async () => {
      const testData = {
        presentationId: 'test-presentation-id',
        nonce: 'test-nonce',
      };
      mockKv.get.mockResolvedValue(JSON.stringify(testData));

      const removedValue = await sessionKV.delete('presentationId');

      expect(removedValue).toBe('test-presentation-id');
      expect(mockKv.put).toHaveBeenCalledWith(
        sessionId,
        JSON.stringify({ nonce: 'test-nonce' }),
        { expirationTtl: ttl }
      );
    });

    it('should return undefined for non-existent key', async () => {
      const testData = { nonce: 'test-nonce' };
      mockKv.get.mockResolvedValue(JSON.stringify(testData));

      const removedValue = await sessionKV.delete(
        'presentationId' as keyof SessionSchemas
      );

      expect(removedValue).toBeUndefined();
      // Should not update storage if key doesn't exist
      expect(mockKv.put).not.toHaveBeenCalled();
    });

    it('should return undefined when session does not exist', async () => {
      mockKv.get.mockResolvedValue(null);

      const removedValue = await sessionKV.delete('presentationId');

      expect(removedValue).toBeUndefined();
      expect(mockKv.put).not.toHaveBeenCalled();
    });
  });

  describe('deleteBatch method', () => {
    it('should remove multiple values from session storage', async () => {
      const testData = {
        presentationId: 'test-presentation-id',
        nonce: 'test-nonce',
        otherKey: 'other-value',
      };
      mockKv.get.mockResolvedValue(JSON.stringify(testData));

      const deletedValues = await sessionKV.deleteBatch(
        'presentationId',
        'nonce'
      );

      expect(deletedValues).toEqual({
        presentationId: 'test-presentation-id',
        nonce: 'test-nonce',
      });
      expect(mockKv.put).toHaveBeenCalledWith(
        sessionId,
        JSON.stringify({ otherKey: 'other-value' }),
        { expirationTtl: ttl }
      );
    });

    it('should return empty object when session does not exist', async () => {
      mockKv.get.mockResolvedValue(null);

      const deletedValues = await sessionKV.deleteBatch(
        'presentationId',
        'nonce'
      );

      expect(deletedValues).toEqual({});
      expect(mockKv.put).not.toHaveBeenCalled();
    });
  });

  describe('clear method', () => {
    it('should remove all data from session storage', async () => {
      await sessionKV.clear();

      expect(mockKv.put).toHaveBeenCalledWith(sessionId, JSON.stringify({}), {
        expirationTtl: ttl,
      });
    });
  });

  describe('has method', () => {
    it('should return true if key exists in session', async () => {
      const testData = { presentationId: 'test-presentation-id' };
      mockKv.get.mockResolvedValue(JSON.stringify(testData));

      const hasKey = await sessionKV.has('presentationId');

      expect(hasKey).toBe(true);
    });

    it('should return false if key does not exist in session', async () => {
      const testData = { otherKey: 'other-value' };
      mockKv.get.mockResolvedValue(JSON.stringify(testData));

      const hasKey = await sessionKV.has(
        'presentationId' as keyof SessionSchemas
      );

      expect(hasKey).toBe(false);
    });

    it('should return false when session does not exist', async () => {
      mockKv.get.mockResolvedValue(null);

      const hasKey = await sessionKV.has('presentationId');

      expect(hasKey).toBe(false);
    });
  });

  describe('keys method', () => {
    it('should return all keys from session storage', async () => {
      const testData = {
        presentationId: 'test-presentation-id',
        nonce: 'test-nonce',
      };
      mockKv.get.mockResolvedValue(JSON.stringify(testData));

      const keys = await sessionKV.keys();

      expect(keys).toEqual(['presentationId', 'nonce']);
    });

    it('should return empty array when session does not exist', async () => {
      mockKv.get.mockResolvedValue(null);

      const keys = await sessionKV.keys();

      expect(keys).toEqual([]);
    });
  });

  describe('size method', () => {
    it('should return number of items in session storage', async () => {
      const testData = {
        presentationId: 'test-presentation-id',
        nonce: 'test-nonce',
      };
      mockKv.get.mockResolvedValue(JSON.stringify(testData));

      const size = await sessionKV.size();

      expect(size).toBe(2);
    });

    it('should return 0 when session does not exist', async () => {
      mockKv.get.mockResolvedValue(null);

      const size = await sessionKV.size();

      expect(size).toBe(0);
    });
  });

  describe('load method', () => {
    it('should load session data only once', async () => {
      const testData = { presentationId: 'test-presentation-id' };
      mockKv.get.mockResolvedValue(JSON.stringify(testData));

      // Call multiple times
      await sessionKV.get('presentationId');
      await sessionKV.get('presentationId');

      // Should only call KV.get once
      expect(mockKv.get).toHaveBeenCalledTimes(1);
    });

    it('should handle empty session data', async () => {
      mockKv.get.mockResolvedValue(null);

      const result = await sessionKV.get('presentationId');

      expect(result).toBeUndefined();
    });
  });

  describe('save method', () => {
    it('should save session data to KV storage', async () => {
      mockKv.get.mockResolvedValue(null);
      await sessionKV.set(
        'presentationId',
        'test-presentation-id' as PresentationId
      );

      expect(mockKv.put).toHaveBeenCalledWith(
        sessionId,
        JSON.stringify({ presentationId: 'test-presentation-id' }),
        { expirationTtl: ttl }
      );
    });
  });
});
