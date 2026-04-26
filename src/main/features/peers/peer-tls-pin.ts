import { createHash, timingSafeEqual } from 'node:crypto';

import type { PeerCertificate } from 'node:tls';

/**
 * Returns a `checkServerIdentity` callback for Node TLS / `ws` that pins the
 * peer's leaf certificate to the given SHA-256 fingerprint (hex).
 *
 * The callback returns `undefined` on match (handshake proceeds) and an
 * `Error` on mismatch (handshake aborts before any application data is
 * exchanged). This is the correct hook for pinning: it runs inside the TLS
 * stack, before the socket emits `'open'` / `'secureConnect'`.
 */
export function pinnedCheckServerIdentity(expectedFingerprintHex: string) {
  const expected = Buffer.from(expectedFingerprintHex, 'hex');
  return (_host: string, cert: PeerCertificate): Error | undefined => {
    const { raw } = cert as { raw?: Buffer };
    if (!raw || raw.length === 0) {
      return new Error('peer fingerprint mismatch (no cert)');
    }
    const actual = createHash('sha256').update(raw).digest();
    if (
      actual.length !== expected.length ||
      !timingSafeEqual(actual, expected)
    ) {
      return new Error('peer fingerprint mismatch');
    }
    return undefined;
  };
}
