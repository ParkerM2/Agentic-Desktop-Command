import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createPrivateKey,
  generateKeyPairSync,
  sign,
} from 'node:crypto';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { request as httpsRequest } from 'node:https';

import { buildApp } from '../src/app.js';

interface JsonResponse<T = unknown> {
  status: number;
  body: T;
  rawBody: string;
}

function httpJson<T = unknown>(opts: {
  host: string;
  port: number;
  path: string;
  method: string;
  ca: string;
  body?: unknown;
  headers?: Record<string, string>;
}): Promise<JsonResponse<T>> {
  const hasBody = opts.body !== undefined;
  const payload = hasBody ? JSON.stringify(opts.body) : '';
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
        headers: {
          ...(hasBody
            ? {
                'content-type': 'application/json',
                'content-length': Buffer.byteLength(payload).toString(),
              }
            : {}),
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
            /* leave raw */
          }
          resolve({ status: res.statusCode ?? 0, body: parsed as T, rawBody });
        });
      },
    );
    req.on('error', reject);
    if (hasBody) req.write(payload);
    req.end();
  });
}

interface Harness {
  dir: string;
  address: { port: number };
  ca: string;
  adminKey: string;
  close: () => Promise<void>;
  dbPath: string;
}

async function startHub(): Promise<Harness> {
  const dir = mkdtempSync(join(tmpdir(), 'hub-admin-clients-'));
  const dbPath = join(dir, 'claude-ui.db');
  const { app, tls } = await buildApp({ dataDir: dir, dbPath });
  await app.listen({ host: '127.0.0.1', port: 0 });
  const address = app.server.address();
  if (address === null || typeof address === 'string') throw new Error('no address');
  const adminKey = readFileSync(join(dir, 'admin-key.txt'), 'utf8').trim();
  return {
    dir,
    address,
    ca: tls.cert,
    adminKey,
    dbPath,
    async close() {
      await app.close();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

interface Keypair {
  privateDer: Buffer;
  publicB64url: string;
}

function makeKeypair(): Keypair {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'der' },
    privateKeyEncoding: { type: 'pkcs8', format: 'der' },
  });
  return {
    privateDer: privateKey,
    publicB64url: publicKey.toString('base64url'),
  };
}

function signNonce(nonce: string, privateDer: Buffer): string {
  const privKey = createPrivateKey({ key: privateDer, format: 'der', type: 'pkcs8' });
  return sign(null, Buffer.from(nonce, 'base64url'), privKey).toString('base64url');
}

async function pairClient(
  hub: Harness,
  clientId: string,
  displayName?: string,
): Promise<{ key: string; kp: Keypair }> {
  const kp = makeKeypair();
  const initRes = await httpJson<{ nonce: string }>({
    host: '127.0.0.1',
    port: hub.address.port,
    path: '/api/pair/init',
    method: 'POST',
    ca: hub.ca,
    body: { clientId, clientPubKey: kp.publicB64url, displayName },
  });
  assert.equal(initRes.status, 200, `init: ${initRes.rawBody}`);
  const signature = signNonce(initRes.body.nonce, kp.privateDer);
  const confirmRes = await httpJson<{ key: string }>({
    host: '127.0.0.1',
    port: hub.address.port,
    path: '/api/pair/confirm',
    method: 'POST',
    ca: hub.ca,
    body: { clientId, nonce: initRes.body.nonce, signature, displayName },
  });
  assert.equal(confirmRes.status, 200, `confirm: ${confirmRes.rawBody}`);
  return { key: confirmRes.body.key, kp };
}

interface AdminClient {
  clientId: string;
  displayName: string | null;
  pairedAt: string;
  lastSeenAt: number | null;
  revokedAt: number | null;
  revokedReason: string | null;
}

test('GET /api/admin/clients — 401 without admin key', async () => {
  const hub = await startHub();
  try {
    const res = await httpJson({
      host: '127.0.0.1',
      port: hub.address.port,
      path: '/api/admin/clients',
      method: 'GET',
      ca: hub.ca,
    });
    assert.equal(res.status, 401, `body: ${res.rawBody}`);
  } finally {
    await hub.close();
  }
});

test('GET /api/admin/clients — 200 with paired clients', async () => {
  const hub = await startHub();
  try {
    await pairClient(hub, 'client-one', 'Laptop One');
    await pairClient(hub, 'client-two', 'Desktop Two');

    const res = await httpJson<AdminClient[]>({
      host: '127.0.0.1',
      port: hub.address.port,
      path: '/api/admin/clients',
      method: 'GET',
      ca: hub.ca,
      headers: { 'x-admin-key': hub.adminKey },
    });
    assert.equal(res.status, 200, `body: ${res.rawBody}`);
    assert.ok(Array.isArray(res.body), 'body should be array');
    assert.equal(res.body.length, 2);
    const byId = Object.fromEntries(res.body.map((c) => [c.clientId, c]));
    assert.ok(byId['client-one']);
    assert.equal(byId['client-one'].displayName, 'Laptop One');
    assert.equal(byId['client-one'].revokedAt, null);
    assert.ok(byId['client-one'].lastSeenAt !== null, 'lastSeenAt should derive from pair.confirm audit');
  } finally {
    await hub.close();
  }
});

