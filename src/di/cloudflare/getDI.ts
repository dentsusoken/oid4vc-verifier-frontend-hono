import { Context } from 'hono';
import { ConfigurationImpl } from './ConfigurationImpl';
import { PortsInputImpl } from 'oid4vc-verifier-frontend-core';
import { PortsOutImpl } from './PortsOutImpl';
import { CloudflareEnv } from '../../env';
import { GetDI } from '..';

/**
 * Dependency injection factory function for Cloudflare Workers environment
 *
 * Creates and configures all necessary dependencies for the OID4VC verifier
 * frontend application running in Cloudflare Workers. This function follows
 * the dependency injection pattern to provide loose coupling between
 * components and enable easy testing and maintenance.
 *
 * The function creates:
 * 1. **Configuration**: Environment-based settings management
 * 2. **Output Ports**: External service adapters (HTTP, KV storage)
 * 3. **Input Ports**: Business logic service invokers
 *
 * All dependencies are properly wired together following the hexagonal
 * architecture pattern, ensuring that business logic remains independent
 * of infrastructure concerns.
 *
 * @param c - Hono context containing Cloudflare Workers environment bindings
 * @returns Dependency injection container with all configured services
 *
 * @throws {TypeError} When context is null or undefined
 * @throws {Error} When required environment bindings are missing
 *
 * @example
 * ```typescript
 * // Basic usage in a Hono handler
 * app.get('/init', async (c) => {
 *   const { config, portsIn } = getDI(c);
 *
 *   const request = {
 *     presentationDefinition: generatePD(),
 *     device: 'mobile'
 *   };
 *
 *   const response = await portsIn.getInitTransaction().execute(request);
 *   return c.json(response);
 * });
 *
 * // Error handling example
 * app.get('/wallet-response', async (c) => {
 *   try {
 *     const { portsIn } = getDI(c);
 *     const result = await portsIn.getGetWalletResponse().execute(sessionId);
 *     return c.json(result);
 *   } catch (error) {
 *     console.error('DI setup failed:', error);
 *     return c.json({ error: 'Service unavailable' }, 500);
 *   }
 * });
 * ```
 *
 * @public
 */
export const getDI: GetDI<CloudflareEnv> = (c: Context<CloudflareEnv>) => {
  // Validate context parameter
  if (!c) {
    throw new TypeError(
      'Context parameter is required for dependency injection setup',
    );
  }

  try {
    // Create configuration with environment validation
    const config = new ConfigurationImpl(c);

    // Create output ports with proper error handling
    const portsOut = new PortsOutImpl(c, config);

    // Create input ports with dependency injection
    const portsIn = new PortsInputImpl(config, portsOut);

    return { config, portsOut, portsIn };
  } catch (error) {
    // Enhanced error context for debugging
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    throw new Error(
      `Failed to initialize dependency injection container: ${errorMessage}. ` +
        'Please check that all required environment variables and bindings are configured.',
    );
  }
};
