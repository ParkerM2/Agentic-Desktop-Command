import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createHash,
  createPrivateKey,
  generateKeyPairSync,
  sign,
} from 'node:crypto';
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

async function startHub(
  envOverrides: Record<string, string | undefined> = {},
): Promise<Harness> {
  const prev: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(envOverrides)) {
    prev[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }

  const dir = mkdtempSync(join(tmpdir(), 'hub-pair-confirm-'));
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

interface Keypair {
  publicDer: Buffer;
  privateDer: Buffer;
  publicB64url: string;
}

function makeKeypair(): Keypair {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'der' },
    privateKeyEncoding: { type: 'pkcs8', format: 'der' },
  });
  return {
    publicDer: publicKey,
    privateDer: privateKey,
    publicB64url: publicKey.toString('base64url'),
  };
}

function signNonce(nonce: string, privateDer: Buffer): string {
  const privKey = createPrivateKey({
    key: privateDer,
    format: 'der',
    type: 'pkcs8',
  });
  const sig = sign(null, Buffer.from(nonce, 'base64url'), privKey);
  return sig.toString('base64url');
}

async function initPair(
  hub: Harness,
  clientId: string,
  publicB64url: string,
): Promise<{ nonce: string; expiresAt: number }> {
  const res = await postJson<{ nonce: string; expiresAt: number }>({
    host: '127.0.0.1',
    port: hub.address.port,
    path: '/api/pair/init',
    ca: hub.ca,
    body: { clientId, clientPubKey: publicB64url },
  });
  assert.equal(res.status, 200, `init failed: ${res.rawBody}`);
  return res.body;
}

test('POST /api/pair/confirm — happy path mints api key and returns hubId', async () => {
  const hub = await startHub();
  try {
    const kp = makeKeypair();
    const clientId = 'client-happy';
    const { nonce } = await initPair(hub, clientId, kp.publicB64url);
    const signature = signNonce(nonce, kp.privateDer);

    const res = await postJson<{ hubId: string; displayName: string; key: string }>({
      host: '127.0.0.1',
      port: hub.address.port,
      path: '/api/pair/confirm',
      ca: hub.ca,
      body: { clientId, nonce, signature, displayName: 'My Laptop' },
    });

    assert.equal(res.status, 200, `confirm failed: ${res.rawBody}`);
    assert.match(res.body.key, /^[0-9a-f]{64}$/, 'key must be 32-byte hex');
    assert.match(
      res.body.hubId,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      'hubId must be UUID',
    );
    assert.equal(res.body.displayName, 'My Laptop');

    // The minted key should authenticate against a protected route.
    const projectsRes = await new Promise<JsonResponse>((resolve, reject) => {
      const req = httpsRequest(
        {
          host: '127.0.0.1',
          port: hub.address.port,
          path: '/api/projects',
          method: 'GET',
          ca: hub.ca,
          rejectUnauthorized: true,
          servername: 'localhost',
          headers: { 'x-api-key': res.body.key },
        },
        (r) => {
          const chunks: Buffer[] = [];
          r.on('data', (c: Buffer) => chunks.push(c));
          r.on('end', () => {
            const rawBody = Buffer.concat(chunks).toString('utf8');
            let parsed: unknown = rawBody;
            try {
              parsed = JSON.parse(rawBody);
            } catch {
              /* leave as raw */
            }
            resolve({ status: r.statusCode ?? 0, body: parsed, rawBody });
          });
        },
      );
      req.on('error', reject);
      req.end();
    });

    assert.notEqual(
      projectsRes.status,
      401,
      `minted key should not be rejected by api-key middleware; got ${projectsRes.status} ${projectsRes.rawBody}`,
    );
  } finally {
    await hub.close();
  }
});

test('POST /api/pair/confirm — fallback displayName from clientId slice', async () => {
  const hub = await startHub();
  try {
    const kp = makeKeypair();
    const clientId = 'abcdef1234-extra';
    const { nonce } = await initPair(hub, clientId, kp.publicB64url);
    const signature = signNonce(nonce, kp.privateDer);

    const res = await postJson<{ hubId: string; displayName: string; key: string }>({
      host: '127.0.0.1',
      port: hub.address.port,
      path: '/api/pair/confirm',
      ca: hub.ca,
      body: { clientId, nonce, signature },
    });

    assert.equal(res.status, 200, `confirm failed: ${res.rawBody}`);
    assert.equal(res.body.displayName, `Client ${clientId.slice(0, 8)}`);
  } finally {
    await hub.close();
  }
});

