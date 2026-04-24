/**
 * Integration tests for pairWithDiscoveredHub.
 *
 * Spins up a real HTTPS server using a self-signed Ed25519 cert (same helper
 * as fingerprint-agent.test.ts) and implements the `/api/pair/init` and
 * `/api/pair/confirm` shape from Tasks 9/10. Exercises:
 *
 *  - happy path — signature verified server-side, returns { hubId, displayName, key, ... }
 *  - FINGERPRINT_MISMATCH — agent catches wrong fingerprint
 *  - hub returns 429 on init — PairError code HUB_REJECTED + status 429
 *  - hub returns 409 on confirm — PairError code HUB_REJECTED + status 409
 *  - malformed response (no key) — PairError code HUB_REJECTED
 *  - per-hub identity reuse — second call reuses existing clientId + pubkey
 */

import { createPublicKey, randomBytes, verify } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { createServer, type Server } from 'node:https';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { pairWithDiscoveredHub, PairError } from '@main/features/hub/hub-pair';

import { generateTestCert, type TestCert } from './__helpers__/test-cert';

import type { IncomingMessage, ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';

const fakeVault = {
  encryptString: (s: string) => Buffer.from(`FAKE:${s}`, 'utf8'),
  decryptString: (b: Buffer) => {
    const s = b.toString('utf8');
    if (!s.startsWith('FAKE:')) throw new Error('bad ciphertext');
    return s.slice(5);
  },
  isEncryptionAvailable: () => true,
};

interface MockHubState {
  /** Predetermined nonce the init endpoint will return. */
  nonce: Buffer;
  /** Server-stored init body to verify signature against on confirm. */
  initBody: { clientId: string; clientPubKey: string; displayName?: string } | undefined;
  /** Override responses for testing failure paths. */
  initResponse?: { status: number; body: unknown };
  confirmResponse?: { status: number; body: unknown };
  /** Records the confirm body for assertions. */
  confirmBody: { clientId: string; nonce: string; signature: string; displayName?: string } | undefined;
  /** Pre-seeded mint values. */
  mintedHubId: string;
  mintedDisplayName: string;
  mintedKey: string;
}

function readJson(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => {
      if (settled) return;
      settled = true;
      let parsed: unknown;
      try {
        parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
        return;
      }
      resolve(parsed);
    });
    req.on('error', (err) => {
      if (settled) return;
      settled = true;
      reject(err);
    });
  });
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(payload);
}

function startMockHub(cert: TestCert, state: MockHubState): Promise<{ server: Server; port: number }> {
  return new Promise((resolve) => {
    const server = createServer({ cert: cert.certPem, key: cert.keyPem }, (req, res) => {
      void (async () => {
        if (req.method !== 'POST') {
          res.writeHead(405);
          res.end();
          return;
        }
        try {
          if (req.url === '/api/pair/init') {
            const body = (await readJson(req)) as MockHubState['initBody'];
            state.initBody = body;
            if (state.initResponse) {
              sendJson(res, state.initResponse.status, state.initResponse.body);
              return;
            }
            sendJson(res, 200, {
              nonce: state.nonce.toString('base64url'),
              expiresAt: Date.now() + 60_000,
            });
            return;
          }
          if (req.url === '/api/pair/confirm') {
            const body = (await readJson(req)) as MockHubState['confirmBody'];
            state.confirmBody = body;
            if (state.confirmResponse) {
              sendJson(res, state.confirmResponse.status, state.confirmResponse.body);
              return;
            }
            // Verify signature using the pubkey sent during init.
            if (!state.initBody) {
              sendJson(res, 400, { error: 'no init recorded' });
              return;
            }
            if (!body) {
              sendJson(res, 400, { error: 'no body' });
              return;
            }
            const pubKeyDer = Buffer.from(state.initBody.clientPubKey, 'base64url');
            const pub = createPublicKey({ key: pubKeyDer, format: 'der', type: 'spki' });
            const sig = Buffer.from(body.signature, 'base64url');
            const nonce = Buffer.from(body.nonce, 'base64url');
            const ok = verify(null, nonce, pub, sig);
            if (!ok) {
              sendJson(res, 401, { error: 'signature invalid' });
              return;
            }
            sendJson(res, 200, {
              hubId: state.mintedHubId,
              displayName: state.mintedDisplayName,
              key: state.mintedKey,
            });
            return;
          }
          res.writeHead(404);
          res.end();
        } catch (err) {
          sendJson(res, 500, { error: (err as Error).message });
        }
      })();
    });
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo;
      resolve({ server, port });
    });
  });
}

