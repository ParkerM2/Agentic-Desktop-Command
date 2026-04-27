import { generateKeyPairSync, randomBytes, sign as edSign } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  helloPayloadBytes,
  signHelloPayload,
  verifyHelloSignature,
} from '@main/features/peers/hello-verify';
import type { PairedPeer, PeerStore } from '@main/features/peers/peer-store';

/** Build a minimal `Pick<PeerStore, 'getByPeerId'>` backed by an in-memory map. */
function buildStubStore(peers: Record<string, PairedPeer | null>): Pick<PeerStore, 'getByPeerId'> {
  return {
    getByPeerId(peerId) {
      return peers[peerId] ?? null;
    },
  };
}

interface Ed25519KeyMaterial {
  pubkeyBase64: string;
  signRaw: (msg: Uint8Array) => Uint8Array;
}

/** Generate an Ed25519 keypair and expose pubkey (raw 32-byte base64) + sign. */
function makeKey(): Ed25519KeyMaterial {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519', {});
  // Last 32 bytes of SPKI DER are the raw public key.
  const pub = publicKey.export({ type: 'spki', format: 'der' }).subarray(-32);
  return {
    pubkeyBase64: Buffer.from(pub).toString('base64'),
    signRaw: (msg: Uint8Array) => edSign(null, Buffer.from(msg), privateKey),
  };
}

function pairedPeer(overrides: Partial<PairedPeer> & Pick<PairedPeer, 'peerId' | 'pubkey' | 'certFingerprint'>): PairedPeer {
  return {
    displayName: null,
    lastSeenHlc: null,
    pairedAt: 1,
    lastConnectedAt: null,
    revokedAt: null,
    ...overrides,
  };
}

describe('verifyHelloSignature', () => {
  it('returns unknown_peer when peerStore has no record', () => {
    const store = buildStubStore({});
    const result = verifyHelloSignature(
      {
        peerId: 'missing',
        schemaHash: 'hash',
        nonce: Buffer.from(randomBytes(32)).toString('base64'),
        sig: Buffer.alloc(64).toString('base64'),
      },
      store,
    );
    expect(result).toEqual({ ok: false, reason: 'unknown_peer' });
  });

  it('returns revoked when the stored peer is revoked', () => {
    const key = makeKey();
    const store = buildStubStore({
      'peer-A': pairedPeer({
        peerId: 'peer-A',
        pubkey: key.pubkeyBase64,
        certFingerprint: 'fp',
        revokedAt: 1234,
      }),
    });
    const nonce = Buffer.from(randomBytes(32));
    const sig = signHelloPayload(
      { peerId: 'peer-A', schemaHash: 'hash', nonce: nonce.toString('base64') },
      key.signRaw,
    );
    const result = verifyHelloSignature(
      {
        peerId: 'peer-A',
        schemaHash: 'hash',
        nonce: nonce.toString('base64'),
        sig,
      },
      store,
    );
    expect(result).toEqual({ ok: false, reason: 'revoked' });
  });

  it('returns bad_signature when the signature does not verify against the stored pubkey', () => {
    const correct = makeKey();
    const wrong = makeKey();
    const store = buildStubStore({
      'peer-A': pairedPeer({
        peerId: 'peer-A',
        pubkey: correct.pubkeyBase64,
        certFingerprint: 'fp',
      }),
    });
    const nonce = Buffer.from(randomBytes(32));
    // Signed with the WRONG key.
    const sig = signHelloPayload(
      { peerId: 'peer-A', schemaHash: 'hash', nonce: nonce.toString('base64') },
      wrong.signRaw,
    );
    const result = verifyHelloSignature(
      {
        peerId: 'peer-A',
        schemaHash: 'hash',
        nonce: nonce.toString('base64'),
        sig,
      },
      store,
    );
    expect(result).toEqual({ ok: false, reason: 'bad_signature' });
  });

  it('returns ok:true when a real Ed25519 sig over (nonce || schemaHash || peerId) verifies', () => {
    const key = makeKey();
    const store = buildStubStore({
      'peer-A': pairedPeer({
        peerId: 'peer-A',
        pubkey: key.pubkeyBase64,
        certFingerprint: 'fp',
      }),
    });
    const nonce = Buffer.from(randomBytes(32));
    const schemaHash = 'schema-v1';
    const peerId = 'peer-A';
    const sig = signHelloPayload(
      { peerId, schemaHash, nonce: nonce.toString('base64') },
      key.signRaw,
    );
    const result = verifyHelloSignature(
      { peerId, schemaHash, nonce: nonce.toString('base64'), sig },
      store,
    );
    expect(result).toEqual({ ok: true });
  });

  it('helloPayloadBytes orders bytes as nonce_bytes || schemaHash_utf8 || peerId_utf8', () => {
    const nonce = Buffer.from('abcd', 'base64');
    const out = helloPayloadBytes({
      peerId: 'pid',
      schemaHash: 'h',
      nonce: nonce.toString('base64'),
    });
    expect(out).toEqual(
      Buffer.concat([nonce, Buffer.from('h', 'utf8'), Buffer.from('pid', 'utf8')]),
    );
  });
});

describe('signHelloPayload', () => {
  it('produces a base64 string accepted by verifyHelloSignature', () => {
    const key = makeKey();
    const store = buildStubStore({
      'peer-Z': pairedPeer({
        peerId: 'peer-Z',
        pubkey: key.pubkeyBase64,
        certFingerprint: 'fp',
      }),
    });
    const nonce = Buffer.from(randomBytes(32)).toString('base64');
    const sig = signHelloPayload(
      { peerId: 'peer-Z', schemaHash: 'h', nonce },
      key.signRaw,
    );
    expect(typeof sig).toBe('string');
    // base64 of an Ed25519 64-byte signature decodes to 64 bytes.
    expect(Buffer.from(sig, 'base64').length).toBe(64);
    const result = verifyHelloSignature(
      { peerId: 'peer-Z', schemaHash: 'h', nonce, sig },
      store,
    );
    expect(result).toEqual({ ok: true });
  });
});
