import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import { FrontendApi } from '../FrontendApi';
import { InitTransactionController, ResultController } from '../controller';
import { Env } from '../../../env';
import { GetDI } from '../../../di';

// Mock the controller modules
vi.mock('../controller', () => ({
  InitTransactionController: vi.fn().mockImplementation(() => ({
    handler: vi.fn().mockReturnValue(() => new Response('init')),
  })),
  ResultController: vi.fn().mockImplementation(() => ({
    handler: vi.fn().mockReturnValue(() => new Response('result')),
  })),
}));

// Mock the views
vi.mock('../views', () => ({
  ErrorPage: vi
    .fn()
    .mockReturnValue({ type: 'div', props: { children: 'ErrorPage' } }),
  Home: vi.fn().mockReturnValue({ type: 'div', props: { children: 'Home' } }),
  Init: vi.fn().mockReturnValue({ type: 'div', props: { children: 'Init' } }),
  Result: vi
    .fn()
    .mockReturnValue({ type: 'div', props: { children: 'Result' } }),
  Template: vi
    .fn()
    .mockReturnValue({ type: 'div', props: { children: 'Template' } }),
}));

// Mock jsxRenderer
vi.mock('hono/jsx-renderer', () => ({
  jsxRenderer: vi.fn(() => (c: any, next: any) => {
    c.render = vi.fn().mockReturnValue(new Response('rendered'));
    return next();
  }),
}));

/**
 * Mock GetDI function for testing
 */
const createMockGetDI = (): GetDI<Env> => {
  return vi.fn().mockReturnValue({
    config: {
      homeViewPath: () => '/test-home',
      initTransactionViewPath: () => '/test-init',
      resultViewPath: () => '/test-result',
    },
    portsIn: {},
    portsOut: {},
  });
};

describe('FrontendApi', () => {
  let mockGetDI: GetDI<Env>;
  let consoleLogSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    mockGetDI = createMockGetDI();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('constructor', () => {
    it('should create instance with valid parameters', () => {
      expect(
        () => new FrontendApi('/home', '/init', '/result', mockGetDI),
      ).not.toThrow();
    });

    it('should log initialization message', () => {
      new FrontendApi('/home', '/init', '/result', mockGetDI);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'FrontendApi initialized:',
        expect.objectContaining({
          homePath: '/home',
          initPath: '/init',
          resultPath: '/result',
          timestamp: expect.any(String),
        }),
      );
    });

    describe('parameter validation', () => {
      it('should throw TypeError for invalid parameters', () => {
        expect(
          () => new FrontendApi('', '/init', '/result', mockGetDI),
        ).toThrow('homePath must be a non-empty string');

        expect(
          () => new FrontendApi('/home', '', '/result', mockGetDI),
        ).toThrow('initPath must be a non-empty string');

        expect(() => new FrontendApi('/home', '/init', '', mockGetDI)).toThrow(
          'resultPath must be a non-empty string',
        );

        expect(
          () => new FrontendApi('/home', '/init', '/result', null as any),
        ).toThrow('getDI must be a function');
      });

      it('should throw Error for invalid path formats', () => {
        expect(
          () => new FrontendApi('invalid-path', '/init', '/result', mockGetDI),
        ).toThrow('Invalid homePath format: invalid-path');
      });

      it('should throw Error when paths are not unique', () => {
        expect(
          () => new FrontendApi('/same', '/same', '/result', mockGetDI),
        ).toThrow('All route paths must be unique');
      });
    });
  });

  describe('paths getter', () => {
    it('should return configured paths', () => {
      const api = new FrontendApi('/home', '/init', '/result', mockGetDI);
      const paths = api.paths;

      expect(paths).toEqual({
        home: '/home',
        init: '/init',
        result: '/result',
      });
    });
  });

  describe('route getter', () => {
    it('should return configured Hono app', () => {
      const api = new FrontendApi('/home', '/init', '/result', mockGetDI);
      const route = api.route;

      expect(route).toBeInstanceOf(Hono);
    });

    it('should log route configuration', () => {
      const api = new FrontendApi('/home', '/init', '/result', mockGetDI);
      api.route;

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Route configuration completed:',
        expect.objectContaining({
          routes: ['/home', '/init', '/result', '*'],
          timestamp: expect.any(String),
        }),
      );
    });
  });

  describe('handler creation', () => {
    let api: FrontendApi<Env>;

    beforeEach(() => {
      api = new FrontendApi('/home', '/init', '/result', mockGetDI);
    });

    it('should create homeHandler', () => {
      const handler = api.homeHandler();
      expect(handler).toBeInstanceOf(Function);
    });

    it('should create initHandler and instantiate InitTransactionController', () => {
      api.initHandler();
      expect(InitTransactionController).toHaveBeenCalled();
    });

    it('should create resultHandler and instantiate ResultController', () => {
      api.resultHandler();
      expect(ResultController).toHaveBeenCalled();
    });

    it('should create notFoundHandler', () => {
      const handler = api.notFoundHandler();
      expect(handler).toBeInstanceOf(Function);
    });
  });

  describe('error handling', () => {
    let api: FrontendApi<Env>;

    beforeEach(() => {
      api = new FrontendApi('/home', '/init', '/result', mockGetDI);
    });

    it('should handle InitTransactionController creation errors', () => {
      (InitTransactionController as any).mockImplementation(() => {
        throw new Error('Controller creation failed');
      });

      expect(() => api.initHandler()).not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to create InitTransactionController:',
        expect.objectContaining({
          error: 'Controller creation failed',
          timestamp: expect.any(String),
        }),
      );
    });

    it('should handle ResultController creation errors', () => {
      (ResultController as any).mockImplementation(() => {
        throw new Error('Result controller creation failed');
      });

      expect(() => api.resultHandler()).not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to create ResultController:',
        expect.objectContaining({
          error: 'Result controller creation failed',
          timestamp: expect.any(String),
        }),
      );
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete API lifecycle', () => {
      const api = new FrontendApi('/home', '/init', '/result', mockGetDI);

      expect(api.paths.home).toBe('/home');
      expect(api.paths.init).toBe('/init');
      expect(api.paths.result).toBe('/result');

      const route = api.route;
      expect(route).toBeInstanceOf(Hono);

      const homeHandler = api.homeHandler();
      const initHandler = api.initHandler();
      const resultHandler = api.resultHandler();
      const notFoundHandler = api.notFoundHandler();

      expect(homeHandler).toBeInstanceOf(Function);
      expect(initHandler).toBeInstanceOf(Function);
      expect(resultHandler).toBeInstanceOf(Function);
      expect(notFoundHandler).toBeInstanceOf(Function);
    });

    it('should handle various path configurations', () => {
      const testCases = [
        { home: '/', init: '/start', result: '/end' },
        { home: '/app', init: '/app/init', result: '/app/result' },
        {
          home: '/verifier',
          init: '/verifier/begin',
          result: '/verifier/finish',
        },
      ];

      for (const { home, init, result } of testCases) {
        expect(
          () => new FrontendApi(home, init, result, mockGetDI),
        ).not.toThrow();

        const api = new FrontendApi(home, init, result, mockGetDI);
        expect(api.paths.home).toBe(home);
        expect(api.paths.init).toBe(init);
        expect(api.paths.result).toBe(result);
      }
    });
  });
});
