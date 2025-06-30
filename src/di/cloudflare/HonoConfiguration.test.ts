import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Context } from 'hono';
import {
  HonoConfiguration,
  HonoConfigurationError,
  HonoConfigurationOptions,
} from './HonoConfiguration';
import { CloudflareBindings, CloudflareEnv } from '../../env';

/**
 * Test suite for HonoConfiguration class
 *
 * This test suite validates the configuration management functionality
 * for Cloudflare Workers environment, including error handling,
 * validation, and environment variable processing.
 */
describe('HonoConfiguration', () => {
  let mockContext: Context<CloudflareEnv>;
  let validEnvBindings: CloudflareBindings;

  beforeEach(() => {
    // Setup valid environment bindings for testing
    validEnvBindings = {
      API_BASE_URL: 'https://api.example.com',
      INIT_TRANSACTION_PATH: '/init',
      GET_WALLET_RESPONSE_PATH: '/wallet-response',
      WALLET_URL: 'https://wallet.example.com',
      PUBLIC_URL: 'https://public.example.com',
      PRESENTATION_ID_KV: {} as KVNamespace,
      BACKEND: {} as Service,
    };

    // Create mock Hono context with environment bindings
    mockContext = {
      env: validEnvBindings,
    } as unknown as Context<CloudflareEnv>;

    // Clear any existing console spies
    vi.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should create instance with valid context', () => {
      const config = new HonoConfiguration(mockContext);
      expect(config).toBeInstanceOf(HonoConfiguration);
    });

    it('should create instance without context', () => {
      const config = new HonoConfiguration();
      expect(config).toBeInstanceOf(HonoConfiguration);
    });

    it('should throw TypeError for invalid context', () => {
      expect(() => new HonoConfiguration(null as any)).toThrow(TypeError);
      expect(() => new HonoConfiguration('invalid' as any)).toThrow(TypeError);
    });

    it('should apply custom options correctly', () => {
      const options: HonoConfigurationOptions = {
        validateUrls: false,
        allowEmpty: true,
        enableLogging: true,
      };

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const config = new HonoConfiguration(mockContext, options);

      expect(config).toBeInstanceOf(HonoConfiguration);
      expect(consoleSpy).toHaveBeenCalledWith(
        '[HonoConfiguration] Initialized with options:',
        expect.objectContaining({
          validateUrls: false,
          allowEmpty: true,
          hasContext: true,
        }),
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Environment Variable Retrieval', () => {
    let config: HonoConfiguration;

    beforeEach(() => {
      config = new HonoConfiguration(mockContext);
    });

    it('should return correct API base URL', () => {
      expect(config.getApiBaseUrl()).toBe('https://api.example.com');
    });

    it('should return correct init transaction path', () => {
      expect(config.getInitTransactionPath()).toBe('/init');
    });

    it('should return correct wallet response path', () => {
      expect(config.getGetWalletResponsePath()).toBe('/wallet-response');
    });

    it('should return correct wallet URL', () => {
      expect(config.getWalletUrl()).toBe('https://wallet.example.com');
    });

    it('should return correct public URL', () => {
      expect(config.getPublicUrl()).toBe('https://public.example.com');
    });
  });

  describe('Error Handling', () => {
    it('should throw HonoConfigurationError for missing environment variables', () => {
      const emptyContext = { env: {} } as unknown as Context<CloudflareEnv>;
      const config = new HonoConfiguration(emptyContext);

      expect(() => config.getApiBaseUrl()).toThrow(HonoConfigurationError);
      expect(() => config.getApiBaseUrl()).toThrow('API_BASE_URL');

      try {
        config.getWalletUrl();
      } catch (error) {
        expect(error).toBeInstanceOf(HonoConfigurationError);
        expect((error as HonoConfigurationError).variableName).toBe(
          'WALLET_URL',
        );
        expect((error as HonoConfigurationError).errorType).toBe('missing');
      }
    });

    it('should throw HonoConfigurationError for empty values when not allowed', () => {
      const emptyValueContext = {
        env: { ...validEnvBindings, API_BASE_URL: '' },
      } as unknown as Context<CloudflareEnv>;

      const config = new HonoConfiguration(emptyValueContext, {
        allowEmpty: false,
      });

      expect(() => config.getApiBaseUrl()).toThrow(HonoConfigurationError);
      expect(() => config.getApiBaseUrl()).toThrow('empty');
    });

    it('should allow empty values when configured', () => {
      const emptyValueContext = {
        env: { ...validEnvBindings, INIT_TRANSACTION_PATH: '' },
      } as unknown as Context<CloudflareEnv>;

      const config = new HonoConfiguration(emptyValueContext, {
        allowEmpty: true,
        validateUrls: false,
      });

      expect(config.getInitTransactionPath()).toBe('');
    });

    it('should validate URL format when enabled', () => {
      const invalidUrlContext = {
        env: { ...validEnvBindings, API_BASE_URL: 'not-a-valid-url' },
      } as unknown as Context<CloudflareEnv>;

      const config = new HonoConfiguration(invalidUrlContext, {
        validateUrls: true,
      });

      expect(() => config.getApiBaseUrl()).toThrow(HonoConfigurationError);
      expect(() => config.getApiBaseUrl()).toThrow('invalid URL format');

      try {
        config.getApiBaseUrl();
      } catch (error) {
        expect(error).toBeInstanceOf(HonoConfigurationError);
        expect((error as HonoConfigurationError).errorType).toBe(
          'format_error',
        );
      }
    });

    it('should skip URL validation when disabled', () => {
      const invalidUrlContext = {
        env: { ...validEnvBindings, WALLET_URL: 'not-a-valid-url' },
      } as unknown as Context<CloudflareEnv>;

      const config = new HonoConfiguration(invalidUrlContext, {
        validateUrls: false,
      });

      expect(config.getWalletUrl()).toBe('not-a-valid-url');
    });
  });

  describe('Custom Validation', () => {
    it('should apply custom validators', () => {
      const customValidators = {
        API_BASE_URL: (value: string) => value.includes('secure'),
      };

      const config = new HonoConfiguration(mockContext, {
        customValidators,
        validateUrls: false,
      });

      expect(() => config.getApiBaseUrl()).toThrow(HonoConfigurationError);
      expect(() => config.getApiBaseUrl()).toThrow('failed custom validation');
    });

    it('should pass custom validation with valid values', () => {
      const secureContext = {
        env: {
          ...validEnvBindings,
          API_BASE_URL: 'https://secure.example.com',
        },
      } as unknown as Context<CloudflareEnv>;

      const customValidators = {
        API_BASE_URL: (value: string) => value.includes('secure'),
      };

      const config = new HonoConfiguration(secureContext, {
        customValidators,
        validateUrls: false,
      });

      expect(config.getApiBaseUrl()).toBe('https://secure.example.com');
    });
  });

  describe('Logging', () => {
    it('should log environment variable retrieval when enabled', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const config = new HonoConfiguration(mockContext, {
        enableLogging: true,
      });
      config.getApiBaseUrl();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[HonoConfiguration] Retrieved API_BASE_URL:'),
      );

      consoleSpy.mockRestore();
    });

    it('should not log when logging is disabled', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const config = new HonoConfiguration(mockContext, {
        enableLogging: false,
      });
      config.getApiBaseUrl();

      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Retrieved API_BASE_URL'),
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null environment bindings', () => {
      const nullEnvContext = { env: null } as unknown as Context<CloudflareEnv>;
      const config = new HonoConfiguration(nullEnvContext);

      expect(() => config.getApiBaseUrl()).toThrow(HonoConfigurationError);
    });

    it('should handle undefined environment bindings', () => {
      const undefinedEnvContext = {} as unknown as Context<CloudflareEnv>;
      const config = new HonoConfiguration(undefinedEnvContext);

      expect(() => config.getPublicUrl()).toThrow(HonoConfigurationError);
    });

    it('should handle whitespace-only values', () => {
      const whitespaceContext = {
        env: { ...validEnvBindings, INIT_TRANSACTION_PATH: '   ' },
      } as unknown as Context<CloudflareEnv>;

      const config = new HonoConfiguration(whitespaceContext, {
        allowEmpty: false,
      });

      expect(() => config.getInitTransactionPath()).toThrow(
        HonoConfigurationError,
      );
      expect(() => config.getInitTransactionPath()).toThrow('empty');
    });
  });

  describe('HonoConfigurationError', () => {
    it('should create error with correct properties', () => {
      const error = new HonoConfigurationError(
        'Test error message',
        'TEST_VAR',
        'invalid',
      );

      expect(error.name).toBe('HonoConfigurationError');
      expect(error.message).toBe('Test error message');
      expect(error.variableName).toBe('TEST_VAR');
      expect(error.errorType).toBe('invalid');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(HonoConfigurationError);
    });

    it('should default to missing error type', () => {
      const error = new HonoConfigurationError('Test message', 'TEST_VAR');
      expect(error.errorType).toBe('missing');
    });
  });
});
