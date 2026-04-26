# Audit 04 — Peers Service / Handlers / IPC

Scope: `src/main/features/peers/peers-service.ts`, `peers-handlers.ts`, `src/shared/ipc/peers/{channels,contract,index}.ts`, `src/main/features/assistant/cross-device-query.ts`, `src/main/bootstrap/service-registry.ts`, `src/main/ipc/index.ts`.

---

## Critical (wiring/correctness)

### C1. PeersService bootstrap is a fire-and-forget IIFE — handlers register before service is ready
**File:** `src/main/bootstrap/service-registry.ts:461-485`, `src/main/ipc/index.ts:245`

`createPeersService` is async (TLS material, `peer-server.listen`). The registry kicks it off inside `void (async () => { … })()` and stores the resolved instance in a mutable `peersServiceHandle`. Meanwhile, `peersServiceLazy` throws "peers-service not yet initialized" if anything calls a handler before the IIFE finishes, and `registerPeersHandlers` is called synchronously during `registerIpcHandlers`. Any IPC call (e.g. the renderer hitting `PEERS.IDENTITY.GET` on app start) during the boot window will hit that throw and surface as a generic IPC error.

**Fix:** make registry bootstrap awaitable — return a `Promise<ServiceRegistryResult>` and `await createPeersService(...)` before constructing `services`, OR have `peersServiceLazy` queue/await an internal `ready` promise instead of throwing. Also remove the `peerConfig.listenPort > 0` gate or document what handlers should do when peers is disabled (currently the lazy throws a confusing error rather than returning a "disabled" stub).

### C2. `disposePeerTransport` ignores the in-flight bootstrap
**File:** `src/main/bootstrap/service-registry.ts:487-492`

If shutdown fires before the async IIFE resolves, `peersServiceHandle` is still `null`, the dispose is a no-op, and the half-constructed `peer-server` (TLS listener, mDNS) leaks. The IIFE assigns to the outer var without a guard against shutdown-already-happened, so a late assignment can also resurrect resources after shutdown.

**Fix:** track the bootstrap promise and `await` it in `disposePeerTransport`, or guard the IIFE assignment with a `disposed` flag and dispose immediately if set.

### C3. mDNS started before GC — but GC needs paired peers, not a wiring issue; however discovery handler set is empty at start
**File:** `src/main/features/peers/peers-service.ts:269-284`

`mdns.start()` runs before any handler is registered. `discoveryHandlers` is empty at that point but `mdnsUnsub = mdns.onChange(...)` is wired pre-start so the first emission post-start fires `fireDiscoveryChanged` into an empty handler set — only an issue because handlers register in `registerPeersHandlers` after the IIFE resolves. The renderer that subscribes via `PEERS_EVENTS.DISCOVERY.CHANGED` may miss the initial advertisements until something else triggers a re-emit.

**Fix:** either re-emit current snapshot inside `registerPeersHandlers` after wiring (`router.emit(PEERS_EVENTS.DISCOVERY.CHANGED, { peers: service.listDiscovered() })`), or expose a "replay current state" entry on the service that handlers call at registration.

---

## High (FSD / IPC convention violations)

### H1. Handlers do not use the contract's output schemas — runtime drift risk
**File:** `src/main/features/peers/peers-handlers.ts:17-35`, `src/shared/ipc/peers/contract.ts:98-123`

`peersInvoke` declares both `input` and `output` Zod schemas, but `registerPeersHandlers` only validates inputs (and even then by importing the raw schemas, not by reading `peersInvoke[ch].input`). Outputs are returned untyped via `Promise.resolve(service.listPaired())`. If `peer-store` ever returns an extra column (e.g. a new TLS field), it ships to the renderer unchecked. The contract advertises an output contract that nothing enforces.

**Fix:** centralize via a `validatedHandle(router, peersInvoke, channel, fn)` helper that parses input AND output, or at minimum call `peersInvoke[PEERS.LIST.PAIRED].output.parse(...)` in dev mode.

### H2. Handlers re-import individual schemas instead of using the `peersInvoke` map
**File:** `src/main/features/peers/peers-handlers.ts:6-12`

The codebase exposes `peersInvoke` and `peersEvents` (`contract.ts:98, 125`) — these are the FSD-blessed access points. Importing individual `PairConfirmInputSchema`/`PairInitInputSchema`/`RevokeInputSchema` bypasses the lookup map and means any contract refactor must touch handlers as well. Pattern is inconsistent with how channel constants are imported (single `PEERS` object).

**Fix:** drop individual schema imports; reach through `peersInvoke[PEERS.PAIR.INIT].input.parse(raw)` etc., or collapse into a `validatedHandle` helper as in H1.

### H3. Pair handler `host` is not validated as a hostname/IP — open SSRF surface
**File:** `src/shared/ipc/peers/contract.ts:42-46, 56-63`

`host: z.string()` accepts any string including `localhost`, `0.0.0.0`, full URLs, file paths, etc. `pairInit`/`pairConfirm` then build `https://${host}:${port}/...` and POST to it. Even though the renderer is the caller, IPC inputs from a compromised renderer/extension should be locked down. mDNS-discovered peers always supply a real address, so the schema should reflect that.

