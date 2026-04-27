# Audit 03 — Replication / Op-Log / LWW

Scope: `src/main/features/peers/{replication-engine,op-log,lww-merge,schema,peer-state-schema,migration-tags}.ts`,
`src/shared/replication/{hlc,op-types,schema-hash,sync-tables}.ts`,
`drizzle/0028_peer_state.sql`. Cross-referenced with `peers-service.ts`.

---

## Critical (correctness / data-loss risk)

### C1. HLC `wallClockMs > MAX_SAFE_INTEGER / 10^WALL_PAD` is silently truncated; numeric parse loses precision past 16 digits — `src/shared/replication/hlc.ts:21-26`
`parseHlc` does `Number(parts[0])`. The wall component is padded to 20 digits (`WALL_PAD = 20`), so any timestamp beyond `Number.MAX_SAFE_INTEGER` (16 digits) silently loses precision on round-trip. Two HLCs that differ only in the lowest 4 digits compare *equal numerically* after parse, then `nextHlc` may emit a counter-bumped HLC whose string form is **less than** the parsed `last.wallClockMs`, breaking monotonicity if any code path ever re-formats a parsed HLC. Today `nextHlc` uses `last.wallClockMs` directly so the bug is latent, but the 20-pad is wrong: `Date.now()` is at most 13 digits — `WALL_PAD = 13` is the correct invariant. **Fix:** drop `WALL_PAD` to 13 (sufficient through year 5138) or use `BigInt`/string compare for wall portion.

### C2. `compareHlc` lexicographic comparison is broken when peer-id-short components contain mixed-case or non-hex characters — `src/shared/replication/hlc.ts:29-33` + `op-types.ts`
Tie-break is by appended `peerIdShort`. Lexicographic sort is only stable if all peer-id-shorts share a normalized character set/length. Nothing in `peer-identity` (referenced from `peers-service`) is read here to enforce this; if one peer emits `peerIdShort = "Ab12"` and another emits `"ab12"`, ASCII says `'A' (0x41) < 'a' (0x61)`, so identical wall+counter HLCs from `peerIdShort=Ab12` always lose to `ab12`, deterministically — a bias, not random. Not data loss, but a stable but unfair tie-break, and worse if peer-id-shorts have variable length (a 4-char id can sort as if greater than a 6-char one if its first chars are higher). **Fix:** require fixed-length lowercase hex peerIdShort and assert it in `formatHlc`/`parseHlc`.

### C3. `applyRemoteOp` appends the op to `op_log` *after* mutating user tables and `row_meta`, but the dedup is checked only in `op_log` via `onConflictDoNothing` — `replication-engine.ts:191-225`, `op-log.ts:20-31`
Within a single transaction the order is: `loadRowMeta` → `mergeOp` → user-table writes → `row_meta` upsert → `opLog.append`. If the same `(originPeerId, hlc)` arrives twice (e.g., catch-up overlapping with live stream), both deliveries pass through `mergeOp` and re-execute `applyColumnsToUserTable` / `deleteFromUserTable` before the dedup unique-index conflict fires. The merge is idempotent for monotone HLCs (newer always wins), but the user-table `INSERT … ON CONFLICT DO UPDATE` and `UPDATE … WHERE pk=?` still rerun. For an `insert` op delivered after the row was *later* updated locally, the second delivery would **reapply the older payload** because `row_meta` already moved past — wait, no: `incomingWins` against current `row_meta` would now return false for the duplicate since `row_meta` has the same hlc, and `compareHlc` returns 0 (not >0), so columns are skipped. Correct. **However,** in the resurrection path (line 202) the duplicate delete-of-tombstone re-fires `db.delete(rowMetaTable)` for the tombstone row that was already cleared — harmless but wasteful. **Real bug:** dedup belongs *first* in the transaction so the entire body is skipped on replay. **Fix:** check `opLog` for `(originPeerId, hlc)` at top of `applyRemoteOp` (or `INSERT … RETURNING` and bail if no row inserted) before doing any merge work.

