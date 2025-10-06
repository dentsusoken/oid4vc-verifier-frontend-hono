/**
 * Cloudflare Workers dependency injection module for OID4VC verifier frontend
 *
 * This module provides Cloudflare Workers-specific implementations of the
 * dependency injection pattern used throughout the OID4VC verifier frontend
 * application. It includes:
 *
 * - **HonoConfiguration**: Environment-based configuration management
 * - **PortsInputImpl**: Input port implementations for business logic services
 * - **PortsOutImpl**: Output port implementations for external dependencies
 * - **getDI**: Factory function for creating dependency injection containers
 *
 * The implementations are optimized for Cloudflare Workers environment,
 * utilizing Workers-specific APIs like KV storage and service bindings
 * while maintaining compatibility with the hexagonal architecture pattern.
 *
 * @example
 * ```typescript
 * import { getDI } from '@/di/cloudflare';
 *
 * // In a Hono handler
 * app.get('/api/endpoint', async (c) => {
 *   const { config, portsIn, portsOut } = getDI(c);
 *   const result = await portsIn.getInitTransaction().execute(request);
 *   return c.json(result);
 * });
 * ```
 *
 * @public
 */
export * from './ConfigurationImpl';
export * from './PortsOutImpl';
export * from './getDI';
