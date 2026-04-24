import { request } from 'node:https';
import { join } from 'node:path';

import { ensureClientIdentity, type ClientIdentityOpts } from './client-identity';
import { buildPinnedAgent } from './fingerprint-agent';

import type { IncomingMessage } from 'node:http';
import type { Agent as HttpsAgent } from 'node:https';

export interface PairInput {
  /** Stable hub id from mDNS TXT. Used to scope the per-hub identity dir. */
  hubId: string;
  /** Candidate addresses from mDNS (IPv4/IPv6). */
  addresses: string[];
  /** Hub HTTPS port. */
  port: number;
  /** SHA-256 hex of the hub's DER leaf cert. */
  fingerprint: string;
  /** Optional human-readable label to send with the pair request. */
  displayName?: string;
}

export interface PairDeps {
  /** Parent directory for per-hub identity dirs (e.g. `userData/hubs`). */
  hubsDir: string;
  /** Test-only override for safeStorage. */
  vault?: ClientIdentityOpts['vault'];
}

export interface PairResult {
  hubId: string;
  displayName: string;
  key: string;
  clientId: string;
  pinnedFingerprint: string;
  lastKnownUrl: string;
}

export type PairErrorCode =
  | 'FINGERPRINT_MISMATCH'
  | 'HUB_REACHABILITY'
  | 'HUB_REJECTED'
  | 'BAD_RESPONSE';

export class PairError extends Error {
  readonly code: PairErrorCode;
  readonly status?: number;

  constructor(message: string, code: PairErrorCode, status?: number) {
    super(message);
    this.name = 'PairError';
    this.code = code;
    this.status = status;
  }
}

interface JsonResponse<T> {
  status: number;
  body: T;
}

function pickAddress(addresses: string[]): string | undefined {
  const isIpv4 = (a: string): boolean =>
    /^\d+\.\d+\.\d+\.\d+$/.test(a) && !a.startsWith('169.254.');
  // Prefer non-loopback IPv4, then any IPv4, then non-link-local IPv6, then first.
  const nonLoopback = addresses.find((a) => isIpv4(a) && !a.startsWith('127.'));
  if (nonLoopback !== undefined) return nonLoopback;
  const anyIpv4 = addresses.find((a) => isIpv4(a));
  if (anyIpv4 !== undefined) return anyIpv4;
  const nonLinkLocal = addresses.find((a) => !a.toLowerCase().startsWith('fe80'));
  return nonLinkLocal ?? addresses[0];
}

function formatHost(address: string): string {
  // Bracket IPv6 literals.
  return address.includes(':') ? `[${address}]` : address;
}

function postJson<T>(
  url: string,
  body: unknown,
  agent: HttpsAgent,
): Promise<JsonResponse<T>> {
  const payload = Buffer.from(JSON.stringify(body), 'utf8');
  return new Promise((resolve, reject) => {
    let settled = false;
    const done = (action: () => void): void => {
      if (settled) return;
      settled = true;
      action();
    };
    const req = request(
      url,
      {
        method: 'POST',
        agent,
        headers: {
          'content-type': 'application/json',
          'content-length': String(payload.byteLength),
        },
      },
      (res: IncomingMessage) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          const status = res.statusCode ?? 0;
          if (text.length === 0) {
            done(() => resolve({ status, body: {} as T }));
            return;
          }
          try {
            const parsed = JSON.parse(text) as T;
            done(() => resolve({ status, body: parsed }));
          } catch {
            done(() =>
              reject(
                new PairError(
                  `Non-JSON response from hub: ${text.slice(0, 200)}`,
                  'BAD_RESPONSE',
                  status,
                ),
              ),
            );
          }
        });
        res.on('error', (err) => {
          done(() => reject(new PairError(err.message, 'HUB_REACHABILITY')));
        });
      },
    );
    req.on('error', (err: Error & { code?: string }) => {
      if (err.code === 'FINGERPRINT_MISMATCH') {
        done(() => reject(new PairError(err.message, 'FINGERPRINT_MISMATCH')));
      } else {
        done(() => reject(new PairError(err.message, 'HUB_REACHABILITY')));
      }
    });
    req.end(payload);
  });
}

/**
 * Orchestrate the two-step pair flow against a discovered hub:
 *   1. POST /api/pair/init  → { nonce, expiresAt }
 *   2. Sign nonce with per-hub Ed25519 client key
 *   3. POST /api/pair/confirm → { hubId, displayName, key }
 *
 * The HTTPS agent is fingerprint-pinned to `fingerprint`, so a spoofed peer
 * surfaces as a `PairError` with `code === 'FINGERPRINT_MISMATCH'` which the
 * renderer can use to render the spoofing banner.
 */
export async function pairWithDiscoveredHub(
  input: PairInput,
  deps: PairDeps,
): Promise<PairResult> {
  const hubDir = join(deps.hubsDir, input.hubId);
  const identity = ensureClientIdentity(hubDir, deps.vault ? { vault: deps.vault } : undefined);

  const address = pickAddress(input.addresses);
  if (address === undefined) {
    throw new PairError('Hub has no usable addresses', 'HUB_REACHABILITY');
  }
  const baseUrl = `https://${formatHost(address)}:${input.port}`;
  const agent = buildPinnedAgent(input.fingerprint);

  const initBody: { clientId: string; clientPubKey: string; displayName?: string } = {
    clientId: identity.clientId,
    clientPubKey: identity.publicKeyBase64url,
  };
  if (input.displayName !== undefined) initBody.displayName = input.displayName;

  const initRes = await postJson<{ nonce?: string; expiresAt?: number; error?: string }>(
    `${baseUrl}/api/pair/init`,
    initBody,
    agent,
  );
  if (initRes.status !== 200 || typeof initRes.body.nonce !== 'string') {
    throw new PairError(
      initRes.body.error ?? `Pair init failed (${initRes.status})`,
      'HUB_REJECTED',
      initRes.status,
    );
  }

  let nonceBuf: Buffer;
  try {
    nonceBuf = Buffer.from(initRes.body.nonce, 'base64url');
  } catch {
    throw new PairError('Hub returned non-base64url nonce', 'BAD_RESPONSE', initRes.status);
  }
  const signature = identity.signNonce(nonceBuf).toString('base64url');

  const confirmBody: {
    clientId: string;
    nonce: string;
    signature: string;
    displayName?: string;
  } = {
    clientId: identity.clientId,
    nonce: initRes.body.nonce,
    signature,
  };
  if (input.displayName !== undefined) confirmBody.displayName = input.displayName;

  const confirmRes = await postJson<{
    hubId?: string;
    displayName?: string;
    key?: string;
    error?: string;
  }>(`${baseUrl}/api/pair/confirm`, confirmBody, agent);

  if (
    confirmRes.status !== 200 ||
    typeof confirmRes.body.key !== 'string' ||
    typeof confirmRes.body.hubId !== 'string' ||
    typeof confirmRes.body.displayName !== 'string'
  ) {
    throw new PairError(
      confirmRes.body.error ?? `Pair confirm failed (${confirmRes.status})`,
      'HUB_REJECTED',
      confirmRes.status,
    );
  }

  return {
    hubId: confirmRes.body.hubId,
    displayName: confirmRes.body.displayName,
    key: confirmRes.body.key,
    clientId: identity.clientId,
    pinnedFingerprint: input.fingerprint,
    lastKnownUrl: baseUrl,
  };
}
