import { html, raw } from 'hono/html';
import { FC } from 'hono/jsx';
import { Card } from './components/card';
import { toString } from 'qrcode';

export type InitProps = {
  redirectUrl: string;
  homePath: string;
  device?: string;
  resultPath?: string;
};

export const Init: FC<InitProps> = async ({
  redirectUrl,
  homePath,
  device,
  resultPath,
}) => {
  const qr = await toString(redirectUrl);

  return (
    <Card title="Verification Started">
      <>
        {device !== 'mobile' && (
          <div class="max-w-48 max-h-48 min-w-28 min-h-28 mx-auto">
            {raw(qr)}
          </div>
        )}
        <a
          href={redirectUrl}
          class="block text-center text-lg text-white bg-green-500 hover:bg-green-700 py-2 px-4 rounded mb-4"
        >
          Redirect to Wallet
        </a>
        <a href={homePath} className="text-blue-500 hover:underline">
          Go back to Home
        </a>
        {device !== 'mobile' &&
          resultPath &&
          html`
            <script>
              const startAt = Date.now();
              const id = setInterval(async () => {
                const res = await fetch('${resultPath}');
                if (res.ok) {
                  window.location.href = '${resultPath}';
                }
                const now = Date.now();
                if (now - startAt > 300000) {
                  clearInterval(id);
                }
              }, 1000);
            </script>
          `}
      </>
    </Card>
  );
};
