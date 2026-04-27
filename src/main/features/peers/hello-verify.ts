import { createPublicKey, verify as edVerify } from 'node:crypto';

import type { PeerStore } from './peer-store';

/**
 * Signed HELLO frame payload — sent by the dialer immediately after WS open
 * and verified by the inbound `wss` against `peerStore.getByPeerId(peerId).pubkey`.
 *
 * The signature is computed over the byte sequence:
 *
 *   nonce_bytes (raw, base64-decoded) || schemaHash_utf8 || peerId_utf8
 *
 * `helloPayloadBytes` is the SINGLE source of truth for that ordering — both
 * the signer and verifier go through it. Do not duplicate the concatenation.
 */
export interface HelloPayload {
  peerId: string;
  /** ADC schema hash (utf8 string, hex). */
  schemaHash: string;
  /** Random nonce, base64 (32 bytes recommended). */
  nonce: string;
  /** Ed25519 signature, base64. */
  sig: string;
}

export type HelloVerifyResult =
  | { ok: true }
  | { ok: false; reason: 'unknown_peer' | 'bad_signature' | 'revoked' };

// Ed25519 SubjectPublicKeyInfo (SPKI) prefix for a 32-byte raw public key:
// RFC 8410 § 7. Mirrors the private-side prefix used in `peer-identity.ts`.
const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');

function createPublicKeyFromRawEd25519(rawBytes: Buffer): ReturnType<typeof createPublicKey> {
  if (rawBytes.length !== 32) {
    throw new Error(`peers.helloVerify: expected 32-byte Ed25519 pubkey, got ${String(rawBytes.length)}`);
  }
  const spki = Buffer.concat([ED25519_SPKI_PREFIX, rawBytes]);
  return createPublicKey({ key: spki, format: 'der', type: 'spki' });
}

/**
 * Build the byte buffer that gets signed/verified.
 * Ordering is fixed: nonce_bytes || schemaHash_utf8 || peerId_utf8.
 */
export function helloPayloadBytes(p: { peerId: string; schemaHash: string; nonce: string }): Buffer {
  return Buffer.concat([
    Buffer.from(p.nonce, 'base64'),
    Buffer.from(p.schemaHash, 'utf8'),
    Buffer.from(p.peerId, 'utf8'),
  ]);
}

/**
 * Verify a signed HELLO payload against the stored Ed25519 pubkey for `peerId`.
 * Returns `{ ok: true }` on success or a structured failure reason otherwise.
 *
 * `peerStore` is a `Pick<PeerStore, 'getByPeerId'>` to keep the helper pure
 * and trivially testable with an in-memory stub.
 */
export function verifyHelloSignature(
  payload: HelloPayload,
  peerStore: Pick<PeerStore, 'getByPeerId'>,
): HelloVerifyResult {
  const peer = peerStore.getByPeerId(payload.peerId);
  if (!peer) return { ok: false, reason: 'unknown_peer' };
  if (peer.revokedAt !== null) return { ok: false, reason: 'revoked' };

  const pub = Buffer.from(peer.pubkey, 'base64');
  let keyObject: ReturnType<typeof createPublicKey>;
  try {
    keyObject = createPublicKeyFromRawEd25519(pub);
  } catch {
    return { ok: false, reason: 'bad_signature' };
  }

  let ok = false;
  try {
    ok = edVerify(
      null,
      helloPayloadBytes(payload),
      keyObject,
      Buffer.from(payload.sig, 'base64'),
    );
  } catch {
    return { ok: false, reason: 'bad_signature' };
  }
  return ok ? { ok: true } : { ok: false, reason: 'bad_signature' };
}

/**
 * Sign a HELLO payload with the caller-provided Ed25519 sign function (typically
 * `selfIdentity.sign` from `peer-identity.ts`). Returns the base64-encoded sig.
 */
export function signHelloPayload(
  args: { peerId: string; schemaHash: string; nonce: string },
  sign: (msg: Uint8Array) => Uint8Array,
): string {
  const sig = sign(helloPayloadBytes(args));
  return Buffer.from(sig).toString('base64');
}
