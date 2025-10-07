import { Handler, Hono } from 'hono';
import { jsxRenderer } from 'hono/jsx-renderer';
import { Env } from '../../env';
import { ErrorPage, Result, Template } from './views';
import { DigitalCredentials } from './views/digitalCredentials';
import { MdocVerifyHandlerImpl } from 'mdoc-cbor-ts';
import { GetDI } from '../../di';
import {
  EphemeralECDHPrivateJwk,
  JarmOption,
} from '@vecrea/oid4vc-verifier-frontend-core';

/**
 * Default root path for Digital Credentials UI
 */
const DEFAULT_ROOT_PATH = '/digital-credentials';

/**
 * Generate Digital Credentials API request payload
 *
 * @param ecdhPublicJwk - Ephemeral public key to send (JWK with `d` removed)
 * @returns Request object to pass to DC API's `navigator.credentials.get`
 */
const credentialRequest = (ecdhPublicJwk: Record<string, unknown>) => ({
  protocol: 'openid4vp-v1-unsigned',
  request: {
    client_metadata: {
      vp_formats_supported: {
        mso_mdoc: {
          deviceauth_alg_values: [-7],
          issuerauth_alg_values: [-7],
        },
      },
      jwks: {
        keys: [ecdhPublicJwk],
      },
    },
    dcql_query: {
      credentials: [
        {
          claims: [
            {
              path: ['org.iso.18013.5.1', 'family_name'],
            },
            {
              path: ['org.iso.18013.5.1', 'given_name'],
            },
            {
              path: ['org.iso.18013.5.1', 'age_over_21'],
            },
          ],
          format: 'mso_mdoc',
          id: 'cred1',
          meta: {
            doctype_value: 'org.iso.18013.5.1.mDL',
          },
        },
      ],
    },
    response_mode: 'dc_api.jwt',
    response_type: 'vp_token',
    nonce: crypto.randomUUID(),
  },
});

/**
 * Digital Credentials frontend API router
 *
 * - Root screen display
 * - Request generation (ephemeral key generation and public key distribution)
 * - Response validation (JARM decryption/validation, mDL validation)
 * - Verification result display
 *
 * @typeParam T - Hono environment type (subtype of `Env`)
 * @since 1.0.0
 */
export class DigitalCredentialsApi<T extends Env> {
  /**
   * Home page route path
   * @private
   */
  readonly #rootPath: string;

  /**
   * Transaction initialization route path
   * @private
   */
  readonly #getRequestPath: string;

  /**
   * Result display route path
   * @private
   */
  readonly #validateResponsePath: string;

  /**
   * Result display route path
   * @private
   */
  readonly #resultPath: string;

  /**
   * Dependency injection function for accessing services
   * @private
   */
  readonly #getDI: GetDI<T>;