**Fix:** tighten with `z.string().regex(/^[A-Za-z0-9.\-:%]+$/).max(255)` (covers hostnames, IPv4, IPv6 in `[]`, and zone-id), or use `z.string().refine(isPlausibleHost)`.

### H4. `displayName` triple-optionality is inconsistent across pairs
**File:** `src/shared/ipc/peers/contract.ts:27, 45, 62`, `peers-service.ts:55, 70`

`DiscoveredPeerSchema.displayName` is `nullable().optional()`, `PairInitInputSchema.displayName` is also `nullable().optional()`, but `PairedPeerSchema.displayName` is just `nullable()`. The service's TS interfaces use `string | null` and `displayName?: string | null`. This permutation forces every consumer to write `?? null` defensively (e.g., `peers-handlers.ts:43`, `peers-service.ts:188, 314`).

**Fix:** pick one — make all handler-input `displayName` simply `z.string().nullable()` (default null in the service), drop `.optional()`. Saves three coalesces in the service alone.

### H5. `PairedPeerSchema` exported from contract duplicates `peer-store.ts::PairedPeer`
**File:** `src/shared/ipc/peers/contract.ts:10-20` vs `src/main/features/peers/peer-store.ts:7-16`

Two `PairedPeer` types with identical fields. The store has its own, the contract has its own. Currently they happen to match field-for-field; nothing enforces that. `service.listPaired()` returns the store type but the contract claims its own.

**Fix:** export the type from contract and import it into `peer-store.ts`, or vice-versa. Single source of truth.

---

## Medium (DRY / helpers / maintainability)

### M1. Handler-level event-forwarding boilerplate is repetitive and untyped
**File:** `src/main/features/peers/peers-handlers.ts:38-52`

Three near-identical `service.onX((info) => { router.emit(EVENT, info); })` blocks. The `onPinIssued` block manually rebuilds the payload field-by-field (`sessionId`, `pin`, `initiatorPeerId`, `initiatorDisplayName ?? null`, `issuedAt`) — a pure passthrough that drifts the moment the service's `PinIssuedInfo` adds a field. The service already coalesces `initiatorDisplayName` once at `peers-service.ts:188`, so the handler's repeat is dead defensive code.

**Fix:** `service.onPinIssued((info) => router.emit(PEERS_EVENTS.PIN.ISSUED, info))` — types already line up.

### M2. `postJson` is a 70-line inline HTTPS client buried inside the service factory
**File:** `src/main/features/peers/peers-service.ts:93-161`

This is reusable infrastructure: TLS-pinned POST with custom fingerprint check, agent disposal, settled-once latch, JSON parse, status check. It belongs next to `peer-tls.ts` / `peer-pairing.ts` as e.g. `peer-http.ts::postJsonPinned(url, fingerprint, body)`. Today it can only be tested via the full `createPeersService` path.

**Fix:** extract `postJsonPinned` as a top-level helper in `peers/peer-http.ts`. Adds a unit-testable seam for the fingerprint-mismatch path.

### M3. GC initial-run scheduled via `setTimeout(0)` instead of inline
**File:** `src/main/features/peers/peers-service.ts:240-252`

`setTimeout(..., 0).unref()` then `setInterval`. The 0ms timer is presumably to defer past constructor return, but it's followed by `setInterval(..., GC_INTERVAL_MS)` so the GC body is duplicated verbatim. Either the deferral matters and the interval should call the same fn, or it doesn't and the initial call can run inline.

**Fix:** extract `function runGc(initial: boolean) { … }` and call once + register interval.

### M4. Error-tolerant handler-iteration pattern is duplicated 3x
**File:** `src/main/features/peers/peers-service.ts:191-194, 210-212, 217-219`

`for (const h of <Set>) { try { h(...); } catch (err) { serviceLogger.warn({err}, '...'); } }` repeated for pin/discovery/trust handlers.

**Fix:** small helper `function safeFanOut<T>(handlers: Set<(t: T) => void>, value: T, label: string)`.

### M5. Off-by-one or wrong-direction filter in `computeGcWatermark`
**File:** `src/main/features/peers/peers-service.ts:224-235`

Filters peers to active (`revokedAt === null`), then refuses GC if any active peer has `lastSeenHlc === null`. Comment says "At least one active peer hasn't been seen — refuse to GC." Logic looks intentional but the watermark computation excludes revoked peers entirely — meaning op_log rows whose origin peer was revoked may be GC'd before pull-replicas converged. Document or check.

**Fix:** add a code comment justifying that revoked peers are excluded from the watermark calc, and confirm with replication-engine owner this is correct semantics.

### M6. `cross-device-query.ts` creates a new `PeerStore` instead of receiving one
**File:** `src/main/features/assistant/cross-device-query.ts:110-112`

`createPeerStore(db)` is invoked inside `createCrossDeviceQuery`. Two stores wrapping the same db is harmless today (stateless wrapper), but it bypasses any caching/test-mocking the registry might add later. The peers domain owns the store; assistant should depend on it via DI.

