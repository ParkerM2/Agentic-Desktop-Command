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
            /* raw */
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
  const dir = mkdtempSync(join(tmpdir(), 'hub-admin-audit-'));
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

function makeKeypair(): { privateDer: Buffer; publicB64url: string } {
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

async function pairClient(hub: Harness, clientId: string): Promise<void> {
  const kp = makeKeypair();
  const initRes = await httpJson<{ nonce: string }>({
    host: '127.0.0.1',
    port: hub.address.port,
    path: '/api/pair/init',
    method: 'POST',
    ca: hub.ca,
    body: { clientId, clientPubKey: kp.publicB64url },
  });
  assert.equal(initRes.status, 200, `init: ${initRes.rawBody}`);
  const sig = signNonce(initRes.body.nonce, kp.privateDer);
  const confirmRes = await httpJson({
    host: '127.0.0.1',
    port: hub.address.port,
    path: '/api/pair/confirm',
    method: 'POST',
    ca: hub.ca,
    body: { clientId, nonce: initRes.body.nonce, signature: sig },
  });
  assert.equal(confirmRes.status, 200, `confirm: ${confirmRes.rawBody}`);
}

interface AuditRow {
  id: string;
  ts: number;
  event_type: string;
  client_id: string | null;
  outcome: string;
}

test('GET /api/admin/audit — eventType filter returns matching events only', async () => {
  const hub = await startHub();
  try {
    await pairClient(hub, 'audit-client');

    const res = await httpJson<AuditRow[]>({
      host: '127.0.0.1',
      port: hub.address.port,
      path: '/api/admin/audit?eventType=pair.confirm',
      method: 'GET',
      ca: hub.ca,
      headers: { 'x-admin-key': hub.adminKey },
    });
    assert.equal(res.status, 200, `body: ${res.rawBody}`);
    assert.ok(Array.isArray(res.body));
    assert.ok(res.body.length >= 1, 'at least one pair.confirm event expected');
    for (const ev of res.body) {
      assert.equal(ev.event_type, 'pair.confirm');
    }
  } finally {
    await hub.close();
  }
});

test('GET /api/admin/audit — 401 without admin key', async () => {
  const hub = await startHub();
  try {
    const res = await httpJson({
      host: '127.0.0.1',
      port: hub.address.port,
      path: '/api/admin/audit',
      method: 'GET',
      ca: hub.ca,
    });
    assert.equal(res.status, 401);
  } finally {
    await hub.close();
  }
});

test('POST /api/admin/rotate-admin-key — rotates key atomically', async () => {
  const hub = await startHub();
  try {
    const oldKey = hub.adminKey;

    const rotateRes = await httpJson<{ key: string }>({
      host: '127.0.0.1',
      port: hub.address.port,
      path: '/api/admin/rotate-admin-key',
      method: 'POST',
      ca: hub.ca,
      headers: { 'x-admin-key': oldKey },
    });
    assert.equal(rotateRes.status, 200, `rotate: ${rotateRes.rawBody}`);
    const newKey = rotateRes.body.key;
    assert.notEqual(newKey, oldKey, 'new key should differ from old');
    assert.match(newKey, /^[0-9a-f]{64}$/, 'key should be 32-byte hex');

    // Old key rejected.
    const oldAttempt = await httpJson({
      host: '127.0.0.1',
      port: hub.address.port,
      path: '/api/admin/clients',
      method: 'GET',
      ca: hub.ca,
      headers: { 'x-admin-key': oldKey },
    });
    assert.equal(oldAttempt.status, 401, `old key should be rejected: ${oldAttempt.rawBody}`);

    // New key accepted.
    const newAttempt = await httpJson({
      host: '127.0.0.1',
      port: hub.address.port,
      path: '/api/admin/clients',
      method: 'GET',
      ca: hub.ca,
      headers: { 'x-admin-key': newKey },
    });
    assert.equal(newAttempt.status, 200, `new key should be accepted: ${newAttempt.rawBody}`);

    // And the disk file was updated.
    const onDisk = readFileSync(join(hub.dir, 'admin-key.txt'), 'utf8').trim();
    assert.equal(onDisk, newKey, 'disk file should match new key');
  } finally {
    await hub.close();
  }
});

test('POST /api/admin/rotate-admin-key — 401 without admin key', async () => {
  const hub = await startHub();
  try {
    const res = await httpJson({
      host: '127.0.0.1',
      port: hub.address.port,
      path: '/api/admin/rotate-admin-key',
      method: 'POST',
      ca: hub.ca,
    });
    assert.equal(res.status, 401);
  } finally {
    await hub.close();
  }
});
