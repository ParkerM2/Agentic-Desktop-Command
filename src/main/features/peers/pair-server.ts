import { createServer, type Server } from 'node:https';

import { serviceLogger } from '@main/lib/logger';

import { createIpRateLimiter, type IpRateLimiter } from './rate-limiter';

import type { PeerPairing } from './peer-pairing';
import type { PeerStore } from './peer-store';
import type { PeerTlsMaterial } from './peer-tls';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';

// ─── Local constants (Task 16 will move these to peer-constants.ts) ──────────

/** Generous cap on init/confirm body size — real bodies are well under 1 KB. */
const MAX_BODY_BYTES = 16 * 1024;
/** TLS floor — Node's TLSv1.3 default for Ed25519 is fine, but we pin the floor. */
const TLS_MIN_VERSION = 'TLSv1.2' as const;
/** Time the request can spend reading headers before the server kills it. */
const HEADERS_TIMEOUT_MS = 10_000;
/** Total request lifetime ceiling, including body. */
const REQUEST_TIMEOUT_MS = 15_000;
/** How long an idle keep-alive connection lingers. */
const KEEP_ALIVE_TIMEOUT_MS = 5_000;
/** Per-request socket inactivity timeout while reading the body. */
const BODY_READ_TIMEOUT_MS = 5_000;
/** Default per-IP rate-limit capacity for /pair/init + /pair/confirm. */
const DEFAULT_RL_CAPACITY = 5;
/** Default refill: 1 token per minute. */
const DEFAULT_RL_REFILL_PER_MS = 1 / 60_000;

export interface PairInitRequestBody {
  peerId: string;
  pubkey: string;
  fingerprint: string;
  displayName?: string;
}

export interface PairServerDeps {
  tls: PeerTlsMaterial;
  pairing: PeerPairing;
  peerStore: PeerStore;
  selfIdentity: { peerId: string; pubkey: string };
  selfFingerprint: string;
  listenPort: number; // 0 = OS-assigned
  host?: string;
  onPinIssued?: (info: { sessionId: string; pin: string; initiatorPeerId: string; initiatorDisplayName?: string }) => void;
  now?: () => number;
  /**
   * Pre-existing https.Server to attach pair routes onto. When provided, the
   * pair-server skips server creation and listening — caller owns the lifecycle.
   */
  existingServer?: Server;
  /** Optional rate limiter override (test injection). */
  rateLimiter?: IpRateLimiter;
}

export type PairRequestHandler = (req: IncomingMessage, res: ServerResponse) => void;

export interface PairRoutesDeps {
  pairing: PeerPairing;
  peerStore: PeerStore;
  selfIdentity: { peerId: string; pubkey: string };
  selfFingerprint: string;
  onPinIssued?: (info: { sessionId: string; pin: string; initiatorPeerId: string; initiatorDisplayName?: string }) => void;
  now?: () => number;
  /** Per-IP rate limiter applied before any work happens. Defaults to 5/min/IP. */
  rateLimiter?: IpRateLimiter;
}

