import { createHash, createPrivateKey, generateKeyPairSync, sign as edSign } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { safeStorage } from 'electron';

import { serviceLogger } from '@main/lib/logger';

export interface PeerIdentity {
  peerIdFull: string;
  peerIdShort: string;
  pubkey: string;
  sign: (message: Uint8Array) => Uint8Array;
}

export interface IdentityOpts {
  allowPlaintext?: boolean;
}

const IDENTITY_FILENAME = 'peer-identity.json';

interface StoredIdentity {
  pubkey: string;
  privkey: string;
  useSafeStorage: boolean;
}

export function getOrCreatePeerIdentity(
  dataDir: string,
  opts: IdentityOpts = {},
): PeerIdentity {
  mkdirSync(dataDir, { recursive: true });
  const path = join(dataDir, IDENTITY_FILENAME);

  if (existsSync(path)) {
    const stored = JSON.parse(readFileSync(path, 'utf8')) as StoredIdentity;
    return materialize(stored);
  }

  const canEncrypt = safeStorage.isEncryptionAvailable();
  const envOptIn = process.env.ADC_PEERS_ALLOW_PLAINTEXT_IDENTITY === '1';
  const allowPlaintext = opts.allowPlaintext === true || envOptIn;
  if (!canEncrypt && !allowPlaintext) {
    // Refuse to leak entropy on the failure path — throw before generating the keypair.
    throw new Error(
      'peer-identity: safeStorage unavailable. Set ADC_PEERS_ALLOW_PLAINTEXT_IDENTITY=1 to opt in.',
    );
  }
  if (!canEncrypt && allowPlaintext) {
    serviceLogger.warn(
      { dataDir },
      'peers.peerIdentity writing private key in plaintext (safeStorage unavailable, opt-in via ADC_PEERS_ALLOW_PLAINTEXT_IDENTITY)',
    );
  }

  const { privateKey, publicKey } = generateKeyPairSync('ed25519', {});
  // Ed25519 SPKI is 44 bytes DER, raw key is the last 32.
  const pubBytes = publicKey.export({ type: 'spki', format: 'der' }).subarray(-32);
  // Ed25519 PKCS#8 is 48 bytes DER, raw private seed is the last 32.
  const privBytes = privateKey.export({ type: 'pkcs8', format: 'der' }).subarray(-32);

  const pubkey = pubBytes.toString('base64');
  const privkeyPlain = privBytes.toString('base64');
  const privkeyStored = canEncrypt
    ? safeStorage.encryptString(privkeyPlain).toString('base64')
    : privkeyPlain;

  const stored: StoredIdentity = {
    pubkey,
    privkey: privkeyStored,
    useSafeStorage: canEncrypt,
  };
  writeFileSync(path, JSON.stringify(stored, null, 2), { mode: 0o600, encoding: 'utf8' });
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
    sign: (message: Uint8Array) => edSign(null, message, keyObject),
  };
}
