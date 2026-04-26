# Audit 01 — Peers Security Layer

Scope: `src/main/features/peers/peer-identity.ts`, `peer-tls.ts`, `peer-store.ts`, `pair-server.ts`, `peer-pairing.ts`, `peer-state-schema.ts`, `schema.ts`, `migration-tags.ts`. Reference: `peers-service.ts`.

## Critical (security/correctness)

- **peer-pairing.ts:50** — PIN is generated with `Math.random()`, a non-cryptographic PRNG. The whole pairing ritual's security collapses to the entropy of the PIN; using `Math.random()` makes PINs predictable to anyone with timing/seed leverage and contradicts the "cryptographic ritual" framing. Fix: default `pinRng` to `crypto.randomInt(0, 1_000_000)` (or build it from `randomBytes`), e.g. `randomInt(0, 1_000_000).toString().padStart(6, '0')`.

- **peer-pairing.ts:60-65** — Hand-rolled `constantTimeEq` over `charCodeAt` is constant-time per index but its inputs are base64 strings rather than the raw HMAC bytes; an attacker controlling `pinHmac` can pad/shrink to influence early-exit on `length !== length` (timing leak on length is acceptable, but byte-vs-char comparison is fragile). Fix: decode both sides to `Buffer` and use `crypto.timingSafeEqual`. This also removes the per-character JS allocations on the hot path.

- **peer-pairing.ts:84-103** — On `unknown_session` the function returns immediately without consuming an attempt, and there is no global rate limit per remote IP/peerId. The 6-digit PIN with 3 attempts per session is fine, but an attacker can re-call `/pair/init` repeatedly (each call mints a new session and fires `onPinIssued`, surfacing a UI prompt) to brute-force across sessions or spam the user. Fix: add per-IP rate limiting at `pair-server.ts` level (token bucket on remote address), and bound the active-sessions map (see also "Scalability" finding).

- **peer-pairing.ts:54** — `sessions` Map is never swept. Expired sessions are only deleted lazily on `confirmPair`. An attacker who only ever calls `/pair/init` grows the map without bound (memory + secret retention). Fix: schedule a periodic sweep keyed off `sessionTtlMs`, or evict on insert when size > N. The `pin` and `expectedHmac` should be cleared from memory ASAP after expiry.

- **peer-pairing.ts:93-95** — On successful confirm, `sessions.delete(sessionId)` is called but the in-memory `pin`/`expectedHmac` strings are not zeroed. JS strings are immutable so this is best-effort, but the HMAC and pin are kept reachable via the `session` local until the closure returns. Fix: at minimum overwrite `session.pin = ''` / `session.expectedHmac = ''` before delete (defense in depth) and avoid keeping the plaintext `pin` in `StoredSession` at all — only `expectedHmac` is needed server-side for verification.

- **pair-server.ts:92-97** — `onPinIssued` is fired *before* anything proves the initiator can complete the ritual, and the PIN is delivered to the UI of the *responder* immediately on `/pair/init`. If `onPinIssued` is invoked unconditionally for every `/pair/init` POST, an unauthenticated attacker on the local network can spam pairing prompts on the responder. Fix: rate-limit `/pair/init` per source IP, and consider gating on the user explicitly enabling pair-mode (an "I'm pairing now" toggle) before issuing PINs.

- **peers-service.ts:99 / pair-server.ts (TLS)** — The pairing client uses `rejectUnauthorized: false` and pins manually after the TLS handshake by hashing `cert.raw` of the leaf cert. This is correct in principle but bypasses Node's TLS validation entirely, so any cert presented will complete the handshake; if the fingerprint comparison code path is ever skipped (e.g., a future refactor) the pin disappears silently. Fix: either use `checkServerIdentity` to enforce the fingerprint inside the TLS callback, or assert the fingerprint check before reading the response body (currently the pin happens after `'end'`, which is fine — but document the invariant in code with a comment + add a test). Also: not strictly an audit issue here, but `peer-identity.ts` keypair is never bound to the TLS cert, so the TLS fingerprint is a separate trust root from the Ed25519 identity. Confirm at the design level (peer-store stores both `pubkey` and `certFingerprint`, but nothing proves the holder of the cert also holds the identity keypair).

- **peer-identity.ts:39-43** — When `safeStorage.isEncryptionAvailable()` is false (Linux without keychain), the private key is written to disk in **plaintext base64** with no warning to the user and no file mode restriction. Fix: refuse to write a plaintext key by default (require an explicit opt-in flag), or at minimum write with mode `0o600` and log a security warning. Currently `writeFileSync(path, …)` uses default mode (0o644 minus umask).

