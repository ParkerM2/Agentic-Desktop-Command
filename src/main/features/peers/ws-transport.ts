import { randomBytes } from 'node:crypto';
import { createServer as createHttpsServer, type Server as HttpsServer } from 'node:https';

import { WebSocket, WebSocketServer, type RawData, type ClientOptions } from 'ws';

import type { Op } from '@shared/replication/op-types';

import {
  signHelloPayload,
  verifyHelloSignature,
} from '@main/features/peers/hello-verify';
import {
  createOutboundDialer,
  type DialResult,
  type OutboundDialer,
} from '@main/features/peers/outbound-dialer';
import type { PeerStore } from '@main/features/peers/peer-store';
import { pinnedCheckServerIdentity } from '@main/features/peers/peer-tls-pin';
import type { ReplicationEngine } from '@main/features/peers/replication-engine';
import { serviceLogger } from '@main/lib/logger';


export interface WsTransportTlsOpts {
  cert: string;
  key: string;
}

export interface WsTransportRemotePeer {
  peerId: string;
  fingerprint: string;
}

/** Self identity used to sign the outbound HELLO nonce. */
export interface WsTransportSelfIdentity {
  peerId: string;
  sign: (msg: Uint8Array) => Uint8Array;
}

export interface WsTransportDeps {
  engine: ReplicationEngine;
  listenPort: number; // 0 = OS-assigned
  remoteUrl: string;  // '' = don't connect out
  schemaHash: string;
  /** When provided, the inbound server runs over TLS using this material. */
  tls?: WsTransportTlsOpts;
  /** When provided alongside a wss:// remoteUrl, the outbound socket pins this fingerprint. */
  remotePeer?: WsTransportRemotePeer;
  /**
   * Pre-existing https.Server to attach the WebSocketServer onto. When provided,
   * ws-transport skips server creation/listening — caller owns the lifecycle.
   * Mutually exclusive with `tls` (caller already configured TLS on the server).
   */
  existingHttpsServer?: HttpsServer;
  /**
   * Paired-peer store, used to look up the Ed25519 pubkey for inbound HELLO
   * signature verification (Task 6). The single instance is owned by
   * `peers-service` and passed through `peer-server`.
   *
   * Optional ONLY for legacy integration tests that use plain `ws://` and
   * do not exercise the auth path. Production callers (`peer-server`) always
   * pass it; when absent inbound auth is skipped.
   */
  peerStore?: PeerStore;
  /**
   * Self identity used to sign outbound HELLO frames. Required when
   * `remoteUrl` is set; ignored otherwise.
   *
   * Optional ONLY for legacy integration tests; production callers always
   * pass it. When absent, HELLO frames are sent with only `schemaHash`.
   */
  selfIdentity?: WsTransportSelfIdentity;
  /**
   * Notified after an inbound peer's HELLO signature verifies. The service
   * uses this to update presence state.
   */
  onConnected?: (info: { peerId: string }) => void;
}

/**
 * Hard cap on simultaneous inbound WS sockets. Overflow connections are
 * closed with WS code 1013 ('try again later'). A constant for now;
 * Task 16 moves this into `peer-constants.ts`.
 */
const MAX_INBOUND_SOCKETS = 64;

export interface WsTransport {
  listenPort: () => number;
  isConnected: () => boolean;
  close: () => Promise<void>;
}

interface WireFrame {
  type: 'HELLO' | 'OPS' | 'PING';
  payload?: unknown;
}

/**
 * HELLO frame payload. Includes the signed nonce (Task 6) so the inbound
 * server can authenticate the peer via the paired pubkey before accepting
 * any further frames. T7 will Zod-validate this; for now it's loosely typed.
 *
 * Signature is over `nonce_bytes || schemaHash_utf8 || peerId_utf8` —
 * see `hello-verify.ts::helloPayloadBytes` for the canonical ordering.
 */
interface HelloPayload {
  schemaHash: string;
  /** Self peerId of the sender (so the receiver can look up the pubkey). */
  peerId?: string;
  /** Random nonce, base64. 32 bytes recommended. */
  nonce?: string;
  /** Ed25519 signature over the canonical payload bytes, base64. */
  sig?: string;
}