### C4. GC watermark uses lexicographic `min` over heterogeneous peer-id-short suffixes — `peers-service.ts:227-235`
`computeGcWatermark` does `seen.reduce((min, h) => h < min ? h : min)`. Because HLCs are `wall.counter.peerIdShort`, the `min` is by the *full string*, not the wall+counter prefix. Two peers at the same wall+counter but different peerIdShort yield different mins. The semantic intent ("oldest HLC observed across active peers") is approximately correct because the wall+counter prefix dominates lexicographic order, **but** GC then deletes ops with `hlc < watermark` — including ops authored by a peer whose suffix is lexicographically greater than the watermark's suffix at the *same* wall+counter. Those ops are not yet known to that peer. **Fix:** strip the peerIdShort suffix when computing the GC frontier, or equivalently use the watermark `wall.counter.\xff` (max suffix) and compare with `<`.

### C5. GC watermark refuses to GC if *any* paired peer has `lastSeenHlc === null`, but `peer_state.lastSeenHlc` is never written anywhere in the audited code — `peer-state-schema.ts:8`, `peers-service.ts:227-235`
Grep shows `peerState` is only referenced in `peer-store.ts` and the schema file. Neither `replication-engine.ts` nor `ws-transport.ts` (where `applyRemoteOp` is called) updates `last_seen_hlc`. Result: `lastSeenHlc` stays `null` forever for every peer, and `computeGcWatermark` always returns `null`, so **`op_log` never GCs in production**. This is an unbounded-growth bug. **Fix:** in `applyRemoteOp` (or transport receive path) update `peer_state.last_seen_hlc` for `op.originPeerId` to `max(current, op.hlc)`, ideally inside the same transaction as the op append.

### C6. `nextHlc` ignores wall-clock that goes backward beyond a threshold — no clock-drift guard — `src/shared/replication/hlc.ts:48-57`
If wall clock jumps forward (NTP, suspend/resume) the HLC adopts the new wall and resets counter to 0 — fine. If wall jumps **backward** by hours, `nextHlc` clamps to `last.wallClockMs` and bumps counter forever — also fine for monotonicity, but if the process restarts after a backward jump, `lastHlc` is reloaded only from in-memory state (`let lastHlc = null` at engine init, line 50), and `recordLocalWrite` would happily emit an HLC with `wallClockMs < op_log.max(hlc).wallClockMs`. **Fix:** in `createReplicationEngine` initialize `lastHlc` from `SELECT max(hlc) FROM op_log` on startup. Currently `lastHlc` starts at `null` after every restart, breaking monotonicity across processes.

### C7. Schema-hash drift handling is absent — `schema-hash.ts`, `replication-engine.ts`
`computeSchemaHash` exists and `peers-service.ts:182` passes `schemaHash` to `createPeerServer`, but the engine itself never reads/checks the hash, and there is no per-op or per-handshake check that the remote peer's schema hash matches before `applyRemoteOp` is called. A peer at migration N can blindly apply ops referencing columns that don't exist locally; `applyColumnsToUserTable` will throw at the SQL layer (column unknown), but only after partially mutating `row_meta`/tombstone state in the transaction. The transaction does roll back on throw, so user data is safe — but the op is also not logged, so it will be re-delivered forever. **Fix:** reject ops whose `tableName` columns include unknown columns at the contract boundary; or include the sender's schema hash in the handshake (already passed to `peer-server`, verify the consumer enforces it).

---

## High (rule violations / scalability)

### H1. Op-log `readSince` loads entire result into memory and `JSON.parse`s every payload — `op-log.ts:34-55`
`.all()` returns the full result set. Catchup over a peer that's been offline for weeks pulls every op into Node memory, then `rows.map(JSON.parse)` synchronously deserializes each. No pagination, no streaming, no limit clause. With 100k ops at ~500 bytes JSON each that's 50 MB of strings + 50 MB of parsed objects in one shot. **Fix:** add `limit` + `offset`/`afterHlc` cursor parameters returning `{ ops, nextCursor }`. Streaming iterator preferred.

### H2. Missing index on `op_log(hlc)` for GC scans — `schema.ts:15-17`
Only index is `unique(originPeerId, hlc)`. GC runs `DELETE FROM op_log WHERE hlc < ?`, which has no usable index — full-table scan every GC cycle. Same for hypothetical broadcast queries that filter by hlc. **Fix:** add `index('op_log_by_hlc').on(t.hlc)`. Also add `index('op_log_by_table_pk').on(t.tableName, t.pk)` for any future per-row history queries.

