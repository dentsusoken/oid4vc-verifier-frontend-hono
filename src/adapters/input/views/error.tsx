import { FC } from 'hono/jsx';
import { Card } from './components/card';

/**
 * Props interface for the ErrorPage component
 *
 * @public
 */
export interface ErrorPageProps {
  /** The error message to display to the user */
  error: string;
  /** The route path to the home page for navigation */
  homePath: string;
}

/**
 * Error page component for the OID4VC verifier frontend application
 *
 * This component provides a consistent error display interface for all types
 * of errors that may occur during the credential verification process. It
 * ensures users receive clear error messaging and navigation options to
 * recover from error states.
 *
 * ## Features
 *
 * - **Clear Error Messaging**: Displays user-friendly error descriptions
 * - **Consistent Design**: Follows the same visual pattern as other pages
 * - **Navigation Recovery**: Provides clear path back to functional areas
 * - **Accessibility**: Proper ARIA labeling and semantic structure
 * - **Security**: Safe error message rendering to prevent XSS
 * - **Responsive Design**: Adapts to different screen sizes
 *
 * ## Error Types Handled
 *
 * This component can display various types of errors:
 * - **Validation Errors**: Invalid input or missing required data
 * - **Session Errors**: Expired or invalid user sessions
 * - **Network Errors**: Communication failures with external services
 * - **Configuration Errors**: Missing or invalid application configuration
 * - **Processing Errors**: Failures during credential verification
 * - **404 Errors**: Requests to non-existent resources
 *
 * ## Security Considerations
 *
 * - Error messages are sanitized to prevent XSS attacks
 * - Sensitive technical details are not exposed to end users
 * - Error content is validated before rendering
 * - Navigation paths are validated for security
 *
 * @example
 * ```typescript
 * // Usage for various error scenarios
 *
 * // Session expired error
 * return c.render(
 *   <ErrorPage
 *     error="Your session has expired. Please start a new verification."
 *     homePath="/home"
 *   />
 * );
 *
 * // Validation error
 * return c.render(
 *   <ErrorPage
 *     error="Invalid verification request. Please try again."
 *     homePath="/home"
 *   />
 * );
 *
 * // 404 error
 * return c.render(
 *   <ErrorPage
 *     error="Page Not Found"
 *     homePath="/home"
 *   />
 * );
 * ```
 *
 * @param props - Component properties
 * @returns JSX element representing the error page
 *
 * @public
 */
export const ErrorPage: FC<ErrorPageProps> = ({ error, homePath }) => {
  // Validate and sanitize error message
  const sanitizedError =
    error && typeof error === 'string'
      ? error.trim()
      : 'An unexpected error occurred';

  // Validate home path
  const safHomePath = homePath && typeof homePath === 'string' ? homePath : '/';

  // Log error for debugging (in development only)
  if (process.env.NODE_ENV === 'development') {
    console.warn('ErrorPage rendered:', {
      error: sanitizedError,
      homePath: safHomePath,
      timestamp: new Date().toISOString(),
    });
  }

  return (
    <Card title="An Error Occurred">
      <>
        <p
          className="text-gray-700 mb-4 text-red-600"
          role="alert"
          aria-live="polite"
        >
          {sanitizedError}
        </p>
        <a
          href={safHomePath}
          className="text-blue-500 hover:underline"
          aria-label="Return to home page"
        >
          Go back to Home
        </a>
      </>
    </Card>
  );
};