/**
 * Reserved close code for an outbound dialer rejecting a peer cert that
 * fails the pinned fingerprint check. Pinning now runs at TLS-handshake
 * time via `checkServerIdentity` (see `peer-tls-pin.ts`), so the dial path
 * no longer emits this code itself — the WebSocket fails before `'open'`
 * with a TLS error. Kept here for inbound code paths and documentation.
 */
const FINGERPRINT_MISMATCH_CODE = 4002;
void FINGERPRINT_MISMATCH_CODE;

function dataToString(data: RawData): string {
  if (typeof data === 'string') return data;
  if (Buffer.isBuffer(data)) return data.toString('utf8');
  if (Array.isArray(data)) return Buffer.concat(data).toString('utf8');
  return Buffer.from(data).toString('utf8');
}

export async function createWsTransport(deps: WsTransportDeps): Promise<WsTransport> {
  const {
    engine,
    remoteUrl,
    tls,
    remotePeer,
    existingHttpsServer,
    peerStore,
    selfIdentity,
    onConnected,
  } = deps;

  let outSocket: WebSocket | null = null;
  const incomingSockets = new Set<WebSocket>();

  let ownedHttpsServer: HttpsServer | null = null;
  let wss: WebSocketServer;
  if (existingHttpsServer) {
    wss = new WebSocketServer({ server: existingHttpsServer });
  } else if (tls) {
    const server = createHttpsServer({ cert: tls.cert, key: tls.key });
    ownedHttpsServer = server;
    wss = new WebSocketServer({ server });
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(deps.listenPort, '127.0.0.1', () => {
        server.removeListener('error', reject);
        resolve();
      });
    });
  } else {
    wss = new WebSocketServer({ port: deps.listenPort, host: '127.0.0.1' });
    await new Promise<void>((resolve) => {
      wss.once('listening', () => { resolve(); });
    });
  }
  // Audit C3: a single peer-side RST or stack-level error must not crash the
  // agent host. Without this listener Node's EventEmitter throws when `wss`
  // emits `'error'` (no listeners).
  wss.on('error', (err) => {
    serviceLogger.error({ err }, 'peers.wsTransport.wss error');
  });
  const addrSource = existingHttpsServer ?? ownedHttpsServer ?? wss;
  const addr = addrSource.address();
  if (addr === null || typeof addr === 'string') {
    throw new Error('WebSocketServer returned unexpected address');
  }
  const actualPort = addr.port;

  function send(ws: WebSocket, frame: WireFrame): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(frame));
    }
  }

  function broadcastOp(op: Op): void {
    const frame: WireFrame = { type: 'OPS', payload: { ops: [op] } };
    const str = JSON.stringify(frame);
    if (outSocket?.readyState === WebSocket.OPEN) outSocket.send(str);
    for (const ws of incomingSockets) {
      if (ws.readyState === WebSocket.OPEN) ws.send(str);
    }
  }

  /**
   * Authenticate an inbound HELLO frame against `peerStore`.
   * Returns true when the frame is accepted, false when the socket has been
   * closed and the caller must abort.
   */
  function authenticateInboundHello(ws: WebSocket, helloPayload: HelloPayload): boolean {
    if (!peerStore) return true;
    if (
      typeof helloPayload.peerId !== 'string' ||
      typeof helloPayload.nonce !== 'string' ||
      typeof helloPayload.sig !== 'string'
    ) {
      serviceLogger.warn(
        { peerId: helloPayload.peerId },
        'peers.wsTransport inbound HELLO missing peerId/nonce/sig',
      );
      ws.close(4004, 'untrusted');
      incomingSockets.delete(ws);
      return false;
    }
    const verifyResult = verifyHelloSignature(
      {
        peerId: helloPayload.peerId,
        schemaHash: helloPayload.schemaHash,
        nonce: helloPayload.nonce,
        sig: helloPayload.sig,
      },
      peerStore,
    );
    if (!verifyResult.ok) {
      serviceLogger.warn(
        { peerId: helloPayload.peerId, reason: verifyResult.reason },
        'peers.wsTransport inbound HELLO auth failed',
      );
      ws.close(4004, 'untrusted');
      incomingSockets.delete(ws);
      return false;
    }
    if (onConnected) {
      try { onConnected({ peerId: helloPayload.peerId }); }
      catch (err) {
        serviceLogger.warn({ err }, 'peers.wsTransport onConnected handler threw');
      }
    }
    return true;
  }

  function handleHelloFrame(
    ws: WebSocket,
    helloPayload: HelloPayload | undefined,
    ctx: { isInbound: boolean },
  ): void {
    if (helloPayload?.schemaHash !== deps.schemaHash) {
      serviceLogger.warn(
        { local: deps.schemaHash, remote: helloPayload?.schemaHash },
        'peers.wsTransport schema mismatch — closing socket',
      );
      ws.close(4001, 'schema mismatch');
      return;
    }
    if (ctx.isInbound) {
      authenticateInboundHello(ws, helloPayload);
    }
  }

  function handleOpsFrame(payload: unknown): void {
    const opsPayload = (payload ?? {}) as { ops?: unknown };
    if (!Array.isArray(opsPayload.ops)) {
      serviceLogger.warn({ payload }, 'peers.wsTransport.OPS frame missing ops array');
      return;
    }
    for (const op of opsPayload.ops as Op[]) {
      try {
        engine.applyRemoteOp(op);
      } catch (err) {
        serviceLogger.error({ err }, 'peers.wsTransport.applyRemoteOp threw');
      }
    }
  }

  function handleFrame(ws: WebSocket, raw: string, ctx: { isInbound: boolean }): void {
    let frame: WireFrame;
    try {
      frame = JSON.parse(raw) as WireFrame;
    } catch {
      return;
    }
    if (frame.type === 'HELLO') {
      handleHelloFrame(ws, frame.payload as HelloPayload | undefined, ctx);
      return;
    }
    if (frame.type === 'OPS') {
      handleOpsFrame(frame.payload);
    }
    // PING is a no-op in Phase 1
  }

  wss.on('connection', (ws) => {
    // Audit M5 (Task 6): cap inbound concurrency. Reject overflow with
    // WS close 1013 ('try again later').
    if (incomingSockets.size >= MAX_INBOUND_SOCKETS) {
      serviceLogger.warn(
        { current: incomingSockets.size, max: MAX_INBOUND_SOCKETS },
        'peers.wsTransport inbound socket cap reached — rejecting',
      );
      ws.close(1013, 'busy');
      return;
    }
    incomingSockets.add(ws);
    // Audit C3: a peer-side RST after acceptance must not crash the agent
    // host. Without an `'error'` listener the EventEmitter throws.
    ws.on('error', (err) => {
      serviceLogger.warn({ err }, 'peers.wsTransport.incoming error');
    });
    ws.on('message', (data: RawData) => { handleFrame(ws, dataToString(data), { isInbound: true }); });
    ws.on('close', () => incomingSockets.delete(ws));
    // Send our HELLO. In production (selfIdentity present) it is signed for
    // wire-format symmetry; legacy tests without selfIdentity send the
    // schema-only HELLO that the pre-T6 wire format used.
    if (selfIdentity) {
      const nonce = randomBytes(32).toString('base64');
      const sig = signHelloPayload(
        { peerId: selfIdentity.peerId, schemaHash: deps.schemaHash, nonce },
        selfIdentity.sign,
      );
      send(ws, {
        type: 'HELLO',
        payload: {
          schemaHash: deps.schemaHash,
          peerId: selfIdentity.peerId,
          nonce,
          sig,
        } satisfies HelloPayload,
      });
    } else {
      send(ws, {
        type: 'HELLO',
        payload: { schemaHash: deps.schemaHash } satisfies HelloPayload,
      });
    }
  });

  let shuttingDown = false;
  let dialer: OutboundDialer | null = null;

  /**
   * One dial attempt. Resolves with:
   *   - `'OK'`  → WebSocket opened (HELLO sent). When this socket later
   *              `'close'`s, we re-arm the dialer to start the next attempt.
   *   - `'PERMANENT_FAIL'` → TLS fingerprint mismatch (peer-tls-pin returned
   *              an Error containing `'fingerprint mismatch'`). The dialer
   *              moves to `permanently_failed` and stops retrying.
   *   - `'FAIL'` → any other transient failure (close before open, network
   *              error, ECONNREFUSED). The dialer schedules the next attempt
   *              with exponential backoff + jitter.
   */
  function attemptDial(): Promise<DialResult> {
    if (!remoteUrl || shuttingDown) return Promise.resolve('FAIL');
    return new Promise<DialResult>((resolve) => {
      const isWss = remoteUrl.startsWith('wss://');
      // Pin the remote leaf cert during the TLS handshake. With this hook a
      // fingerprint mismatch fails the WebSocket before `'open'` fires, so
      // there is no post-handshake fingerprint check below.
      //
      // The `ws` package types `checkServerIdentity` as
      // `(name, cert: CertMeta) => boolean`, but at runtime Node passes the
      // real `PeerCertificate` and accepts an `Error | undefined` return —
      // matching `https.RequestOptions.checkServerIdentity`. We cast through
      // `ClientOptions` to satisfy the looser package typing.
      const wssOpts: ClientOptions = remotePeer
        ? {
            rejectUnauthorized: true,
            checkServerIdentity: pinnedCheckServerIdentity(
              remotePeer.fingerprint,
            ) as unknown as ClientOptions['checkServerIdentity'],
          }
        : { rejectUnauthorized: true };
      const ws = isWss
        ? new WebSocket(remoteUrl, wssOpts)
        : new WebSocket(remoteUrl);
      outSocket = ws;

      let settled = false;
      let permanent = false;

      ws.on('open', () => {
        if (selfIdentity) {
          // Sign the outbound HELLO so the inbound peer can authenticate us
          // (Task 6). Signature is over nonce_bytes || schemaHash_utf8 || peerId_utf8.
          const nonce = randomBytes(32).toString('base64');
          const sig = signHelloPayload(
            { peerId: selfIdentity.peerId, schemaHash: deps.schemaHash, nonce },
            selfIdentity.sign,
          );
          send(ws, {
            type: 'HELLO',
            payload: {
              schemaHash: deps.schemaHash,
              peerId: selfIdentity.peerId,
              nonce,
              sig,
            } satisfies HelloPayload,
          });
        } else {
          // Legacy test path: send schema-only HELLO.
          send(ws, {
            type: 'HELLO',
            payload: { schemaHash: deps.schemaHash } satisfies HelloPayload,
          });
        }
        if (!settled) {
          settled = true;
          resolve('OK');
        }
      });
      ws.on('message', (data: RawData) => {
        handleFrame(ws, dataToString(data), { isInbound: false });
      });
      ws.on('error', (err: Error & { code?: string }) => {
        serviceLogger.warn({ err }, 'peers.wsTransport.dial error');
        const msg = err.message;
        const code = err.code ?? '';
        if (msg.includes('fingerprint mismatch') || code === 'FINGERPRINT_MISMATCH') {
          permanent = true;
        }
      });
      ws.on('close', () => {
        const wasOutSocket = outSocket === ws;
        if (wasOutSocket) outSocket = null;
        if (!settled) {
          // Closed before 'open' → transient or permanent failure.
          settled = true;
          resolve(permanent ? 'PERMANENT_FAIL' : 'FAIL');
          return;
        }
        // The socket previously emitted 'open' (we resolved 'OK' already).
        // Treat the close as a request to re-arm the dialer for the next
        // attempt — single-flight guard inside the dialer makes re-entrant
        // start() calls a no-op when not in idle/backoff.
        if (!shuttingDown) {
          dialer?.start();
        }
      });
    });
  }

  if (remoteUrl) {
    dialer = createOutboundDialer({ attemptDial });
    dialer.start();
  }

  const unsubscribe = engine.onLocalOp((op) => broadcastOp(op));

  return {
    listenPort: () => actualPort,
    isConnected: () =>
      outSocket?.readyState === WebSocket.OPEN || incomingSockets.size > 0,
    async close() {
      shuttingDown = true;
      dialer?.close();
      unsubscribe();
      if (outSocket) outSocket.close();
      for (const ws of incomingSockets) ws.close();
      await new Promise<void>((resolve) => {
        wss.close(() => { resolve(); });
      });
      const server = ownedHttpsServer;
      if (server) {
        await new Promise<void>((resolve) => {
          server.close(() => { resolve(); });
          server.closeAllConnections();
        });
      }
    },
  };
}