describe('pairWithDiscoveredHub', () => {
  let cert: TestCert;
  let otherCert: TestCert;
  let server: Server;
  let port: number;
  let state: MockHubState;
  let hubsDir: string;

  beforeEach(async () => {
    cert = await generateTestCert();
    otherCert = await generateTestCert();
    state = {
      nonce: randomBytes(32),
      initBody: undefined,
      confirmBody: undefined,
      mintedHubId: 'hub-abc-123',
      mintedDisplayName: 'Test Hub',
      mintedKey: 'mint-key-xyz',
    };
    ({ server, port } = await startMockHub(cert, state));
    hubsDir = mkdtempSync(join(tmpdir(), 'hub-pair-'));
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
    rmSync(hubsDir, { recursive: true, force: true });
  });

  it('happy path — signs the nonce and returns the minted key', async () => {
    const result = await pairWithDiscoveredHub(
      {
        hubId: 'discovered-hub-id',
        addresses: ['127.0.0.1'],
        port,
        fingerprint: cert.fingerprint,
        displayName: 'My Laptop',
      },
      { hubsDir, vault: fakeVault },
    );

    expect(result.hubId).toBe('hub-abc-123');
    expect(result.displayName).toBe('Test Hub');
    expect(result.key).toBe('mint-key-xyz');
    expect(result.pinnedFingerprint).toBe(cert.fingerprint);
    expect(result.lastKnownUrl).toBe(`https://127.0.0.1:${port}`);
    expect(result.clientId).toMatch(/^[0-9a-f]{32}$/);

    // Hub received correct init body
    expect(state.initBody?.clientId).toBe(result.clientId);
    expect(typeof state.initBody?.clientPubKey).toBe('string');
    expect(state.initBody?.displayName).toBe('My Laptop');

    // Hub received correct confirm body with signature bound to nonce
    expect(state.confirmBody?.clientId).toBe(result.clientId);
    expect(state.confirmBody?.nonce).toBe(state.nonce.toString('base64url'));
    expect(typeof state.confirmBody?.signature).toBe('string');
  });

  it('surfaces FINGERPRINT_MISMATCH when the pin does not match the hub cert', async () => {
    await expect(
      pairWithDiscoveredHub(
        {
          hubId: 'spoof-target',
          addresses: ['127.0.0.1'],
          port,
          fingerprint: otherCert.fingerprint,
        },
        { hubsDir, vault: fakeVault },
      ),
    ).rejects.toMatchObject({
      name: 'PairError',
      code: 'FINGERPRINT_MISMATCH',
    });
  });

  it('hub returns 429 on init — PairError HUB_REJECTED + status 429', async () => {
    state.initResponse = { status: 429, body: { error: 'too many attempts' } };

    let caught: unknown;
    try {
      await pairWithDiscoveredHub(
        {
          hubId: 'rate-limited-hub',
          addresses: ['127.0.0.1'],
          port,
          fingerprint: cert.fingerprint,
        },
        { hubsDir, vault: fakeVault },
      );
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(PairError);
    const err = caught as PairError;
    expect(err.code).toBe('HUB_REJECTED');
    expect(err.status).toBe(429);
    expect(err.message).toContain('too many attempts');
  });

  it('hub returns 409 on confirm — PairError HUB_REJECTED + status 409', async () => {
    state.confirmResponse = { status: 409, body: { error: 'already paired' } };

    let caught: unknown;
    try {
      await pairWithDiscoveredHub(
        {
          hubId: 'already-paired-hub',
          addresses: ['127.0.0.1'],
          port,
          fingerprint: cert.fingerprint,
        },
        { hubsDir, vault: fakeVault },
      );
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(PairError);
    const err = caught as PairError;
    expect(err.code).toBe('HUB_REJECTED');
    expect(err.status).toBe(409);
  });

  it('malformed confirm response (missing key) — PairError HUB_REJECTED', async () => {
    state.confirmResponse = {
      status: 200,
      body: { hubId: 'h', displayName: 'n' /* no key */ },
    };

    let caught: unknown;
    try {
      await pairWithDiscoveredHub(
        {
          hubId: 'bad-response-hub',
          addresses: ['127.0.0.1'],
          port,
          fingerprint: cert.fingerprint,
        },
        { hubsDir, vault: fakeVault },
      );
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(PairError);
    expect((caught as PairError).code).toBe('HUB_REJECTED');
  });

  it('throws HUB_REACHABILITY when no addresses are provided', async () => {
    await expect(
      pairWithDiscoveredHub(
        {
          hubId: 'no-addr-hub',
          addresses: [],
          port,
          fingerprint: cert.fingerprint,
        },
        { hubsDir, vault: fakeVault },
      ),
    ).rejects.toMatchObject({
      name: 'PairError',
      code: 'HUB_REACHABILITY',
    });
  });

  it('reuses per-hub identity across calls (same clientId)', async () => {
    const first = await pairWithDiscoveredHub(
      {
        hubId: 'stable-hub-id',
        addresses: ['127.0.0.1'],
        port,
        fingerprint: cert.fingerprint,
      },
      { hubsDir, vault: fakeVault },
    );

    // Reset recorded bodies, re-pair
    state.initBody = undefined;
    state.confirmBody = undefined;
    state.nonce = randomBytes(32);

    const second = await pairWithDiscoveredHub(
      {
        hubId: 'stable-hub-id',
        addresses: ['127.0.0.1'],
        port,
        fingerprint: cert.fingerprint,
      },
      { hubsDir, vault: fakeVault },
    );

    expect(second.clientId).toBe(first.clientId);
    // Re-read via a fresh reference so the narrower doesn't stick on `undefined`.
    const recorded = (state as { initBody: MockHubState['initBody'] }).initBody;
    expect(recorded?.clientId).toBe(first.clientId);
  });

  it('uses loopback IPv4 when it is the only ipv4 address', async () => {
    // All-loopback list should fall through to 127.0.0.1 and succeed.
    const result = await pairWithDiscoveredHub(
      {
        hubId: 'loopback-only-hub',
        addresses: ['127.0.0.1'],
        port,
        fingerprint: cert.fingerprint,
      },
      { hubsDir, vault: fakeVault },
    );
    expect(result.lastKnownUrl).toBe(`https://127.0.0.1:${port}`);
  });

  it('skips link-local IPv4 (169.254.x.x) when a real address is present', async () => {
    const result = await pairWithDiscoveredHub(
      {
        hubId: 'link-local-hub',
        addresses: ['169.254.42.42', '127.0.0.1'],
        port,
        fingerprint: cert.fingerprint,
      },
      { hubsDir, vault: fakeVault },
    );
    expect(result.lastKnownUrl).toBe(`https://127.0.0.1:${port}`);
  });
});
