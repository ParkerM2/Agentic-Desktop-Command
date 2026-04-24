import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createPrivateKey,
  generateKeyPairSync,
  sign,
} from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { request as httpsRequest } from 'node:https';

import Database from 'better-sqlite3';
import WebSocket from 'ws';

import { buildApp } from '../src/app.js';
import { runMigrations } from '../src/db/migration-runner.js';
import { createAuditRepo } from '../src/lib/audit-repo.js';
import { createRevocationBus } from '../src/lib/revocation-bus.js';
import { revokeClient } from '../src/lib/revoke-client.js';
import { hashKey } from '../src/middleware/api-key.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, '..', 'src', 'db', 'migrations');

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

function makeKeypair(): {
  publicB64url: string;
  privateDer: Buffer;
} {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'der' },
    privateKeyEncoding: { type: 'pkcs8', format: 'der' },
  });
  return {
    publicB64url: publicKey.toString('base64url'),
    privateDer: privateKey,
  };
}

function signNonce(nonce: string, privateDer: Buffer): string {
  const privKey = createPrivateKey({
    key: privateDer,
    format: 'der',
    type: 'pkcs8',
  });
  return sign(null, Buffer.from(nonce, 'base64url'), privKey).toString('base64url');
}

// ---------------------------------------------------------------------------

test('revokeClient — writes revoked_at/reason and emits bus event', () => {
  const db = new Database(':memory:');
  try {
    runMigrations(db, migrationsDir);

    db.prepare(
      `INSERT INTO api_keys (id, key_hash, name, client_id, revoked_at, revoked_reason)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run('k-1', hashKey('secret-live'), 'test-key', 'client-revoke-1', null, null);

    const bus = createRevocationBus();
    const audit = createAuditRepo(db);

    const received: Array<{ clientId: string; reason: string }> = [];
    bus.onRevoke((clientId, reason) => {
      received.push({ clientId, reason });
    });

    const result = revokeClient({ db, bus, audit }, 'client-revoke-1', 'test');
    assert.equal(result.updated, 1, 'one row should have been updated');

    const row = db
      .prepare(
        'SELECT revoked_at, revoked_reason FROM api_keys WHERE client_id = ?',
      )
      .get('client-revoke-1') as {
      revoked_at: number | null;
      revoked_reason: string | null;
    };
    assert.ok(row.revoked_at !== null && row.revoked_at > 0, 'revoked_at must be set');
    assert.equal(row.revoked_reason, 'test');

    assert.deepEqual(received, [{ clientId: 'client-revoke-1', reason: 'test' }]);

    // key.revoke audit row should have landed too.
    const auditRows = audit.list({ clientId: 'client-revoke-1' });
    const revokeAudit = auditRows.find((r) => r.event_type === 'key.revoke');
    assert.ok(revokeAudit, 'key.revoke audit event must be recorded');
    assert.equal(revokeAudit.outcome, 'success');
    assert.equal(revokeAudit.reason, 'test');

    // Idempotency — calling again changes no rows (already revoked), but still fires.
    received.length = 0;
    const second = revokeClient({ db, bus, audit }, 'client-revoke-1', 'test-2');
    assert.equal(second.updated, 0);
    assert.deepEqual(received, [{ clientId: 'client-revoke-1', reason: 'test-2' }]);
  } finally {
    db.close();
  }
});

// ---------------------------------------------------------------------------

test('WS receives close code 4003 with reason JSON when client is revoked', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'hub-ws-revoke-'));
  const dbPath = join(dir, 'claude-ui.db');
  const built = await buildApp({ dataDir: dir, dbPath });
  const { app, tls, revokeClient: boundRevoke } = built;

  try {
    await app.listen({ host: '127.0.0.1', port: 0 });
    const address = app.server.address();
    if (address === null || typeof address === 'string') {
      throw new Error('no address');
    }
    const port = address.port;

    // 1. Pair a client via real init/confirm to mint a real key bound to a clientId.
    const kp = makeKeypair();
    const clientId = 'client-ws-revoke';

    const initRes = await postJson<{ nonce: string }>({
      host: '127.0.0.1',
      port,
      path: '/api/pair/init',
      ca: tls.cert,
      body: { clientId, clientPubKey: kp.publicB64url },
    });
    assert.equal(initRes.status, 200, `init: ${initRes.rawBody}`);
    const nonce = initRes.body.nonce;
    const signature = signNonce(nonce, kp.privateDer);

    const confirmRes = await postJson<{ key: string }>({
      host: '127.0.0.1',
      port,
      path: '/api/pair/confirm',
      ca: tls.cert,
      body: { clientId, nonce, signature, displayName: 'Test Laptop' },
    });
    assert.equal(confirmRes.status, 200, `confirm: ${confirmRes.rawBody}`);
    const apiKey = confirmRes.body.key;

    // 2. Open a WS, send API key auth, wait for auth_ok ack.
    const ws = new WebSocket(`wss://127.0.0.1:${port}/ws`, {
      ca: tls.cert,
      rejectUnauthorized: false,
    });

    const authed = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('timeout waiting for auth_ok')),
        4000,
      );
      ws.once('open', () => {
        ws.send(JSON.stringify({ type: 'auth', apiKey }));
      });
      ws.on('message', (raw) => {
        try {
          const parsed = JSON.parse(String(raw)) as { type?: string };
          if (parsed.type === 'auth_ok') {
            clearTimeout(timer);
            resolve();
          }
        } catch {
          /* ignore */
        }
      });
      ws.once('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });

    await authed;

    // 3. Expect a close event with code 4003 after revoke.
    const closed = new Promise<{ code: number; reason: string }>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('timeout waiting for close')),
        4000,
      );
      ws.once('close', (code: number, reason: Buffer) => {
        clearTimeout(timer);
        resolve({ code, reason: reason.toString('utf8') });
      });
    });

    // 4. Trigger the revocation from the hub's own binding.
    const result = boundRevoke(clientId, 'test');
    assert.equal(result.updated, 1, 'revoke should have updated the minted key row');

    const closeEvt = await closed;
    assert.equal(closeEvt.code, 4003, 'close code must be 4003');
    const body = JSON.parse(closeEvt.reason) as { reason: string };
    assert.equal(body.reason, 'test');
  } finally {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
