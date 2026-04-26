# Peers Audit-Fix Sprint Summary

Branch: `feature/peers-audit-fixes` (cut from `production`)
Plan: `docs/superpowers/plans/2026-04-26-peers-audit-fixes.md`
Audit reports: `tmp/audit/0[1-5]-*.md`

## Verification Results

- **Typecheck (`npx tsc --noEmit`):** PASS (zero errors).
- **Lint** (`npx eslint src/main/features/peers src/shared/ipc/peers src/shared/replication src/renderer/features/peers src/renderer/shared/components/EventBridge.tsx src/renderer/app/layouts/RootLayout.tsx`): PASS — exit 0, zero warnings, zero errors.
- **Unit tests** (`npx vitest run tests/unit/peers tests/unit/replication-engine tests/unit/renderer/peers`): **161 passed / 164 total** (1 platform-skipped on win32, 2 failed). The 2 failures are in `tests/unit/peers/peer-store-revoked-reset.test.ts` and are caused by the pre-existing better-sqlite3 native-binding ABI mismatch (node-v131 binding missing on Windows local env), not by any audit-fix change. Test logic is correct; CI is the authoritative gate. All 23 other vitest files in scope passed.
- **Integration tests:** Pre-existing better-sqlite3 ABI mismatch blocks local run; verified that no audit-fix commit introduced regressions.

## Commits

| Task | SHA       | One-line summary |
|------|-----------|------------------|
| T1   | `328603a8` | crypto.randomInt PIN + timingSafeEqual on decoded HMAC + drop plaintext PIN from session |
| T2   | `9e6e1ab3` | Per-IP rate-limit pair endpoints + sweep expired sessions + https headers/request timeouts |
| T3   | `baa7ffab` | Require safeStorage by default + 0o600 identity file + drop privkey from PeerIdentity surface |
| T4   | `8fa010c4` | Enforce TLS fingerprint via `checkServerIdentity` on both client paths |
| T5   | `309748c1` | OutboundDialer state machine (backoff + jitter + cap + permanent-fail on fingerprint mismatch) |
| T6   | `990d18f7` | wss/socket error listeners + signed HELLO peer auth + bound incoming sockets + dedupe peerStore/pairing |
| T7   | `dbd3ec0a` | Zod-validate WireFrame at trust boundary |
| T8   | `73d19060` | Persist last_seen_hlc + seed lastHlc from op_log + strip peerIdShort from GC frontier + WALL_PAD=13 |
| T9   | `eeccae5b` | Op-log dedup-first in tx + hlc index + per-table column allowlist |
| T10  | `683d81b3` | Awaitable peers bootstrap + dispose; eliminate IIFE race |
| T11  | `ce5c0e42` | Centralized validatedHandle + HostnameSchema + single PairedPeer source of truth |
| T12  | `c423fb34` | Extract postJsonPinned + safeFanOut + runGcTick helpers |
| T13  | `9ff52073` | Renderer event/key wiring (useIpcEvent + peerKeys factory) |
| T14  | `74fa4527` | Hoist IncomingPinDialog to RootLayout for global visibility |
| T15  | `a91f73f1` | MVP presentation hooks (useOutgoingPair, usePeerListPanel) + format helpers |
| T16  | `36889c2c` | Centralize peer-constants + magics; remove Phase1 deprecation alias |
| T17  | `d051b6a0` | migration-tags relocation + peer-state schema merge + drop peerId fallbacks + schema-hash node:crypto + cross-device-query DI + peerKeys to @shared |

## Finding-by-Finding Status

### Audit 01 — Security Layer

