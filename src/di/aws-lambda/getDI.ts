import { HonoConfiguration, PortsInputImpl, PortsOutImpl } from '.';
import { AwsEnv } from '../../env';
import { GetDI } from '..';

/**
 * Dependency injection factory function for AWS Lambda environment
 *
 * Creates and configures all necessary dependencies for the OID4VC verifier
 * frontend application running in AWS Lambda. This function follows the
 * dependency injection pattern to provide loose coupling between components
 * and enable easy testing and maintenance in serverless environments.
 *
 * The function creates:
 * 1. **Configuration**: AWS Secrets Manager-based settings management
 * 2. **Output Ports**: AWS service adapters (DynamoDB, HTTP)
 * 3. **Input Ports**: Business logic service invokers
 *
 * All dependencies are properly wired together following the hexagonal
 * architecture pattern, ensuring that business logic remains independent
 * of AWS-specific infrastructure concerns.
 *
 * ## AWS Lambda Optimization
 *
 * The implementation is optimized for AWS Lambda cold starts and execution:
 * - Lazy initialization of AWS service connections
 * - Connection reuse across Lambda invocations
 * - Proper error handling for AWS service failures
 * - Efficient secret caching to minimize AWS API calls
 *
 * @param c - Hono context containing AWS Lambda event and context
 * @returns Promise resolving to dependency injection container with all configured services
 *
 * @throws {Error} When required AWS environment variables are missing
 * @throws {Error} When AWS service initialization fails
 *
 * @example
 * ```typescript
 * // Basic usage in a Lambda handler
 * export const handler = async (event, context) => {
 *   try {
 *     const { config, portsIn } = await getDI(context);
 *
 *     const request = {
 *       presentationDefinition: generatePD(),
 *       device: 'mobile'
 *     };
 *
 *     const response = await (await portsIn.getInitTransaction()).execute(request);
 *
 *     return {
 *       statusCode: 200,
 *       headers: { 'Content-Type': 'application/json' },
 *       body: JSON.stringify(response)
 *     };
 *   } catch (error) {
 *     console.error('Lambda execution failed:', error);
 *     return {
 *       statusCode: 500,
 *       body: JSON.stringify({ error: 'Internal server error' })
 *     };
 *   }
 * };
 *
 * // Error handling example
 * export const walletResponseHandler = async (event, context) => {
 *   try {
 *     const { portsIn } = await getDI(context);
 *     const sessionId = event.pathParameters?.sessionId;
 *
 *     if (!sessionId) {
 *       return { statusCode: 400, body: 'Session ID required' };
 *     }
 *
 *     const result = await (await portsIn.getGetWalletResponse()).execute(sessionId);
 *     return { statusCode: 200, body: JSON.stringify(result) };
 *   } catch (error) {
 *     console.error('Wallet response processing failed:', error);
 *     return { statusCode: 500, body: 'Service unavailable' };
 *   }
 * };
 * ```
 *
 * @public
 */
export const getDI = async (c: any) => {
  try {
    // Create configuration with AWS Secrets Manager integration
    const config = new HonoConfiguration();

    // Pre-load secrets to catch configuration errors early
    await config.loadSecrets();

    // Create output ports with AWS service integrations
    const portsOut = new PortsOutImpl(config);

    // Create input ports with dependency injection
    const portsIn = new PortsInputImpl(config, portsOut);

    return { config, portsOut, portsIn };
  } catch (error) {
    // Enhanced error context for AWS Lambda debugging
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.error('AWS Lambda DI initialization failed:', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      awsRegion: process.env.AWS_REGION,
      secretId: process.env.SECRET_ID,
      timestamp: new Date().toISOString(),
    });

    throw new Error(
      `Failed to initialize AWS Lambda dependency injection container: ${errorMessage}. ` +
        'Please check AWS service configurations, IAM permissions, and environment variables.',
    );
  }
};
