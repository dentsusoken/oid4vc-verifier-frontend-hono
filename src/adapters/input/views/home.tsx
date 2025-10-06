import { FC } from 'hono/jsx';
import { Card } from './components/card';

/**
 * Props interface for the Home component
 *
 * @public
 */
export interface HomeProps {
  /** The route path for transaction initialization (e.g., '/init') */
  initTransactionPath: string;
}

/**
 * Home page component for the OID4VC verifier frontend application
 *
 * This component serves as the landing page and entry point for the credential
 * verification process. It provides users with a clear call-to-action to begin
 * the mDL (mobile Driver's License) verification workflow.
 *
 * ## Features
 *
 * - **Clear Navigation**: Prominent button to start the verification process
 * - **User-Friendly Interface**: Simple, intuitive design with clear messaging
 * - **Responsive Design**: Adapts to different screen sizes through the Card component
 * - **Accessibility**: Semantic HTML with proper link structure
 *
 * ## User Journey
 *
 * The home page represents the first step in the OID4VC verification flow:
 * 1. User lands on the home page
 * 2. User clicks "mDL Verification" button
 * 3. User is redirected to the transaction initialization page
 * 4. Verification process begins
 *
 * @example
 * ```typescript
 * // Usage in routing
 * return c.render(<Home initTransactionPath="/init" />);
 *
 * // The component renders a card with:
 * // - "Start Verification" title
 * // - "mDL Verification" button linking to initTransactionPath
 * ```
 *
 * @param props - Component properties
 * @returns JSX element representing the home page content
 *
 * @public
 */
export const Home: FC<HomeProps> = ({ initTransactionPath }) => {
  // Validate required props
  if (!initTransactionPath || typeof initTransactionPath !== 'string') {
    console.error(
      'Home component: initTransactionPath is required and must be a string'
    );
    return (
      <Card title="Configuration Error">
        <>
          <p className="text-red-600 mb-4">
            Unable to load verification options. Please contact support.
          </p>
        </>
      </Card>
    );
  }

  return (
    <Card title="Start Verification">
      <>
        <a
          href={initTransactionPath}
          class="block text-center text-lg text-white bg-green-500 hover:bg-green-700 py-2 px-4 rounded mb-4"
          role="button"
          aria-label="Start mDL verification process"
        >
          mDL Verification
        </a>
        <a
          href={`${initTransactionPath}/unifiedID`}
          class="block text-center text-lg text-white bg-green-500 hover:bg-green-700 py-2 px-4 rounded mb-4"
          role="button"
          aria-label="Start unifiedID verification process"
        >
          UnifiedID Verification
        </a>
      </>
    </Card>
  );
};