/** Returns a request handler that responds to /pair/init + /pair/confirm only. */
export function createPairRoutes(deps: PairRoutesDeps): PairRequestHandler {
  const { pairing, peerStore, selfIdentity, selfFingerprint, onPinIssued } = deps;
  const now = deps.now ?? Date.now;
  const rateLimiter =
    deps.rateLimiter ??
    createIpRateLimiter({
      capacity: DEFAULT_RL_CAPACITY,
      refillPerMs: DEFAULT_RL_REFILL_PER_MS,
    });

  return (req, res) => {
    void handle(req, res).catch((err: unknown) => {
      serviceLogger.error({ err, url: req.url }, 'peers.pairRoutes handler threw');
      if (!res.headersSent) sendJson(res, 500, { error: 'internal_error' });
    });
  };

  async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = req.url ?? '';
    const method = req.method ?? 'GET';

    if (url !== '/pair/init' && url !== '/pair/confirm') {
      sendJson(res, 404, { error: 'not_found' });
      return;
    }
    if (method !== 'POST') {
      res.setHeader('allow', 'POST');
      sendJson(res, 405, { error: 'method_not_allowed' });
      return;
    }

    const ip = req.socket.remoteAddress ?? 'unknown';
    if (!rateLimiter.consume(ip)) {
      serviceLogger.warn({ ip, url }, 'peers.pairRoutes rate-limited request');
      sendJson(res, 429, { error: 'rate_limited' });
      return;
    }

    // Slow-loris guard — if the client stops sending body bytes, drop the socket.
    req.setTimeout(BODY_READ_TIMEOUT_MS, () => {
      req.destroy();
    });

    let body: unknown;
    try {
      body = await readJsonBody(req);
    } catch (err) {
      const reason = (err as Error).message === 'body_too_large' ? 'body_too_large' : 'invalid_json';
      sendJson(res, 400, { error: reason });
      return;
    }

    if (url === '/pair/init') {
      if (!isInitBody(body)) {
        sendJson(res, 400, { error: 'invalid_body' });
        return;
      }
      const result = pairing.initPair({
        peerId: body.peerId,
        pubkey: body.pubkey,
        fingerprint: body.fingerprint,
        displayName: body.displayName,
      });
      onPinIssued?.({
        sessionId: result.sessionId,
        pin: result.pin,
        initiatorPeerId: body.peerId,
        initiatorDisplayName: body.displayName,
      });
      sendJson(res, 200, { sessionId: result.sessionId, challenge: result.challenge });
      return;
    }

    if (!isConfirmBody(body)) {
      sendJson(res, 400, { error: 'invalid_body' });
      return;
    }
    const outcome = pairing.confirmPair(body.sessionId, body.pinHmac);
    if (!outcome.ok) {
      sendJson(res, 401, { error: outcome.reason });
      return;
    }

    const { initiator } = outcome;
    if (!initiator.fingerprint) {
      sendJson(res, 400, { error: 'missing_fingerprint' });
      return;
    }
    peerStore.upsert({
      peerId: initiator.peerId,
      pubkey: initiator.pubkey,
      displayName: initiator.displayName ?? null,
      certFingerprint: initiator.fingerprint,
      pairedAt: now(),
    });

    sendJson(res, 200, {
      peerId: selfIdentity.peerId,
      pubkey: selfIdentity.pubkey,
      fingerprint: selfFingerprint,
    });
  }
}

export interface PairServer {
  port: () => number;
  url: () => string;
  close: () => Promise<void>;
}

function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    let settled = false;
    const settleErr = (err: Error): void => {
      if (settled) return;
      settled = true;
      reject(err);
    };
    const settleOk = (value: unknown): void => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    req.on('data', (chunk: Buffer) => {
      total += chunk.length;
      if (total > MAX_BODY_BYTES) {
        settleErr(new Error('body_too_large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (settled) return;
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) {
        settleOk(null);
        return;
      }
      try {
        settleOk(JSON.parse(raw));
      } catch {
        settleErr(new Error('invalid_json'));
      }
    });
    req.on('error', settleErr);
  });
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = Buffer.from(JSON.stringify(body), 'utf8');
  res.writeHead(status, {
    'content-type': 'application/json',
    'content-length': String(payload.length),
  });
  res.end(payload);
}

function isInitBody(value: unknown): value is PairInitRequestBody {
  if (value === null || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (typeof v.peerId !== 'string' || v.peerId.length === 0) return false;
  if (typeof v.pubkey !== 'string' || v.pubkey.length === 0) return false;
  if (typeof v.fingerprint !== 'string' || v.fingerprint.length === 0) return false;
  if (v.displayName !== undefined && typeof v.displayName !== 'string') return false;
  return true;
}

interface ConfirmBody {
  sessionId: string;
  pinHmac: string;
}

function isConfirmBody(value: unknown): value is ConfirmBody {
  if (value === null || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.sessionId === 'string' && typeof v.pinHmac === 'string';
}

export async function createPairServer(deps: PairServerDeps): Promise<PairServer> {
  const { tls, existingServer } = deps;
  const host = deps.host ?? '127.0.0.1';
  const ownsServer = !existingServer;

  const server: Server =
    existingServer ??
    createServer({
      cert: tls.cert,
      key: tls.key,
      minVersion: TLS_MIN_VERSION,
    });
  if (ownsServer) {
    // Slow-loris hardening — see audit 01-security finding "no requestTimeout/headersTimeout".
    server.headersTimeout = HEADERS_TIMEOUT_MS;
    server.requestTimeout = REQUEST_TIMEOUT_MS;
    server.keepAliveTimeout = KEEP_ALIVE_TIMEOUT_MS;
  }
  const handler = createPairRoutes(deps);
  server.on('request', handler);

  if (ownsServer) {
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(deps.listenPort, host, () => {
        server.removeListener('error', reject);
        resolve();
      });
    });
  }

  const addr = server.address() as AddressInfo;
  const { port: actualPort } = addr;

  return {
    port: () => actualPort,
    url: () => `https://${host}:${String(actualPort)}`,
    async close() {
      server.removeListener('request', handler);
      if (!ownsServer) return;
      await new Promise<void>((resolve, reject) => {
        server.close((err) => {
          if (err) reject(err);
          else resolve();
        });
        server.closeAllConnections();
      });
    },
  };
}
