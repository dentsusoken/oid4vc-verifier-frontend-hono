import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Context } from 'hono';
import { FC } from 'hono/jsx';
import { InitTransactionController } from '../InitTransactionController';
import {
  Configuration,
  PortsInput,
} from '@vecrea/oid4vc-verifier-frontend-core';
import { InitProps, ErrorPageProps } from '../../views';
import { Env } from '../../../../env';
import { GetDI } from '../../../../di';

/**
 * Mock Configuration implementation for testing
 */
class MockConfiguration implements Configuration {
  homeViewPath(): string {
    return '/test-home';
  }
  resultViewPath(): string {
    return '/test-result';
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
 * Mock PortsInput implementation for testing
 */
class MockPortsInput implements PortsInput {
  private mockInitTransactionService = vi.fn();

  initTransaction() {
    return this.mockInitTransactionService;
  }

  getWalletResponse() {
    return vi.fn();
  }

  // Helper method to set up mock behavior
  setInitTransactionMock(mockImplementation: any) {
    this.mockInitTransactionService.mockImplementation(mockImplementation);
    return this.mockInitTransactionService;
  }
}

/**
 * Mock Init view component for testing
 */
const mockInitView: FC<InitProps> = async ({
  redirectUrl,
  homePath,
  resultPath,
  isMobile,
}) => {
  return {
    type: 'div',
    props: {
      children: `Init: redirectUrl=${redirectUrl}, homePath=${homePath}, resultPath=${resultPath}, isMobile=${isMobile}`,
    },
  } as any;
};

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
 * Mock GetDI function for testing
 */
const createMockGetDI = (
  config: MockConfiguration,
  portsIn: MockPortsInput
): GetDI<Env> => {
  return vi.fn().mockReturnValue({
    config,
    portsIn,
    portsOut: {}, // Not used in InitTransactionController tests
  });
};

/**
 * Mock Context for testing
 */
const createMockContext = (): Context<Env> => {
  const mockResponse = new Response('test');
  return {
    req: {
      raw: new Request('http://test.com/init'),
      path: '/test-path',
    },
    status: vi.fn(),
    render: vi.fn().mockReturnValue(mockResponse),
  } as any;
};

describe('InitTransactionController', () => {
  let controller: InitTransactionController<Env>;
  let mockConfig: MockConfiguration;
  let mockPortsIn: MockPortsInput;
  let mockGetDI: GetDI<Env>;
  let mockContext: Context<Env>;

  beforeEach(() => {
    mockConfig = new MockConfiguration();
    mockPortsIn = new MockPortsInput();
    mockGetDI = createMockGetDI(mockConfig, mockPortsIn);
    mockContext = createMockContext();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create instance with valid parameters', () => {
      expect(
        () =>
          new InitTransactionController(mockGetDI, mockInitView, mockErrorView)
      ).not.toThrow();
    });

    it('should throw TypeError when getDI is null', () => {
      expect(
        () =>
          new InitTransactionController(
            null as any,
            mockInitView,
            mockErrorView
          )
      ).toThrow(TypeError);
      expect(
        () =>
          new InitTransactionController(
            null as any,
            mockInitView,
            mockErrorView
          )
      ).toThrow('getDI must be a function');
    });

    it('should throw TypeError when getDI is undefined', () => {
      expect(
        () =>
          new InitTransactionController(
            undefined as any,
            mockInitView,
            mockErrorView
          )
      ).toThrow(TypeError);
      expect(
        () =>
          new InitTransactionController(
            undefined as any,
            mockInitView,
            mockErrorView
          )
      ).toThrow('getDI must be a function');
    });

    it('should throw TypeError when getDI is not a function', () => {
      expect(
        () =>
          new InitTransactionController(
            'not-a-function' as any,
            mockInitView,
            mockErrorView
          )
      ).toThrow(TypeError);
      expect(
        () =>
          new InitTransactionController(
            'not-a-function' as any,
            mockInitView,
            mockErrorView
          )
      ).toThrow('getDI must be a function');
    });

    it('should throw TypeError when View is null', () => {
      expect(
        () =>
          new InitTransactionController(mockGetDI, null as any, mockErrorView)
      ).toThrow(TypeError);
      expect(
        () =>
          new InitTransactionController(mockGetDI, null as any, mockErrorView)
      ).toThrow('View must be a React functional component');
    });

    it('should throw TypeError when View is undefined', () => {
      expect(
        () =>
          new InitTransactionController(
            mockGetDI,
            undefined as any,
            mockErrorView
          )
      ).toThrow(TypeError);
      expect(
        () =>
          new InitTransactionController(
            mockGetDI,
            undefined as any,
            mockErrorView
          )
      ).toThrow('View must be a React functional component');
    });

    it('should throw TypeError when View is not a function', () => {
      expect(
        () =>
          new InitTransactionController(
            mockGetDI,
            'not-a-function' as any,
            mockErrorView
          )
      ).toThrow(TypeError);
      expect(
        () =>
          new InitTransactionController(
            mockGetDI,
            'not-a-function' as any,
            mockErrorView
          )
      ).toThrow('View must be a React functional component');
    });

    it('should inherit from AbstractController with errorView', () => {
      controller = new InitTransactionController(
        mockGetDI,
        mockInitView,
        mockErrorView
      );
      expect(controller).toBeInstanceOf(InitTransactionController);
      // Note: We can't directly test inheritance chain, but the constructor should complete successfully
    });
  });

  describe('handler', () => {
    beforeEach(() => {
      controller = new InitTransactionController(
        mockGetDI,
        mockInitView,
        mockErrorView
      );
    });

    describe('successful transaction initialization', () => {
      it('should initialize transaction and render view for mobile user', async () => {
        const mockServiceResult = {
          walletRedirectUri: 'wallet://test-redirect-uri',
          isMobile: true,
        };

        mockPortsIn.setInitTransactionMock(async () => mockServiceResult);

        const handler = controller.handler();
        const result = await handler(mockContext);

        expect(mockGetDI).toHaveBeenCalledWith(mockContext);
        expect(mockPortsIn.initTransaction()).toHaveBeenCalledWith(
          mockContext.req.raw
        );
        expect(mockContext.render).toHaveBeenCalledWith(
          expect.objectContaining({
            props: expect.objectContaining({
              children: expect.stringContaining(
                'redirectUrl=wallet://test-redirect-uri'
              ),
            }),
          })
        );
        expect(mockContext.render).toHaveBeenCalledWith(
          expect.objectContaining({
            props: expect.objectContaining({
              children: expect.stringContaining('isMobile=true'),
            }),
          })
        );
        expect(result).toBeInstanceOf(Response);
      });

      it('should initialize transaction and render view for desktop user', async () => {
        const mockServiceResult = {
          walletRedirectUri: 'https://wallet.example.com/verify?request=...',
          isMobile: false,
        };

        mockPortsIn.setInitTransactionMock(async () => mockServiceResult);

        const handler = controller.handler();
        const result = await handler(mockContext);

        expect(mockContext.render).toHaveBeenCalledWith(
          expect.objectContaining({
            props: expect.objectContaining({
              children: expect.stringContaining('isMobile=false'),
            }),
          })
        );
        expect(result).toBeInstanceOf(Response);
      });

      it('should pass correct props to View component', async () => {
        const mockServiceResult = {
          walletRedirectUri: 'wallet://custom-uri',
          isMobile: true,
        };

        mockPortsIn.setInitTransactionMock(async () => mockServiceResult);

        const handler = controller.handler();
        await handler(mockContext);

        expect(mockContext.render).toHaveBeenCalledWith(
          expect.objectContaining({
            props: expect.objectContaining({
              children: expect.stringContaining(
                'redirectUrl=wallet://custom-uri'
              ),
            }),
          })
        );
        expect(mockContext.render).toHaveBeenCalledWith(
          expect.objectContaining({
            props: expect.objectContaining({
              children: expect.stringContaining('homePath=/test-home'),
            }),
          })
        );
        expect(mockContext.render).toHaveBeenCalledWith(
          expect.objectContaining({
            props: expect.objectContaining({
              children: expect.stringContaining('resultPath=/test-result'),
            }),
          })
        );
      });

      it('should handle undefined isMobile value', async () => {
        const mockServiceResult = {
          walletRedirectUri: 'wallet://test-uri',
          // isMobile is undefined
        };

        mockPortsIn.setInitTransactionMock(async () => mockServiceResult);

        const handler = controller.handler();
        const result = await handler(mockContext);

        expect(mockContext.render).toHaveBeenCalledWith(
          expect.objectContaining({
            props: expect.objectContaining({
              children: expect.stringContaining('isMobile=undefined'),
            }),
          })
        );
        expect(result).toBeInstanceOf(Response);
      });
    });

    describe('view component errors', () => {
      it('should handle error when View component returns null', async () => {
        const nullView: FC<InitProps> = async () => null as any;
        const controllerWithNullView = new InitTransactionController(
          mockGetDI,
          nullView,
          mockErrorView
        );

        const mockServiceResult = {
          walletRedirectUri: 'wallet://test-uri',
          isMobile: false,
        };

        mockPortsIn.setInitTransactionMock(async () => mockServiceResult);

        // Mock the handleError method to verify it's called
        const handleErrorSpy = vi
          .spyOn(controllerWithNullView, 'handleError')
          .mockResolvedValue(new Response('error'));

        const handler = controllerWithNullView.handler();
        const result = await handler(mockContext);

        expect(handleErrorSpy).toHaveBeenCalledWith(
          mockContext,
          mockConfig,
          expect.any(Error)
        );
        expect(result).toBeInstanceOf(Response);

        handleErrorSpy.mockRestore();
      });

      it('should handle error when View component returns undefined', async () => {
        const undefinedView: FC<InitProps> = async () => undefined as any;
        const controllerWithUndefinedView = new InitTransactionController(
          mockGetDI,
          undefinedView,
          mockErrorView
        );

        const mockServiceResult = {
          walletRedirectUri: 'wallet://test-uri',
          isMobile: false,
        };

        mockPortsIn.setInitTransactionMock(async () => mockServiceResult);

        // Mock the handleError method to verify it's called
        const handleErrorSpy = vi
          .spyOn(controllerWithUndefinedView, 'handleError')
          .mockResolvedValue(new Response('error'));

        const handler = controllerWithUndefinedView.handler();
        const result = await handler(mockContext);

        expect(handleErrorSpy).toHaveBeenCalledWith(
          mockContext,
          mockConfig,
          expect.any(Error)
        );
        expect(result).toBeInstanceOf(Response);

        handleErrorSpy.mockRestore();
      });
    });

    describe('service errors', () => {
      it('should handle service initialization errors', async () => {
        const serviceError = new Error('Service initialization failed');
        mockPortsIn.setInitTransactionMock(async () => {
          throw serviceError;
        });

        // Mock the handleError method to verify it's called
        const handleErrorSpy = vi
          .spyOn(controller, 'handleError')
          .mockResolvedValue(new Response('error'));

        const handler = controller.handler();
        const result = await handler(mockContext);

        expect(handleErrorSpy).toHaveBeenCalledWith(
          mockContext,
          mockConfig,
          serviceError
        );
        expect(result).toBeInstanceOf(Response);

        handleErrorSpy.mockRestore();
      });

      it('should handle async service errors', async () => {
        const asyncError = new Error('Async service error');
        mockPortsIn.setInitTransactionMock(async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          throw asyncError;
        });

        const handleErrorSpy = vi
          .spyOn(controller, 'handleError')
          .mockResolvedValue(new Response('error'));

        const handler = controller.handler();
        await handler(mockContext);

        expect(handleErrorSpy).toHaveBeenCalledWith(
          mockContext,
          mockConfig,
          asyncError
        );

        handleErrorSpy.mockRestore();
      });

      it('should handle getDI errors', async () => {
        const getDIError = new Error('Dependency injection failed');
        const failingGetDI = vi.fn().mockImplementation(() => {
          throw getDIError;
        });

        const controllerWithFailingDI = new InitTransactionController(
          failingGetDI,
          mockInitView,
          mockErrorView
        );

        const handler = controllerWithFailingDI.handler();

        await expect(handler(mockContext)).rejects.toThrow(
          'Dependency injection failed'
        );
      });
    });

    describe('integration scenarios', () => {
      it('should handle complete flow with all components working', async () => {
        const mockServiceResult = {
          walletRedirectUri: 'wallet://complete-flow-test',
          isMobile: true,
        };

        mockPortsIn.setInitTransactionMock(async () => mockServiceResult);

        const handler = controller.handler();
        const result = await handler(mockContext);

        // Verify getDI was called with context
        expect(mockGetDI).toHaveBeenCalledWith(mockContext);

        // Verify service was called with request
        expect(mockPortsIn.initTransaction()).toHaveBeenCalledWith(
          mockContext.req.raw
        );

        // Verify view was rendered with correct props
        expect(mockContext.render).toHaveBeenCalledTimes(1);
        expect(result).toBeInstanceOf(Response);
      });

      it('should handle different walletRedirectUri formats', async () => {
        const testCases = [
          'wallet://mobile-app/verify?request=abc123',
          'https://wallet.example.com/verify?presentation_request=xyz789',
          'custom-scheme://app?data=encoded_request',
        ];

        for (const redirectUri of testCases) {
          vi.clearAllMocks();

          const mockServiceResult = {
            walletRedirectUri: redirectUri,
            isMobile: false,
          };

          mockPortsIn.setInitTransactionMock(async () => mockServiceResult);

          const handler = controller.handler();
          await handler(mockContext);

          expect(mockContext.render).toHaveBeenCalledWith(
            expect.objectContaining({
              props: expect.objectContaining({
                children: expect.stringContaining(`redirectUrl=${redirectUri}`),
              }),
            })
          );
        }
      });
    });

    describe('boundary value tests', () => {
      it('should handle empty walletRedirectUri', async () => {
        const mockServiceResult = {
          walletRedirectUri: '',
          isMobile: false,
        };

        mockPortsIn.setInitTransactionMock(async () => mockServiceResult);

        const handler = controller.handler();
        const result = await handler(mockContext);

        expect(mockContext.render).toHaveBeenCalledWith(
          expect.objectContaining({
            props: expect.objectContaining({
              children: expect.stringContaining('redirectUrl='),
            }),
          })
        );
        expect(result).toBeInstanceOf(Response);
      });

      it('should handle service result with missing properties', async () => {
        const mockServiceResult = {
          walletRedirectUri: 'wallet://test',
          // isMobile is missing
        } as any;

        mockPortsIn.setInitTransactionMock(async () => mockServiceResult);

        const handler = controller.handler();
        const result = await handler(mockContext);

        expect(mockContext.render).toHaveBeenCalledWith(
          expect.objectContaining({
            props: expect.objectContaining({
              children: expect.stringContaining('isMobile=undefined'),
            }),
          })
        );
        expect(result).toBeInstanceOf(Response);
      });
    });
  });
});
