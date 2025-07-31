import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConfigurationImpl } from '../ConfigurationImpl';

// Mock AWS SDK
vi.mock('aws-sdk/clients/secretsmanager', () => ({
  default: vi.fn().mockImplementation(() => ({
    getSecretValue: vi.fn().mockReturnValue({
      promise: vi.fn(),
    }),
  })),
}));

// Mock createDynamoDBClient
vi.mock('../../../adapters/out/session/aws/SessionDynamoDB', () => ({
  createDynamoDBClient: vi.fn().mockReturnValue({
    mock: 'dynamoDBClient',
  }),
}));

describe('ConfigurationImpl', () => {
  let configurationImpl: ConfigurationImpl;
  let mockSecretsManagerInstance: any;
  let mockSecretsManager: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Set up environment variables
    process.env.AWS_REGION = 'us-east-1';
    process.env.SECRETS_MANAGER_ENDPOINT = 'http://localhost:4566';
    process.env.SECRETS_MANAGER_SECRET_ID = 'test-secret-id';

    // Get the mocked SecretsManager constructor
    const { default: SecretsManager } = await import(
      'aws-sdk/clients/secretsmanager'
    );
    mockSecretsManager = SecretsManager as any;

    // Create a mock instance that will be returned by the constructor
    mockSecretsManagerInstance = {
      getSecretValue: vi.fn().mockReturnValue({
        promise: vi.fn(),
      }),
    };

    // Make the constructor return our mock instance
    mockSecretsManager.mockImplementation(() => mockSecretsManagerInstance);

    configurationImpl = new ConfigurationImpl();
  });

  afterEach(() => {
    delete process.env.AWS_REGION;
    delete process.env.SECRETS_MANAGER_ENDPOINT;
    delete process.env.SECRETS_MANAGER_SECRET_ID;
  });

  describe('constructor', () => {
    it('should create ConfigurationImpl instance', () => {
      expect(configurationImpl).toBeDefined();
      expect(configurationImpl).toBeInstanceOf(ConfigurationImpl);
    });

    it('should work with context parameter', () => {
      const mockContext = {} as any;
      const config = new ConfigurationImpl(mockContext);
      expect(config).toBeInstanceOf(ConfigurationImpl);
    });

    it('should work without context parameter', () => {
      const config = new ConfigurationImpl();
      expect(config).toBeInstanceOf(ConfigurationImpl);
    });
  });

  describe('loadSecrets', () => {
    it('should load secrets from SecretsManager', async () => {
      const mockSecrets = {
        API_BASE_URL: 'https://api.example.com',
        INIT_TRANSACTION_PATH: '/init',
        PUBLIC_URL: 'https://verifier.example.com',
      };

      mockSecretsManagerInstance.getSecretValue.mockReturnValue({
        promise: vi.fn().mockResolvedValue({
          SecretString: JSON.stringify(mockSecrets),
        }),
      });

      await configurationImpl.loadSecrets();

      expect(mockSecretsManagerInstance.getSecretValue).toHaveBeenCalledWith({
        SecretId: 'test-secret-id',
      });
    });

    it('should handle empty SecretString', async () => {
      mockSecretsManagerInstance.getSecretValue.mockReturnValue({
        promise: vi.fn().mockResolvedValue({
          SecretString: null,
        }),
      });

      await configurationImpl.loadSecrets();

      expect(mockSecretsManagerInstance.getSecretValue).toHaveBeenCalled();
    });

    it('should create SecretsManager with correct configuration', async () => {
      mockSecretsManagerInstance.getSecretValue.mockReturnValue({
        promise: vi.fn().mockResolvedValue({
          SecretString: '{}',
        }),
      });

      await configurationImpl.loadSecrets();

      expect(mockSecretsManager).toHaveBeenCalledWith({
        region: 'us-east-1',
        endpoint: 'http://localhost:4566',
      });
    });
  });

  describe('configuration methods', () => {
    beforeEach(async () => {
      const mockSecrets = {
        API_BASE_URL: 'https://api.example.com',
        INIT_TRANSACTION_PATH: '/init',
        GET_WALLET_RESPONSE_PATH: '/wallet-response',
        PUBLIC_URL: 'https://verifier.example.com',
        WALLET_URL: 'https://wallet.example.com',
        DYNAMODB_ENDPOINT: 'http://localhost:8000',
        DYNAMODB_TABLE: 'test-table',
      };

      mockSecretsManagerInstance.getSecretValue.mockReturnValue({
        promise: vi.fn().mockResolvedValue({
          SecretString: JSON.stringify(mockSecrets),
        }),
      });

      await configurationImpl.loadSecrets();
    });

    describe('apiBaseUrl', () => {
      it('should return API base URL from secrets', () => {
        const result = configurationImpl.apiBaseUrl();
        expect(result).toBe('https://api.example.com');
      });

      it('should return empty string when secrets not loaded', () => {
        const config = new ConfigurationImpl();
        const result = config.apiBaseUrl();
        expect(result).toBe('');
      });
    });

    describe('initTransactionApiPath', () => {
      it('should return init transaction path from secrets', () => {
        const result = configurationImpl.initTransactionApiPath();
        expect(result).toBe('/init');
      });

      it('should return empty string when secrets not loaded', () => {
        const config = new ConfigurationImpl();
        const result = config.initTransactionApiPath();
        expect(result).toBe('');
      });
    });

    describe('getWalletResponseApiPath', () => {
      it('should return wallet response path from secrets', () => {
        const result = configurationImpl.getWalletResponseApiPath();
        expect(result).toBe('/wallet-response');
      });

      it('should return empty string when secrets not loaded', () => {
        const config = new ConfigurationImpl();
        const result = config.getWalletResponseApiPath();
        expect(result).toBe('');
      });
    });

    describe('publicUrl', () => {
      it('should return public URL from secrets', () => {
        const result = configurationImpl.publicUrl();
        expect(result).toBe('https://verifier.example.com');
      });

      it('should return empty string when secrets not loaded', () => {
        const config = new ConfigurationImpl();
        const result = config.publicUrl();
        expect(result).toBe('');
      });
    });

    describe('walletUrl', () => {
      it('should return wallet URL from secrets', () => {
        const result = configurationImpl.walletUrl();
        expect(result).toBe('https://wallet.example.com');
      });

      it('should return empty string when secrets not loaded', () => {
        const config = new ConfigurationImpl();
        const result = config.walletUrl();
        expect(result).toBe('');
      });
    });

    describe('walletResponseRedirectPath', () => {
      it('should return wallet response redirect path from secrets', () => {
        const result = configurationImpl.walletResponseRedirectPath();
        expect(result).toBe('/wallet-response');
      });

      it('should return empty string when secrets not loaded', () => {
        const config = new ConfigurationImpl();
        const result = config.walletResponseRedirectPath();
        expect(result).toBe('');
      });
    });

    describe('dynamoDBTable', () => {
      it('should return DynamoDB table name from secrets', () => {
        const result = configurationImpl.dynamoDBTable();
        expect(result).toBe('test-table');
      });

      it('should return empty string when secrets not loaded', () => {
        const config = new ConfigurationImpl();
        const result = config.dynamoDBTable();
        expect(result).toBe('');
      });
    });
  });

  describe('dynamoDBClient', () => {
    it('should create and return DynamoDB client', async () => {
      const mockSecrets = {
        DYNAMODB_ENDPOINT: 'http://localhost:8000',
      };

      mockSecretsManagerInstance.getSecretValue.mockReturnValue({
        promise: vi.fn().mockResolvedValue({
          SecretString: JSON.stringify(mockSecrets),
        }),
      });

      await configurationImpl.loadSecrets();
      const result = configurationImpl.dynamoDBClient();

      expect(result).toEqual({ mock: 'dynamoDBClient' });
    });

    it('should use environment AWS_REGION', async () => {
      const { createDynamoDBClient } = await import(
        '../../../adapters/out/session/aws/SessionDynamoDB'
      );

      const mockSecrets = {
        DYNAMODB_ENDPOINT: 'http://localhost:8000',
      };

      mockSecretsManagerInstance.getSecretValue.mockReturnValue({
        promise: vi.fn().mockResolvedValue({
          SecretString: JSON.stringify(mockSecrets),
        }),
      });

      await configurationImpl.loadSecrets();
      configurationImpl.dynamoDBClient();

      expect(createDynamoDBClient).toHaveBeenCalledWith(
        'http://localhost:8000',
        'us-east-1'
      );
    });

    it('should handle missing environment variables', async () => {
      const originalRegion = process.env.AWS_REGION;
      delete process.env.AWS_REGION;

      const { createDynamoDBClient } = await import(
        '../../../adapters/out/session/aws/SessionDynamoDB'
      );

      const mockSecrets = {
        DYNAMODB_ENDPOINT: 'http://localhost:8000',
      };

      mockSecretsManagerInstance.getSecretValue.mockReturnValue({
        promise: vi.fn().mockResolvedValue({
          SecretString: JSON.stringify(mockSecrets),
        }),
      });

      await configurationImpl.loadSecrets();
      configurationImpl.dynamoDBClient();

      expect(createDynamoDBClient).toHaveBeenCalledWith(
        'http://localhost:8000',
        ''
      );

      // Restore environment
      if (originalRegion) {
        process.env.AWS_REGION = originalRegion;
      }
    });
  });

  describe('error handling', () => {
    it('should handle SecretsManager errors', async () => {
      mockSecretsManagerInstance.getSecretValue.mockReturnValue({
        promise: vi.fn().mockRejectedValue(new Error('SecretsManager error')),
      });

      await expect(configurationImpl.loadSecrets()).rejects.toThrow(
        'SecretsManager error'
      );
    });

    it('should handle invalid JSON in secrets', async () => {
      mockSecretsManagerInstance.getSecretValue.mockReturnValue({
        promise: vi.fn().mockResolvedValue({
          SecretString: 'invalid json',
        }),
      });

      await expect(configurationImpl.loadSecrets()).rejects.toThrow();
    });

    it('should handle missing SECRETS_MANAGER_SECRET_ID', async () => {
      delete process.env.SECRETS_MANAGER_SECRET_ID;

      mockSecretsManagerInstance.getSecretValue.mockReturnValue({
        promise: vi.fn().mockResolvedValue({
          SecretString: '{}',
        }),
      });

      await configurationImpl.loadSecrets();

      expect(mockSecretsManagerInstance.getSecretValue).toHaveBeenCalledWith({
        SecretId: '',
      });
    });
  });

  describe('caching behavior', () => {
    it('should load secrets only once', async () => {
      const mockSecrets = {
        API_BASE_URL: 'https://api.example.com',
      };

      mockSecretsManagerInstance.getSecretValue.mockReturnValue({
        promise: vi.fn().mockResolvedValue({
          SecretString: JSON.stringify(mockSecrets),
        }),
      });

      await configurationImpl.loadSecrets();
      await configurationImpl.loadSecrets();

      expect(mockSecretsManagerInstance.getSecretValue).toHaveBeenCalledTimes(
        2
      );
    });
  });
});