- **peer-identity.ts:50** — Identity file is written with default mode (no `mode: 0o600`). Even when `safeStorage` encrypts the privkey blob, the file should still be `0o600`. Compare with `peer-tls.ts:77-82` which does set `0o600` and chmods on non-Windows. Fix: mirror that pattern here.

## High (rule violations)

- **peer-tls.ts:9-10** — `x509.cryptoProvider.set(webcrypto)` is module-level global mutation. If another module also imports `@peculiar/x509` with a different provider, last-write-wins races exist. Fix: move the `set` call inside `generateCert` (idempotent set is safe) or guard with a "set once" sentinel.

- **peers-service.ts:99** — `new HttpsAgent({ rejectUnauthorized: false })` is created per request (allocation + socket pool churn) and explicitly disables TLS validation. The fingerprint pin is enforced manually but the `rejectUnauthorized: false` allows expired/invalid certs to reach the handshake. For a self-signed pinning model this is expected but should be combined with a `checkServerIdentity` that returns `undefined` only when the fingerprint matches. Also: `agent.destroy()` is called both on success and on error — fine — but the agent should be reused per host, not created per call.

- **pair-server.ts:139** — `MAX_BODY_BYTES = 16 * 1024` is a magic constant with no comment. The init body is well under 1 KB; 16 KB is generous. Confirm intent (probably fine) and add a comment. More importantly, no `Content-Length` is checked up-front, so a malicious client can keep a slow trickle of bytes alive — `req.destroy()` is called on overflow, but there is no overall request timeout. Fix: `req.setTimeout(5_000, () => req.destroy())` on the request, or set a server-level timeout.

