import { FC } from 'hono/jsx';
import { Card } from './components/card';
import { PresentationDetail } from './components/presntationDetail';

/**
 * Props interface for the Result component
 *
 * @public
 */
export interface ResultProps {
  /**
   * Verified credential data extracted from VP tokens
   * Array of credential documents with their respective data fields
   */
  data: Record<string, Record<string, unknown>>[] | undefined;
  /** The raw VP (Verifiable Presentation) token string */
  vpToken: string;
  /** The route path to the home page for navigation */
  homePath: string;
}

/**
 * Verification result display component for the OID4VC verifier frontend
 *
 * This component presents the results of credential verification to users,
 * displaying both the processed credential data in a user-friendly format
 * and providing access to the raw VP token for technical inspection.
 *
 * ## Features
 *
 * - **Credential Display**: Shows verified credential data in organized sections
 * - **Raw Token Access**: Provides expandable section with raw VP token
 * - **Error Handling**: Graceful handling of missing or invalid data
 * - **Navigation**: Back button to return to home page
 * - **Accessibility**: Proper labeling and semantic structure
 * - **Security**: Safe rendering of credential data with XSS protection
 *
 * ## Data Processing
 *
 * The component processes credential data by:
 * 1. Iterating through verified credential documents
 * 2. Extracting document IDs and associated data
 * 3. Rendering each document using PresentationDetail component
 * 4. Handling various data types (text, images, dates, objects)
 *
 * ## Security Considerations
 *
 * - Credential data is rendered safely to prevent XSS attacks
 * - Raw VP tokens are displayed in disabled text areas
 * - No sensitive data is logged to console
 * - Error states provide minimal information disclosure
 *
 * @example
 * ```typescript
 * // Usage in result processing
 * return c.render(
 *   <Result
 *     data={verifiedCredentials}
 *     vpToken="eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NiJ9..."
 *     homePath="/home"
 *   />
 * );
 *
 * // Example credential data structure:
 * const data = [
 *   {
 *     "org.iso.18013.5.1.mDL": {
 *       "family_name": "Doe",
 *       "given_name": "John",
 *       "birth_date": "1990-01-01",
 *       "portrait": Uint8Array([...])
 *     }
 *   }
 * ];
 * ```
 *
 * @param props - Component properties
 * @returns JSX element representing the verification results page
 *
 * @public
 */
export const Result: FC<ResultProps> = ({ data, vpToken, homePath }) => {
  // Validate required props
  if (!vpToken || typeof vpToken !== 'string') {
    console.error('Result component: vpToken is required and must be a string');
    return (
      <Card title="Verification Error">
        <>
          <p className="text-red-600 mb-4">
            No verification token available. Please try the verification process
            again.
          </p>
          <a
            href={homePath || '/'}
            className="text-blue-500 hover:underline"
            aria-label="Return to home page"
          >
            Go back to Home
          </a>
        </>
      </Card>
    );
  }

  if (!homePath || typeof homePath !== 'string') {
    console.error(
      'Result component: homePath is required and must be a string',
    );
    return (
      <Card title="Configuration Error">
        <>
          <p className="text-red-600 mb-4">
            Navigation configuration error. Please contact support.
          </p>
        </>
      </Card>
    );
  }

  // Check if credential data is available
  const hasCredentialData = data && Array.isArray(data) && data.length > 0;
  const hasValidCredentials =
    hasCredentialData &&
    data.some(
      (credential) =>
        credential &&
        typeof credential === 'object' &&
        Object.keys(credential).length > 0,
    );

  return (
    <Card title="Presentation Result">
      <>
        <div role="region" aria-label="Verified credential information">
          {hasValidCredentials ? (
            data?.map((credential, credentialIndex) =>
              Object.entries(credential).map(
                ([documentId, documentData], entryIndex) => (
                  <PresentationDetail
                    key={`${credentialIndex}-${entryIndex}-${documentId}`}
                    title={documentId}
                    data={documentData}
                  />
                ),
              ),
            )
          ) : (
            <div className="text-center text-gray-600 mb-4">
              <p>No credential data available to display.</p>
              {hasCredentialData && (
                <p className="text-sm text-gray-500 mt-2">
                  The verification was successful, but no readable credential
                  information was found.
                </p>
              )}
            </div>
          )}
        </div>

        <details class="mt-6" role="region" aria-label="Raw verification token">
          <summary className="cursor-pointer text-gray-700 hover:text-gray-900">
            Raw VP Token
          </summary>
          <div className="mt-2">
            <textarea
              name="vp_token"
              id="vp_token"
              disabled={true}
              class="w-full h-96 p-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-white text-gray-900"
              aria-label="Raw verifiable presentation token"
              readonly
            >
              {vpToken}
            </textarea>
          </div>
        </details>

        <a
          href={homePath}
          className="text-blue-500 hover:underline mt-4 inline-block"
          aria-label="Return to home page"
        >
          Go back to Home
        </a>
      </>
    </Card>
  );
};