**Fix:** add `peersService` (or a narrow `peerReader` interface exposing `listActive`) to `CrossDeviceQueryDeps` instead of constructing internally. Same applies to importing `opLog` and `progressTasks` schemas directly across feature boundaries — these schema imports leak peers/progress internals into assistant.

### M7. `tasksForPeer` cross-table query has a slug/PK conflation risk
**File:** `src/main/features/assistant/cross-device-query.ts:114-145`

`opLog.pk` is treated as a `progressTasks.slug` (line 135 `inArray(progressTasks.slug, slugs)`). This is correct only if the replication engine writes `pk = slug` for `progress_tasks` rows. The fallback `t.id ?? t.slug` (line 141) hints somebody anticipated either field could be primary. If schema migrates to use `id`, this query silently returns nothing.

**Fix:** add a literal const `PROGRESS_TASKS_PK_FIELD = 'slug'` exported by the progress feature or assert the convention in a comment with a `// invariant: replication-engine.ts writes opLog.pk = progress_tasks.slug` reference.

---

## Low (style / cleanup)

### L1. Magic numbers without named constants in handler-issued payloads
**File:** `src/main/features/assistant/cross-device-query.ts:30-31`

`SLEEPING_THRESHOLD_MS = 2 * 60 * 1000`, `OFFLINE_THRESHOLD_MS = 30 * 60 * 1000`. Already named locally. OK. But `STATE_INDICATORS` uses ASCII brackets `[online]` etc. that bake LLM-prompt-format assumptions into a generic query layer. Move to caller.

### L2. `[unknown]` fallback in `STATE_INDICATORS` is unreachable
**File:** `src/main/features/assistant/cross-device-query.ts:78`

`getDeviceState` only returns one of four literals, all keys present in `STATE_INDICATORS`. The `?? '[unknown]'` is dead defensive code. Either drop or change `STATE_INDICATORS` type to `Record<DeviceState, string>` to enforce coverage.

### L3. `'peer-a'` / `'aaaaaaaa'` placeholder fallback peer IDs
**File:** `src/main/bootstrap/service-registry.ts:457-458`

`peerIdShort: peerConfig.peerIdShort || 'aaaaaaaa'`, `peerIdFull: peerConfig.peerIdFull || 'peer-a'`. These are dev defaults that, in prod, mean two unconfigured machines write op_log entries with the SAME origin peer id and silently corrupt cross-device queries. Should fail-fast or use the `getOrCreatePeerIdentity` value (which `peers-service.ts:164` resolves anyway).

**Fix:** remove the `||` fallbacks; throw if `peerConfig.peerIdFull` is empty, OR have `replicationEngine` accept an identity-provider lazy.

### L4. `selectDistinct({pk})` then map to `pk` array — could be a single column-scoped query
**File:** `src/main/features/assistant/cross-device-query.ts:115-125`

Drizzle supports `db.select({pk: opLog.pk}).from(opLog).where(...).groupBy(opLog.pk)`. Functionally equivalent; no actual problem.

### L5. Naming mismatch: `revoke` returns `{revoked: boolean}` but channel is `PEERS.REVOKE.PEER`
**File:** `src/main/features/peers/peers-service.ts:343-350`

A no-op revoke (peer already revoked or unknown) returns `{revoked: false}` indistinguishably from "this peer doesn't exist." The renderer cannot tell the two cases apart. Consider `{revoked: boolean, reason?: 'already_revoked' | 'not_found'}` or throwing on not-found.

### L6. Comment block at `service-registry.ts:447-451` references "Phase 3b" sprint codename
**File:** `src/main/bootstrap/service-registry.ts:447-451`

"Phase 3b" sprint marker, fine for now but will rot. Consider linking to `docs/architecture/peers.md` or removing once stable.

### L7. `peers-handlers.ts` JSDoc says "thin bridge" — accurate. No dead Hub-era code in scope.
Verified: no `Hub`/`hub`/`legacy` references remain in `peers-service.ts` or `peers-handlers.ts`. `cross-device-query.ts` header explicitly says "no Hub round-trips" — clean.

---

## Strengths

- **Channel/event builders used correctly**: `channels.ts:3-14` produces `peers.list.paired`, `event:peers.pin.issued` etc., zero hardcoded strings.
- **Contract is Zod-complete** for both inputs and outputs (`peersInvoke`, `peersEvents` maps), even if handlers don't yet enforce outputs (H1).
- **Service factory is pure** — accepts `deps`, returns instance, no module-level state, deterministic init aside from C1's async-bootstrap pattern.
- **Dispose path is comprehensive** (`peers-service.ts:367-389`): clears interval, unsubs mDNS, stops mDNS, closes server, clears handler sets, all wrapped in try/catch with logging.
- **Cross-device-query genuinely uses local op_log** — no Hub/network calls, single SQLite read path, suitable for offline. Migration intent realized.
- **Naming convention `certFingerprint` vs `fingerprint`** is documented at the top of `contract.ts:5-8`. Good defensive doc.
- **Handlers are thin** — every one is ≤4 lines: parse → call service → return. Matches FSD rule.