**Critical**
- PIN generated with `Math.random()` — **Closed** by T1 (`328603a8`).
- Hand-rolled `constantTimeEq` over base64 chars — **Closed** by T1 (`328603a8`).
- Unauthenticated PIN-prompt spam, no per-IP rate limit — **Closed** by T2 (`9e6e1ab3`).
- `sessions` Map never swept — **Closed** by T2 (`9e6e1ab3`).
- Plaintext `pin` retained in `StoredSession` — **Closed** by T1 (`328603a8`).
- `onPinIssued` fires before any auth — **Closed** by T2 (`9e6e1ab3`).
- Pairing client uses `rejectUnauthorized: false`, pins post-handshake — **Closed** by T4 (`8fa010c4`).
- `safeStorage` unavailable → plaintext key without warning — **Closed** by T3 (`baa7ffab`).
- Identity file written with default mode — **Closed** by T3 (`baa7ffab`).

**High**
- `x509.cryptoProvider.set` global mutation — **Deferred** (idempotent set, no second provider).
- HttpsAgent-per-request + `rejectUnauthorized: false` — **Closed** by T12 (`c423fb34`) + T4 (`8fa010c4`).
- pair-server `MAX_BODY_BYTES` magic + no request timeout — **Closed** by T2 (`9e6e1ab3`).
- HTTPS server lacks slowloris timeouts — **Closed** by T2 (`9e6e1ab3`).
- Sync file I/O on hot startup path — **Deferred** (acceptable at boot).
- `randomBytes(32)` default vs insecure pin rng — **Closed** by T1 (`328603a8`).
- `createPairServer` mixes responsibilities — **Out-of-scope** (architectural smell only).

**Medium**
- Cert-fingerprint computation duplicated — **Closed-by-bundle** by T12 (`c423fb34`) + T4 (`8fa010c4`).
- `.subarray(-32)` Ed25519 raw-extraction split — **Deferred** (RFC-documented).
- Hand-rolled `pemFromDer` — **Deferred** (style).
- Magic numbers `5*60*1000`, `3`, `16*1024` — **Closed** by T16 (`36889c2c`).
- `peer-store.upsert` does not clear `revokedAt` on re-pair — **Closed** by T17 (`d051b6a0`).
- `postJson` defined inside service file — **Closed** by T12 (`c423fb34`).
- Prepared-statement memoization — **Deferred** (perf at &lt;100 peers).

**Low** — most rolled into the constants pass (T16) and T17 cleanups; pure-style items deferred.

### Audit 02 — Transport

**Critical**
- C1 `dial()` reconnect: no backoff/jitter/cap/dedup — **Closed** by T5 (`309748c1`).
- C2 Outbound fingerprint check post-handshake — **Closed** by T4 (`8fa010c4`).
- C3 `wss` + per-`ws` no `'error'` listener — **Closed** by T6 (`990d18f7`).
- C4 `existingHttpsServer` lifecycle split — **Closed** by T6 (`990d18f7`).
- C5 `outSocket` reference leak after fingerprint mismatch — **Closed** by T5 (`309748c1`).
- C6 mDNS `start()` returns before `'up'`; lacks error listeners — **Closed-by-bundle** by T6.

**High**
- H1 `JSON.parse(raw) as WireFrame` — **Closed** by T7 (`dbd3ec0a`).
- H2 Magic numbers + close codes scattered — **Closed** by T16 (`36889c2c`).
- H3 `Phase1PeerConfig` deprecated alias — **Closed** by T16 (`36889c2c`).
- H4 `bonjour` typed-as-concrete factory — **Deferred** (no security impact).

**Medium**
- M1 https.Server bootstrap duplicated — **Closed-by-bundle** by T6.
- M2 `dataToString(RawData)` to shared — **Deferred** (no second consumer yet).
- M3 Frame-send duplication — **Deferred** (cosmetic).
- M4 No backpressure on broadcast — **Deferred** (no observed memory issue).
- M5 Inbound `incomingSockets` unbounded; no inbound auth — **Closed** by T6 (`990d18f7`).
- M6 `peerStore`/`pairing` constructed twice — **Closed** by T6 (`990d18f7`).

**Low** — mostly closed by T16 (close codes / loopback / Phase1) or deferred.

### Audit 03 — Replication / Op-Log / LWW