### H3. Per-column `INSERT … ON CONFLICT DO UPDATE` to `row_meta` runs N statements per op instead of one batched VALUES list — `replication-engine.ts:71-86`
For an op that mutates 8 columns, `upsertRowMeta` issues 8 `INSERT … ON CONFLICT DO UPDATE … WHERE …` statements. Better-sqlite3 prepared statements amortize, but it's still N round-trips through Drizzle's query builder. **Fix:** build a single multi-row INSERT and use a prepared statement cached at engine-init.

### H4. `loadRowMeta` runs a full SELECT per op via Drizzle's `.all()`; in catchup, this is N×K reads where K is avg columns per row — `replication-engine.ts:53-64`, called from `applyRemoteOp` line 192
For a 10k-op catchup batch, 10k SELECTs against `row_meta`. Indexed (`row_meta_by_row`) so each is fast, but Drizzle's query builder allocates per call. **Fix:** prepare the SELECT once and reuse, or batch-load `row_meta` for all `(table, pk)` pairs in the incoming batch.

### H5. Migration-tag loader uses `readFileSync` from `process.cwd()` and `__dirname` fallback with no caching — `migration-tags.ts:14-32`
Each call re-reads and re-parses the journal. If `computeSchemaHash` is called on every handshake or sync cycle (need to verify in transport), this is per-connection disk I/O. **Fix:** memoize `loadMigrationTags()` result behind a module-level `let cached`; `_journal.json` is immutable for a given build.

### H6. `gc()` returns `{ deleted: result.changes ?? 0 }` casting `result` to `{ changes?: number }` via `as` — `op-log.ts:60-62`
`as` cast on Drizzle's run result; correctness depends on better-sqlite3 driver shape. No guard or zod parse. Low-severity but a `any`-adjacent escape. **Fix:** narrow with a typed helper or assert in unit test.

### H7. `applyColumnsToUserTable` builds raw SQL via string concatenation each call; no prepared-statement cache — `replication-engine.ts:101-118`
Every remote op compiles a fresh SQL string and passes through `prepare()`. better-sqlite3 caches by SQL text but the cache is per `Database` instance and re-lookups still cost. With variable column subsets per op the cache thrashes. **Fix:** for `update`, build SQL with all columns (sorted) and `coalesce(?, current)` — or accept the thrash and note it. For `insert`, same pattern.

### H8. SQL injection surface relies on `COLUMN_NAME_RE.test(col)` but doesn't validate against the actual table schema — `replication-engine.ts:14, 96-100`
The regex only enforces identifier syntax, not that the column exists in the target table. A malicious peer (or buggy emitter) sending an op with a column named `"id; DROP TABLE…"`  would fail the regex, good — but a column like `created_at_extra` that doesn't exist in `notes` would pass the regex and SQLite would throw. The transaction rolls back, but the op is still re-delivered (see C7). **Fix:** maintain `SYNC_TABLE_COLUMNS: Record<SyncTable, ReadonlySet<string>>` alongside `SYNC_TABLE_PK` and validate.

### H9. Sync-tables list duplicated implicitly — `sync-tables.ts:1`, plus comments referencing "Phase 6 may add projects/sub_projects" in unrelated services
`SYNC_TABLES` is one place, but `SYNC_TABLE_PK` separately in the same file. These will drift if a contributor adds a table to one and forgets the other. **Fix:** define as a single object `SYNC_TABLE_DEFS: Record<SyncTable, { pk: string; columns: ReadonlySet<string> }>` and derive `SYNC_TABLES`/`SYNC_TABLE_PK` from it. Add a TS exhaustiveness assertion.

---

## Medium (DRY / maintainability)

### M1. `computeGcWatermark` duplicated logic between initial-tick and interval-tick — `peers-service.ts:240-264`
The two GC tick bodies are identical. Extract to `runGcTick(initial: boolean)`.

### M2. Tombstone column constant `__deleted__` is hard-coded inside `mergeOp` and `recordLocalWrite` — `op-types.ts:23`, used in 4 places
Already centralized as `TOMBSTONE_COLUMN`, good. But documentation comment in `op-types.ts:18-19` should match the actual column name and explain that tombstones live in `row_meta` not user tables.

### M3. `recordLocalWrite` is a 50-line function doing five things: validate, build HLC, build payload, transact (append + meta), notify listeners — `replication-engine.ts:128-184`
Extract: `buildLocalOp(args, hlc)` and `applyLocalOpToMeta(op)`.

### M4. `applyRemoteOp` similarly long with inline tombstone + resurrect + apply branches — `replication-engine.ts:186-226`
Extract the in-transaction body to `applyMergedOpInTx(op, mergeResult)`.

