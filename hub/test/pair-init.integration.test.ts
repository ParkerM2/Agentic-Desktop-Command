import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { request as httpsRequest } from 'node:https';

import { buildApp } from '../src/app.js';

interface JsonResponse<T = unknown> {
  status: number;
  body: T;
  rawBody: string;
}

function postJson<T = unknown>(opts: {
  host: string;
  port: number;
  path: string;
  ca: string;
  body: unknown;
  headers?: Record<string, string>;
}): Promise<JsonResponse<T>> {
  const payload = JSON.stringify(opts.body);
  return new Promise((resolve, reject) => {
    const req = httpsRequest(
      {
        host: opts.host,
        port: opts.port,
        path: opts.path,
        method: 'POST',
        ca: opts.ca,
        rejectUnauthorized: true,
        servername: 'localhost',
        headers: {
          'content-type': 'application/json',
          'content-length': Buffer.byteLength(payload).toString(),
          ...opts.headers,
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => {
          const rawBody = Buffer.concat(chunks).toString('utf8');
          let parsed: unknown = rawBody;
          try {
            parsed = JSON.parse(rawBody);
          } catch {
            /* leave as raw string */
          }
          resolve({
            status: res.statusCode ?? 0,
            body: parsed as T,
            rawBody,
          });
        });
      },
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

interface Harness {
  dir: string;
  address: { port: number };
  ca: string;
  close: () => Promise<void>;
  dbPath: string;
}

async function startHub(envOverrides: Record<string, string | undefined> = {}): Promise<Harness> {
  const prev: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(envOverrides)) {
    prev[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }

  const dir = mkdtempSync(join(tmpdir(), 'hub-pair-init-'));
  const dbPath = join(dir, 'claude-ui.db');
  const { app, tls } = await buildApp({ dataDir: dir, dbPath });
  await app.listen({ host: '127.0.0.1', port: 0 });
  const address = app.server.address();
  if (address === null || typeof address === 'string') {
    throw new Error('no address');
  }

  return {
    dir,
    address,
    ca: tls.cert,
    dbPath,
    async close() {
      await app.close();
      rmSync(dir, { recursive: true, force: true });
      for (const [k, v] of Object.entries(prev)) {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
      }
    },
  };
}

function samplePubKey(): { pubkey: string; fp: string } {
  const pubkey = randomBytes(32).toString('base64url');
  const fp = createHash('sha256')
    .update(Buffer.from(pubkey, 'base64url'))
    .digest('hex');
  return { pubkey, fp };
}

test('POST /api/pair/init — happy path mints nonce and persists binding', async () => {
  const hub = await startHub();
  try {
    const { pubkey } = samplePubKey();
    const res = await postJson<{ nonce: string; expiresAt: number }>({
      host: '127.0.0.1',
      port: hub.address.port,
      path: '/api/pair/init',
      ca: hub.ca,
      body: { clientId: 'client-a', clientPubKey: pubkey, displayName: 'Desktop' },
    });

    assert.equal(res.status, 200, `body: ${res.rawBody}`);
    assert.match(res.body.nonce, /^[A-Za-z0-9_-]{43}$/);
    assert.ok(res.body.expiresAt > Date.now(), `expiresAt should be future: ${res.body.expiresAt}`);

    // Verify client_bindings row persisted.
    const BetterSqlite3 = (await import('better-sqlite3')).default;
    const verifier = new BetterSqlite3(hub.dbPath, { readonly: true });
    try {
      const row = verifier
        .prepare('SELECT client_id, pubkey_der FROM client_bindings WHERE client_id = ?')
        .get('client-a') as { client_id: string; pubkey_der: Buffer } | undefined;
      assert.ok(row, 'client_bindings row should exist');
      assert.equal(row.client_id, 'client-a');
      assert.equal(
        row.pubkey_der.toString('base64url'),
        pubkey,
        'stored pubkey_der should round-trip to same base64url',
      );
    } finally {
      verifier.close();
    }
  } finally {
    await hub.close();
  }
});

test('POST /api/pair/init — 400 on empty body', async () => {
  const hub = await startHub();
  try {
    const res = await postJson({
      host: '127.0.0.1',
      port: hub.address.port,
      path: '/api/pair/init',
      ca: hub.ca,
      body: {},
    });
    assert.equal(res.status, 400, `body: ${res.rawBody}`);
  } finally {
    await hub.close();
  }
});

test('POST /api/pair/init — 409 IdentityConflict on pubkey mismatch', async () => {
  const hub = await startHub();
  try {
    const BetterSqlite3 = (await import('better-sqlite3')).default;
    const seeder = new BetterSqlite3(hub.dbPath);
    try {
      // Seed an api_keys row for 'client-a' with a DIFFERENT pubkey_fp.
      seeder
        .prepare(
          `INSERT INTO api_keys (id, key_hash, name, created_at, client_id, pubkey_fp)
             VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .run(
          'seed-id',
          createHash('sha256').update('seeded-key').digest('hex'),
          'seeded',
          new Date().toISOString(),
          'client-a',
          'deadbeef'.repeat(8),
        );
    } finally {
      seeder.close();
    }

    const { pubkey } = samplePubKey();
    const res = await postJson<{ error: string }>({
      host: '127.0.0.1',
      port: hub.address.port,
      path: '/api/pair/init',
      ca: hub.ca,
      body: { clientId: 'client-a', clientPubKey: pubkey },
    });

    assert.equal(res.status, 409, `body: ${res.rawBody}`);
    assert.equal(res.body.error, 'IdentityConflict');
  } finally {
    await hub.close();
  }
});

test('POST /api/pair/init — 429 after rate limit exhausted', async () => {
  const hub = await startHub({
    HUB_PAIR_RATE_LIMIT_INIT: '2',
    HUB_PAIR_RATE_LIMIT_INIT_WINDOW_MS: '60000',
  });
  try {
    const { pubkey } = samplePubKey();
    const body = { clientId: 'client-rl', clientPubKey: pubkey };

    const r1 = await postJson({
      host: '127.0.0.1',
      port: hub.address.port,
      path: '/api/pair/init',
      ca: hub.ca,
      body,
    });
    const r2 = await postJson({
      host: '127.0.0.1',
      port: hub.address.port,
      path: '/api/pair/init',
      ca: hub.ca,
      body,
    });
    const r3 = await postJson<{ error: string }>({
      host: '127.0.0.1',
      port: hub.address.port,
      path: '/api/pair/init',
      ca: hub.ca,
      body,
    });

    assert.equal(r1.status, 200, `r1: ${r1.rawBody}`);
    assert.equal(r2.status, 200, `r2: ${r2.rawBody}`);
    assert.equal(r3.status, 429, `r3: ${r3.rawBody}`);
    assert.equal(r3.body.error, 'RateLimited');
  } finally {
    await hub.close();
  }
});

test('POST /api/pair/init — bypasses API-key auth', async () => {
  // Seed a single api_keys row so the middleware has a "require auth" state
  // (not the empty-keys bootstrap bypass), then confirm /api/pair/init still
  // succeeds with no X-API-Key header.
  const hub = await startHub();
  try {
    const BetterSqlite3 = (await import('better-sqlite3')).default;
    const seeder = new BetterSqlite3(hub.dbPath);
    try {
      seeder
        .prepare(
          `INSERT INTO api_keys (id, key_hash, name, created_at)
             VALUES (?, ?, ?, ?)`,
        )
        .run(
          'seed',
          createHash('sha256').update('seeded-key').digest('hex'),
          'seeded',
          new Date().toISOString(),
        );
    } finally {
      seeder.close();
    }

    const { pubkey } = samplePubKey();
    const res = await postJson({
      host: '127.0.0.1',
      port: hub.address.port,
      path: '/api/pair/init',
      ca: hub.ca,
      body: { clientId: 'client-noauth', clientPubKey: pubkey },
    });

    assert.equal(res.status, 200, `body: ${res.rawBody}`);
  } finally {
    await hub.close();
  }
});
