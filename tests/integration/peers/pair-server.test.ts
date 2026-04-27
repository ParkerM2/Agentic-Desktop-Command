import { mkdtempSync, rmSync } from 'node:fs';
import { Agent as HttpsAgent, request as httpsRequest } from 'node:https';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import * as schema from '@main/db/schema';
import { createPairServer, type PairServer } from '@main/features/peers/pair-server';
import { createPeerPairing } from '@main/features/peers/peer-pairing';
import { createPeerStore } from '@main/features/peers/peer-store';
import { resolvePeerTls } from '@main/features/peers/peer-tls';

interface JsonResponse {
  status: number;
  body: unknown;
}

function postJson(
  port: number,
  path: string,
  body: unknown,
  agent: HttpsAgent,
): Promise<JsonResponse> {
  return new Promise((resolve, reject) => {
    const payload = Buffer.from(JSON.stringify(body), 'utf8');
    const req = httpsRequest(
      {
        host: '127.0.0.1',
        port,
        path,
        method: 'POST',
        agent,
        headers: {
          'content-type': 'application/json',
          'content-length': String(payload.length),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');
          let parsed: unknown = null;
          try {
            parsed = raw ? JSON.parse(raw) : null;
          } catch {
            parsed = raw;
          }
          resolve({ status: res.statusCode ?? 0, body: parsed });
        });
      },
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

const RECEIVER_IDENTITY = {
  peerId: 'b'.repeat(64),
  pubkey: 'receiver-pubkey-b64',
};

const INITIATOR = {
  peerId: 'a'.repeat(64),
  pubkey: 'initiator-pubkey-b64',
  fingerprint: 'c'.repeat(64),
  displayName: 'Desktop A',
};

let dataDir: string;
let sqlite: Database.Database;
let db: ReturnType<typeof drizzle<typeof schema>>;
let server: PairServer;
let agent: HttpsAgent;

beforeEach(async () => {
  dataDir = mkdtempSync(join(tmpdir(), 'pair-server-'));
  sqlite = new Database(':memory:');
  db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: join(__dirname, '../../../drizzle') });

  const tls = await resolvePeerTls(dataDir, RECEIVER_IDENTITY.peerId);
  const pairing = createPeerPairing();
  const store = createPeerStore(db);

  server = await createPairServer({
    tls,
    pairing,
    peerStore: store,
    selfIdentity: { peerId: RECEIVER_IDENTITY.peerId, pubkey: RECEIVER_IDENTITY.pubkey },
    selfFingerprint: tls.fingerprint,
    listenPort: 0,
    host: '127.0.0.1',
  });
  agent = new HttpsAgent({ rejectUnauthorized: false });
});

afterEach(async () => {
  agent.destroy();
  await server.close();
  sqlite.close();
  rmSync(dataDir, { recursive: true, force: true });
});

describe('pair-server', () => {
  it('listens on a port over TLS', () => {
    expect(server.port()).toBeGreaterThan(0);
  });

  it('POST /pair/init returns sessionId + challenge and emits pin to onPinIssued', async () => {
    const pins: string[] = [];
    await server.close();
    const tls = await resolvePeerTls(dataDir, RECEIVER_IDENTITY.peerId);
    const next = await createPairServer({
      tls,
      pairing: createPeerPairing(),
      peerStore: createPeerStore(db),
      selfIdentity: { peerId: RECEIVER_IDENTITY.peerId, pubkey: RECEIVER_IDENTITY.pubkey },
      selfFingerprint: tls.fingerprint,
      listenPort: 0,
      host: '127.0.0.1',
      onPinIssued: (info) => pins.push(info.pin),
    });
    // eslint-disable-next-line require-atomic-updates -- single-threaded test, server replaced after close
    server = next;
    const res = await postJson(next.port(), '/pair/init', INITIATOR, agent);
    expect(res.status).toBe(200);
    const body = res.body as { sessionId: string; challenge: string };
    expect(body.sessionId).toMatch(/^[0-9a-f-]+$/);
    expect(Buffer.from(body.challenge, 'base64')).toHaveLength(32);
    expect(pins).toHaveLength(1);
    expect(pins[0]).toMatch(/^\d{6}$/);
  });

  it('full pair flow: init then confirm with correct HMAC upserts initiator and returns our identity', async () => {
    const pairing = createPeerPairing();
    const store = createPeerStore(db);
    await server.close();
    const tls = await resolvePeerTls(dataDir, RECEIVER_IDENTITY.peerId);
    let issuedPin = '';
    const next = await createPairServer({
      tls,
      pairing,
      peerStore: store,
      selfIdentity: { peerId: RECEIVER_IDENTITY.peerId, pubkey: RECEIVER_IDENTITY.pubkey },
      selfFingerprint: tls.fingerprint,
      listenPort: 0,
      host: '127.0.0.1',
      onPinIssued: (info) => {
        issuedPin = info.pin;
      },
    });
    // eslint-disable-next-line require-atomic-updates -- single-threaded test, server replaced after close
    server = next;

    const initRes = await postJson(next.port(), '/pair/init', INITIATOR, agent);
    expect(initRes.status).toBe(200);
    const initBody = initRes.body as { sessionId: string; challenge: string };

    const pinHmac = pairing.computePinHmac(issuedPin, initBody.challenge);
    const confirmRes = await postJson(
      next.port(),
      '/pair/confirm',
      { sessionId: initBody.sessionId, pinHmac },
      agent,
    );
    expect(confirmRes.status).toBe(200);
    const confirmBody = confirmRes.body as { peerId: string; pubkey: string; fingerprint: string };
    expect(confirmBody.peerId).toBe(RECEIVER_IDENTITY.peerId);
    expect(confirmBody.pubkey).toBe(RECEIVER_IDENTITY.pubkey);
    expect(confirmBody.fingerprint).toBe(tls.fingerprint);

    const stored = store.getByPeerId(INITIATOR.peerId);
    expect(stored).not.toBeNull();
    expect(stored?.pubkey).toBe(INITIATOR.pubkey);
    expect(stored?.displayName).toBe(INITIATOR.displayName);
    expect(stored?.certFingerprint).toBe(INITIATOR.fingerprint);
  });

  it('POST /pair/confirm with wrong HMAC returns 401', async () => {
    const initRes = await postJson(server.port(), '/pair/init', INITIATOR, agent);
    const initBody = initRes.body as { sessionId: string };

    const confirmRes = await postJson(
      server.port(),
      '/pair/confirm',
      { sessionId: initBody.sessionId, pinHmac: 'aGVsbG8=' },
      agent,
    );
    expect(confirmRes.status).toBe(401);
    const body = confirmRes.body as { error: string };
    expect(body.error).toBe('wrong_pin');
  });

  it('POST /pair/confirm with unknown session returns 401', async () => {
    const res = await postJson(
      server.port(),
      '/pair/confirm',
      { sessionId: 'does-not-exist', pinHmac: 'aGVsbG8=' },
      agent,
    );
    expect(res.status).toBe(401);
    const body = res.body as { error: string };
    expect(body.error).toBe('unknown_session');
  });

  it('POST /pair/init with malformed body returns 400', async () => {
    const res = await postJson(
      server.port(),
      '/pair/init',
      { peerId: 'only-this' },
      agent,
    );
    expect(res.status).toBe(400);
  });

  it('GET on /pair/init returns 405', async () => {
    const got = await new Promise<JsonResponse>((resolve, reject) => {
      const req = httpsRequest(
        {
          host: '127.0.0.1',
          port: server.port(),
          path: '/pair/init',
          method: 'GET',
          agent,
        },
        (res) => {
          res.resume();
          res.on('end', () => { resolve({ status: res.statusCode ?? 0, body: null }); });
        },
      );
      req.on('error', reject);
      req.end();
    });
    expect(got.status).toBe(405);
  });

  it('POST to unknown path returns 404', async () => {
    const res = await postJson(server.port(), '/nope', {}, agent);
    expect(res.status).toBe(404);
  });
});
