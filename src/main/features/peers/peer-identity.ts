import { createHash, createPrivateKey, generateKeyPairSync, sign as edSign } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { safeStorage } from 'electron';

export interface PeerIdentity {
  peerIdFull: string;
  peerIdShort: string;
  pubkey: string;
  privkey: string;
  sign: (message: Uint8Array) => Uint8Array;
}

const IDENTITY_FILENAME = 'peer-identity.json';

interface StoredIdentity {
  pubkey: string;
  privkey: string;
  useSafeStorage: boolean;
}

export function getOrCreatePeerIdentity(dataDir: string): PeerIdentity {
  mkdirSync(dataDir, { recursive: true });
  const path = join(dataDir, IDENTITY_FILENAME);

  if (existsSync(path)) {
    const stored = JSON.parse(readFileSync(path, 'utf8')) as StoredIdentity;
    return materialize(stored);
  }

  const { privateKey, publicKey } = generateKeyPairSync('ed25519', {});
  // Ed25519 SPKI is 44 bytes DER, raw key is the last 32.
  const pubBytes = publicKey.export({ type: 'spki', format: 'der' }).subarray(-32);
  // Ed25519 PKCS#8 is 48 bytes DER, raw private seed is the last 32.
  const privBytes = privateKey.export({ type: 'pkcs8', format: 'der' }).subarray(-32);

  const pubkey = pubBytes.toString('base64');
  const canEncrypt = safeStorage.isEncryptionAvailable();
  const privkeyPlain = privBytes.toString('base64');
  const privkeyStored = canEncrypt
    ? safeStorage.encryptString(privkeyPlain).toString('base64')
    : privkeyPlain;

  const stored: StoredIdentity = {
    pubkey,
    privkey: privkeyStored,
    useSafeStorage: canEncrypt,
  };
  writeFileSync(path, JSON.stringify(stored, null, 2), 'utf8');
  return materialize(stored);
}

// Ed25519 PKCS#8 prefix for a 32-byte seed: RFC 8410 § 7
const ED25519_PKCS8_PREFIX = Buffer.from('302e020100300506032b657004220420', 'hex');

function materialize(stored: StoredIdentity): PeerIdentity {
  const pubBytes = Buffer.from(stored.pubkey, 'base64');
  const peerIdFull = createHash('sha256').update(pubBytes).digest('hex');

  const privBytesPlain = stored.useSafeStorage
    ? safeStorage.decryptString(Buffer.from(stored.privkey, 'base64'))
    : stored.privkey;
  const privBytes = Buffer.from(privBytesPlain, 'base64');

  const pkcs8 = Buffer.concat([ED25519_PKCS8_PREFIX, privBytes]);
  const keyObject = createPrivateKey({ key: pkcs8, format: 'der', type: 'pkcs8' });

  return {
    peerIdFull,
    peerIdShort: peerIdFull.slice(0, 8),
    pubkey: stored.pubkey,
    privkey: privBytes.toString('base64'),
    sign: (message: Uint8Array) => edSign(null, message, keyObject),
  };
}