- **pair-server.ts:217** — The HTTPS server is created with only `{ cert, key }`; no `requestTimeout`, `headersTimeout`, `keepAliveTimeout`, or `minVersion: 'TLSv1.3'` is set. Slowloris-style attacks against the pair server are possible. Fix: configure `headersTimeout`, `requestTimeout`, and pin `minVersion: 'TLSv1.2'` (Node's TLSv1.3 default for Ed25519 is fine, but enforce the floor explicitly).

- **peer-identity.ts (whole file)** — Mixes synchronous file I/O on the hot startup path. This is acceptable at boot, but `getOrCreatePeerIdentity` is exported as a sync function that performs `safeStorage.encryptString`/`decryptString` (potentially keychain calls) inline. The async boundary is already present elsewhere (`resolvePeerTls` is async) — make this async too for consistency, or document why sync is required.

- **peer-pairing.ts:1** — `randomBytes(32)` default for `rng` allocates per init; fine, but `pinRng`'s default uses the same insecure `Math.random()` as critical above.

- **pair-server.ts:212-249** — `createPairServer` mixes two responsibilities: creating + listening + owning lifecycle vs. attaching routes to an existing server. The `existingServer` branch returns a `close()` that removes the request listener but leaves the server running — yet still exposes `port()`/`url()`. This is an FSD/separation-of-concerns smell: split into `createPairRoutes` (already exists) + `createOwnedPairServer` (the listening case). Currently a caller that passes `existingServer` gets a misleading `close()` that doesn't close.

## Medium (DRY/maintainability)

- **peer-tls.ts:22-28 / peers-service.ts:125-127** — Cert-fingerprint computation is duplicated. `computeCertFingerprint(pem)` strips PEM and hashes DER; `peers-service.ts` hashes `cert.raw` (already DER) directly. Both produce the same SHA-256 hex, but the logic is parallel and drift-prone. Fix: export `computeCertFingerprintFromDer(der: Buffer): string` and have the PEM helper call it.

- **peer-identity.ts:34-36** — `.subarray(-32)` to extract Ed25519 raw key bytes from SPKI/PKCS#8 DER is correct only because the prefix is fixed-length, which is what the `ED25519_PKCS8_PREFIX` constant on line 55 actually documents. The two halves of the encoding logic (parse vs. emit) live apart. Fix: extract a helper `ed25519RawFromPkcs8(der)` / `pkcs8FromEd25519Raw(seed)` and use them consistently. The 16-byte hex prefix string is undocumented except by the `RFC 8410` comment.

- **peer-tls.ts:30-33** — `pemFromDer` is hand-rolled. `@peculiar/x509` already provides `PemConverter.encode` (used on line 61). Fix: use `x509.PemConverter.encode(pkcs8, 'PRIVATE KEY')` for symmetry and remove the hand-rolled function.

- **peer-pairing.ts:43-44 / pair-server.ts:139** — Magic numbers (`5 * 60 * 1000`, `3`, `16 * 1024`) without named export or shared config. Fix: move to a `peer-config.ts` (already exists, per directory listing) and import.

- **peer-store.ts:50-71** — The `upsert` set clause omits `lastSeenHlc`, `pairedAt`, `lastConnectedAt`, `revokedAt` from the update path. Re-pairing a previously-revoked peer will leave `revokedAt` set — silent re-pair fails. Fix: either explicitly clear `revokedAt` on re-upsert, or make the caller revoke→insert explicit. Also the schema row is leaked through `$inferSelect` only via `rowToPeer`, which is good, but the `upsert` accepts `lastSeenHlc` and `lastConnectedAt` in the input type that are never persisted on conflict.

- **peers-service.ts:93-161** — `postJson` is defined inside the service file. It's a generic mTLS-style fingerprint-pinned client — extract to `peer-pinned-client.ts` so other call sites (replication, op-log push) can reuse it without re-implementing fingerprint pinning.

- **peer-store.ts:48** — `createPeerStore` returns an object literal where each method takes a closure over `db`. Five methods each issue a single Drizzle statement; consider memoizing prepared statements (`db.select().…prepare()`) for hot paths (`getByPeerId` is called in `enrichDiscovered` per advertisement).

## Low (style/cleanup)

- **peer-identity.ts:55** — `ED25519_PKCS8_PREFIX` is declared *after* its first use inside `materialize` (hoisting works, but reads bottom-up). Fix: move to top of file with other constants.

- **peer-identity.ts:73** — `privkey: privBytes.toString('base64')` is exposed on `PeerIdentity` even though no caller in the audited files uses it (only `sign` is needed). Fix: drop `privkey` from the exported interface — minimize secret surface area.

- **peer-tls.ts:78-82** — `writeFileSync` is called with `{ mode: 0o600 }` and then `chmodSync(…, 0o600)` is also called on non-Windows. The `mode` option on `writeFileSync` already sets the mode on file creation, so the chmod is redundant unless the file already existed (which the `existsSync` check above precludes). Fix: drop the chmod or comment why it's defensive.

- **peer-tls.ts:18** — `CERT_VALIDITY_DAYS = 365 * 10` magic; document.

- **pair-server.ts:138** — `MAX_BODY_BYTES` defined after first use in the file. Style only.

- **migration-tags.ts:22-27** — `for…of` with `try/catch` and `continue` swallows all errors silently; if the journal is corrupt, the user sees only "not found in any known location". Fix: collect the last error and include it in the thrown message.

- **peer-pairing.ts:17** — Discriminated union for `PairConfirmResult` mixes success and failure. Fine, but `reason` is a string-literal union without an exhaustive `assertNever` check anywhere it is consumed (`pair-server.ts:107`). Fix: add a switch with default to surface unknown reasons.

- **peer-state-schema.ts:1-12** — No index on `revokedAt` despite `listActive` filtering on `isNull(revokedAt)`. Low impact at expected peer counts (<100), but worth a comment.

- **schema.ts** — `op_log.payload` is `text` not `blob`. JSON-as-text is fine but CRDT payloads can grow; consider `blob` if binary encodings (msgpack/CBOR) are planned.

- **migration-tags.ts** — Lives in `peers/` but is generic Drizzle-journal logic. Fix: move to `src/main/db/` so non-peer tests can use it (FSD violation: it's not peer-specific).

## Strengths

- TLS uses Ed25519 self-signed certs (RFC 8410), 10-year validity, and SHA-256 fingerprint pinning — modern and clean.
- Private TLS key file written with `0o600` and `chmod` reinforced on non-Windows in `peer-tls.ts`.
- `safeStorage` is used for the Ed25519 identity privkey when available (Electron OS keychain integration).
- Pairing uses HMAC-of-PIN over a 32-byte server challenge — initiator never transmits the PIN, only the HMAC, defeating passive eavesdroppers.
- Session attempts are bounded (3) with TTL (5 min) and `locked_out`/`expired` reasons surfaced cleanly.
- PEM/DER plumbing is well-commented (RFC 8410 reference on the PKCS#8 prefix).
- Pair-server validates body shape with hand-rolled type guards, bounds body size at 16 KB, rejects non-POST and unknown routes, returns proper 405/404/400.
- Trust store cleanly separates DB row shape from public `PairedPeer` via `rowToPeer`; uses `onConflictDoUpdate` for idempotent upserts.
- Service-level `dispose()` clears intervals, unsubscribes mDNS, closes server, and clears handler sets — good resource hygiene.
- Service-level event handlers wrap subscriber callbacks in try/catch with logging — no one bad listener can crash the bus.
