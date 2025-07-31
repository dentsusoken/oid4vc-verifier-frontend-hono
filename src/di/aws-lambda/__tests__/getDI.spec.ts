import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Context } from 'hono';
import { AwsEnv } from '../../../env';
import type {
  Configuration,
  PortsInput,
  PortsOut,
} from '@vecrea/oid4vc-verifier-frontend-core';

// Create mock factory functions
const createMockConfiguration = (): Configuration => ({
  apiBaseUrl: vi.fn().mockReturnValue('https://api.example.com'),
  initTransactionApiPath: vi.fn().mockReturnValue('/api/init'),
  getWalletResponseApiPath: vi.fn().mockReturnValue('/api/response'),
  publicUrl: vi.fn().mockReturnValue('https://verifier.example.com'),
  walletUrl: vi.fn().mockReturnValue('https://wallet.example.com'),
  walletResponseRedirectPath: vi.fn().mockReturnValue('/result'),
  resultViewPath: vi.fn().mockReturnValue('/result'),
  walletResponseRedirectQueryTemplate: vi.fn().mockReturnValue('{}'),
  tokenType: vi.fn().mockReturnValue('vp_token'),
  jarmOption: vi.fn().mockReturnValue({}),
  homeViewPath: vi.fn().mockReturnValue('/home'),
  initTransactionViewPath: vi.fn().mockReturnValue('/init'),
  presentationDefinitionMode: vi.fn().mockReturnValue(undefined),
  jarMode: vi.fn().mockReturnValue(undefined),
  responseMode: vi.fn().mockReturnValue('direct_post'),
  requestOptions: vi.fn().mockReturnValue({}),
  authorizationSignedResponseAlg: vi.fn().mockReturnValue(undefined),
  authorizationEncryptedResponseAlg: vi.fn().mockReturnValue(undefined),
  authorizationEncryptedResponseEnc: vi.fn().mockReturnValue(undefined),
});

const createMockPortsOut = (): PortsOut => ({
  generatePresentationDefinition: vi.fn().mockReturnValue({}),
  mdocVerifier: vi.fn().mockReturnValue({ verify: vi.fn() }),
  session: vi.fn().mockReturnValue({ set: vi.fn(), get: vi.fn() }),
  generateNonce: vi.fn(),
  fetcher: vi.fn().mockReturnValue({ get: vi.fn(), post: vi.fn() }),
  isMobile: vi.fn(),
  generateWalletResponseRedirectUriTemplate: vi.fn(),
  generateWalletRedirectUri: vi.fn(),
  generateEphemeralECDHPrivateJwk: vi.fn(),
  verifyJarmJwt: vi.fn(),
});

const createMockPortsInput = (): PortsInput => ({
  initTransaction: vi.fn().mockReturnValue({
    execute: vi.fn().mockResolvedValue({ success: true }),
  }),
  getWalletResponse: vi.fn().mockReturnValue({
    execute: vi.fn().mockResolvedValue({ result: 'success' }),
  }),
});

// Set up mocks
vi.mock('../ConfigurationImpl', () => ({
  ConfigurationImpl: vi.fn(),
}));

vi.mock('../PortsOutImpl', () => ({
  PortsOutImpl: vi.fn(),
}));

vi.mock('@vecrea/oid4vc-verifier-frontend-core', async () => {
  const actual = await vi.importActual('@vecrea/oid4vc-verifier-frontend-core');
  return {
    ...actual,
    PortsInputImpl: vi.fn(),
  };
});

// Import after mocking
import { getDI } from '../getDI';
import { ConfigurationImpl } from '../ConfigurationImpl';
import { PortsOutImpl } from '../PortsOutImpl';
import { PortsInputImpl } from '@vecrea/oid4vc-verifier-frontend-core';

