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
import {
  parseWireFrame,
  type HelloFrame,
  type OpsFrame,
  type WireFrame,
} from '@main/features/peers/wire-schema';
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
    const frame: WireFrame = { type: 'OPS', ops: [op] };
    const str = JSON.stringify(frame);
    if (outSocket?.readyState === WebSocket.OPEN) outSocket.send(str);
    for (const ws of incomingSockets) {
      if (ws.readyState === WebSocket.OPEN) ws.send(str);
    }
  }

  /**
   * Authenticate an inbound HELLO frame against `peerStore`. Zod has already
   * verified that `peerId`, `nonce`, and `sig` are non-empty strings.
   * Returns true when the frame is accepted, false when the socket has been
   * closed and the caller must abort.
   */
  function authenticateInboundHello(ws: WebSocket, frame: HelloFrame): boolean {
    if (!peerStore) return true;
    const verifyResult = verifyHelloSignature(
      {
        peerId: frame.peerId,
        schemaHash: frame.schemaHash,
        nonce: frame.nonce,
        sig: frame.sig,
      },
      peerStore,
    );
    if (!verifyResult.ok) {
      serviceLogger.warn(
        { peerId: frame.peerId, reason: verifyResult.reason },
        'peers.wsTransport inbound HELLO auth failed',
      );
      ws.close(4004, 'untrusted');
      incomingSockets.delete(ws);
      return false;
    }
    if (onConnected) {
      try { onConnected({ peerId: frame.peerId }); }
      catch (err) {
        serviceLogger.warn({ err }, 'peers.wsTransport onConnected handler threw');
      }
    }
    return true;
  }

  function handleHelloFrame(
    ws: WebSocket,
    frame: HelloFrame,
    ctx: { isInbound: boolean },
  ): void {
    if (frame.schemaHash !== deps.schemaHash) {
      serviceLogger.warn(
        { local: deps.schemaHash, remote: frame.schemaHash },
        'peers.wsTransport schema mismatch — closing socket',
      );
      ws.close(4001, 'schema mismatch');
      return;
    }
    if (ctx.isInbound) {
      authenticateInboundHello(ws, frame);
    }
  }

  function handleOpsFrame(frame: OpsFrame): void {
    // T9 will tighten per-op validation in `replication-engine.applyRemoteOp`,
    // which already has a column-allowlist. For now we trust the structure
    // Zod confirmed (array, length cap) and let the engine reject bad shapes.
    for (const op of frame.ops as Op[]) {
      try {
        engine.applyRemoteOp(op);
      } catch (err) {
        serviceLogger.error({ err }, 'peers.wsTransport.applyRemoteOp threw');
      }
    }
  }

  function handleFrame(ws: WebSocket, raw: string, ctx: { isInbound: boolean }): void {
    const parsed = parseWireFrame(raw);
    if (!parsed.ok) {
      serviceLogger.warn(
        { reason: parsed.error },
        'peers.wsTransport.malformedFrame',
      );
      ws.close(4003, 'malformed frame');
      return;
    }
    const { frame } = parsed;
    if (frame.type === 'HELLO') {
      handleHelloFrame(ws, frame, ctx);
      return;
    }
    if (frame.type === 'OPS') {
      handleOpsFrame(frame);
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
    // wire-format symmetry. Legacy tests without selfIdentity emit placeholder
    // nonce/sig values purely to satisfy the wire schema; the receiver in
    // those tests has no peerStore, so signature verification is skipped.
    if (selfIdentity) {
      const nonce = randomBytes(32).toString('base64');
      const sig = signHelloPayload(
        { peerId: selfIdentity.peerId, schemaHash: deps.schemaHash, nonce },
        selfIdentity.sign,
      );
      send(ws, {
        type: 'HELLO',
        peerId: selfIdentity.peerId,
        schemaHash: deps.schemaHash,
        nonce,
        sig,
      });
    } else {
      send(ws, {
        type: 'HELLO',
        peerId: 'legacy',
        schemaHash: deps.schemaHash,
        nonce: 'legacy',
        sig: 'legacy',
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
            peerId: selfIdentity.peerId,
            schemaHash: deps.schemaHash,
            nonce,
            sig,
          });
        } else {
          // Legacy test path: emit placeholder nonce/sig to satisfy the wire
          // schema. Receiver with no peerStore skips signature verification.
          send(ws, {
            type: 'HELLO',
            peerId: 'legacy',
            schemaHash: deps.schemaHash,
            nonce: 'legacy',
            sig: 'legacy',
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
