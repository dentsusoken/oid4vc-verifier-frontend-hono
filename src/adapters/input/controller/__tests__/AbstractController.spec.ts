import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { FC } from 'hono/jsx';
import { AbstractController } from '../AbstractController';
import { Configuration } from 'oid4vc-verifier-frontend-core';
import { ErrorPageProps } from '../../views';
import { Env } from '../../../../env';

/**
 * Concrete implementation of AbstractController for testing purposes
 */
class TestController extends AbstractController<Env> {
  handler() {
    return vi.fn();
  }
}

/**
 * Mock Configuration implementation for testing
 */
class MockConfiguration implements Configuration {
  homeViewPath(): string {
    return '/test-home';
  }

  // Required abstract methods (not used in these tests but needed for interface compliance)
  apiBaseUrl(): string {
    return 'http://test-api.com';
  }
  initTransactionApiPath(): string {
    return '/init';
  }
  getWalletResponseApiPath(): string {
    return '/response';
  }
  publicUrl(): string {
    return 'http://test-public.com';
  }
  initTransactionViewPath(): string {
    return '/init';
  }
  resultViewPath(): string {
    return '/result';
  }
  walletUrl(): string {
    return 'http://test-wallet.com';
  }
  walletResponseRedirectPath(): string {
    return '/callback';
  }
  walletResponseRedirectQueryTemplate(): string {
    return '{RESPONSE_CODE}';
  }
  tokenType(): any {
    return 'vp_token';
  }
  loggerConfig(): any {
    return {};
  }
  requestOptions(): any {
    return undefined;
  }
  presentationDefinitionMode(): any {
    return undefined;
  }
  presentationType(): any {
    return undefined;
  }
  responseMode(): any {
    return undefined;
  }
  jarMode(): any {
    return undefined;
  }
  jarmOption(): any {
    return undefined;
  }
  authorizationSignedResponseAlg(): any {
    return undefined;
  }
  authorizationEncryptedResponseAlg(): any {
    return undefined;
  }
  authorizationEncryptedResponseEnc(): any {
    return undefined;
  }
  generateNonce(): any {
    return vi.fn();
  }
  generateWalletRedirectUri(): any {
    return vi.fn();
  }
  generateWalletResponseRedirectUriTemplate(): any {
    return vi.fn();
  }
  generatePresentationDefinition(): any {
    return vi.fn();
  }
  isMobile(): any {
    return vi.fn();
  }
  mdocVerifier(): any {
    return undefined;
  }
}

/**
 * Mock error view component for testing
 */
const mockErrorView: FC<ErrorPageProps> = ({ error, homePath }) => {
  return {
    type: 'div',
    props: {
      children: `Error: ${error}, Home: ${homePath}`,
    },
  } as any;
};

/**
 * Mock Context for testing
 */
const createMockContext = (): Context<Env> => {
  const mockResponse = new Response('test');
  return {
    status: vi.fn(),
    render: vi.fn().mockReturnValue(mockResponse),
    req: {
      path: '/test-path',
    },
  } as any;
};