test('POST /api/pair/confirm — 401 ExpiredNonce on replay (single-use)', async () => {
  const hub = await startHub();
  try {
    const kp = makeKeypair();
    const clientId = 'client-replay';
    const { nonce } = await initPair(hub, clientId, kp.publicB64url);
    const signature = signNonce(nonce, kp.privateDer);

    const first = await postJson<{ key: string }>({
      host: '127.0.0.1',
      port: hub.address.port,
      path: '/api/pair/confirm',
      ca: hub.ca,
      body: { clientId, nonce, signature },
    });
    assert.equal(first.status, 200, `first confirm failed: ${first.rawBody}`);

    const second = await postJson<{ error: string }>({
      host: '127.0.0.1',
      port: hub.address.port,
      path: '/api/pair/confirm',
      ca: hub.ca,
      body: { clientId, nonce, signature },
    });
    assert.equal(second.status, 401, `expected 401 on replay: ${second.rawBody}`);
    assert.equal(second.body.error, 'ExpiredNonce');
  } finally {
    await hub.close();
  }
});

test('POST /api/pair/confirm — 401 BadSignature on tampered signature', async () => {
  const hub = await startHub();
  try {
    const kp = makeKeypair();
    const clientId = 'client-bad-sig';
    const { nonce } = await initPair(hub, clientId, kp.publicB64url);

    // Sign a DIFFERENT message so the signature verifies against the wrong bytes.
    const privKey = createPrivateKey({
      key: kp.privateDer,
      format: 'der',
      type: 'pkcs8',
    });
    const wrongSig = sign(null, Buffer.from('not-the-nonce'), privKey).toString(
      'base64url',
    );

    const res = await postJson<{ error: string }>({
      host: '127.0.0.1',
      port: hub.address.port,
      path: '/api/pair/confirm',
      ca: hub.ca,
      body: { clientId, nonce, signature: wrongSig },
    });
    assert.equal(res.status, 401, `expected 401: ${res.rawBody}`);
    assert.equal(res.body.error, 'BadSignature');
  } finally {
    await hub.close();
  }
});

test('POST /api/pair/confirm — 401 UnknownClient when no prior init', async () => {
  const hub = await startHub();
  try {
    const kp = makeKeypair();
    // Sign arbitrary bytes; the clientId has no binding so it should 401 before
    // signature verification even succeeds (or fails — either way it's UnknownClient).
    const privKey = createPrivateKey({
      key: kp.privateDer,
      format: 'der',
      type: 'pkcs8',
    });
    const fakeNonce = Buffer.from('fake-nonce-bytes').toString('base64url');
    const signature = sign(null, Buffer.from(fakeNonce, 'base64url'), privKey).toString(
      'base64url',
    );

    const res = await postJson<{ error: string }>({
      host: '127.0.0.1',
      port: hub.address.port,
      path: '/api/pair/confirm',
      ca: hub.ca,
      body: { clientId: 'no-such-client', nonce: fakeNonce, signature },
    });
    assert.equal(res.status, 401, `expected 401: ${res.rawBody}`);
    assert.equal(res.body.error, 'UnknownClient');
  } finally {
    await hub.close();
  }
});

test('POST /api/pair/confirm — 429 after rate limit exhausted', async () => {
  const hub = await startHub({
    HUB_PAIR_RATE_LIMIT_CONFIRM: '5',
    HUB_PAIR_RATE_LIMIT_CONFIRM_WINDOW_MS: '60000',
  });
  try {
    const clientId = 'client-rl';
    // Don't bother with init for most of these — the limiter fires first.
    const bogus = { clientId, nonce: 'aaaa', signature: 'bbbb' };
    for (let i = 0; i < 5; i += 1) {
      const r = await postJson({
        host: '127.0.0.1',
        port: hub.address.port,
        path: '/api/pair/confirm',
        ca: hub.ca,
        body: bogus,
      });
      // Each of these fails for "UnknownClient" reasons but IS counted by limiter.
      assert.notEqual(r.status, 429, `attempt ${i + 1} should not be 429 yet: ${r.rawBody}`);
    }

    const sixth = await postJson<{ error: string }>({
      host: '127.0.0.1',
      port: hub.address.port,
      path: '/api/pair/confirm',
      ca: hub.ca,
      body: bogus,
    });
    assert.equal(sixth.status, 429, `expected 429 on 6th: ${sixth.rawBody}`);
  } finally {
    await hub.close();
  }
});

