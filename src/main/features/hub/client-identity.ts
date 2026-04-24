import { generateKeyPairSync, createHash, createPrivateKey, sign } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { safeStorage } from 'electron';

export interface ClientIdentity {
  /** First 32 hex chars of SHA-256 of the DER SPKI public key. */
  clientId: string;
  /** DER-encoded SPKI public key. */
  publicKeyDer: Buffer;
  /** base64url-encoded DER SPKI public key — ready to send in /api/pair/init. */
  publicKeyBase64url: string;
  /** Sign raw bytes (typically a nonce) with the hub-scoped private key. */
  signNonce: (nonce: Buffer) => Buffer;
}

export interface ClientIdentityOpts {
  /** Override safeStorage for tests. Both methods return Buffer. */
  vault?: {
    encryptString: (value: string) => Buffer;
    decryptString: (encrypted: Buffer) => string;
    isEncryptionAvailable?: () => boolean;
  };
}

function getVault(opts?: ClientIdentityOpts) {
  if (opts?.vault) return opts.vault;
  return {
    encryptString: (value: string) => safeStorage.encryptString(value),
    decryptString: (encrypted: Buffer) => safeStorage.decryptString(encrypted),
    isEncryptionAvailable: () => safeStorage.isEncryptionAvailable(),
  };
}

function deriveClientId(publicKeyDer: Buffer): string {
  return createHash('sha256').update(publicKeyDer).digest('hex').slice(0, 32);
}

export function ensureClientIdentity(hubDir: string, opts?: ClientIdentityOpts): ClientIdentity {
  mkdirSync(hubDir, { recursive: true });
  const encPath = join(hubDir, 'client-identity.enc');
  const pubPath = join(hubDir, 'client-identity.pub');

  if (existsSync(encPath) && existsSync(pubPath)) {
    const publicKeyDer = readFileSync(pubPath);
    const vault = getVault(opts);
    const privPemString = vault.decryptString(readFileSync(encPath));
    const privateKey = createPrivateKey(privPemString);
    return {
      clientId: deriveClientId(publicKeyDer),
      publicKeyDer,
      publicKeyBase64url: publicKeyDer.toString('base64url'),
      signNonce: (nonce) => sign(null, nonce, privateKey),
    };
  }

  // Generate fresh keypair
  const { publicKey, privateKey } = generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'der' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  const publicKeyDer = publicKey as Buffer;
  const privatePem = privateKey;

  const vault = getVault(opts);
  const encrypted = vault.encryptString(privatePem);
  writeFileSync(encPath, encrypted, { mode: 0o600 });
  writeFileSync(pubPath, publicKeyDer, { mode: 0o600 });

  const privateKeyObj = createPrivateKey(privatePem);
  return {
    clientId: deriveClientId(publicKeyDer),
    publicKeyDer,
    publicKeyBase64url: publicKeyDer.toString('base64url'),
    signNonce: (nonce) => sign(null, nonce, privateKeyObj),
  };
}