  /**
   * Create a new DigitalCredentialsApi instance
   *
   * @param getDI - DI retrieval function
   * @param rootPath - Root screen path
   * @param getRequestPath - Request generation path
   * @param validateResponsePath - Response validation path
   * @param resultPath - Verification result display path
   * @throws {TypeError} When parameters are invalid
   * @throws {Error} When path format is invalid or not unique
   */
  constructor(
    getDI: GetDI<T>,
    rootPath: string = DEFAULT_ROOT_PATH,
    getRequestPath: string = `${DEFAULT_ROOT_PATH}/get-request`,
    validateResponsePath: string = `${DEFAULT_ROOT_PATH}/validate-response`,
    resultPath: string = `${DEFAULT_ROOT_PATH}/result`
  ) {
    // Validate required parameters
    if (!rootPath || typeof rootPath !== 'string') {
      throw new TypeError('rootPath must be a non-empty string');
    }
    if (!getRequestPath || typeof getRequestPath !== 'string') {
      throw new TypeError('getRequestPath must be a non-empty string');
    }
    if (!validateResponsePath || typeof validateResponsePath !== 'string') {
      throw new TypeError('validateResponsePath must be a non-empty string');
    }
    if (!getDI || typeof getDI !== 'function') {
      throw new TypeError('getDI must be a function');
    }
    if (!resultPath || typeof resultPath !== 'string') {
      throw new TypeError('resultPath must be a non-empty string');
    }

    // Validate path formats
    const pathRegex = /^\/[a-zA-Z0-9\-_/]*$/;
    if (!pathRegex.test(rootPath)) {
      throw new Error(`Invalid rootPath format: ${rootPath}`);
    }
    if (!pathRegex.test(getRequestPath)) {
      throw new Error(`Invalid getRequestPath format: ${getRequestPath}`);
    }
    if (!pathRegex.test(validateResponsePath)) {
      throw new Error(
        `Invalid validateResponsePath format: ${validateResponsePath}`
      );
    }
    if (!pathRegex.test(resultPath)) {
      throw new Error(`Invalid resultPath format: ${resultPath}`);
    }
    // Ensure paths are unique
    const paths = [rootPath, getRequestPath, validateResponsePath, resultPath];
    const uniquePaths = new Set(paths);
    if (uniquePaths.size !== paths.length) {
      throw new Error('All route paths must be unique');
    }

    this.#rootPath = rootPath;
    this.#getRequestPath = getRequestPath;
    this.#validateResponsePath = validateResponsePath;
    this.#resultPath = resultPath;
    this.#getDI = getDI;

    console.log('DigitalCredentialsApi initialized:', {
      rootPath: this.#rootPath,
      getRequestPath: this.#getRequestPath,
      validateResponsePath: this.#validateResponsePath,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get Hono router
   *
   * @returns `Hono` instance containing routing definitions
   */
  get route(): Hono<Env> {
    try {
      const app = new Hono<Env>()
        .use(
          '*',
          jsxRenderer(({ children }) => <Template>{children}</Template>)
        )
        .get(this.#rootPath, this.rootHandler())
        .get(this.#getRequestPath, this.getRequestHandler())
        .post(this.#validateResponsePath, this.validateResponseHandler())
        .get(this.#resultPath, this.resultHandler());
      // .get('*', this.notFoundHandler());

      console.log('Route configuration completed:', {
        routes: [
          this.#rootPath,
          this.#getRequestPath,
          this.#validateResponsePath,
          this.#resultPath,
        ],
        timestamp: new Date().toISOString(),
      });

      return app;
    } catch (error) {
      console.error('Failed to configure routes:', {
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  /**
   * Root screen handler
   *
   * @returns Hono handler
   */
  rootHandler(): Handler<T> {
    return (c) => {
      try {
        console.log('Root page accessed:', {
          path: c.req.path,
          userAgent: c.req.raw.headers.get('user-agent'),
          timestamp: new Date().toISOString(),
        });

        return c.render(
          <DigitalCredentials
            getRequestPath={this.#getRequestPath}
            validateResponsePath={this.#validateResponsePath}
            resultPath={this.#resultPath}
          />
        );
      } catch (error) {
        console.error('Root handler error:', {
          error: error instanceof Error ? error.message : String(error),
          path: c.req.path,
          timestamp: new Date().toISOString(),
        });

        return c.render(
          <ErrorPage
            error="Failed to load root page"
            homePath={this.#rootPath}
          />
        );
      }
    };
  }

  /**
   * Request generation handler
   *
   * - Generate ephemeral ECDH key and save to session
   * - Return DC API request using public JWK
   *
   * @returns Hono handler (returns JSON)
   */
  getRequestHandler(): Handler<T> {
    try {
      return async (c) => {
        const { portsOut } = this.#getDI(c);
        const generateEphemeralECDHPrivateJwk =
          portsOut.generateEphemeralECDHPrivateJwk();
        const result = await generateEphemeralECDHPrivateJwk();
        const ecdhPrivateJwk = result.getOrThrow().toJSON();

        await portsOut.dcSession().save(JSON.stringify({ ecdhPrivateJwk }));

        const ecdhPublicJwk = JSON.parse(ecdhPrivateJwk);

        delete ecdhPublicJwk.d;
        return c.json(credentialRequest(ecdhPublicJwk), 200);
      };
    } catch (error) {
      console.error('Failed to create getRequestHandler:', {
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });

      // Return fallback handler
      return (c) =>
        c.json({ error: 'Failed to create getRequestHandler' }, 500);
    }
  }

  /**
   * Response validation handler
   *
   * - Decrypt and validate JARM JWT
   * - Validate mDL format VP Token
   * - Save VP Token to session
   *
   * @returns Hono handler (returns JSON)
   */
  validateResponseHandler(): Handler<T> {
    try {
      console.log('validateResponseHandler created successfully');
      return async (c) => {
        const { portsOut } = this.#getDI(c);
        const credentialResponse = await c.req.json();
        const jarmJwt = credentialResponse.data.response;
        const dcSession = portsOut.dcSession();
        const data = await dcSession.get();

        if (!data) {
          return c.json({ error: 'Session data not found' }, 400);
        }

        const ecdhPrivateJwk = JSON.parse(data).ecdhPrivateJwk;

        if (!ecdhPrivateJwk) {
          return c.json({ error: 'ECDH private key not found' }, 400);
        }

        const verifyJarmJwt = portsOut.verifyJarmJwt();
        const verifyJarmJwtResult = await verifyJarmJwt(
          new JarmOption.Encrypted('ECDH-ES', 'A128GCM'),
          new EphemeralECDHPrivateJwk(ecdhPrivateJwk),
          jarmJwt
        );

        const vpToken = (
          verifyJarmJwtResult.getOrThrow().vpToken! as unknown as Record<
            string,
            string[]
          >
        ).cred1[0];
        const verifier = new MdocVerifyHandlerImpl();
        const result = await verifier.verify(vpToken);
        await dcSession.save(JSON.stringify({ vpToken }));
        return c.json({ message: 'validateResponseHandler', result }, 200);
      };
    } catch (error) {
      console.error('Failed to create validateResponseHandler:', {
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });

      // Return fallback handler
      return (c) =>
        c.json({ error: 'Failed to create validateResponseHandler' }, 500);
    }
  }

  /**
   * Verification result display handler
   *
   * - Retrieve VP Token from session and re-validate
   * - Render result screen on successful validation
   *
   * @returns Hono handler (returns HTML)
   */
  resultHandler(): Handler<T> {
    return async (c) => {
      const { portsOut } = this.#getDI(c);
      const dcSession = portsOut.dcSession();
      const data = await dcSession.get();

      if (!data) {
        return c.json({ error: 'Session data not found' }, 400);
      }

      const vpToken = JSON.parse(data).vpToken;

      if (!vpToken) {
        return c.json({ error: 'VP token not found' }, 400);
      }

      const verifier = new MdocVerifyHandlerImpl();
      const result = await verifier.verify(vpToken);

      if (!result.valid) {
        return c.json({ error: 'Invalid VP token' }, 400);
      }

      return c.render(
        <Result
          data={result.documents}
          homePath={this.#rootPath}
          vpToken={vpToken}
        />
      );
    };
  }
}
