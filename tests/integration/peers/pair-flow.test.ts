// tests/integration/peers/pair-flow.test.ts
import { mkdtempSync, rmSync } from 'node:fs';
import { Agent as HttpsAgent, request as httpsRequest } from 'node:https';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as schema from '@main/db/schema';

vi.mock('electron', () => ({
  safeStorage: {
    isEncryptionAvailable: () => false,
    encryptString: (s: string) => Buffer.from(s),
    decryptString: (b: Buffer) => b.toString('utf8'),
  },
}));

const { getOrCreatePeerIdentity } = await import('@main/features/peers/peer-identity');
const { resolvePeerTls } = await import('@main/features/peers/peer-tls');
const { createPeerPairing } = await import('@main/features/peers/peer-pairing');
const { createPeerStore } = await import('@main/features/peers/peer-store');
const { createPeerServer } = await import('@main/features/peers/peer-server');
const { createReplicationEngine } = await import('@main/features/peers/replication-engine');

type PeerServer = Awaited<ReturnType<typeof createPeerServer>>;

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

async function waitFor<T>(fn: () => T | undefined, timeoutMs = 3000): Promise<T> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const v = fn();
    if (v !== undefined) return v;
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 20);
    });
  }
  throw new Error('waitFor timed out');
}

describe('pair-flow end-to-end', () => {
  let dataDirA: string;
  let dataDirB: string;
  let sqliteA: Database.Database;
  let sqliteB: Database.Database;
  let dbA: ReturnType<typeof drizzle<typeof schema>>;
  let dbB: ReturnType<typeof drizzle<typeof schema>>;
  let serverA: PeerServer;
  let serverB: PeerServer;
  let agent: HttpsAgent;

  beforeEach(() => {
    dataDirA = mkdtempSync(join(tmpdir(), 'pair-flow-a-'));
    dataDirB = mkdtempSync(join(tmpdir(), 'pair-flow-b-'));
    sqliteA = new Database(':memory:');
    sqliteB = new Database(':memory:');
    dbA = drizzle(sqliteA, { schema });
    dbB = drizzle(sqliteB, { schema });
    migrate(dbA, { migrationsFolder: resolve(__dirname, '../../../drizzle') });
    migrate(dbB, { migrationsFolder: resolve(__dirname, '../../../drizzle') });
    agent = new HttpsAgent({ rejectUnauthorized: false });
  });

  afterEach(async () => {
    agent.destroy();
    await serverA.close();
    await serverB.close();
    sqliteA.close();
    sqliteB.close();
    rmSync(dataDirA, { recursive: true, force: true });
    rmSync(dataDirB, { recursive: true, force: true });
  });

  it('pairs two instances over TLS and replicates a write across the pinned WS transport', async () => {
    // 1. Generate identities + TLS material upfront for both instances.
    const identityA = getOrCreatePeerIdentity(dataDirA);
    const identityB = getOrCreatePeerIdentity(dataDirB);
    const tlsA = await resolvePeerTls(dataDirA, identityA.peerIdFull);
    const tlsB = await resolvePeerTls(dataDirB, identityB.peerIdFull);

    // 2. Replication engines wired to each instance's SQLite db.
    const engineA = createReplicationEngine({
      db: dbA,
      peerIdShort: identityA.peerIdShort,
      peerIdFull: identityA.peerIdFull,
    });
    const engineB = createReplicationEngine({
      db: dbB,
      peerIdShort: identityB.peerIdShort,
      peerIdFull: identityB.peerIdFull,
    });

    // 3. Bring up A first (no outbound dial — A is the receiver).
    let pinIssuedToB = '';
    serverA = await createPeerServer({
      db: dbA,
      engine: engineA,
      tls: tlsA,
      selfIdentity: {
        peerId: identityA.peerIdFull,
        pubkey: identityA.pubkey,
        sign: identityA.sign,
      },
      peerStore: createPeerStore(dbA),
      pairing: createPeerPairing(),
      listenPort: 0,
      host: '127.0.0.1',
      schemaHash: 'pair-flow-schema',
      onPinIssued: (info) => {
        pinIssuedToB = info.pin;
      },
    });
    const portA = serverA.port();

    // 4. Bring up B with an outbound dial to A pinned to A's fingerprint.
    serverB = await createPeerServer({
      db: dbB,
      engine: engineB,
      tls: tlsB,
      selfIdentity: {
        peerId: identityB.peerIdFull,
        pubkey: identityB.pubkey,
        sign: identityB.sign,
      },
      peerStore: createPeerStore(dbB),
      pairing: createPeerPairing(),
      listenPort: 0,
      host: '127.0.0.1',
      schemaHash: 'pair-flow-schema',
      remoteUrl: `wss://127.0.0.1:${String(portA)}`,
      remotePeer: { peerId: identityA.peerIdFull, fingerprint: tlsA.fingerprint },
    });

    // 5. Wait for the TLS-pinned WS connection to come up both ways.
    await waitFor(() => (serverA.ws.isConnected() && serverB.ws.isConnected() ? true : undefined));

    // 6. PAIR: B is initiator, A is receiver. B POSTs /pair/init to A's TLS port.
    const initRes = await postJson(
      portA,
      '/pair/init',
      {
        peerId: identityB.peerIdFull,
        pubkey: identityB.pubkey,
        fingerprint: tlsB.fingerprint,
        displayName: 'Desktop B',
      },
      agent,
    );
    expect(initRes.status).toBe(200);
    const initBody = initRes.body as { sessionId: string; challenge: string };
    expect(initBody.sessionId).toMatch(/^[0-9a-f-]+$/);
    expect(pinIssuedToB).toMatch(/^\d{6}$/);

    // 7. B computes HMAC(pin, challenge) and POSTs /pair/confirm.
    const pairing = createPeerPairing();
    const pinHmac = pairing.computePinHmac(pinIssuedToB, initBody.challenge);
    const confirmRes = await postJson(
      portA,
      '/pair/confirm',
      { sessionId: initBody.sessionId, pinHmac },
      agent,
    );
    expect(confirmRes.status).toBe(200);
    const confirmBody = confirmRes.body as { peerId: string; pubkey: string; fingerprint: string };
    expect(confirmBody.peerId).toBe(identityA.peerIdFull);
    expect(confirmBody.pubkey).toBe(identityA.pubkey);
    expect(confirmBody.fingerprint).toBe(tlsA.fingerprint);

    // 8. Pair-server upserted B into A's store automatically. B must upsert A
    //    into its OWN store — pair-server only handles the receiver's side.
    const storeB = createPeerStore(dbB);
    storeB.upsert({
      peerId: confirmBody.peerId,
      pubkey: confirmBody.pubkey,
      certFingerprint: confirmBody.fingerprint,
      displayName: 'Desktop A',
      pairedAt: Date.now(),
    });

    // 9. Both peer_state tables now contain the other peer.
    const storeA = createPeerStore(dbA);
    const aSeesB = storeA.getByPeerId(identityB.peerIdFull);
    expect(aSeesB).not.toBeNull();
    expect(aSeesB?.pubkey).toBe(identityB.pubkey);
    expect(aSeesB?.certFingerprint).toBe(tlsB.fingerprint);
    expect(aSeesB?.displayName).toBe('Desktop B');

    const bSeesA = storeB.getByPeerId(identityA.peerIdFull);
    expect(bSeesA).not.toBeNull();
    expect(bSeesA?.pubkey).toBe(identityA.pubkey);
    expect(bSeesA?.certFingerprint).toBe(tlsA.fingerprint);
    expect(bSeesA?.displayName).toBe('Desktop A');

    // listActive should also surface them.
    expect(storeA.listActive().map((p) => p.peerId)).toContain(identityB.peerIdFull);
    expect(storeB.listActive().map((p) => p.peerId)).toContain(identityA.peerIdFull);

    // 10. SYNC: write a task on A, expect it to land on B over the TLS-pinned WS.
    sqliteA
      .prepare(
        `INSERT INTO progress_tasks (slug, title, status, priority, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        'pair-flow-task',
        'Hello from paired A',
        'backlog',
        'medium',
        '2026-04-24T00:00:00Z',
        '2026-04-24T00:00:00Z',
      );
    engineA.recordLocalWrite({
      tableName: 'progress_tasks',
      pk: 'pair-flow-task',
      opType: 'insert',
      columns: {
        slug: 'pair-flow-task',
        title: 'Hello from paired A',
        status: 'backlog',
        priority: 'medium',
        created_at: '2026-04-24T00:00:00Z',
        updated_at: '2026-04-24T00:00:00Z',
      },
    });

    const replicated = await waitFor(() =>
      sqliteB
        .prepare(`SELECT title FROM progress_tasks WHERE slug='pair-flow-task'`)
        .get() as { title: string } | undefined,
    );
    expect(replicated.title).toBe('Hello from paired A');
  });
});