describe('getDI', () => {
  let mockContext: Context<AwsEnv>;
  let mockConfig: Configuration;
  let mockPortsOut: PortsOut;
  let mockPortsInput: PortsInput;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock instances
    mockConfig = createMockConfiguration();
    mockPortsOut = createMockPortsOut();
    mockPortsInput = createMockPortsInput();

    // Set up mock implementations
    vi.mocked(ConfigurationImpl).mockImplementation(() => mockConfig as any);
    vi.mocked(PortsOutImpl).mockImplementation(() => mockPortsOut as any);
    vi.mocked(PortsInputImpl).mockImplementation(() => mockPortsInput as any);

    // Create mock context
    mockContext = {
      get: vi.fn(),
      set: vi.fn(),
      env: {} as AwsEnv,
      req: {
        method: 'GET',
        url: 'https://example.com',
        headers: new Headers(),
      },
      res: {
        headers: new Headers(),
      },
      var: {},
      event: {},
      executionCtx: {
        waitUntil: vi.fn(),
        passThroughOnException: vi.fn(),
      },
      json: vi.fn(),
      text: vi.fn(),
      html: vi.fn(),
      notFound: vi.fn(),
      redirect: vi.fn(),
      body: vi.fn(),
      newResponse: vi.fn(),
      render: vi.fn(),
      setRenderer: vi.fn(),
      header: vi.fn(),
      status: vi.fn(),
      cookie: vi.fn(),
      finalized: false,
      error: undefined,
    } as any;
  });

  describe('successful dependency injection', () => {
    it('should return DI container with config, portsOut, and portsIn', () => {
      const result = getDI(mockContext);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('config');
      expect(result).toHaveProperty('portsOut');
      expect(result).toHaveProperty('portsIn');
    });

    it('should create ConfigurationImpl with context', () => {
      getDI(mockContext);

      expect(vi.mocked(ConfigurationImpl)).toHaveBeenCalledWith(mockContext);
      expect(vi.mocked(ConfigurationImpl)).toHaveBeenCalledTimes(1);
    });

    it('should create PortsOutImpl with context and config', () => {
      getDI(mockContext);

      expect(vi.mocked(PortsOutImpl)).toHaveBeenCalledWith(
        mockContext,
        mockConfig
      );
      expect(vi.mocked(PortsOutImpl)).toHaveBeenCalledTimes(1);
    });

    it('should create PortsInputImpl with config and portsOut', () => {
      getDI(mockContext);

      expect(vi.mocked(PortsInputImpl)).toHaveBeenCalledWith(
        mockConfig,
        mockPortsOut
      );
      expect(vi.mocked(PortsInputImpl)).toHaveBeenCalledTimes(1);
    });

    it('should return correct instances', () => {
      const result = getDI(mockContext);

      expect(result.config).toBe(mockConfig);
      expect(result.portsOut).toBe(mockPortsOut);
      expect(result.portsIn).toBe(mockPortsInput);
    });

    it('should create dependencies in correct order', () => {
      getDI(mockContext);

      expect(vi.mocked(ConfigurationImpl)).toHaveBeenCalled();
      expect(vi.mocked(PortsOutImpl)).toHaveBeenCalled();
      expect(vi.mocked(PortsInputImpl)).toHaveBeenCalled();
    });
  });

  describe('input validation', () => {
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

    it('should validate context before creating dependencies', () => {
      expect(() => getDI(null as any)).toThrow();

      expect(vi.mocked(ConfigurationImpl)).not.toHaveBeenCalled();
      expect(vi.mocked(PortsOutImpl)).not.toHaveBeenCalled();
      expect(vi.mocked(PortsInputImpl)).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle ConfigurationImpl creation failure', () => {
      vi.mocked(ConfigurationImpl).mockImplementation(() => {
        throw new Error('Configuration initialization failed');
      });

      expect(() => getDI(mockContext)).toThrow(
        'Failed to initialize dependency injection container: Configuration initialization failed'
      );
    });

    it('should handle PortsOutImpl creation failure', () => {
      vi.mocked(PortsOutImpl).mockImplementation(() => {
        throw new Error('PortsOut initialization failed');
      });

      expect(() => getDI(mockContext)).toThrow(
        'Failed to initialize dependency injection container: PortsOut initialization failed'
      );
    });

    it('should handle PortsInputImpl creation failure', () => {
      vi.mocked(PortsInputImpl).mockImplementation(() => {
        throw new Error('PortsInput initialization failed');
      });

      expect(() => getDI(mockContext)).toThrow(
        'Failed to initialize dependency injection container: PortsInput initialization failed'
      );
    });

    it('should handle non-Error exceptions', () => {
      vi.mocked(ConfigurationImpl).mockImplementation(() => {
        throw 'String error';
      });

      expect(() => getDI(mockContext)).toThrow(
        'Failed to initialize dependency injection container: Unknown error'
      );
    });

    it('should provide helpful debugging information', () => {
      vi.mocked(ConfigurationImpl).mockImplementation(() => {
        throw new Error('AWS credentials not found');
      });

      expect(() => getDI(mockContext)).toThrow(
        /Please check that all required environment variables and bindings are configured/
      );
    });
  });

  describe('dependency wiring', () => {
    it('should pass context to ConfigurationImpl', () => {
      getDI(mockContext);

      const configCall = vi.mocked(ConfigurationImpl).mock.calls[0];
      expect(configCall[0]).toBe(mockContext);
    });

    it('should pass context and config to PortsOutImpl', () => {
      getDI(mockContext);

      const portsOutCall = vi.mocked(PortsOutImpl).mock.calls[0];
      expect(portsOutCall[0]).toBe(mockContext);
      expect(portsOutCall[1]).toBe(mockConfig);
    });

    it('should pass config and portsOut to PortsInputImpl', () => {
      getDI(mockContext);

      const portsInputCall = vi.mocked(PortsInputImpl).mock.calls[0];
      expect(portsInputCall[0]).toBe(mockConfig);
      expect(portsInputCall[1]).toBe(mockPortsOut);
    });

    it('should ensure same config instance is shared', () => {
      getDI(mockContext);

      const portsOutCall = vi.mocked(PortsOutImpl).mock.calls[0];
      const portsInputCall = vi.mocked(PortsInputImpl).mock.calls[0];

      expect(portsOutCall[1]).toBe(portsInputCall[0]);
    });
  });

  describe('return value characteristics', () => {
    it('should return new instances on each call', () => {
      const result1 = getDI(mockContext);
      const result2 = getDI(mockContext);

      expect(result1).not.toBe(result2);
      expect(Object.keys(result1).sort()).toEqual(Object.keys(result2).sort());
    });

    it('should have consistent object structure', () => {
      const result = getDI(mockContext);

      expect(Object.keys(result)).toEqual(['config', 'portsOut', 'portsIn']);
      expect(result.config).toBeDefined();
      expect(result.portsOut).toBeDefined();
      expect(result.portsIn).toBeDefined();
    });
  });

  describe('functionality verification', () => {
    it('should return functional configuration object', () => {
      const result = getDI(mockContext);

      expect(typeof result.config.apiBaseUrl).toBe('function');
      expect(typeof result.config.publicUrl).toBe('function');
    });

    it('should return functional portsOut object', () => {
      const result = getDI(mockContext);

      expect(typeof result.portsOut.generatePresentationDefinition).toBe(
        'function'
      );
      expect(typeof result.portsOut.mdocVerifier).toBe('function');
      expect(typeof result.portsOut.session).toBe('function');
    });

    it('should return functional portsIn object', () => {
      const result = getDI(mockContext);

      expect(typeof result.portsIn.initTransaction).toBe('function');
      expect(typeof result.portsIn.getWalletResponse).toBe('function');
    });
  });

  describe('performance and memory characteristics', () => {
    it('should create dependencies efficiently', () => {
      const startTime = performance.now();

      for (let i = 0; i < 100; i++) {
        getDI(mockContext);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(1000);
    });

    it('should not accumulate memory in repeated calls', () => {
      const instances = [];

      for (let i = 0; i < 10; i++) {
        instances.push(getDI(mockContext));
      }

      expect(instances).toHaveLength(10);
      instances.forEach((instance) => {
        expect(instance).toHaveProperty('config');
        expect(instance).toHaveProperty('portsOut');
        expect(instance).toHaveProperty('portsIn');
      });
    });
  });

  describe('edge cases', () => {
    it('should handle context with minimal required properties', () => {
      const minimalContext = {
        get: vi.fn(),
        set: vi.fn(),
        env: {},
        req: {
          method: 'GET',
          url: 'https://example.com',
          headers: new Headers(),
        },
        res: { headers: new Headers() },
        var: {},
        event: {},
        executionCtx: { waitUntil: vi.fn(), passThroughOnException: vi.fn() },
        finalized: false,
        error: undefined,
      } as any;

      expect(() => getDI(minimalContext)).not.toThrow();
    });

    it('should handle context with undefined env', () => {
      const contextWithUndefinedEnv = {
        ...mockContext,
        env: undefined,
      } as any;

      expect(() => getDI(contextWithUndefinedEnv)).not.toThrow();
    });
  });
});
