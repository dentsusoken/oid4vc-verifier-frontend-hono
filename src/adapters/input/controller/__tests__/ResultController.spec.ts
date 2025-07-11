import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Context } from 'hono';
import { FC } from 'hono/jsx';
import { ResultController } from '../ResultController';
import { Configuration, PortsInput } from 'oid4vc-verifier-frontend-core';
import { ResultProps, ErrorPageProps } from '../../views';
import { Env } from '../../../../env';
import { GetDI } from '../../../../di';

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
    return '/test-result';
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
  private mockGetWalletResponseService = vi.fn();

  initTransaction() {
    return vi.fn();
  }

  getWalletResponse() {
    return this.mockGetWalletResponseService;
  }

  // Helper method to set up mock behavior
  setGetWalletResponseMock(mockImplementation: any) {
    this.mockGetWalletResponseService.mockImplementation(mockImplementation);
    return this.mockGetWalletResponseService;
  }
}

/**
 * Mock Result view component for testing
 */
const mockResultView: FC<ResultProps> = ({ data, vpToken, homePath }) => {
  return {
    type: 'div',
    props: {
      children: `Result: data=${JSON.stringify(data)}, vpToken=${vpToken}, homePath=${homePath}`,
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
  portsIn: MockPortsInput,
): GetDI<Env> => {
  return vi.fn().mockReturnValue({
    config,
    portsIn,
    portsOut: {}, // Not used in ResultController tests
  });
};

/**
 * Mock Context for testing
 */
const createMockContext = (
  queryParams: Record<string, string> = {},
): Context<Env> => {
  const mockResponse = new Response('test');
  return {
    req: {
      query: vi
        .fn()
        .mockImplementation((key: string) => queryParams[key] ?? null),
      path: '/test-path',
    },
    status: vi.fn(),
    render: vi.fn().mockReturnValue(mockResponse),
  } as any;
};

describe('ResultController', () => {
  let controller: ResultController<Env>;
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
        () => new ResultController(mockGetDI, mockResultView, mockErrorView),
      ).not.toThrow();
    });

    it('should throw TypeError when getDI is null', () => {
      expect(
        () => new ResultController(null as any, mockResultView, mockErrorView),
      ).toThrow(TypeError);
      expect(
        () => new ResultController(null as any, mockResultView, mockErrorView),
      ).toThrow('getDI must be a function');
    });

    it('should throw TypeError when getDI is undefined', () => {
      expect(
        () =>
          new ResultController(undefined as any, mockResultView, mockErrorView),
      ).toThrow(TypeError);
      expect(
        () =>
          new ResultController(undefined as any, mockResultView, mockErrorView),
      ).toThrow('getDI must be a function');
    });

    it('should throw TypeError when getDI is not a function', () => {
      expect(
        () =>
          new ResultController(
            'not-a-function' as any,
            mockResultView,
            mockErrorView,
          ),
      ).toThrow(TypeError);
      expect(
        () =>
          new ResultController(
            'not-a-function' as any,
            mockResultView,
            mockErrorView,
          ),
      ).toThrow('getDI must be a function');
    });

    it('should throw TypeError when View is null', () => {
      expect(
        () => new ResultController(mockGetDI, null as any, mockErrorView),
      ).toThrow(TypeError);
      expect(
        () => new ResultController(mockGetDI, null as any, mockErrorView),
      ).toThrow('View must be a React functional component');
    });

    it('should throw TypeError when View is undefined', () => {
      expect(
        () => new ResultController(mockGetDI, undefined as any, mockErrorView),
      ).toThrow(TypeError);
      expect(
        () => new ResultController(mockGetDI, undefined as any, mockErrorView),
      ).toThrow('View must be a React functional component');
    });

    it('should throw TypeError when View is not a function', () => {
      expect(
        () =>
          new ResultController(
            mockGetDI,
            'not-a-function' as any,
            mockErrorView,
          ),
      ).toThrow(TypeError);
      expect(
        () =>
          new ResultController(
            mockGetDI,
            'not-a-function' as any,
            mockErrorView,
          ),
      ).toThrow('View must be a React functional component');
    });

    it('should inherit from AbstractController with errorView', () => {
      controller = new ResultController(
        mockGetDI,
        mockResultView,
        mockErrorView,
      );
      expect(controller).toBeInstanceOf(ResultController);
      // Note: We can't directly test inheritance chain, but the constructor should complete successfully
    });
  });

  describe('handler', () => {
    beforeEach(() => {
      controller = new ResultController(
        mockGetDI,
        mockResultView,
        mockErrorView,
      );
    });

    describe('successful wallet response processing', () => {
      it('should process wallet response with response_code and render view', async () => {
        const mockServiceResult = {
          valid: true,
          documents: [
            {
              'org.iso.18013.5.1.mDL': {
                family_name: 'Doe',
                given_name: 'John',
                birth_date: '1990-01-01',
              },
            },
          ],
          vpToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        };

        mockPortsIn.setGetWalletResponseMock(async () => mockServiceResult);
        mockContext = createMockContext({
          response_code: 'test_response_code',
        });

        const handler = controller.handler();
        const result = await handler(mockContext);

        expect(mockGetDI).toHaveBeenCalledWith(mockContext);
        expect(mockPortsIn.getWalletResponse()).toHaveBeenCalledWith(
          'test_response_code',
        );
        expect(mockContext.render).toHaveBeenCalledWith(
          expect.objectContaining({
            props: expect.objectContaining({
              children: expect.stringContaining(
                'vpToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
              ),
            }),
          }),
        );
        expect(result).toBeInstanceOf(Response);
      });

      it('should process wallet response without response_code', async () => {
        const mockServiceResult = {
          valid: true,
          documents: [],
          vpToken: 'test_vp_token',
        };

        mockPortsIn.setGetWalletResponseMock(async () => mockServiceResult);
        mockContext = createMockContext({}); // No query parameters

        const handler = controller.handler();
        const result = await handler(mockContext);

        expect(mockPortsIn.getWalletResponse()).toHaveBeenCalledWith('');
        expect(result).toBeInstanceOf(Response);
      });

      it('should pass correct props to View component', async () => {
        const testDocuments = [
          {
            'org.iso.18013.5.1.mDL': {
              family_name: 'Smith',
              given_name: 'Alice',
            },
          },
        ];

        const mockServiceResult = {
          valid: true,
          documents: testDocuments,
          vpToken: 'test_vp_token_123',
        };

        mockPortsIn.setGetWalletResponseMock(async () => mockServiceResult);

        const handler = controller.handler();
        await handler(mockContext);

        expect(mockContext.render).toHaveBeenCalledWith(
          expect.objectContaining({
            props: expect.objectContaining({
              children: expect.stringContaining(
                `data=${JSON.stringify(testDocuments)}`,
              ),
            }),
          }),
        );
        expect(mockContext.render).toHaveBeenCalledWith(
          expect.objectContaining({
            props: expect.objectContaining({
              children: expect.stringContaining('homePath=/test-home'),
            }),
          }),
        );
        expect(mockContext.render).toHaveBeenCalledWith(
          expect.objectContaining({
            props: expect.objectContaining({
              children: expect.stringContaining('vpToken=test_vp_token_123'),
            }),
          }),
        );
      });

      it('should handle empty documents array', async () => {
        const mockServiceResult = {
          valid: true,
          documents: [],
          vpToken: 'empty_docs_token',
        };

        mockPortsIn.setGetWalletResponseMock(async () => mockServiceResult);

        const handler = controller.handler();
        const result = await handler(mockContext);

        expect(mockContext.render).toHaveBeenCalledWith(
          expect.objectContaining({
            props: expect.objectContaining({
              children: expect.stringContaining('data=[]'),
            }),
          }),
        );
        expect(result).toBeInstanceOf(Response);
      });

      it('should handle undefined documents', async () => {
        const mockServiceResult = {
          valid: true,
          documents: undefined,
          vpToken: 'undefined_docs_token',
        };

        mockPortsIn.setGetWalletResponseMock(async () => mockServiceResult);

        const handler = controller.handler();
        const result = await handler(mockContext);

        expect(mockContext.render).toHaveBeenCalledWith(
          expect.objectContaining({
            props: expect.objectContaining({
              children: expect.stringContaining('data=undefined'),
            }),
          }),
        );
        expect(result).toBeInstanceOf(Response);
      });
    });

    describe('wallet response validation errors', () => {
      it('should handle invalid wallet response', async () => {
        const mockServiceResult = {
          valid: false,
          documents: [],
          vpToken: undefined,
        };

        mockPortsIn.setGetWalletResponseMock(async () => mockServiceResult);

        // Mock the handleError method to verify it's called
        const handleErrorSpy = vi
          .spyOn(controller, 'handleError')
          .mockResolvedValue(new Response('error'));

        const handler = controller.handler();
        const result = await handler(mockContext);

        expect(handleErrorSpy).toHaveBeenCalledWith(
          mockContext,
          mockConfig,
          expect.objectContaining({
            message: expect.stringContaining('Wallet returned error'),
          }),
        );
        expect(result).toBeInstanceOf(Response);

        handleErrorSpy.mockRestore();
      });

      it('should handle wallet response with error details', async () => {
        const mockServiceResult = {
          valid: false,
          error: 'invalid_request',
          error_description: 'The presentation request is invalid',
          documents: [],
          vpToken: undefined,
        };

        mockPortsIn.setGetWalletResponseMock(async () => mockServiceResult);

        const handleErrorSpy = vi
          .spyOn(controller, 'handleError')
          .mockResolvedValue(new Response('error'));

        const handler = controller.handler();
        await handler(mockContext);

        expect(handleErrorSpy).toHaveBeenCalledWith(
          mockContext,
          mockConfig,
          expect.any(Error),
        );

        handleErrorSpy.mockRestore();
      });
    });

    describe('view component errors', () => {
      it('should handle error when View component returns null', async () => {
        const nullView: FC<ResultProps> = () => null as any;
        const controllerWithNullView = new ResultController(
          mockGetDI,
          nullView,
          mockErrorView,
        );

        const mockServiceResult = {
          valid: true,
          documents: [],
          vpToken: 'test_token',
        };

        mockPortsIn.setGetWalletResponseMock(async () => mockServiceResult);

        // Mock the handleError method to verify it's called
        const handleErrorSpy = vi
          .spyOn(controllerWithNullView, 'handleError')
          .mockResolvedValue(new Response('error'));

        const handler = controllerWithNullView.handler();
        const result = await handler(mockContext);

        expect(handleErrorSpy).toHaveBeenCalledWith(
          mockContext,
          mockConfig,
          expect.any(Error),
        );
        expect(result).toBeInstanceOf(Response);

        handleErrorSpy.mockRestore();
      });

      it('should handle error when View component returns undefined', async () => {
        const undefinedView: FC<ResultProps> = () => undefined as any;
        const controllerWithUndefinedView = new ResultController(
          mockGetDI,
          undefinedView,
          mockErrorView,
        );

        const mockServiceResult = {
          valid: true,
          documents: [],
          vpToken: 'test_token',
        };

        mockPortsIn.setGetWalletResponseMock(async () => mockServiceResult);

        // Mock the handleError method to verify it's called
        const handleErrorSpy = vi
          .spyOn(controllerWithUndefinedView, 'handleError')
          .mockResolvedValue(new Response('error'));

        const handler = controllerWithUndefinedView.handler();
        const result = await handler(mockContext);

        expect(handleErrorSpy).toHaveBeenCalledWith(
          mockContext,
          mockConfig,
          expect.any(Error),
        );
        expect(result).toBeInstanceOf(Response);

        handleErrorSpy.mockRestore();
      });
    });

    describe('service errors', () => {
      it('should handle service errors', async () => {
        const serviceError = new Error('Service unavailable');
        mockPortsIn.setGetWalletResponseMock(async () => {
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
          serviceError,
        );
        expect(result).toBeInstanceOf(Response);

        handleErrorSpy.mockRestore();
      });

      it('should handle async service errors', async () => {
        const asyncError = new Error('Async service error');
        mockPortsIn.setGetWalletResponseMock(async () => {
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
          asyncError,
        );

        handleErrorSpy.mockRestore();
      });

      it('should handle getDI errors', async () => {
        const getDIError = new Error('Dependency injection failed');
        const failingGetDI = vi.fn().mockImplementation(() => {
          throw getDIError;
        });

        const controllerWithFailingDI = new ResultController(
          failingGetDI,
          mockResultView,
          mockErrorView,
        );

        const handler = controllerWithFailingDI.handler();

        await expect(handler(mockContext)).rejects.toThrow(
          'Dependency injection failed',
        );
      });
    });

    describe('integration scenarios', () => {
      it('should handle complete flow with all components working', async () => {
        const mockServiceResult = {
          valid: true,
          documents: [
            {
              'org.iso.18013.5.1.mDL': {
                family_name: 'Test',
                given_name: 'User',
              },
            },
          ],
          vpToken: 'complete_flow_token',
        };

        mockPortsIn.setGetWalletResponseMock(async () => mockServiceResult);
        mockContext = createMockContext({ response_code: 'complete_test' });

        const handler = controller.handler();
        const result = await handler(mockContext);

        // Verify getDI was called with context
        expect(mockGetDI).toHaveBeenCalledWith(mockContext);

        // Verify service was called with response code
        expect(mockPortsIn.getWalletResponse()).toHaveBeenCalledWith(
          'complete_test',
        );

        // Verify view was rendered with correct props
        expect(mockContext.render).toHaveBeenCalledTimes(1);
        expect(result).toBeInstanceOf(Response);
      });

      it('should handle different response_code formats', async () => {
        const testCases = [
          'simple_code',
          'complex-code-with-dashes',
          'code_with_underscores',
          '123456789',
          'mixed_Code123-test',
        ];

        for (const responseCode of testCases) {
          vi.clearAllMocks();

          const mockServiceResult = {
            valid: true,
            documents: [],
            vpToken: `token_for_${responseCode}`,
          };

          mockPortsIn.setGetWalletResponseMock(async () => mockServiceResult);
          mockContext = createMockContext({ response_code: responseCode });

          const handler = controller.handler();
          await handler(mockContext);

          expect(mockPortsIn.getWalletResponse()).toHaveBeenCalledWith(
            responseCode,
          );
          expect(mockContext.render).toHaveBeenCalledWith(
            expect.objectContaining({
              props: expect.objectContaining({
                children: expect.stringContaining(
                  `vpToken=token_for_${responseCode}`,
                ),
              }),
            }),
          );
        }
      });
    });

    describe('boundary value tests', () => {
      it('should handle missing vpToken in response', async () => {
        const mockServiceResult = {
          valid: true,
          documents: [],
          vpToken: undefined,
        };

        mockPortsIn.setGetWalletResponseMock(async () => mockServiceResult);

        const handler = controller.handler();
        const result = await handler(mockContext);

        expect(mockContext.render).toHaveBeenCalledWith(
          expect.objectContaining({
            props: expect.objectContaining({
              children: expect.stringContaining('vpToken=undefined'),
            }),
          }),
        );
        expect(result).toBeInstanceOf(Response);
      });

      it('should handle empty response_code query parameter', async () => {
        const mockServiceResult = {
          valid: true,
          documents: [],
          vpToken: 'empty_code_token',
        };

        mockPortsIn.setGetWalletResponseMock(async () => mockServiceResult);
        mockContext = createMockContext({ response_code: '' });

        const handler = controller.handler();
        await handler(mockContext);

        expect(mockPortsIn.getWalletResponse()).toHaveBeenCalledWith('');
      });

      it('should handle large document arrays', async () => {
        const largeDocuments = Array.from({ length: 10 }, (_, i) => ({
          [`document_type_${i}`]: {
            field1: `value1_${i}`,
            field2: `value2_${i}`,
            field3: `value3_${i}`,
          },
        }));

        const mockServiceResult = {
          valid: true,
          documents: largeDocuments,
          vpToken: 'large_docs_token',
        };

        mockPortsIn.setGetWalletResponseMock(async () => mockServiceResult);

        const handler = controller.handler();
        const result = await handler(mockContext);

        expect(mockContext.render).toHaveBeenCalledWith(
          expect.objectContaining({
            props: expect.objectContaining({
              children: expect.stringContaining(
                `data=${JSON.stringify(largeDocuments)}`,
              ),
            }),
          }),
        );
        expect(result).toBeInstanceOf(Response);
      });
    });
  });
});
