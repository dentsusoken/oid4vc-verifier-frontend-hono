import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDI } from '../getDI';
import { Context } from 'hono';
import { CloudflareEnv } from '../../../env';
import { ConfigurationImpl } from '../ConfigurationImpl';
import { PortsOutImpl } from '../PortsOutImpl';
import { PortsInputImpl } from '@vecrea/oid4vc-verifier-frontend-core';

// Mock setup
vi.mock('../ConfigurationImpl');
vi.mock('../PortsOutImpl');
vi.mock('@vecrea/oid4vc-verifier-frontend-core', async () => {
  const actual = await vi.importActual('@vecrea/oid4vc-verifier-frontend-core');
  return {
    ...actual,
    PortsInputImpl: vi.fn(),
  };
});

describe('getDI', () => {
  let mockContext: Context<CloudflareEnv>;
  let mockConfig: any;
  let mockPortsOut: any;
  let mockPortsIn: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    mockConfig = {
      apiBaseUrl: vi.fn().mockReturnValue('https://api.example.com'),
    };

    mockPortsOut = {
      generatePresentationDefinition: vi.fn(),
      mdocVerifier: vi.fn(),
      session: vi.fn(),
    };

    mockPortsIn = {
      initTransaction: vi.fn(),
      getWalletResponse: vi.fn(),
    };

    // Setup mock constructors
    (ConfigurationImpl as any).mockImplementation(() => mockConfig);
    (PortsOutImpl as any).mockImplementation(() => mockPortsOut);
    (PortsInputImpl as any).mockImplementation(() => mockPortsIn);

    mockContext = {
      env: {
        API_BASE_URL: 'https://api.example.com',
        INIT_TRANSACTION_PATH: '/init',
        GET_WALLET_RESPONSE_PATH: '/wallet-response',
        PUBLIC_URL: 'https://verifier.example.com',
        WALLET_URL: 'https://wallet.example.com',
        PRESENTATION_ID_KV: {} as KVNamespace,
        BACKEND: {} as Service,
      },
      get: vi.fn(),
      set: vi.fn(),
    } as any;
  });

  describe('successful DI creation', () => {
    it('should create and return all dependencies', () => {
      const result = getDI(mockContext);

      expect(result).toEqual({
        config: mockConfig,
        portsOut: mockPortsOut,
        portsIn: mockPortsIn,
      });

      // Verify constructors are called correctly
      expect(ConfigurationImpl).toHaveBeenCalledWith(mockContext);
      expect(PortsOutImpl).toHaveBeenCalledWith(mockContext, mockConfig);
      expect(PortsInputImpl).toHaveBeenCalledWith(mockConfig, mockPortsOut);
    });

    it('should create dependencies in correct order', () => {
      getDI(mockContext);

      // Verify dependency creation order
      const configCall = (ConfigurationImpl as any).mock.invocationCallOrder[0];
      const portsOutCall = (PortsOutImpl as any).mock.invocationCallOrder[0];
      const portsInCall = (PortsInputImpl as any).mock.invocationCallOrder[0];

      expect(configCall).toBeLessThan(portsOutCall);
      expect(portsOutCall).toBeLessThan(portsInCall);
    });
  });

  describe('error handling', () => {
    it('should throw TypeError when context is null', () => {
      expect(() => getDI(null as any)).toThrow(TypeError);
      expect(() => getDI(null as any)).toThrow(
        'Context parameter is required for dependency injection setup'
      );
    });

    it('should throw TypeError when context is undefined', () => {
      expect(() => getDI(undefined as any)).toThrow(TypeError);
      expect(() => getDI(undefined as any)).toThrow(
        'Context parameter is required for dependency injection setup'
      );
    });

    it('should throw enhanced error when ConfigurationImpl fails', () => {
      const configError = new Error('Configuration setup failed');
      (ConfigurationImpl as any).mockImplementation(() => {
        throw configError;
      });

      expect(() => getDI(mockContext)).toThrow(
        'Failed to initialize dependency injection container: Configuration setup failed. Please check that all required environment variables and bindings are configured.'
      );
    });

    it('should throw enhanced error when PortsOutImpl fails', () => {
      const portsOutError = new Error('PortsOut setup failed');
      (PortsOutImpl as any).mockImplementation(() => {
        throw portsOutError;
      });

      expect(() => getDI(mockContext)).toThrow(
        'Failed to initialize dependency injection container: PortsOut setup failed. Please check that all required environment variables and bindings are configured.'
      );
    });

    it('should throw enhanced error when PortsInputImpl fails', () => {
      const portsInError = new Error('PortsIn setup failed');
      (PortsInputImpl as any).mockImplementation(() => {
        throw portsInError;
      });

      expect(() => getDI(mockContext)).toThrow(
        'Failed to initialize dependency injection container: PortsIn setup failed. Please check that all required environment variables and bindings are configured.'
      );
    });

    it('should handle non-Error objects thrown during setup', () => {
      (ConfigurationImpl as any).mockImplementation(() => {
        throw 'String error';
      });

      expect(() => getDI(mockContext)).toThrow(
        'Failed to initialize dependency injection container: Unknown error. Please check that all required environment variables and bindings are configured.'
      );
    });
  });

  describe('integration', () => {
    it('should work with actual constructors when no errors occur', () => {
      // Restore actual classes by disabling mocks
      vi.mocked(ConfigurationImpl).mockRestore?.();
      vi.mocked(PortsOutImpl).mockRestore?.();
      vi.mocked(PortsInputImpl).mockRestore?.();

      expect(() => getDI(mockContext)).not.toThrow();
    });
  });
});