### M5. Magic constants — `peers-service.ts:222`
`GC_INTERVAL_MS = 24*60*60*1000` is local; should live in a `peer-config.ts` constant block alongside the existing `peer-config` module.

### M6. `op-log.ts:42-54` — Drizzle `.select().from(opLogTable).where(...).orderBy(...).all()` then `.map` rebuilds the row shape that Drizzle already gave us, mainly to `JSON.parse(payload)`
Helper `decodeOpLogRow(row): Op` would clarify intent and let it be unit-tested.

### M7. `lww-merge.ts` lacks any unit-testable export of `incomingWins` (`lww-merge.ts:23`) — internal but the tie-break behavior is the entire correctness story
Consider exporting for tests.

### M8. `schema-hash.ts` uses `crypto.subtle.digest` (Web Crypto) in a Node.js main-process file
Works on Node 20+ but inconsistent with the rest of the main process which uses `node:crypto`. **Fix:** use `createHash('sha256').update(buf).digest('hex')` for consistency and to avoid the async surface (this function would no longer need to be async).

---

## Low (style / cleanup)

### L1. `replication-engine.ts:14` — Regex defined at module scope is fine, but `^[A-Za-z_][A-Za-z0-9_]*$` allows uppercase identifiers; SQLite treats unquoted identifiers as case-insensitive but the engine quotes them, so `"FooBar"` and `"foobar"` are distinct columns. Consider lowercasing or rejecting mixed case.

### L2. `op-log.ts:1` — imports `lt`, `gt`, `and`, `eq`, `asc` separately; fine, but `applyRemoteOp` doesn't actually need `JSON.stringify(op.payload)` to go through `JSON` if a CBOR/MessagePack encoder is planned.

### L3. `peer-state-schema.ts` is in its own file but `schema.ts` already declares peer tables — split is asymmetric. Consider consolidating into `schema.ts` (matches FSD: one schema per domain).

### L4. `migration-tags.ts:21` — `for…of candidates { try {…} catch {continue} }` swallows the error; on the final candidate the actual error message is lost. Track and rethrow the last error.

### L5. `hlc.ts` has no exported `MIN_HLC` constant; engines that want "fetch all ops" pass `null` which `op-log.readSince` special-cases. A `MIN_HLC = '0'.repeat(20) + '.' + '0'.repeat(8) + '.aaaa'` constant would let `readSince` use a single code path.

### L6. `replication-engine.ts:172` — comment says "advance only on successful commit" but `lastHlc = hlc` is *inside* the transaction callback, so it executes before commit. better-sqlite3's `db.transaction(fn)` runs `fn` synchronously inside the BEGIN…COMMIT, and a throw rolls back, so the comment is technically correct (any throw skips the assignment), but a reader unfamiliar with better-sqlite3 may misread. Add: `// db.transaction throws if commit fails, so this line is unreachable on rollback`.

### L7. `replication-engine.ts:39-43` — `interface SqliteClient { prepare … }` and `$client(db)` cast: this leaks Drizzle internals. Acceptable as an escape hatch but should be wrapped in a `getRawClient(db)` helper in `@main/db` and exported, not redefined in two places (verify this isn't duplicated elsewhere).

### L8. `sync-tables.ts:1` lists tables as a tuple but `progress_tasks` uses `slug` PK while the rest use `id` — flag in a comment so future maintainers understand the asymmetry.

---

## Strengths

- LWW merge logic in `lww-merge.ts` is small, pure, and testable; tombstone-vs-update precedence with explicit `resurrectTombstone` flag is clean.
- HLC encoding with fixed-width zero-padded wall + hex counter sorts correctly under plain string compare (modulo the peerIdShort caveat in C2).
- `recordLocalWrite` correctly defers `lastHlc` mutation until inside the transaction.
- `unique(originPeerId, hlc)` index gives idempotent op-log appends.
- Allowlist-based table/PK lookup via `SYNC_TABLE_PK` plus `COLUMN_NAME_RE` is the right defense-in-depth shape against SQL injection from peer-supplied identifiers.
- Replication engine cleanly separates op authoring (`recordLocalWrite`), op application (`applyRemoteOp`), and op-log lifecycle (`gcOpLog`) — good FSD hygiene.
- Local op listeners are notified *outside* the DB transaction (line 175), avoiding handler latency from blocking the write path.
