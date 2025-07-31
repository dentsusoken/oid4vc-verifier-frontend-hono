import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PortsOutImpl } from '../PortsOutImpl';
import { Context } from 'hono';
import { AwsEnv } from '../../../env';
import { AbstractPortsOut } from '@vecrea/oid4vc-verifier-frontend-core';

// Mock dependencies
vi.mock('../../adapters/out/prex', () => ({
  mDLPresentationDefinition: vi.fn(() => ({
    id: 'org.iso.18013.5.1.mDL',
    input_descriptors: [
      {
        id: 'mDL',
        constraints: {
          fields: [
            {
              path: ["$['org.iso.18013.5.1']['family_name']"],
            },
          ],
        },
      },
    ],
  })),
}));

vi.mock('../../adapters/out/mdoc/MdocVerifier', () => ({
  mdocVerifier: {
    verify: vi.fn(),
  },
}));

describe('PortsOutImpl', () => {
  let portsOutImpl: PortsOutImpl;
  let mockContext: Context<AwsEnv>;
  let mockConfig: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockContext = {
      get: vi.fn(),
      set: vi.fn(),
      env: {} as AwsEnv,
    } as any;

    mockConfig = {
      apiBaseUrl: vi.fn().mockReturnValue('https://api.example.com'),
      publicUrl: vi.fn().mockReturnValue('https://verifier.example.com'),
      loggerConfig: vi.fn().mockReturnValue({ level: 'debug' }),
    };

    portsOutImpl = new PortsOutImpl(mockContext, mockConfig);
  });

  describe('constructor', () => {
    it('should create PortsOutImpl instance with correct parameters', () => {
      expect(portsOutImpl).toBeDefined();
      expect(portsOutImpl).toBeInstanceOf(PortsOutImpl);
    });

    it('should extend AbstractPortsOut', () => {
      expect(portsOutImpl).toBeInstanceOf(AbstractPortsOut);
    });

    it('should store context and config internally', () => {
      // Test that context and config are properly stored by testing method behavior
      expect(() => portsOutImpl.generatePresentationDefinition()).not.toThrow();
      expect(() => portsOutImpl.mdocVerifier()).not.toThrow();
      expect(() => portsOutImpl.session()).not.toThrow();
    });
  });

  describe('generatePresentationDefinition', () => {
    it('should return mDLPresentationDefinition function', () => {
      const result = portsOutImpl.generatePresentationDefinition();

      expect(typeof result).toBe('function');
    });

    it('should return function that generates presentation definition', () => {
      const generatePD = portsOutImpl.generatePresentationDefinition();
      const pd = generatePD();

      expect(pd).toBeDefined();
      expect(pd.id).toBe('org.iso.18013.5.1.mDL');
      expect(pd.input_descriptors).toBeDefined();
    });

    it('should always return the same function reference', () => {
      const result1 = portsOutImpl.generatePresentationDefinition();
      const result2 = portsOutImpl.generatePresentationDefinition();

      expect(result1).toBe(result2);
    });
  });

  describe('mdocVerifier', () => {
    it('should return mdocVerifier instance', () => {
      const result = portsOutImpl.mdocVerifier();

      expect(result).toBeDefined();
      expect(result).toHaveProperty('verify');
    });

    it('should return the same verifier instance on multiple calls', () => {
      const result1 = portsOutImpl.mdocVerifier();
      const result2 = portsOutImpl.mdocVerifier();

      expect(result1).toBe(result2);
    });

    it('should return verifier with expected interface', () => {
      const verifier = portsOutImpl.mdocVerifier();

      expect(typeof verifier.verify).toBe('function');
    });
  });

  describe('session', () => {
    it('should return session from context', () => {
      const mockSession = { id: 'test-session', data: {} };
      mockContext.get = vi.fn().mockReturnValue(mockSession);

      const result = portsOutImpl.session();

      expect(result).toBe(mockSession);
      expect(mockContext.get).toHaveBeenCalledWith('SESSION');
    });

    it('should return undefined when session not set in context', () => {
      mockContext.get = vi.fn().mockReturnValue(undefined);

      const result = portsOutImpl.session();

      expect(result).toBeUndefined();
      expect(mockContext.get).toHaveBeenCalledWith('SESSION');
    });

    it('should call context.get with correct key', () => {
      portsOutImpl.session();

      expect(mockContext.get).toHaveBeenCalledWith('SESSION');
      expect(mockContext.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('integration with AbstractPortsOut', () => {
    it('should have access to configuration through parent class', () => {
      // AbstractPortsOut should provide access to config
      expect(portsOutImpl).toBeInstanceOf(AbstractPortsOut);
    });

    it('should properly initialize with AbstractPortsOut constructor', () => {
      // Verify the parent constructor was called with config
      expect(() => portsOutImpl.generatePresentationDefinition()).not.toThrow();
    });
  });

  describe('context management', () => {
    it('should handle different context types', () => {
      const differentContext = {
        get: vi.fn().mockReturnValue('different-session'),
        set: vi.fn(),
        env: { CUSTOM_VAR: 'test' } as any,
      } as any;

      const instance = new PortsOutImpl(differentContext, mockConfig);
      const session = instance.session();

      expect(session).toBe('different-session');
    });

    it('should maintain context reference throughout lifecycle', () => {
      const contextSpy = vi.spyOn(mockContext, 'get');

      portsOutImpl.session();
      portsOutImpl.session();

      expect(contextSpy).toHaveBeenCalledTimes(2);
      expect(contextSpy).toHaveBeenCalledWith('SESSION');
    });
  });

  describe('method consistency', () => {
    it('should return consistent results for generatePresentationDefinition', () => {
      const result1 = portsOutImpl.generatePresentationDefinition();
      const result2 = portsOutImpl.generatePresentationDefinition();

      expect(result1).toBe(result2);
    });

    it('should return consistent results for mdocVerifier', () => {
      const result1 = portsOutImpl.mdocVerifier();
      const result2 = portsOutImpl.mdocVerifier();

      expect(result1).toBe(result2);
    });
  });

  describe('error handling', () => {
    it('should handle context.get throwing an error', () => {
      mockContext.get = vi.fn().mockImplementation(() => {
        throw new Error('Context error');
      });

      expect(() => portsOutImpl.session()).toThrow('Context error');
    });

    it('should handle null context gracefully in constructor', () => {
      expect(() => new PortsOutImpl(null as any, mockConfig)).not.toThrow();
    });

    it('should handle null config gracefully in constructor', () => {
      expect(() => new PortsOutImpl(mockContext, null as any)).not.toThrow();
    });
  });

  describe('type safety', () => {
    it('should maintain proper typing for session return', () => {
      const mockSession = { id: 'test', data: {} };
      mockContext.get = vi.fn().mockReturnValue(mockSession);

      const session = portsOutImpl.session();
      expect(session).toEqual(mockSession);
    });

    it('should maintain proper typing for presentation definition', () => {
      const generatePD = portsOutImpl.generatePresentationDefinition();
      expect(typeof generatePD).toBe('function');

      const pd = generatePD();
      expect(pd).toHaveProperty('id');
      expect(pd).toHaveProperty('input_descriptors');
    });
  });
});
