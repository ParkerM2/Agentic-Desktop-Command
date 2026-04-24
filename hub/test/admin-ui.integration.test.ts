import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { request as httpsRequest } from 'node:https';

import { hash as argon2Hash } from '@node-rs/argon2';

import { buildApp } from '../src/app.js';

interface RawResponse {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  body: string;
}

function httpRaw(opts: {
  host: string;
  port: number;
  path: string;
  method: string;
  ca: string;
  headers?: Record<string, string>;
}): Promise<RawResponse> {
  return new Promise((resolve, reject) => {
    const req = httpsRequest(
      {
        host: opts.host,
        port: opts.port,
        path: opts.path,
        method: opts.method,
        ca: opts.ca,
        rejectUnauthorized: true,
        servername: 'localhost',
        headers: opts.headers ?? {},
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => {
          resolve({
            status: res.statusCode ?? 0,
            headers: res.headers,
            body: Buffer.concat(chunks).toString('utf8'),
          });
        });
      },
    );
    req.on('error', reject);
    req.end();
  });
}

interface Harness {
  dir: string;
  port: number;
  ca: string;
  close: () => Promise<void>;
}

async function startHub(): Promise<Harness> {
  const dir = mkdtempSync(join(tmpdir(), 'hub-admin-ui-'));
  const dbPath = join(dir, 'claude-ui.db');
  const { app, tls } = await buildApp({ dataDir: dir, dbPath });
  await app.listen({ host: '127.0.0.1', port: 0 });
  const address = app.server.address();
  if (address === null || typeof address === 'string') throw new Error('no address');
  return {
    dir,
    port: address.port,
    ca: tls.cert,
    async close() {
      await app.close();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

function withEnv<T>(
  updates: Record<string, string | undefined>,
  fn: () => Promise<T>,
): Promise<T> {
  const prev: Record<string, string | undefined> = {};
  for (const k of Object.keys(updates)) {
    prev[k] = process.env[k];
    const v = updates[k];
    if (v === undefined) {
      delete process.env[k];
    } else {
      process.env[k] = v;
    }
  }
  return fn().finally(() => {
    for (const k of Object.keys(prev)) {
      const v = prev[k];
      if (v === undefined) {
        delete process.env[k];
      } else {
        process.env[k] = v;
      }
    }
  });
}

test('/admin returns 403 when admin env unset', async () => {
  await withEnv(
    { HUB_ADMIN_USER: undefined, HUB_ADMIN_PASSWORD_HASH: undefined },
    async () => {
      const hub = await startHub();
      try {
        const res = await httpRaw({
          host: '127.0.0.1',
          port: hub.port,
          path: '/admin',
          method: 'GET',
          ca: hub.ca,
        });
        assert.equal(res.status, 403, `body: ${res.body}`);
      } finally {
        await hub.close();
      }
    },
  );
});

test('/admin returns 401 without basic auth when env set', async () => {
  // Default algorithm in @node-rs/argon2 is Argon2id.
  const passwordHash = await argon2Hash('test-pass');
  await withEnv(
    { HUB_ADMIN_USER: 'admin', HUB_ADMIN_PASSWORD_HASH: passwordHash },
    async () => {
      const hub = await startHub();
      try {
        const res = await httpRaw({
          host: '127.0.0.1',
          port: hub.port,
          path: '/admin',
          method: 'GET',
          ca: hub.ca,
        });
        assert.equal(res.status, 401, `body: ${res.body}`);
        const wwwAuth = res.headers['www-authenticate'];
        assert.ok(
          typeof wwwAuth === 'string' && wwwAuth.startsWith('Basic '),
          `expected WWW-Authenticate header, got ${String(wwwAuth)}`,
        );
      } finally {
        await hub.close();
      }
    },
  );
});

test('/admin returns 200 html with correct basic auth', async () => {
  // Default algorithm in @node-rs/argon2 is Argon2id.
  const passwordHash = await argon2Hash('test-pass');
  await withEnv(
    { HUB_ADMIN_USER: 'admin', HUB_ADMIN_PASSWORD_HASH: passwordHash },
    async () => {
      const hub = await startHub();
      try {
        const creds = Buffer.from('admin:test-pass', 'utf8').toString('base64');
        const res = await httpRaw({
          host: '127.0.0.1',
          port: hub.port,
          path: '/admin',
          method: 'GET',
          ca: hub.ca,
          headers: { authorization: `Basic ${creds}` },
        });
        assert.equal(res.status, 200, `body: ${res.body.slice(0, 200)}`);
        const ct = res.headers['content-type'];
        assert.ok(
          typeof ct === 'string' && ct.includes('text/html'),
          `expected text/html, got ${String(ct)}`,
        );
        assert.ok(
          res.body.includes('<html') || res.body.includes('<!DOCTYPE html'),
          'body should contain HTML markup',
        );
        assert.ok(
          res.body.includes('ADC Hub Admin'),
          'body should contain admin UI heading',
        );
      } finally {
        await hub.close();
      }
    },
  );
});

test('/admin with wrong basic auth credentials returns 401', async () => {
  // Default algorithm in @node-rs/argon2 is Argon2id.
  const passwordHash = await argon2Hash('test-pass');
  await withEnv(
    { HUB_ADMIN_USER: 'admin', HUB_ADMIN_PASSWORD_HASH: passwordHash },
    async () => {
      const hub = await startHub();
      try {
        const creds = Buffer.from('admin:wrong-pass', 'utf8').toString('base64');
        const res = await httpRaw({
          host: '127.0.0.1',
          port: hub.port,
          path: '/admin',
          method: 'GET',
          ca: hub.ca,
          headers: { authorization: `Basic ${creds}` },
        });
        assert.equal(res.status, 401, `body: ${res.body}`);
      } finally {
        await hub.close();
      }
    },
  );
});