test('POST /api/pair/confirm — supersedes previous live key with revoked_reason=superseded', async () => {
  const hub = await startHub();
  try {
    const kp = makeKeypair();
    const clientId = 'client-supersede';

    // First pair cycle.
    const first = await initPair(hub, clientId, kp.publicB64url);
    const firstSig = signNonce(first.nonce, kp.privateDer);
    const firstConfirm = await postJson<{ key: string }>({
      host: '127.0.0.1',
      port: hub.address.port,
      path: '/api/pair/confirm',
      ca: hub.ca,
      body: { clientId, nonce: first.nonce, signature: firstSig },
    });
    assert.equal(firstConfirm.status, 200, `first confirm: ${firstConfirm.rawBody}`);
    const firstKey = firstConfirm.body.key;

    // Second pair cycle, same client + same key (so no IdentityConflict).
    const second = await initPair(hub, clientId, kp.publicB64url);
    const secondSig = signNonce(second.nonce, kp.privateDer);
    const secondConfirm = await postJson<{ key: string }>({
      host: '127.0.0.1',
      port: hub.address.port,
      path: '/api/pair/confirm',
      ca: hub.ca,
      body: { clientId, nonce: second.nonce, signature: secondSig },
    });
    assert.equal(secondConfirm.status, 200, `second confirm: ${secondConfirm.rawBody}`);
    const secondKey = secondConfirm.body.key;
    assert.notEqual(firstKey, secondKey, 'keys must differ');

    // Inspect api_keys rows.
    const BetterSqlite3 = (await import('better-sqlite3')).default;
    const db = new BetterSqlite3(hub.dbPath, { readonly: true });
    try {
      const firstHash = createHash('sha256').update(firstKey).digest('hex');
      const secondHash = createHash('sha256').update(secondKey).digest('hex');

      const rowFirst = db
        .prepare(
          'SELECT revoked_at, revoked_reason FROM api_keys WHERE key_hash = ?',
        )
        .get(firstHash) as
        | { revoked_at: number | null; revoked_reason: string | null }
        | undefined;
      assert.ok(rowFirst, 'first key row must exist');
      assert.ok(
        rowFirst.revoked_at !== null && rowFirst.revoked_at > 0,
        'first key must be revoked',
      );
      assert.equal(rowFirst.revoked_reason, 'superseded');

      const rowSecond = db
        .prepare(
          'SELECT revoked_at, revoked_reason FROM api_keys WHERE key_hash = ?',
        )
        .get(secondHash) as
        | { revoked_at: number | null; revoked_reason: string | null }
        | undefined;
      assert.ok(rowSecond, 'second key row must exist');
      assert.equal(rowSecond.revoked_at, null, 'second key must be live');
    } finally {
      db.close();
    }

    // Confirm the old key is rejected by api-key middleware.
    const oldKeyRes = await new Promise<JsonResponse>((resolve, reject) => {
      const req = httpsRequest(
        {
          host: '127.0.0.1',
          port: hub.address.port,
          path: '/api/projects',
          method: 'GET',
          ca: hub.ca,
          rejectUnauthorized: true,
          servername: 'localhost',
          headers: { 'x-api-key': firstKey },
        },
        (r) => {
          const chunks: Buffer[] = [];
          r.on('data', (c: Buffer) => chunks.push(c));
          r.on('end', () => {
            resolve({
              status: r.statusCode ?? 0,
              body: Buffer.concat(chunks).toString('utf8'),
              rawBody: Buffer.concat(chunks).toString('utf8'),
            });
          });
        },
      );
      req.on('error', reject);
      req.end();
    });
    assert.equal(
      oldKeyRes.status,
      401,
      `old superseded key must be rejected: ${oldKeyRes.rawBody}`,
    );
  } finally {
    await hub.close();
  }
});
