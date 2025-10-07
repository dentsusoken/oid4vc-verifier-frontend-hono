import { FC } from 'hono/jsx';
import { Card } from './components/card';
import { html } from 'hono/html';

/**
 * Digital Credentials view properties
 *
 * - `getRequestPath`: Request generation endpoint
 * - `validateResponsePath`: Response validation endpoint
 * - `resultPath`: Result display path
 *
 * @public
 */
export interface DigitalCredentialsProps {
  /** Request generation endpoint */
  getRequestPath: string;
  /** Response validation endpoint */
  validateResponsePath: string;
  /** Result display path */
  resultPath: string;
}

/**
 * Digital Credentials UI component
 *
 * - Initiates verification flow using browser's Digital Credentials API
 * - Executes server validation after success and navigates to result screen
 *
 * @param props - Component arguments
 * @returns JSX
 * @public
 */
export const DigitalCredentials: FC<DigitalCredentialsProps> = ({
  getRequestPath,
  validateResponsePath,
  resultPath,
}) => {
  return (
    <Card title="Start Verification">
      <>
        <a
          class="block text-center text-lg text-white bg-green-500 hover:bg-green-700 py-2 px-4 rounded mb-4"
          role="button"
          aria-label="Start mDL verification process"
          id="mdl-verification-button"
          onClick={(e) => {
            e.preventDefault();
          }}
        >
          mDL Verification
        </a>
        {html`
          <script type="module">
            const getRequest = async () => {
              const response = await fetch('${getRequestPath}', {
                headers: { Accept: 'application/json' },
              });
              if (!response.ok) {
                throw new Error('Failed to get request');
              }
              const data = await response.json();
              return data;
            };

            const validateResponse = async (res) => {
              const response = await fetch('${validateResponsePath}', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Accept: 'application/json',
                },
                body: JSON.stringify(res),
              });
              if (!response.ok) {
                throw new Error('Failed to validate response');
              }
              const data = await response.json();
              return data;
            };

            const execute = async () => {
              const request = await getRequest();
              console.log('request', request);
              const credentialResponse = await navigator.credentials.get({
                digital: {
                  requests: [
                    {
                      protocol: request['protocol'],
                      data: request['request'],
                    },
                  ],
                },
              });
              if (
                credentialResponse &&
                credentialResponse.constructor &&
                credentialResponse.constructor.name === 'DigitalCredential'
              ) {
                const data = credentialResponse.data;
                const protocol = credentialResponse.protocol;
                console.log(
                  'Response Data: ' +
                    JSON.stringify(data) +
                    ' Protocol: ' +
                    protocol
                );
                const responseForServer = {
                  protocol: protocol,
                  data: data,
                  // state: request['state'], // stateが必要な場合に有効化
                };
                await validateResponse(responseForServer);
                window.location.pathname = '${resultPath}';
              }
            };
            const button = document.getElementById('mdl-verification-button');
            button.addEventListener('click', () => {
              execute();
            });
          </script>
        `}
      </>
    </Card>
  );
};
