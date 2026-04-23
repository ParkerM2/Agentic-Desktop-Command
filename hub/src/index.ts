import { readFileSync } from 'node:fs';
import { hostname } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildApp } from './app.js';
import { createAdvertiser } from './mdns/advertiser.js';

const PORT_ENV = process.env.PORT;
const PORT = PORT_ENV === undefined || PORT_ENV === '' ? 3200 : Number(PORT_ENV);
const HOST = process.env.HOST ?? '0.0.0.0';

function readPackageVersion(): string {
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    // `dist/index.js` or `src/index.ts` — package.json is always one level up.
    const pkgPath = join(here, '..', 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { version?: string };
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

function resolveChannel(): 'release' | 'local' | 'dev' {
  const raw = process.env.HUB_CHANNEL;
  if (raw === 'release' || raw === 'local' || raw === 'dev') {
    return raw;
  }
  return 'release';
}

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

  const advertiser = createAdvertiser({
    hubId,
    version: readPackageVersion(),
    channel: resolveChannel(),
    displayName: process.env.HUB_DISPLAY_NAME ?? hostname(),
    port: PORT,
    fingerprint: tls.fingerprint,
  });
  try {
    await advertiser.start();
    app.log.info(`mDNS advertisement published as _adc-hub._tcp.local (${hubId})`);
  } catch (error) {
    app.log.warn({ err: error }, 'Failed to start mDNS advertiser — continuing without it');
  }

  let shuttingDown = false;
  const shutdown = (sig: NodeJS.Signals): void => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    app.log.info(`Received ${sig} — shutting down`);
    void (async () => {
      try {
        await advertiser.stop();
      } catch (error) {
        app.log.warn({ err: error }, 'mDNS advertiser stop failed');
      }
      try {
        await app.close();
      } catch (error) {
        app.log.warn({ err: error }, 'Fastify close failed');
      }
      process.exit(0);
    })();
  };

  process.on('SIGTERM', () => {
    shutdown('SIGTERM');
  });
  process.on('SIGINT', () => {
    shutdown('SIGINT');
  });
}

await start();