describe('AbstractController', () => {
  let controller: TestController;
  let mockConfig: MockConfiguration;
  let mockContext: Context<Env>;

  // Console spy setup
  let consoleErrorSpy: any;
  let originalNodeEnv: string | undefined;

  beforeEach(() => {
    mockConfig = new MockConfiguration();
    mockContext = createMockContext();
    controller = new TestController(mockErrorView);

    // Setup console spy
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Store original NODE_ENV
    originalNodeEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy.mockRestore();

    // Restore original NODE_ENV
    if (originalNodeEnv !== undefined) {
      process.env.NODE_ENV = originalNodeEnv;
    } else {
      delete process.env.NODE_ENV;
    }
  });

  describe('constructor', () => {
    it('should create instance with valid errorView', () => {
      expect(() => new TestController(mockErrorView)).not.toThrow();
    });

    it('should throw TypeError when errorView is null', () => {
      expect(() => new TestController(null as any)).toThrow(TypeError);
      expect(() => new TestController(null as any)).toThrow(
        'errorView must be a React functional component',
      );
    });

    it('should throw TypeError when errorView is undefined', () => {
      expect(() => new TestController(undefined as any)).toThrow(TypeError);
      expect(() => new TestController(undefined as any)).toThrow(
        'errorView must be a React functional component',
      );
    });

    it('should throw TypeError when errorView is not a function', () => {
      expect(() => new TestController('not-a-function' as any)).toThrow(
        TypeError,
      );
      expect(() => new TestController('not-a-function' as any)).toThrow(
        'errorView must be a React functional component',
      );
    });
  });

  describe('handleError', () => {
    describe('normal cases', () => {
      it('should handle basic Error with default status 500', async () => {
        const error = new Error('Test error message');

        const result = await controller.handleError(
          mockContext,
          mockConfig,
          error,
        );

        expect(mockContext.status).toHaveBeenCalledWith(500);
        expect(mockContext.render).toHaveBeenCalled();
        expect(result).toBeInstanceOf(Response);
      });

      it('should handle string error message', async () => {
        const error = 'String error message';

        const result = await controller.handleError(
          mockContext,
          mockConfig,
          error,
        );

        expect(mockContext.status).toHaveBeenCalledWith(500);
        expect(mockContext.render).toHaveBeenCalled();
        expect(result).toBeInstanceOf(Response);
      });

      it('should use custom status when provided', async () => {
        const error = new Error('Test error');
        const customStatus = 400;

        const result = await controller.handleError(
          mockContext,
          mockConfig,
          error,
          customStatus,
        );

        expect(mockContext.status).toHaveBeenCalledWith(customStatus);
        expect(result).toBeInstanceOf(Response);
      });
    });

    describe('HTTPException handling', () => {
      it('should handle HTTPException with correct status and message', async () => {
        const httpError = new HTTPException(404, { message: 'Not Found' });

        const result = await controller.handleError(
          mockContext,
          mockConfig,
          httpError,
        );

        expect(mockContext.status).toHaveBeenCalledWith(404);
        expect(result).toBeInstanceOf(Response);
      });

      it('should handle HTTPException with different status codes', async () => {
        const httpError = new HTTPException(403, { message: 'Forbidden' });

        const result = await controller.handleError(
          mockContext,
          mockConfig,
          httpError,
        );

        expect(mockContext.status).toHaveBeenCalledWith(403);
        expect(result).toBeInstanceOf(Response);
      });
    });

    describe('error message to status code mapping', () => {
      it.each([
        ['Session expired', 401],
        ['Invalid session', 401],
      ])(
        'should map session errors to 401 status: %s',
        async (errorMessage, expectedStatus) => {
          const error = new Error(errorMessage);

          await controller.handleError(mockContext, mockConfig, error);

          expect(mockContext.status).toHaveBeenCalledWith(expectedStatus);
        },
      );

      it.each([
        ['Invalid input', 400],
        ['Missing parameter', 400],
      ])(
        'should map validation errors to 400 status: %s',
        async (errorMessage, expectedStatus) => {
          const error = new Error(errorMessage);

          await controller.handleError(mockContext, mockConfig, error);

          expect(mockContext.status).toHaveBeenCalledWith(expectedStatus);
        },
      );

      it('should map not found errors to 404 status', async () => {
        const error = new Error('Resource Not found');

        await controller.handleError(mockContext, mockConfig, error);

        expect(mockContext.status).toHaveBeenCalledWith(404);
      });
    });

    describe('development and production environment behavior', () => {
      it('should log detailed error information in development', async () => {
        process.env.NODE_ENV = 'development';
        const error = new Error('Test error for development');

        await controller.handleError(mockContext, mockConfig, error);

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          '[TestController] Error:',
          expect.objectContaining({
            message: 'Test error for development',
            stack: expect.any(String),
            status: 500,
            timestamp: expect.any(String),
          }),
        );
      });

      it('should log sanitized error information in production', async () => {
        process.env.NODE_ENV = 'production';
        const error = new Error('Test error for production');

        await controller.handleError(mockContext, mockConfig, error);

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          '[TestController] Error occurred',
          expect.objectContaining({
            status: 500,
            timestamp: expect.any(String),
          }),
        );

        // Ensure sensitive information is not logged
        expect(consoleErrorSpy).not.toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            message: expect.any(String),
            stack: expect.any(String),
          }),
        );
      });

      it('should sanitize error message for production 500 errors', async () => {
        process.env.NODE_ENV = 'production';
        const error = new Error('Sensitive internal error details');

        await controller.handleError(mockContext, mockConfig, error);

        // Verify that the error view was called with sanitized message
        expect(mockContext.render).toHaveBeenCalledWith(
          expect.objectContaining({
            props: expect.objectContaining({
              children: expect.stringContaining('Internal Server Error'),
            }),
          }),
        );
      });

      it('should not sanitize non-500 error messages in production', async () => {
        process.env.NODE_ENV = 'production';
        const error = new Error('Invalid session');

        await controller.handleError(mockContext, mockConfig, error);

        // 401 error should not be sanitized
        expect(mockContext.render).toHaveBeenCalledWith(
          expect.objectContaining({
            props: expect.objectContaining({
              children: expect.stringContaining('Session expired'),
            }),
          }),
        );
      });
    });

    describe('error view rendering', () => {
      it('should render error view with correct props', async () => {
        process.env.NODE_ENV = 'development';
        const error = new Error('Test error');

        await controller.handleError(mockContext, mockConfig, error);

        expect(mockContext.render).toHaveBeenCalledWith(
          expect.objectContaining({
            props: expect.objectContaining({
              children: expect.stringContaining('Error: Test error'),
            }),
          }),
        );
        expect(mockContext.render).toHaveBeenCalledWith(
          expect.objectContaining({
            props: expect.objectContaining({
              children: expect.stringContaining('Home: /test-home'),
            }),
          }),
        );
      });

      it('should throw HTTPException when errorView returns null', async () => {
        process.env.NODE_ENV = 'development';
        const nullErrorView: FC<ErrorPageProps> = () => null as any;
        const controllerWithNullView = new TestController(nullErrorView);
        const error = new Error('Test error');

        await expect(
          controllerWithNullView.handleError(mockContext, mockConfig, error),
        ).rejects.toThrow(HTTPException);

        expect(consoleErrorSpy).toHaveBeenNthCalledWith(
          2,
          'Failed to generate error view component',
          expect.objectContaining({
            error: 'Test error',
            homePath: '/test-home',
            statusCode: 500,
            timestamp: expect.any(String),
          }),
        );
      });

      it('should handle render errors and throw HTTPException', async () => {
        process.env.NODE_ENV = 'development';
        const error = new Error('Original error');
        mockContext.render = vi.fn().mockImplementation(() => {
          throw new Error('Render error');
        });

        await expect(
          controller.handleError(mockContext, mockConfig, error),
        ).rejects.toThrow(HTTPException);

        expect(consoleErrorSpy).toHaveBeenNthCalledWith(
          2,
          'Critical error in AbstractController:',
          expect.objectContaining({
            originalError: 'Original error',
            renderError: 'Render error',
            statusCode: 500,
            path: '/test-path',
            timestamp: expect.any(String),
            stack: expect.any(String),
          }),
        );
      });

      it('should handle critical errors differently in development vs production', async () => {
        const error = new Error('Original error');
        mockContext.render = vi.fn().mockImplementation(() => {
          throw new Error('Critical render error');
        });

        // Test development mode
        process.env.NODE_ENV = 'development';
        await expect(
          controller.handleError(mockContext, mockConfig, error),
        ).rejects.toThrow('Critical error: Critical render error');

        // Test production mode
        process.env.NODE_ENV = 'production';
        await expect(
          controller.handleError(mockContext, mockConfig, error),
        ).rejects.toThrow('Critical system error occurred');
      });
    });

    describe('async Configuration processing', () => {
      it('should handle async homeViewPath correctly', async () => {
        // Test case when homeViewPath is async
        const asyncConfig = {
          ...mockConfig,
          homeViewPath: vi.fn().mockResolvedValue('/async-home'),
        };

        const error = new Error('Async test error');

        await controller.handleError(mockContext, asyncConfig as any, error);

        expect(asyncConfig.homeViewPath).toHaveBeenCalled();
        expect(mockContext.render).toHaveBeenCalledWith(
          expect.objectContaining({
            props: expect.objectContaining({
              children: expect.stringContaining('Home: /async-home'),
            }),
          }),
        );
      });

      it('should handle homeViewPath rejection', async () => {
        const failingConfig = {
          ...mockConfig,
          homeViewPath: vi.fn().mockRejectedValue(new Error('Config error')),
        };

        const error = new Error('Original error');

        await expect(
          controller.handleError(mockContext, failingConfig as any, error),
        ).rejects.toThrow(HTTPException);

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Critical error in AbstractController:',
          expect.objectContaining({
            renderError: 'Config error',
          }),
        );
      });
    });

    describe('boundary value tests', () => {
      it('should handle empty string error', async () => {
        const error = '';

        const result = await controller.handleError(
          mockContext,
          mockConfig,
          error,
        );

        expect(mockContext.status).toHaveBeenCalledWith(500);
        expect(result).toBeInstanceOf(Response);
      });

      it('should handle null error (converted to string)', async () => {
        const error = null as any;

        const result = await controller.handleError(
          mockContext,
          mockConfig,
          error,
        );

        expect(mockContext.status).toHaveBeenCalledWith(500);
        expect(result).toBeInstanceOf(Response);
      });

      it('should handle Error with empty message', async () => {
        const error = new Error('');

        const result = await controller.handleError(
          mockContext,
          mockConfig,
          error,
        );

        expect(mockContext.status).toHaveBeenCalledWith(500);
        expect(result).toBeInstanceOf(Response);
      });
    });
  });
});
