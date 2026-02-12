import { buildApp } from './app.js';

const PORT = Number(process.env['PORT']) || 3200;
const HOST = process.env['HOST'] ?? '0.0.0.0';

async function start(): Promise<void> {
  const app = await buildApp();

  try {
    await app.listen({ port: PORT, host: HOST });
    app.log.info(`Hub server listening on ${HOST}:${PORT}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

void start();
