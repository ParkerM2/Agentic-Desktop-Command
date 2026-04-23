import { createHash } from 'node:crypto';
import https from 'node:https';
import tls from 'node:tls';

import type { AgentOptions } from 'node:https';
import type { Duplex } from 'node:stream';

export interface FingerprintMismatchError extends Error {
  code: 'FINGERPRINT_MISMATCH';
  expected: string;
  actual: string;
}

/**
 * HTTPS agent subclass that identifies the peer solely by the SHA-256 hash
 * of the leaf certificate's DER bytes (the "TLS fingerprint"). The ADC hub
 * uses self-signed Ed25519 certs whose fingerprint is advertised over mDNS
 * TXT and stored on the client per-hub; this agent is the one piece that
 * enforces the pin on every outbound HTTPS request.
 *
 * Why not `checkServerIdentity`? That callback is only consulted when
 * `rejectUnauthorized: true`, which would fail the handshake first because
 * self-signed certs have no CA chain. Instead we disable the CA check,
 * let the handshake complete, then validate the fingerprint on the
 * `secureConnect` event and destroy the socket if it doesn't match.
 */
class PinnedAgent extends https.Agent {
  constructor(
    private readonly expected: string,
    options?: AgentOptions,
  ) {
    super({ ...options, rejectUnauthorized: false });
  }

  override createConnection(
    options: tls.ConnectionOptions,
    callback?: (err: Error | null, stream: Duplex) => void,
  ): Duplex {
    const socket = tls.connect({ ...options, rejectUnauthorized: false });
    socket.once('secureConnect', () => {
      const cert = socket.getPeerCertificate(true);
      const der = cert.raw as Buffer | undefined;
      if (!Buffer.isBuffer(der) || der.length === 0) {
        const err = new Error('Peer certificate missing raw DER bytes') as Error & {
          code?: string;
        };
        err.code = 'FINGERPRINT_UNVERIFIABLE';
        socket.destroy(err);
        return;
      }
      const actual = createHash('sha256').update(der).digest('hex');
      if (actual !== this.expected) {
        const err = new Error(
          `FingerprintMismatch: expected ${this.expected} got ${actual}`,
        ) as FingerprintMismatchError;
        err.code = 'FINGERPRINT_MISMATCH';
        err.expected = this.expected;
        err.actual = actual;
        socket.destroy(err);
      }
    });
    if (callback) {
      socket.once('secureConnect', () => callback(null, socket));
      socket.once('error', (err) => callback(err, socket));
    }
    return socket;
  }
}

/**
 * Create an HTTPS agent that rejects any connection whose peer certificate's
 * SHA-256 DER fingerprint doesn't match `expectedFingerprint`.
 *
 * `expectedFingerprint` is a hex string (64 chars). Case is normalized,
 * so uppercase input matches lowercase peer fingerprints.
 *
 * A mismatch propagates an error to the pending `https.request` with
 * `code === 'FINGERPRINT_MISMATCH'` and `expected` / `actual` fields,
 * enabling the UI to render a spoof-warning banner.
 */
export function buildPinnedAgent(expectedFingerprint: string): https.Agent {
  return new PinnedAgent(expectedFingerprint.toLowerCase());
}