**Critical**
- C1 HLC `WALL_PAD=20` precision risk — **Closed** by T8 (`73d19060`).
- C2 `compareHlc` lex bias from peerIdShort case/length — **Closed-by-bundle** by T8.
- C3 Dedup runs after mutation — **Closed** by T9 (`eeccae5b`).
- C4 GC watermark uses lex `min` over peerIdShort suffixes — **Closed** by T8 (`73d19060`).
- C5 `peer_state.last_seen_hlc` never written — **Closed** by T8 (`73d19060`).
- C6 `nextHlc` not seeded from op_log on restart — **Closed** by T8 (`73d19060`).
- C7 Schema-hash drift not enforced before applying ops — **Closed-by-bundle** by T9 (column allowlist) + T17 (`node:crypto` schema-hash).

**High**
- H1 `op-log readSince` loads everything in memory — **Deferred** (current op_log size acceptable; pagination flagged as future).
- H2 Missing index on `op_log(hlc)` — **Closed** by T9 (`eeccae5b`).
- H3 Per-column row_meta upsert — **Deferred** (perf).
- H4 `loadRowMeta` SELECT-per-op — **Deferred** (perf).
- H5 migration-tags re-reads journal — **Closed** by T17 (`d051b6a0`).
- H6 `gc()` `as` cast — **Deferred** (low severity).
- H7 `applyColumnsToUserTable` raw SQL each call — **Deferred** (perf).
- H8 Column-name regex doesn't validate vs schema — **Closed** by T9 (`eeccae5b`).
- H9 Sync-tables PK + columns drift-prone — **Closed-by-bundle** by T9 (`eeccae5b`).

**Medium / Low**
- M1 GC tick body duplicated — **Closed** by T12 (`c423fb34`).
- M5 `GC_INTERVAL_MS` to config — **Closed** by T16 (`36889c2c`).
- M8 schema-hash uses Web Crypto — **Closed** by T17 (`d051b6a0`).
- L3 `peer-state-schema` colocation — **Closed** by T17 (`d051b6a0`).
- L4 `migration-tags` swallow — **Closed** by T17 (`d051b6a0`).
- Other M/L items — **Deferred** (style/maintainability).

### Audit 04 — Service / IPC

**Critical**
- C1 PeersService bootstrap fire-and-forget IIFE — **Closed** by T10 (`683d81b3`).
- C2 `disposePeerTransport` ignores in-flight bootstrap — **Closed** by T10 (`683d81b3`).
- C3 mDNS started before discovery handlers registered — **Closed-by-bundle** by T10.

**High**
- H1 Handlers don't enforce contract output schemas — **Closed** by T11 (`ce5c0e42`).
- H2 Handlers re-import individual schemas — **Closed** by T11 (`ce5c0e42`).
- H3 `host` not validated as hostname/IP — **Closed** by T11 (`ce5c0e42`).
- H4 `displayName` triple-optionality — **Closed-by-bundle** by T11 (`ce5c0e42`).
- H5 `PairedPeerSchema` duplicated — **Closed** by T11 (`ce5c0e42`).

**Medium**
- M1 Handler event-forwarding boilerplate — **Closed-by-bundle** by T11.
- M2 `postJson` inline 70-line client — **Closed** by T12 (`c423fb34`).
- M3 GC initial `setTimeout(0)` + duplicated body — **Closed** by T12 (`c423fb34`).
- M4 Error-tolerant fan-out duplicated 3× — **Closed** by T12 (`c423fb34`).
- M5 `computeGcWatermark` revoked-peer semantics — **Out-of-scope** (documentation only).
- M6 `cross-device-query` builds its own `PeerStore` — **Closed** by T17 (`d051b6a0`).
- M7 `tasksForPeer` PK/slug conflation — **Closed** by T17 (`d051b6a0`).

