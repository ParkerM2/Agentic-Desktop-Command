import { buildApp } from './app.js';

const PORT = Number(process.env['PORT']) || 3200;
const HOST = process.env['HOST'] ?? '0.0.0.0';

async function start(): Promise<void> {
  const { app, hubId, tls } = await buildApp({ port: PORT });

  try {
    await app.listen({ port: PORT, host: HOST });
    app.log.info(
      `Hub server listening on https://${HOST}:${PORT} hubId=${hubId} fingerprint=${tls.fingerprint}`,
    );
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

void start();
