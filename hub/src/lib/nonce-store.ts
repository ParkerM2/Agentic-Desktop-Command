import { randomBytes } from 'node:crypto';

export interface NonceStore {
  mint: (clientId: string) => { nonce: string; expiresAt: number };
  consume: (clientId: string, nonce: string) => boolean;
  has: (clientId: string, nonce: string) => boolean;
}

const TTL_MS = 30_000;

/**
 * In-memory nonce store keyed by clientId.
 * - Nonces are 32-byte base64url (43 chars, no padding).
 * - TTL of 30s.
 * - Single-use via `consume`; `has` is a non-destructive check used mostly for tests.
 * - Expired entries are lazily pruned on every mutation.
 */
export function createNonceStore(): NonceStore {
  const store = new Map<string, Map<string, number>>();

  function prune(): void {
    const now = Date.now();
    for (const [cid, nonces] of store) {
      for (const [n, exp] of nonces) {
        if (exp <= now) nonces.delete(n);
      }
      if (nonces.size === 0) store.delete(cid);
    }
  }

  return {
    mint(clientId) {
      prune();
      const nonce = randomBytes(32).toString('base64url');
      const expiresAt = Date.now() + TTL_MS;
      let bucket = store.get(clientId);
      if (!bucket) {
        bucket = new Map();
        store.set(clientId, bucket);
      }
      bucket.set(nonce, expiresAt);
      return { nonce, expiresAt };
    },
    has(clientId, nonce) {
      prune();
      const exp = store.get(clientId)?.get(nonce);
      return exp !== undefined && exp > Date.now();
    },
    consume(clientId, nonce) {
      prune();
      const bucket = store.get(clientId);
      if (bucket === undefined) return false;
      const exp = bucket.get(nonce);
      if (exp === undefined || exp <= Date.now()) return false;
      bucket.delete(nonce);
      return true;
    },
  };
}