test('POST /api/admin/clients/:id/revoke — 200 updates=1 and key becomes invalid', async () => {
  const hub = await startHub();
  try {
    const { key } = await pairClient(hub, 'client-rev', 'Revoke Me');

    const revokeRes = await httpJson<{ updated: number }>({
      host: '127.0.0.1',
      port: hub.address.port,
      path: '/api/admin/clients/client-rev/revoke',
      method: 'POST',
      ca: hub.ca,
      headers: { 'x-admin-key': hub.adminKey },
      body: { reason: 'compromised' },
    });
    assert.equal(revokeRes.status, 200, `revoke: ${revokeRes.rawBody}`);
    assert.equal(revokeRes.body.updated, 1);

    // Revoked key should now be rejected.
    const probe = await httpJson({
      host: '127.0.0.1',
      port: hub.address.port,
      path: '/api/projects',
      method: 'GET',
      ca: hub.ca,
      headers: { 'x-api-key': key },
    });
    assert.equal(probe.status, 401, `revoked key should be rejected: ${probe.rawBody}`);
  } finally {
    await hub.close();
  }
});

test('POST /api/admin/clients/:id/rename — 200 and list shows new name', async () => {
  const hub = await startHub();
  try {
    await pairClient(hub, 'client-rename', 'Old Name');

    const renameRes = await httpJson<{ updated: number }>({
      host: '127.0.0.1',
      port: hub.address.port,
      path: '/api/admin/clients/client-rename/rename',
      method: 'POST',
      ca: hub.ca,
      headers: { 'x-admin-key': hub.adminKey },
      body: { displayName: 'New Name' },
    });
    assert.equal(renameRes.status, 200, `rename: ${renameRes.rawBody}`);
    assert.equal(renameRes.body.updated, 1);

    const listRes = await httpJson<AdminClient[]>({
      host: '127.0.0.1',
      port: hub.address.port,
      path: '/api/admin/clients',
      method: 'GET',
      ca: hub.ca,
      headers: { 'x-admin-key': hub.adminKey },
    });
    assert.equal(listRes.status, 200);
    const row = listRes.body.find((c) => c.clientId === 'client-rename');
    assert.ok(row);
    assert.equal(row.displayName, 'New Name');
  } finally {
    await hub.close();
  }
});

test('POST /api/admin/clients/:id/reset-identity — deletes binding and revokes key', async () => {
  const hub = await startHub();
  try {
    await pairClient(hub, 'client-reset', 'Reset Me');

    const resetRes = await httpJson<{ deleted: number; revoked: number }>({
      host: '127.0.0.1',
      port: hub.address.port,
      path: '/api/admin/clients/client-reset/reset-identity',
      method: 'POST',
      ca: hub.ca,
      headers: { 'x-admin-key': hub.adminKey },
    });
    assert.equal(resetRes.status, 200, `reset: ${resetRes.rawBody}`);
    assert.equal(resetRes.body.deleted, 1);
    assert.equal(resetRes.body.revoked, 1);

    // Verify: client_bindings row gone, api_keys row revoked.
    const BetterSqlite3 = (await import('better-sqlite3')).default;
    const db = new BetterSqlite3(hub.dbPath, { readonly: true });
    try {
      const binding = db
        .prepare('SELECT client_id FROM client_bindings WHERE client_id = ?')
        .get('client-reset');
      assert.equal(binding, undefined, 'client_bindings row should be gone');

      const keyRow = db
        .prepare('SELECT revoked_at, revoked_reason FROM api_keys WHERE client_id = ? AND revoked_at IS NOT NULL')
        .get('client-reset') as { revoked_at: number; revoked_reason: string } | undefined;
      assert.ok(keyRow, 'api_keys row should be revoked');
      assert.equal(keyRow.revoked_reason, 'identity_reset');
    } finally {
      db.close();
    }
  } finally {
    await hub.close();
  }
});

test('/api/admin/* — bypasses X-API-Key middleware (401 is from admin middleware, not api-key)', async () => {
  const hub = await startHub();
  try {
    // No x-admin-key, no x-api-key: should be 401 with an admin-specific error shape.
    const res = await httpJson<{ error: string }>({
      host: '127.0.0.1',
      port: hub.address.port,
      path: '/api/admin/clients',
      method: 'GET',
      ca: hub.ca,
    });
    assert.equal(res.status, 401);
    // The admin middleware writes "Missing X-Admin-Key header", not "Missing X-API-Key header".
    assert.match(res.body.error, /admin/i, `expected admin-middleware 401, got: ${res.rawBody}`);
  } finally {
    await hub.close();
  }
});
