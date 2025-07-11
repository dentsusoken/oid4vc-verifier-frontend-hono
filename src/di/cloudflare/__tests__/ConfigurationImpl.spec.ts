import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConfigurationImpl } from '../ConfigurationImpl';
import { Context } from 'hono';
import { CloudflareEnv } from '../../../env';
import { DEVELOPMENT_LOGGER_CONFIG } from 'oid4vc-verifier-frontend-core';

describe('ConfigurationImpl', () => {
  let mockContext: Partial<Context<CloudflareEnv>>;
  let config: ConfigurationImpl;

  const mockEnv = {
    API_BASE_URL: 'https://api.example.com',
    INIT_TRANSACTION_PATH: '/init',
    GET_WALLET_RESPONSE_PATH: '/wallet-response',
    PUBLIC_URL: 'https://verifier.example.com',
    WALLET_URL: 'https://wallet.example.com',
    PRESENTATION_ID_KV: {} as KVNamespace,
    BACKEND: {} as Service,
  };

  beforeEach(() => {
    mockContext = {
      env: mockEnv,
    };
    config = new ConfigurationImpl(mockContext as Context<CloudflareEnv>);
  });

  describe('constructor', () => {
    it('should create instance with context', () => {
      expect(config).toBeInstanceOf(ConfigurationImpl);
    });

    it('should create instance without context', () => {
      const configWithoutContext = new ConfigurationImpl();
      expect(configWithoutContext).toBeInstanceOf(ConfigurationImpl);
    });
  });

  describe('apiBaseUrl', () => {
    it('should return API base URL from environment', () => {
      const result = config.apiBaseUrl();
      expect(result).toBe('https://api.example.com');
    });

    it('should return empty string when context is undefined', () => {
      const configWithoutContext = new ConfigurationImpl();
      const result = configWithoutContext.apiBaseUrl();
      expect(result).toBe('');
    });
  });

  describe('initTransactionApiPath', () => {
    it('should return init transaction API path from environment', () => {
      const result = config.initTransactionApiPath();
      expect(result).toBe('/init');
    });

    it('should return empty string when context is undefined', () => {
      const configWithoutContext = new ConfigurationImpl();
      const result = configWithoutContext.initTransactionApiPath();
      expect(result).toBe('');
    });
  });

  describe('getWalletResponseApiPath', () => {
    it('should return wallet response API path from environment', () => {
      const result = config.getWalletResponseApiPath();
      expect(result).toBe('/wallet-response');
    });

    it('should return empty string when context is undefined', () => {
      const configWithoutContext = new ConfigurationImpl();
      const result = configWithoutContext.getWalletResponseApiPath();
      expect(result).toBe('');
    });
  });

  describe('publicUrl', () => {
    it('should return public URL from environment', () => {
      const result = config.publicUrl();
      expect(result).toBe('https://verifier.example.com');
    });

    it('should return empty string when context is undefined', () => {
      const configWithoutContext = new ConfigurationImpl();
      const result = configWithoutContext.publicUrl();
      expect(result).toBe('');
    });
  });

  describe('walletUrl', () => {
    it('should return wallet URL from environment', () => {
      const result = config.walletUrl();
      expect(result).toBe('https://wallet.example.com');
    });

    it('should return empty string when context is undefined', () => {
      const configWithoutContext = new ConfigurationImpl();
      const result = configWithoutContext.walletUrl();
      expect(result).toBe('');
    });
  });

  describe('walletResponseRedirectPath', () => {
    it('should return wallet response redirect path from environment', () => {
      const result = config.walletResponseRedirectPath();
      expect(result).toBe('/wallet-response');
    });

    it('should return empty string when context is undefined', () => {
      const configWithoutContext = new ConfigurationImpl();
      const result = configWithoutContext.walletResponseRedirectPath();
      expect(result).toBe('');
    });
  });

  describe('loggerConfig', () => {
    it('should return development logger config', () => {
      const result = config.loggerConfig();
      expect(result).toBe(DEVELOPMENT_LOGGER_CONFIG);
    });
  });
});
