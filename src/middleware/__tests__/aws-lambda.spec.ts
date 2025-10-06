import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { sessionMiddleware } from '../aws-lambda';
import type { AwsEnv } from '../../env';

// Mock external dependencies
vi.mock('hono/cookie', () => ({
  getCookie: vi.fn(),
  setCookie: vi.fn(),
}));

vi.mock('../../adapters/out/session/aws', () => ({
  SessionDynamoDB: vi.fn(),
}));

vi.mock('../../di/aws-lambda', () => ({
  ConfigurationImpl: vi.fn(),
}));

vi.mock('@vecrea/oid4vc-core', () => ({
  DynamoDB: vi.fn(),
}));

// Mock crypto.randomUUID globally
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn().mockReturnValue('mock-session-id'),
  },
});

describe('AWS Lambda Session Middleware', () => {
  let app: Hono<AwsEnv>;
  let mockGetCookie: ReturnType<typeof vi.fn>;
  let mockSetCookie: ReturnType<typeof vi.fn>;
  let mockConfigurationImpl: ReturnType<typeof vi.fn>;
  let mockSessionDynamoDB: ReturnType<typeof vi.fn>;
  let mockDynamoDB: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Get mocked functions
    mockGetCookie = vi.mocked(getCookie);
    mockSetCookie = vi.mocked(setCookie);

    // Dynamic imports for mocked modules
    const { ConfigurationImpl } = await import('../../di/aws-lambda');
    const { SessionDynamoDB } = await import('../../adapters/out/session/aws');
    const { DynamoDB } = await import('@vecrea/oid4vc-core');

    mockConfigurationImpl = vi.mocked(ConfigurationImpl);
    mockSessionDynamoDB = vi.mocked(SessionDynamoDB);
    mockDynamoDB = vi.mocked(DynamoDB);

    // Mock ConfigurationImpl instance
    const mockConfigInstance = {
      dynamoDBClient: vi.fn().mockReturnValue('mock-client'),
      dynamoDBTable: vi.fn().mockReturnValue('test-table'),
    };
    mockConfigurationImpl.mockImplementation(() => mockConfigInstance);

    // Setup test app
    app = new Hono<AwsEnv>();
    app.use('*', sessionMiddleware);
    app.get('/test', (c) => {
      const session = c.get('SESSION');
      return c.json({ success: true, sessionExists: !!session });
    });
  });

  describe('Normal cases', () => {
    it('should create new session when no cookie exists', async () => {
      // Arrange
      mockGetCookie.mockReturnValue(undefined);
      const mockSessionInstance = { id: 'mock-session-id' };
      mockSessionDynamoDB.mockImplementation(() => mockSessionInstance);

      // Act
      const response = await app.request('/test');

      // Assert
      expect(response.status).toBe(200);
      const responseData = (await response.json()) as {
        success: boolean;
        sessionExists: boolean;
      };
      expect(responseData.success).toBe(true);
      expect(responseData.sessionExists).toBe(true);

      // Verify session ID was generated and cookie was set
      expect(mockSetCookie).toHaveBeenCalledWith(
        expect.anything(),
        'session',
        'mock-session-id',
      );

      // Verify SessionDynamoDB was created with correct parameters
      expect(mockDynamoDB).toHaveBeenCalledWith('mock-client', 'test-table');
      expect(mockSessionDynamoDB).toHaveBeenCalledWith(
        expect.anything(), // DynamoDB instance
        'mock-session-id',
        60 * 60 * 24, // EXPIRATION_TTL
      );
    });

    it('should use existing session when cookie exists', async () => {
      // Arrange
      const existingSessionId = 'existing-session-id';
      mockGetCookie.mockReturnValue(existingSessionId);
      const mockSessionInstance = { id: existingSessionId };
      mockSessionDynamoDB.mockImplementation(() => mockSessionInstance);

      // Act
      const response = await app.request('/test');

      // Assert
      expect(response.status).toBe(200);
      const responseData = (await response.json()) as {
        success: boolean;
        sessionExists: boolean;
      };
      expect(responseData.success).toBe(true);
      expect(responseData.sessionExists).toBe(true);

      // Verify no new cookie was set
      expect(mockSetCookie).not.toHaveBeenCalled();

      // Verify SessionDynamoDB was created with existing session ID
      expect(mockSessionDynamoDB).toHaveBeenCalledWith(
        expect.anything(),
        existingSessionId,
        60 * 60 * 24,
      );
    });

    it('should set SESSION variable in context', async () => {
      // Arrange
      mockGetCookie.mockReturnValue('test-session-id');
      const mockSessionInstance = {
        id: 'test-session-id',
        get: vi.fn(),
        set: vi.fn(),
      };
      mockSessionDynamoDB.mockImplementation(() => mockSessionInstance);

      // Act
      const response = await app.request('/test');

      // Assert
      expect(response.status).toBe(200);

      // Verify that the session was set in context
      expect(mockSessionDynamoDB).toHaveBeenCalledTimes(1);
    });
  });

  describe('Configuration and DI', () => {
    it('should create ConfigurationImpl with correct context', async () => {
      // Arrange
      mockGetCookie.mockReturnValue('session-id');

      // Act
      await app.request('/test');

      // Assert
      expect(mockConfigurationImpl).toHaveBeenCalledWith(expect.anything());
    });

    it('should create DynamoDB with correct parameters', async () => {
      // Arrange
      mockGetCookie.mockReturnValue('session-id');

      // Act
      await app.request('/test');

      // Assert
      expect(mockDynamoDB).toHaveBeenCalledWith('mock-client', 'test-table');
    });

    it('should use correct TTL value', async () => {
      // Arrange
      const expectedTTL = 60 * 60 * 24; // 1 day
      mockGetCookie.mockReturnValue('session-id');

      // Act
      await app.request('/test');

      // Assert
      expect(mockSessionDynamoDB).toHaveBeenCalledWith(
        expect.anything(),
        'session-id',
        expectedTTL,
      );
    });
  });

  describe('Error handling', () => {
    it('should return 500 when configuration creation fails', async () => {
      // Arrange
      mockConfigurationImpl.mockImplementation(() => {
        throw new Error('Configuration error');
      });

      // Act
      const response = await app.request('/test');

      // Assert
      expect(response.status).toBe(500);
      expect(await response.text()).toContain('Internal Server Error');
    });

    it('should return 500 when DynamoDB creation fails', async () => {
      // Arrange
      mockGetCookie.mockReturnValue('session-id');
      mockDynamoDB.mockImplementation(() => {
        throw new Error('DynamoDB error');
      });

      // Act
      const response = await app.request('/test');

      // Assert
      expect(response.status).toBe(500);
      expect(await response.text()).toContain('Internal Server Error');
    });

    it('should return 500 when SessionDynamoDB creation fails', async () => {
      // Arrange
      mockGetCookie.mockReturnValue('session-id');
      mockSessionDynamoDB.mockImplementation(() => {
        throw new Error('Session creation error');
      });

      // Act
      const response = await app.request('/test');

      // Assert
      expect(response.status).toBe(500);
      expect(await response.text()).toContain('Internal Server Error');
    });
  });

  describe('Session ID generation', () => {
    it('should generate unique session ID when cookie is missing', async () => {
      // Arrange
      mockGetCookie.mockReturnValue(undefined);
      const mockUuid = vi.fn().mockReturnValue('generated-uuid');
      global.crypto.randomUUID = mockUuid;

      // Act
      await app.request('/test');

      // Assert
      expect(mockUuid).toHaveBeenCalledTimes(1);
      expect(mockSetCookie).toHaveBeenCalledWith(
        expect.anything(),
        'session',
        'generated-uuid',
      );
    });

    it('should use session cookie name constant', async () => {
      // Arrange
      mockGetCookie.mockReturnValue(undefined);

      // Act
      await app.request('/test');

      // Assert
      expect(mockGetCookie).toHaveBeenCalledWith(expect.anything(), 'session');
      expect(mockSetCookie).toHaveBeenCalledWith(
        expect.anything(),
        'session',
        expect.any(String),
      );
    });
  });

  describe('Boundary value tests', () => {
    it('should handle empty string session ID from cookie', async () => {
      // Arrange
      mockGetCookie.mockReturnValue('');
      const mockSessionInstance = { id: 'new-session-id' };
      mockSessionDynamoDB.mockImplementation(() => mockSessionInstance);

      // Reset any error-throwing mocks
      mockDynamoDB.mockReturnValue('mock-dynamodb-instance');

      // Act
      const response = await app.request('/test');

      // Assert
      expect(response.status).toBe(200);
      // Empty string is falsy, so new session should be generated
      expect(mockSetCookie).toHaveBeenCalled();
    });

    it('should handle very long session ID from cookie', async () => {
      // Arrange
      const longSessionId = 'a'.repeat(1000);
      mockGetCookie.mockReturnValue(longSessionId);
      const mockSessionInstance = { id: longSessionId };
      mockSessionDynamoDB.mockImplementation(() => mockSessionInstance);

      // Reset any error-throwing mocks
      mockDynamoDB.mockReturnValue('mock-dynamodb-instance');

      // Act
      const response = await app.request('/test');

      // Assert
      expect(response.status).toBe(200);
      expect(mockSessionDynamoDB).toHaveBeenCalledWith(
        expect.anything(),
        longSessionId,
        expect.any(Number),
      );
    });
  });
});