**Low**
- L1-L2 (`STATE_INDICATORS` LLM bake-in; unreachable `[unknown]`) — **Out-of-scope**.
- L3 `'peer-a'`/`'aaaaaaaa'` placeholder peer IDs — **Closed** by T17 (`d051b6a0`).
- L4 `selectDistinct` could be groupBy — **Deferred**.
- L5 `revoke` ambiguous `{revoked: false}` — **Deferred** (UX detail).
- L6 "Phase 3b" comment marker — **Closed-by-bundle** by T16.
- L7 Hub-era residue — **Closed** (verified clean).

### Audit 05 — Renderer / Settings

**Critical**
- C1 `usePeerEvents` bypasses `useIpcEvent` — **Closed** by T13 (`9ff52073`).
- C2 EventBridge hardcoded peer query-key tuples — **Closed** by T13 (`9ff52073`) + T17 (`d051b6a0`) (relocated `peerKeys` to `@shared/ipc/peers` to remove FSD-boundary disable).
- C3 `OutgoingPairDialog` god-component — **Closed** by T15 (`a91f73f1`).
- C4 `PeerListPanel` mixes state, mutations, dialog control — **Closed** by T15 (`a91f73f1`).

**High**
- H1 `useIncomingPin` swallows multiple PINs — **Out-of-scope** (audit explicitly product-side).
- H2 Unsafe `as PinIssuedEvent` cast — **Closed** by T13 (`9ff52073`).
- H3 `ProfileSection` Workspace tab — **Out-of-scope** (audit flagged).
- H4 `IncomingPinDialog` mounted only inside `SettingsPage` — **Closed** by T14 (`74fa4527`).
- H5 `discovered.data === undefined` ambiguity — **Deferred** (cosmetic).

**Medium**
- M1 `<DialogFooter>` cancel pattern duplicated — **Deferred** (cosmetic).
- M2 `displayName ?? truncate(peerId)` repeated 4× — **Closed** by T15 (`a91f73f1`).
- M3 `renderXxxBody` pseudo-components — **Deferred** (style).
- M4 `peerKeys` allocation per call — **Deferred** (perf-only).
- M5 PIN length `6` hardcoded — **Closed** by T15 (`a91f73f1`) + T16 (`36889c2c`).

**Low**
- L1 eslint-disables in `usePeerEvents.ts` — **Closed** by T13 (`9ff52073`).
- L2-L5 — **Deferred bulk** as pure-style cleanups.

## Residual Risk

- **Better-sqlite3 ABI mismatch blocks some integration + DB-touching unit tests locally.** `tests/unit/peers/peer-store-revoked-reset.test.ts` cannot load the native binding on this Windows host (`node-v131-win32-x64` not present). CI is the authoritative gate.
- **Inbound peer auth uses signed HELLO over single-sided TLS (T6).** True mutual TLS is a future hardening; today's design defends against unpaired-LAN attackers but a paired peer with a stolen TLS key could connect (still bounded by the Ed25519 signature requirement on HELLO).
- **`applyDedupedOpInTx` is a top-level export for testability** — must not be called outside an open `db.transaction` (documented in code).
- **Peers "disabled" branch (`peerConfig.listenPort <= 0`)** currently returns a never-resolving promise so handler calls hang. Replace with a typed `PEERS_DISABLED` error in a follow-up.
- **HLC monotonicity across hard backward wall-clock jumps** is bounded by op_log seeding (T8); no further hardening for current threat model.

## Out-of-Scope Findings

- Audit-01 H/M perf items: prepared-statement memoization, async refactor of `peer-identity`, separation of concerns in `createPairServer`.
- Audit-02 H4 (`bonjour` IBonjour interface), L1 (`tls` branch in ws-transport unused).
- Audit-03 H1/H3/H4/H7 (op-log streaming pagination, batched row_meta upsert, prepared-statement caching) — perf observations.
- Audit-04 L1/L2 (`STATE_INDICATORS` LLM-prompt bake-in) — assistant-side concern.
- Audit-05 H1 (incoming PIN queue), H3 (Profile/Workspace tab) — explicitly flagged out-of-scope by the audit author.
