import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { sessionMiddleware } from '../cloudflare';
import type { CloudflareEnv } from '../../env';

// Mock external dependencies
vi.mock('hono/cookie', () => ({
  getCookie: vi.fn(),
  setCookie: vi.fn(),
}));

vi.mock('../../adapters/out/session/cloudflare', () => ({
  SessionKV: vi.fn(),
}));

// Mock crypto.randomUUID globally
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn().mockReturnValue('mock-session-id'),
  },
});

describe('Cloudflare Session Middleware', () => {
  let app: Hono<CloudflareEnv>;
  let mockGetCookie: ReturnType<typeof vi.fn>;
  let mockSetCookie: ReturnType<typeof vi.fn>;
  let mockSessionKV: ReturnType<typeof vi.fn>;
  let mockKVNamespace: KVNamespace;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Get mocked functions
    mockGetCookie = vi.mocked(getCookie);
    mockSetCookie = vi.mocked(setCookie);

    // Dynamic import for mocked module
    const { SessionKV } = await import('../../adapters/out/session/cloudflare');
    mockSessionKV = vi.mocked(SessionKV);

    // Create mock KV namespace
    mockKVNamespace = {
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      list: vi.fn(),
      getWithMetadata: vi.fn(),
    } as any;

    // Setup test app with mock environment
    app = new Hono<CloudflareEnv>();
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
      mockSessionKV.mockImplementation(() => mockSessionInstance);

      // Act
      const response = await app.request(
        '/test',
        {},
        {
          PRESENTATION_ID_KV: mockKVNamespace,
          API_BASE_URL: 'https://api.example.com',
          INIT_TRANSACTION_PATH: '/init',
          GET_WALLET_RESPONSE_PATH: '/response',
          WALLET_URL: 'https://wallet.example.com',
          PUBLIC_URL: 'https://public.example.com',
          BACKEND: {} as Service,
        },
      );

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

      // Verify SessionKV was created with correct parameters
      expect(mockSessionKV).toHaveBeenCalledWith(
        mockKVNamespace,
        'mock-session-id',
        60 * 60 * 24, // EXPIRATION_TTL
      );
    });

    it('should use existing session when cookie exists', async () => {
      // Arrange
      const existingSessionId = 'existing-session-id';
      mockGetCookie.mockReturnValue(existingSessionId);
      const mockSessionInstance = { id: existingSessionId };
      mockSessionKV.mockImplementation(() => mockSessionInstance);

      // Act
      const response = await app.request(
        '/test',
        {},
        {
          PRESENTATION_ID_KV: mockKVNamespace,
          API_BASE_URL: 'https://api.example.com',
          INIT_TRANSACTION_PATH: '/init',
          GET_WALLET_RESPONSE_PATH: '/response',
          WALLET_URL: 'https://wallet.example.com',
          PUBLIC_URL: 'https://public.example.com',
          BACKEND: {} as Service,
        },
      );

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

      // Verify SessionKV was created with existing session ID
      expect(mockSessionKV).toHaveBeenCalledWith(
        mockKVNamespace,
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
      mockSessionKV.mockImplementation(() => mockSessionInstance);

      // Act
      const response = await app.request(
        '/test',
        {},
        {
          PRESENTATION_ID_KV: mockKVNamespace,
          API_BASE_URL: 'https://api.example.com',
          INIT_TRANSACTION_PATH: '/init',
          GET_WALLET_RESPONSE_PATH: '/response',
          WALLET_URL: 'https://wallet.example.com',
          PUBLIC_URL: 'https://public.example.com',
          BACKEND: {} as Service,
        },
      );

      // Assert
      expect(response.status).toBe(200);

      // Verify that the session was set in context
      expect(mockSessionKV).toHaveBeenCalledTimes(1);
    });
  });

  describe('Environment configuration', () => {
    it('should use KV namespace from environment', async () => {
      // Arrange
      mockGetCookie.mockReturnValue('session-id');

      // Act
      await app.request(
        '/test',
        {},
        {
          PRESENTATION_ID_KV: mockKVNamespace,
          API_BASE_URL: 'https://api.example.com',
          INIT_TRANSACTION_PATH: '/init',
          GET_WALLET_RESPONSE_PATH: '/response',
          WALLET_URL: 'https://wallet.example.com',
          PUBLIC_URL: 'https://public.example.com',
          BACKEND: {} as Service,
        },
      );

      // Assert
      expect(mockSessionKV).toHaveBeenCalledWith(
        mockKVNamespace,
        'session-id',
        60 * 60 * 24,
      );
    });

    it('should use correct TTL value', async () => {
      // Arrange
      const expectedTTL = 60 * 60 * 24; // 1 day
      mockGetCookie.mockReturnValue('session-id');

      // Act
      await app.request(
        '/test',
        {},
        {
          PRESENTATION_ID_KV: mockKVNamespace,
          API_BASE_URL: 'https://api.example.com',
          INIT_TRANSACTION_PATH: '/init',
          GET_WALLET_RESPONSE_PATH: '/response',
          WALLET_URL: 'https://wallet.example.com',
          PUBLIC_URL: 'https://public.example.com',
          BACKEND: {} as Service,
        },
      );

      // Assert
      expect(mockSessionKV).toHaveBeenCalledWith(
        expect.anything(),
        'session-id',
        expectedTTL,
      );
    });
  });

  describe('Error handling', () => {
    it('should return 500 when SessionKV creation fails', async () => {
      // Arrange
      mockGetCookie.mockReturnValue('session-id');
      mockSessionKV.mockImplementation(() => {
        throw new Error('KV error');
      });

      // Act
      const response = await app.request(
        '/test',
        {},
        {
          PRESENTATION_ID_KV: mockKVNamespace,
          API_BASE_URL: 'https://api.example.com',
          INIT_TRANSACTION_PATH: '/init',
          GET_WALLET_RESPONSE_PATH: '/response',
          WALLET_URL: 'https://wallet.example.com',
          PUBLIC_URL: 'https://public.example.com',
          BACKEND: {} as Service,
        },
      );

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

      // Setup successful mock
      const mockSessionInstance = { id: 'generated-uuid' };
      mockSessionKV.mockImplementation(() => mockSessionInstance);

      // Act
      await app.request(
        '/test',
        {},
        {
          PRESENTATION_ID_KV: mockKVNamespace,
          API_BASE_URL: 'https://api.example.com',
          INIT_TRANSACTION_PATH: '/init',
          GET_WALLET_RESPONSE_PATH: '/response',
          WALLET_URL: 'https://wallet.example.com',
          PUBLIC_URL: 'https://public.example.com',
          BACKEND: {} as Service,
        },
      );

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

      // Setup successful mock
      const mockSessionInstance = { id: 'mock-session-id' };
      mockSessionKV.mockImplementation(() => mockSessionInstance);

      // Act
      await app.request(
        '/test',
        {},
        {
          PRESENTATION_ID_KV: mockKVNamespace,
          API_BASE_URL: 'https://api.example.com',
          INIT_TRANSACTION_PATH: '/init',
          GET_WALLET_RESPONSE_PATH: '/response',
          WALLET_URL: 'https://wallet.example.com',
          PUBLIC_URL: 'https://public.example.com',
          BACKEND: {} as Service,
        },
      );

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
      mockSessionKV.mockImplementation(() => mockSessionInstance);

      // Act
      const response = await app.request(
        '/test',
        {},
        {
          PRESENTATION_ID_KV: mockKVNamespace,
          API_BASE_URL: 'https://api.example.com',
          INIT_TRANSACTION_PATH: '/init',
          GET_WALLET_RESPONSE_PATH: '/response',
          WALLET_URL: 'https://wallet.example.com',
          PUBLIC_URL: 'https://public.example.com',
          BACKEND: {} as Service,
        },
      );

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
      mockSessionKV.mockImplementation(() => mockSessionInstance);

      // Act
      const response = await app.request(
        '/test',
        {},
        {
          PRESENTATION_ID_KV: mockKVNamespace,
          API_BASE_URL: 'https://api.example.com',
          INIT_TRANSACTION_PATH: '/init',
          GET_WALLET_RESPONSE_PATH: '/response',
          WALLET_URL: 'https://wallet.example.com',
          PUBLIC_URL: 'https://public.example.com',
          BACKEND: {} as Service,
        },
      );

      // Assert
      expect(response.status).toBe(200);
      expect(mockSessionKV).toHaveBeenCalledWith(
        expect.anything(),
        longSessionId,
        expect.any(Number),
      );
    });
  });
});
