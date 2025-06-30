import { html, raw } from 'hono/html';
import { FC } from 'hono/jsx';
import { Card } from './components/card';
import { toString } from 'qrcode';

/**
 * Props interface for the Init component
 *
 * @public
 */
export interface InitProps {
  /** The wallet redirect URL containing presentation parameters */
  redirectUrl: string;
  /** The route path to the home page for navigation */
  homePath: string;
  /** The detected device type (e.g., 'mobile', 'desktop') */
  device?: string;
  /** The route path to the result page for polling */
  resultPath?: string;
}

/**
 * Transaction initialization component for the OID4VC verifier frontend
 *
 * This component handles the presentation of credential verification options
 * to users after a transaction has been initialized. It provides multiple
 * interaction methods based on the user's device type and supports both
 * mobile and desktop workflows.
 *
 * ## Features
 *
 * - **QR Code Display**: Shows QR code for non-mobile devices for easy scanning
 * - **Direct Wallet Link**: Provides clickable link to redirect to wallet application
 * - **Device Detection**: Adapts interface based on detected device type
 * - **Auto-Polling**: Automatically checks for completion on non-mobile devices
 * - **Navigation**: Back button to return to home page
 * - **Error Handling**: Graceful handling of QR code generation failures
 *
 * ## Device-Specific Behavior
 *
 * ### Mobile Devices
 * - QR code is hidden (users are on the same device)
 * - Direct wallet redirect button is prominent
 * - No auto-polling (user will be redirected back)
 *
 * ### Desktop/Non-Mobile Devices
 * - QR code is displayed for mobile wallet scanning
 * - Wallet redirect button available as fallback
 * - Auto-polling checks result endpoint every second for 5 minutes
 *
 * ## Security Considerations
 *
 * - URLs are validated before QR code generation
 * - Polling has timeout limits to prevent resource exhaustion
 * - Error states provide minimal information to prevent information disclosure
 *
 * @example
 * ```typescript
 * // Usage in transaction initialization
 * return c.render(
 *   <Init
 *     redirectUrl="wallet://verify?request=..."
 *     homePath="/home"
 *     device="mobile"
 *     resultPath="/result"
 *   />
 * );
 * ```
 *
 * @param props - Component properties
 * @returns Promise resolving to JSX element representing the initialization page
 *
 * @public
 */
export const Init: FC<InitProps> = async ({
  redirectUrl,
  homePath,
  device,
  resultPath,
}) => {
  // Validate required props
  if (!redirectUrl || typeof redirectUrl !== 'string') {
    console.error(
      'Init component: redirectUrl is required and must be a string',
    );
    return (
      <Card title="Configuration Error">
        <>
          <p className="text-red-600 mb-4">
            Unable to initialize verification. Please try again.
          </p>
          <a href={homePath || '/'} className="text-blue-500 hover:underline">
            Go back to Home
          </a>
        </>
      </Card>
    );
  }

  if (!homePath || typeof homePath !== 'string') {
    console.error('Init component: homePath is required and must be a string');
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

  // Generate QR code with error handling
  let qrCodeSvg: string;
  try {
    qrCodeSvg = await toString(redirectUrl);
  } catch (error) {
    console.error('Failed to generate QR code:', error);
    qrCodeSvg = '';
  }

  const isMobile = device === 'mobile';
  const shouldShowQR = !isMobile && qrCodeSvg;
  const shouldEnablePolling = !isMobile && resultPath;

  return (
    <Card title="Verification Started">
      <>
        {shouldShowQR && (
          <div
            class="max-w-48 max-h-48 min-w-28 min-h-28 mx-auto"
            role="img"
            aria-label="QR code for wallet verification"
          >
            {raw(qrCodeSvg)}
          </div>
        )}

        {!shouldShowQR && !isMobile && qrCodeSvg === '' && (
          <div class="text-center text-gray-600 mb-4">
            <p>QR code unavailable. Please use the wallet link below.</p>
          </div>
        )}

        <a
          href={redirectUrl}
          class="block text-center text-lg text-white bg-green-500 hover:bg-green-700 py-2 px-4 rounded mb-4"
          role="button"
          aria-label="Redirect to wallet application for verification"
        >
          Redirect to Wallet
        </a>

        <a
          href={homePath}
          className="text-blue-500 hover:underline"
          aria-label="Return to home page"
        >
          Go back to Home
        </a>

        {shouldEnablePolling &&
          html`
            <script>
              (function () {
                const startAt = Date.now();
                const POLLING_INTERVAL = 1000; // 1 second
                const TIMEOUT_DURATION = 300000; // 5 minutes
                const RESULT_PATH = '${resultPath}';

                if (!RESULT_PATH) {
                  console.warn('Result path not configured for polling');
                  return;
                }

                const pollForResult = async () => {
                  try {
                    const response = await fetch(RESULT_PATH);
                    if (response.ok) {
                      window.location.href = RESULT_PATH;
                      return true; // Stop polling
                    }
                  } catch (error) {
                    console.warn('Polling request failed:', error);
                  }
                  return false; // Continue polling
                };

                const intervalId = setInterval(async () => {
                  const now = Date.now();

                  // Check timeout
                  if (now - startAt > TIMEOUT_DURATION) {
                    clearInterval(intervalId);
                    console.log('Polling timeout reached');
                    return;
                  }

                  // Poll for result
                  const shouldStop = await pollForResult();
                  if (shouldStop) {
                    clearInterval(intervalId);
                  }
                }, POLLING_INTERVAL);

                // Cleanup on page unload
                window.addEventListener('beforeunload', () => {
                  clearInterval(intervalId);
                });
              })();
            </script>
          `}
      </>
    </Card>
  );
};
