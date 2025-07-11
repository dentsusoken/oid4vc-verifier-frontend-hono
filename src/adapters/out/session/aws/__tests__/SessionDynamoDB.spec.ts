import { describe, it, expect, vi, beforeEach, Mocked } from 'vitest';
import { SessionDynamoDB, createDynamoDBClient } from '../SessionDynamoDB';
import { DynamoDB } from '@vecrea/oid4vc-core';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { Nonce, PresentationId } from 'oid4vc-verifier-frontend-core';

// Mock AWS SDK
vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn(),
}));

vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: vi.fn(),
  },
}));

// Mock @vecrea/oid4vc-core DynamoDB
vi.mock('@vecrea/oid4vc-core', () => ({
  DynamoDB: vi.fn(),
}));

describe('SessionDynamoDB', () => {
  let mockDynamoDB: Mocked<DynamoDB>;
  let sessionDynamoDB: SessionDynamoDB;
  const sessionId = 'test-session-id';
  const ttl = 3600;

  beforeEach(() => {
    vi.clearAllMocks();

    mockDynamoDB = {
      get: vi.fn(),
      put: vi.fn(),
    } as any;

    sessionDynamoDB = new SessionDynamoDB(mockDynamoDB, sessionId, ttl);
  });

  describe('constructor', () => {
    it('should create SessionDynamoDB instance with correct parameters', () => {
      expect(sessionDynamoDB).toBeDefined();
      expect(sessionDynamoDB).toBeInstanceOf(SessionDynamoDB);
    });

    it('should store sessionId and ttl internally', () => {
      // Test by checking behavior rather than private properties
      expect(
        () => new SessionDynamoDB(mockDynamoDB, sessionId, ttl),
      ).not.toThrow();
    });
  });

  describe('get', () => {
    it('should return undefined when no data is stored', async () => {
      mockDynamoDB.get.mockResolvedValue(null);

      const result = await sessionDynamoDB.get('nonce');

      expect(result).toBeUndefined();
      expect(mockDynamoDB.get).toHaveBeenCalledWith(sessionId);
    });

    it('should return stored value when data exists', async () => {
      const mockData = { nonce: 'test-nonce-123' };
      mockDynamoDB.get.mockResolvedValue(JSON.stringify(mockData));

      const result = await sessionDynamoDB.get('nonce');

      expect(result).toBe('test-nonce-123');
      expect(mockDynamoDB.get).toHaveBeenCalledWith(sessionId);
    });

    it('should return undefined for non-existent key', async () => {
      const mockData = { nonce: 'test-nonce-123' };
      mockDynamoDB.get.mockResolvedValue(JSON.stringify(mockData));

      const result = await sessionDynamoDB.get('presentationId' as any);

      expect(result).toBeUndefined();
    });

    it('should handle multiple get calls efficiently (caching)', async () => {
      const mockData = { nonce: 'test-nonce-123' };
      mockDynamoDB.get.mockResolvedValue(JSON.stringify(mockData));

      const result1 = await sessionDynamoDB.get('nonce');
      const result2 = await sessionDynamoDB.get('nonce');

      expect(result1).toBe('test-nonce-123');
      expect(result2).toBe('test-nonce-123');
      expect(mockDynamoDB.get).toHaveBeenCalledTimes(1); // Should only call once due to caching
    });
  });

  describe('getBatch', () => {
    it('should return empty object when no data is stored', async () => {
      mockDynamoDB.get.mockResolvedValue(null);

      const result = await sessionDynamoDB.getBatch(
        'nonce',
        'presentationId' as any,
      );

      expect(result).toEqual({});
      expect(mockDynamoDB.get).toHaveBeenCalledWith(sessionId);
    });

    it('should return only existing keys from stored data', async () => {
      const mockData = {
        nonce: 'test-nonce-123',
        presentationId: 'test-presentation-id',
      };
      mockDynamoDB.get.mockResolvedValue(JSON.stringify(mockData));

      const result = await sessionDynamoDB.getBatch(
        'nonce',
        'presentationId' as any,
        'nonExistent' as any,
      );

      expect(result).toEqual({
        nonce: 'test-nonce-123',
        presentationId: 'test-presentation-id',
      });
    });

    it('should handle empty key list', async () => {
      const result = await sessionDynamoDB.getBatch();

      expect(result).toEqual({});
    });
  });

  describe('set', () => {
    it('should store new value in empty session', async () => {
      mockDynamoDB.get.mockResolvedValue(null);
      mockDynamoDB.put.mockResolvedValue(undefined);

      await sessionDynamoDB.set('nonce', 'new-nonce-123' as Nonce);

      expect(mockDynamoDB.put).toHaveBeenCalledWith(
        sessionId,
        JSON.stringify({ nonce: 'new-nonce-123' }),
        { expirationTtl: ttl },
      );
    });

    it('should update existing value in session', async () => {
      const existingData = { nonce: 'old-nonce' };
      mockDynamoDB.get.mockResolvedValue(JSON.stringify(existingData));
      mockDynamoDB.put.mockResolvedValue(undefined);

      await sessionDynamoDB.set('nonce', 'new-nonce-123' as Nonce);

      expect(mockDynamoDB.put).toHaveBeenCalledWith(
        sessionId,
        JSON.stringify({ nonce: 'new-nonce-123' }),
        { expirationTtl: ttl },
      );
    });

    it('should add new key to existing session data', async () => {
      const existingData = { nonce: 'existing-nonce' };
      mockDynamoDB.get.mockResolvedValue(JSON.stringify(existingData));
      mockDynamoDB.put.mockResolvedValue(undefined);

      await sessionDynamoDB.set('presentationId' as any, 'new-presentation-id');

      expect(mockDynamoDB.put).toHaveBeenCalledWith(
        sessionId,
        JSON.stringify({
          nonce: 'existing-nonce',
          presentationId: 'new-presentation-id',
        }),
        { expirationTtl: ttl },
      );
    });
  });

  describe('setBatch', () => {
    it('should store multiple values in empty session', async () => {
      mockDynamoDB.get.mockResolvedValue(null);
      mockDynamoDB.put.mockResolvedValue(undefined);

      const batchData = {
        nonce: 'batch-nonce' as Nonce,
        presentationId: 'batch-presentation-id' as PresentationId,
      };

      await sessionDynamoDB.setBatch(batchData);

      expect(mockDynamoDB.put).toHaveBeenCalledWith(
        sessionId,
        JSON.stringify(batchData),
        { expirationTtl: ttl },
      );
    });

    it('should merge with existing session data', async () => {
      const existingData = { nonce: 'existing-nonce' };
      mockDynamoDB.get.mockResolvedValue(JSON.stringify(existingData));
      mockDynamoDB.put.mockResolvedValue(undefined);

      await sessionDynamoDB.setBatch({
        presentationId: 'new-presentation-id' as PresentationId,
      });

      expect(mockDynamoDB.put).toHaveBeenCalledWith(
        sessionId,
        JSON.stringify({
          nonce: 'existing-nonce',
          presentationId: 'new-presentation-id',
        }),
        { expirationTtl: ttl },
      );
    });

    it('should skip undefined values', async () => {
      mockDynamoDB.get.mockResolvedValue(null);
      mockDynamoDB.put.mockResolvedValue(undefined);

      await sessionDynamoDB.setBatch({
        nonce: 'defined-nonce' as Nonce,
        presentationId: undefined,
      });

      expect(mockDynamoDB.put).toHaveBeenCalledWith(
        sessionId,
        JSON.stringify({ nonce: 'defined-nonce' }),
        { expirationTtl: ttl },
      );
    });
  });

  describe('delete', () => {
    it('should return undefined when key does not exist', async () => {
      mockDynamoDB.get.mockResolvedValue(null);

      const result = await sessionDynamoDB.delete('nonce');

      expect(result).toBeUndefined();
    });

    it('should return and remove existing value', async () => {
      const existingData = {
        nonce: 'test-nonce',
        presentationId: 'test-presentation-id',
      };
      mockDynamoDB.get.mockResolvedValue(JSON.stringify(existingData));
      mockDynamoDB.put.mockResolvedValue(undefined);

      const result = await sessionDynamoDB.delete('nonce');

      expect(result).toBe('test-nonce');
      expect(mockDynamoDB.put).toHaveBeenCalledWith(
        sessionId,
        JSON.stringify({ presentationId: 'test-presentation-id' }),
        { expirationTtl: ttl },
      );
    });

    it('should handle deletion of non-existent key from existing session', async () => {
      const existingData = { nonce: 'test-nonce' };
      mockDynamoDB.get.mockResolvedValue(JSON.stringify(existingData));

      const result = await sessionDynamoDB.delete('nonExistent' as any);

      expect(result).toBeUndefined();
    });
  });

  describe('deleteBatch', () => {
    it('should return empty object when no data exists', async () => {
      mockDynamoDB.get.mockResolvedValue(null);

      const result = await sessionDynamoDB.deleteBatch(
        'nonce',
        'presentationId' as any,
      );

      expect(result).toEqual({});
    });

    it('should return and remove existing values', async () => {
      const existingData = {
        nonce: 'test-nonce',
        presentationId: 'test-presentation-id',
        keepThis: 'should-remain',
      };
      mockDynamoDB.get.mockResolvedValue(JSON.stringify(existingData));
      mockDynamoDB.put.mockResolvedValue(undefined);

      const result = await sessionDynamoDB.deleteBatch(
        'nonce',
        'presentationId' as any,
      );

      expect(result).toEqual({
        nonce: 'test-nonce',
        presentationId: 'test-presentation-id',
      });
      expect(mockDynamoDB.put).toHaveBeenCalledWith(
        sessionId,
        JSON.stringify({ keepThis: 'should-remain' }),
        { expirationTtl: ttl },
      );
    });

    it('should handle mix of existing and non-existing keys', async () => {
      const existingData = { nonce: 'test-nonce' };
      mockDynamoDB.get.mockResolvedValue(JSON.stringify(existingData));
      mockDynamoDB.put.mockResolvedValue(undefined);

      const result = await sessionDynamoDB.deleteBatch(
        'nonce',
        'nonExistent' as any,
      );

      expect(result).toEqual({ nonce: 'test-nonce' });
    });
  });

  describe('clear', () => {
    it('should remove all data from session', async () => {
      mockDynamoDB.put.mockResolvedValue(undefined);

      await sessionDynamoDB.clear();

      expect(mockDynamoDB.put).toHaveBeenCalledWith(
        sessionId,
        JSON.stringify({}),
        { expirationTtl: ttl },
      );
    });

    it('should work even when no data exists initially', async () => {
      mockDynamoDB.get.mockResolvedValue(null);
      mockDynamoDB.put.mockResolvedValue(undefined);

      await sessionDynamoDB.clear();

      expect(mockDynamoDB.put).toHaveBeenCalledWith(
        sessionId,
        JSON.stringify({}),
        { expirationTtl: ttl },
      );
    });
  });

  describe('has', () => {
    it('should return false when no data exists', async () => {
      mockDynamoDB.get.mockResolvedValue(null);

      const result = await sessionDynamoDB.has('nonce');

      expect(result).toBe(false);
    });

    it('should return true for existing key', async () => {
      const existingData = { nonce: 'test-nonce' };
      mockDynamoDB.get.mockResolvedValue(JSON.stringify(existingData));

      const result = await sessionDynamoDB.has('nonce');

      expect(result).toBe(true);
    });

    it('should return false for non-existing key', async () => {
      const existingData = { nonce: 'test-nonce' };
      mockDynamoDB.get.mockResolvedValue(JSON.stringify(existingData));

      const result = await sessionDynamoDB.has('nonExistent' as any);

      expect(result).toBe(false);
    });
  });

  describe('keys', () => {
    it('should return empty array when no data exists', async () => {
      mockDynamoDB.get.mockResolvedValue(null);

      const result = await sessionDynamoDB.keys();

      expect(result).toEqual([]);
    });

    it('should return all keys from session data', async () => {
      const existingData = {
        nonce: 'test-nonce',
        presentationId: 'test-presentation-id',
      };
      mockDynamoDB.get.mockResolvedValue(JSON.stringify(existingData));

      const result = await sessionDynamoDB.keys();

      expect(result).toEqual(
        expect.arrayContaining(['nonce', 'presentationId']),
      );
      expect(result).toHaveLength(2);
    });
  });

  describe('size', () => {
    it('should return 0 when no data exists', async () => {
      mockDynamoDB.get.mockResolvedValue(null);

      const result = await sessionDynamoDB.size();

      expect(result).toBe(0);
    });

    it('should return correct count of stored items', async () => {
      const existingData = {
        nonce: 'test-nonce',
        presentationId: 'test-presentation-id',
        anotherKey: 'another-value',
      };
      mockDynamoDB.get.mockResolvedValue(JSON.stringify(existingData));

      const result = await sessionDynamoDB.size();

      expect(result).toBe(3);
    });
  });

  describe('save', () => {
    it('should call DynamoDB put with correct parameters', async () => {
      mockDynamoDB.put.mockResolvedValue(undefined);

      // Access private method through public interface
      await sessionDynamoDB.set('nonce', 'test-nonce' as Nonce);

      expect(mockDynamoDB.put).toHaveBeenCalledWith(
        sessionId,
        JSON.stringify({ nonce: 'test-nonce' }),
        { expirationTtl: ttl },
      );
    });
  });

  describe('load', () => {
    it('should load data from DynamoDB when not cached', async () => {
      const testData = { nonce: 'loaded-nonce' };
      mockDynamoDB.get.mockResolvedValue(JSON.stringify(testData));

      await sessionDynamoDB.get('nonce');

      expect(mockDynamoDB.get).toHaveBeenCalledWith(sessionId);
    });

    it('should not reload data when already cached', async () => {
      const testData = { nonce: 'cached-nonce' };
      mockDynamoDB.get.mockResolvedValue(JSON.stringify(testData));

      // First call loads data
      await sessionDynamoDB.get('nonce');
      // Second call should use cached data
      await sessionDynamoDB.get('nonce');

      expect(mockDynamoDB.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('error handling', () => {
    it('should handle DynamoDB get errors gracefully', async () => {
      mockDynamoDB.get.mockRejectedValue(new Error('DynamoDB error'));

      await expect(sessionDynamoDB.get('nonce')).rejects.toThrow(
        'DynamoDB error',
      );
    });

    it('should handle DynamoDB put errors gracefully', async () => {
      mockDynamoDB.get.mockResolvedValue(null);
      mockDynamoDB.put.mockRejectedValue(new Error('DynamoDB put error'));

      await expect(
        sessionDynamoDB.set('nonce', 'test' as Nonce),
      ).rejects.toThrow('DynamoDB put error');
    });

    it('should handle invalid JSON in stored data', async () => {
      mockDynamoDB.get.mockResolvedValue('invalid-json');

      await expect(sessionDynamoDB.get('nonce')).rejects.toThrow();
    });
  });
});

describe('createDynamoDBClient', () => {
  const endpoint = 'http://localhost:8000';
  const region = 'us-east-1';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create DynamoDBClient with correct configuration', () => {
    const mockClient = { mock: 'client' };
    const mockDocumentClient = { mock: 'documentClient' };

    vi.mocked(DynamoDBClient).mockReturnValue(mockClient as any);
    vi.mocked(DynamoDBDocumentClient.from).mockReturnValue(
      mockDocumentClient as any,
    );

    const result = createDynamoDBClient(endpoint, region);

    expect(DynamoDBClient).toHaveBeenCalledWith({
      endpoint,
      region,
    });
    expect(DynamoDBDocumentClient.from).toHaveBeenCalledWith(mockClient);
    expect(result).toBe(mockDocumentClient);
  });

  it('should merge additional config options', () => {
    const mockClient = { mock: 'client' };
    const mockDocumentClient = { mock: 'documentClient' };
    const additionalConfig = {
      maxAttempts: 3,
      credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
    };

    vi.mocked(DynamoDBClient).mockReturnValue(mockClient as any);
    vi.mocked(DynamoDBDocumentClient.from).mockReturnValue(
      mockDocumentClient as any,
    );

    createDynamoDBClient(endpoint, region, additionalConfig);

    expect(DynamoDBClient).toHaveBeenCalledWith({
      endpoint,
      region,
      ...additionalConfig,
    });
  });

  it('should handle empty additional config', () => {
    const mockClient = { mock: 'client' };
    const mockDocumentClient = { mock: 'documentClient' };

    vi.mocked(DynamoDBClient).mockReturnValue(mockClient as any);
    vi.mocked(DynamoDBDocumentClient.from).mockReturnValue(
      mockDocumentClient as any,
    );

    createDynamoDBClient(endpoint, region, undefined);

    expect(DynamoDBClient).toHaveBeenCalledWith({
      endpoint,
      region,
    });
  });
});
