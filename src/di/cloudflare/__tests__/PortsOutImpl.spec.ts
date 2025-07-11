import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PortsOutImpl } from '../PortsOutImpl';
import { Context } from 'hono';
import { CloudflareEnv } from '../../../env';
import { Configuration } from 'oid4vc-verifier-frontend-core';

describe('PortsOutImpl', () => {
  let mockContext: Partial<Context<CloudflareEnv>>;
  let mockConfig: Configuration;
  let portsOut: PortsOutImpl;
  let mockSession: any;

  beforeEach(() => {
    mockSession = {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
    };

    mockContext = {
      get: vi.fn().mockReturnValue(mockSession),
      env: {
        PRESENTATION_ID_KV: {} as KVNamespace,
        BACKEND: {} as Service,
      } as any,
    };

    mockConfig = {
      apiBaseUrl: vi.fn().mockReturnValue('https://api.example.com'),
      initTransactionApiPath: vi.fn().mockReturnValue('/init'),
      getWalletResponseApiPath: vi.fn().mockReturnValue('/wallet-response'),
      publicUrl: vi.fn().mockReturnValue('https://verifier.example.com'),
      walletUrl: vi.fn().mockReturnValue('https://wallet.example.com'),
      walletResponseRedirectPath: vi.fn().mockReturnValue('/wallet-response'),
      loggerConfig: vi.fn().mockReturnValue({
        level: 'info',
        types: ['console'],
      }),
    } as any;

    portsOut = new PortsOutImpl(
      mockContext as Context<CloudflareEnv>,
      mockConfig,
    );
  });

  describe('constructor', () => {
    it('should create instance with provided context and config', () => {
      expect(portsOut).toBeInstanceOf(PortsOutImpl);
    });
  });

  describe('generatePresentationDefinition', () => {
    it('should return mDL presentation definition', () => {
      const result = portsOut.generatePresentationDefinition();

      // mDLPresentationDefinition is imported from external module,
      // verify that it has an actual value (could be function or object)
      expect(result).toBeDefined();
      expect(typeof result === 'object' || typeof result === 'function').toBe(
        true,
      );
    });
  });

  describe('mdocVerifier', () => {
    it('should return mdoc verifier', () => {
      const result = portsOut.mdocVerifier();

      // mdocVerifier is imported from external module,
      // verify that it has an actual value
      expect(result).toBeDefined();
    });
  });

  describe('session', () => {
    it('should return session from context', () => {
      const result = portsOut.session();

      expect(result).toBe(mockSession);
      expect(mockContext.get).toHaveBeenCalledWith('SESSION');
    });
  });
});
