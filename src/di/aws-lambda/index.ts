/**
 * AWS Lambda dependency injection module for OID4VC verifier frontend
 *
 * This module provides AWS Lambda-specific implementations of the
 * dependency injection pattern used throughout the OID4VC verifier frontend
 * application. It includes:
 *
 * - **HonoConfiguration**: AWS Secrets Manager-based configuration management
 * - **PortsInputImpl**: Input port implementations for business logic services
 * - **PortsOutImpl**: Output port implementations for AWS services (DynamoDB, etc.)
 * - **getDI**: Factory function for creating dependency injection containers
 *
 * The implementations are optimized for AWS Lambda environment,
 * utilizing AWS-specific services like Secrets Manager for configuration
 * and DynamoDB for session storage while maintaining compatibility
 * with the hexagonal architecture pattern.
 *
 * ## AWS Services Integration
 *
 * - **AWS Secrets Manager**: Secure configuration and secrets management
 * - **Amazon DynamoDB**: Session state persistence and data storage
 * - **AWS Lambda Context**: Runtime environment and execution context
 *
 * @example
 * ```typescript
 * import { getDI } from '@/di/aws-lambda';
 *
 * // In a Lambda handler
 * export const handler = async (event, context) => {
 *   const { config, portsIn, portsOut } = await getDI(context);
 *   const result = await portsIn.getInitTransaction().execute(request);
 *   return {
 *     statusCode: 200,
 *     body: JSON.stringify(result)
 *   };
 * };
 * ```
 *
 * @public
 */
export * from './HonoConfiguration';
export * from './PortsInputImpl';
export * from './PortsOutImpl';
export * from './getDI';
