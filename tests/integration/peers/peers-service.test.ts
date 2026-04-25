// tests/integration/peers/peers-service.test.ts
import { mkdtempSync, rmSync } from 'node:fs';
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

const { createReplicationEngine } = await import('@main/features/peers/replication-engine');
const { createPeersService } = await import('@main/features/peers/peers-service');

type PeersService = Awaited<ReturnType<typeof createPeersService>>;

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

describe('PeersService', () => {
  let dataDirA: string;
  let dataDirB: string;
  let sqliteA: Database.Database;
  let sqliteB: Database.Database;
  let dbA: ReturnType<typeof drizzle<typeof schema>>;
  let dbB: ReturnType<typeof drizzle<typeof schema>>;
  let svcA: PeersService;
  let svcB: PeersService;

  beforeEach(async () => {
    dataDirA = mkdtempSync(join(tmpdir(), 'peers-service-a-'));
    dataDirB = mkdtempSync(join(tmpdir(), 'peers-service-b-'));
    sqliteA = new Database(':memory:');
    sqliteB = new Database(':memory:');
    dbA = drizzle(sqliteA, { schema });
    dbB = drizzle(sqliteB, { schema });
    migrate(dbA, { migrationsFolder: resolve(__dirname, '../../../drizzle') });
    migrate(dbB, { migrationsFolder: resolve(__dirname, '../../../drizzle') });

    const engineA = createReplicationEngine({
      db: dbA,
      peerIdShort: 'aaaaaaaa',
      peerIdFull: 'a'.repeat(64),
    });
    const engineB = createReplicationEngine({
      db: dbB,
      peerIdShort: 'bbbbbbbb',
      peerIdFull: 'b'.repeat(64),
    });

    svcA = await createPeersService({
      db: dbA,
      dataDir: dataDirA,
      engine: engineA,
      listenPort: 0,
      schemaHash: 'peers-service-test',
      preferMdns: false,
      displayName: 'Desktop A',
    });
    svcB = await createPeersService({
      db: dbB,
      dataDir: dataDirB,
      engine: engineB,
      listenPort: 0,
      schemaHash: 'peers-service-test',
      preferMdns: false,
      displayName: 'Desktop B',
    });
  });

  afterEach(async () => {
    await svcA.dispose();
    await svcB.dispose();
    sqliteA.close();
    sqliteB.close();
    rmSync(dataDirA, { recursive: true, force: true });
    rmSync(dataDirB, { recursive: true, force: true });
  });

  it('pairInit + pairConfirm round-trip — both sides record peer + emit trust-changed on initiator', async () => {
    const idA = svcA.getIdentity();
    const idB = svcB.getIdentity();
    const portA = svcA.getListenPort();

    let pinIssued: { sessionId: string; pin: string; initiatorPeerId: string } | undefined;
    svcA.onPinIssued((info) => {
      pinIssued = info;
    });

    const trustEventsB: Array<{ peerId: string; action: string }> = [];
    svcB.onTrustChanged((ev) => trustEventsB.push(ev));

    // B initiates pair against A
    const initRes = await svcB.pairInit({
      host: '127.0.0.1',
      port: portA,
      fingerprint: idA.fingerprint,
      displayName: 'Desktop B',
    });
    expect(initRes.sessionId).toMatch(/^[0-9a-f-]+$/);
    expect(initRes.challenge.length).toBeGreaterThan(0);

    // Wait for A to receive the PIN
    const issued = await waitFor(() => pinIssued);
    expect(issued.pin).toMatch(/^\d{6}$/);
    expect(issued.initiatorPeerId).toBe(idB.peerId);

    // B confirms with the PIN
    const confirmRes = await svcB.pairConfirm({
      host: '127.0.0.1',
      port: portA,
      fingerprint: idA.fingerprint,
      sessionId: initRes.sessionId,
      challenge: initRes.challenge,
      pin: issued.pin,
      displayName: 'Desktop A',
    });
    expect(confirmRes.peerId).toBe(idA.peerId);
    expect(confirmRes.pubkey).toBe(idA.pubkey);
    expect(confirmRes.fingerprint).toBe(idA.fingerprint);

    // Both peer-stores now contain the other peer
    const aPaired = svcA.listPaired().find((p) => p.peerId === idB.peerId);
    expect(aPaired).toBeDefined();
    expect(aPaired?.pubkey).toBe(idB.pubkey);
    expect(aPaired?.certFingerprint).toBe(idB.fingerprint);

    const bPaired = svcB.listPaired().find((p) => p.peerId === idA.peerId);
    expect(bPaired).toBeDefined();
    expect(bPaired?.pubkey).toBe(idA.pubkey);
    expect(bPaired?.certFingerprint).toBe(idA.fingerprint);
    expect(bPaired?.displayName).toBe('Desktop A');

    // Trust-changed event fired on B (the initiator side)
    expect(trustEventsB).toContainEqual({ peerId: idA.peerId, action: 'added' });
  });

  it('revoke marks peer revoked, emits trust-changed, and is idempotent', async () => {
    const idA = svcA.getIdentity();
    const idB = svcB.getIdentity();
    const portA = svcA.getListenPort();

    let pinIssued: { sessionId: string; pin: string; initiatorPeerId: string } | undefined;
    svcA.onPinIssued((info) => { pinIssued = info; });

    const initRes = await svcB.pairInit({
      host: '127.0.0.1',
      port: portA,
      fingerprint: idA.fingerprint,
    });
    const issued = await waitFor(() => pinIssued);
    await svcB.pairConfirm({
      host: '127.0.0.1',
      port: portA,
      fingerprint: idA.fingerprint,
      sessionId: initRes.sessionId,
      challenge: initRes.challenge,
      pin: issued.pin,
    });

    // svcB now has A paired
    expect(svcB.listPaired().find((p) => p.peerId === idA.peerId)?.revokedAt).toBeNull();

    const trustEventsB: Array<{ peerId: string; action: string }> = [];
    svcB.onTrustChanged((ev) => trustEventsB.push(ev));

    const r1 = svcB.revoke(idA.peerId);
    expect(r1).toEqual({ revoked: true });
    expect(trustEventsB).toEqual([{ peerId: idA.peerId, action: 'revoked' }]);

    const after = svcB.listPaired().find((p) => p.peerId === idA.peerId);
    expect(after?.revokedAt).not.toBeNull();

    // Idempotent: second revoke returns false, no extra event
    const r2 = svcB.revoke(idA.peerId);
    expect(r2).toEqual({ revoked: false });
    expect(trustEventsB).toHaveLength(1);

    // Revoking unknown peer is also a no-op
    const r3 = svcB.revoke('does-not-exist');
    expect(r3).toEqual({ revoked: false });

    // Suppress unused-var warning for idB
    expect(idB.peerId).toBeTruthy();
  });

  it('onPinIssued fires on the receiver when the initiator calls pairInit', async () => {
    const idA = svcA.getIdentity();
    const portA = svcA.getListenPort();

    const seen: Array<{ sessionId: string; pin: string; initiatorPeerId: string }> = [];
    const off = svcA.onPinIssued((info) => seen.push(info));

    await svcB.pairInit({
      host: '127.0.0.1',
      port: portA,
      fingerprint: idA.fingerprint,
    });

    const ev = await waitFor(() => seen[0]);
    expect(ev.pin).toMatch(/^\d{6}$/);
    expect(ev.initiatorPeerId).toBe(svcB.getIdentity().peerId);

    off();
  });
});
