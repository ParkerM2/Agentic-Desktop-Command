# Hub Auto-Discovery — Design Spec

**Status:** Draft — pending approval
**Date:** 2026-04-23
**Author:** brainstormed with Claude
**Scope:** Full enterprise bundle (Option X)

## Motivation

The current hub-pairing flow is a manual chain: user finds the hub's LAN IP, types `http://<ip>:3200`, generates a bootstrap secret on the hub container, pastes it into the client, mints a key, pastes the key into the Connect form. Each step has surfaced a production bug during the 0.1.0 → 0.1.6 releases (CSP blocking the fetch, missing X-Bootstrap-Secret header, missing firewall rule, etc.). Users on a second device are forced to know the network topology of the first.

The replacement must:

- Work automatically: the client browses mDNS, finds hubs, pairs with one click.
- Survive a compromised LAN: no plaintext keys on the wire, no rogue hub can impersonate a paired one.
- Support multiple hubs per client (home + office + cloud), Spotify-Connect-style switching from Settings → Hub.
- Ship with audit logging, revocation, and an admin surface so a hub owner retains control of paired clients.
- Preserve existing installs through a non-breaking migration.

## Design decisions locked in brainstorming

| Question | Decision |
|---|---|
| Trust model for discovered hubs | **A** — no approval required; LAN is the trust boundary. |
| Manual URL entry after auto-discovery lands | **B** — hidden escape hatch, revealed via expander. |
| Hub count per user | **B** — 2 to 5 hubs maintained at once. |
| Picker location | Settings → Hub tab (override of my recommended toolbar). |
| First-launch flow | **A** — show picker after skip-sign-in; "Continue without hub" skips to local mode. |
| Pairing endpoint approach | **1** — dedicated `/api/pair` with two-step init/confirm; no reuse of `/api/auth/generate-key`. |
| Scope | **X** — full enterprise bundle (TLS, Ed25519 identity, audit, revocation, network change, per-hub data isolation). |

## Architecture

```
┌──────────────────────────────────────┐              ┌───────────────────────────────┐
│            Hub (Fastify)             │              │     Client (Electron main)    │
│                                      │              │                               │
│  ┌────────────────────────────────┐  │              │  ┌─────────────────────────┐  │
│  │ mdns/advertiser.ts             │  │   mDNS       │  │ hub-discovery.ts        │  │
│  │   _adc-hub._tcp.local          │──┼──────────────┼──│   Bonjour browse        │  │
│  │   TXT: {id,v,app,ch,name,api,fp}│ │              │  │   Map<hubId, record>    │  │
│  └────────────────────────────────┘  │              │  └─────────────────────────┘  │
│                                      │              │                               │
│  ┌────────────────────────────────┐  │   HTTPS      │  ┌─────────────────────────┐  │
│  │ routes/pair.ts                 │  │◄─────────────┼──│ hub-connection.ts       │  │
│  │   POST /api/pair/init          │  │  pinned fp   │  │   HubRecord[]           │  │
│  │   POST /api/pair/confirm       │  │              │  │   activeHubId           │  │
│  └────────────────────────────────┘  │              │  └─────────────────────────┘  │
│                                      │              │                               │
│  ┌────────────────────────────────┐  │   WSS        │  ┌─────────────────────────┐  │
│  │ routes/admin/*                 │  │◄─────────────┼──│ hub-ws-client.ts        │  │
│  │ + /admin React UI              │  │  close 4003  │  │   revocation modal       │  │
│  └────────────────────────────────┘  │              │  └─────────────────────────┘  │
│                                      │              │                               │
│  ┌────────────────────────────────┐  │              │          │ IPC                │
│  │ SQLite                         │  │              │          ▼                    │
│  │   api_keys + client_id + pubkey│  │              │  ┌─────────────────────────┐  │
│  │   pairing_events (audit)       │  │              │  │ Renderer                │  │
│  └────────────────────────────────┘  │              │  │   HubPickerPanel        │  │
└──────────────────────────────────────┘              │  │   HubSetupPage (first   │  │
                                                       │  │     launch frame)       │  │
                                                       │  └─────────────────────────┘  │
                                                       └───────────────────────────────┘
```

### New and modified modules

**Hub (`hub/`):**

- `hub/src/mdns/advertiser.ts` (new) — owns the Bonjour advertisement lifecycle.
- `hub/src/lib/hub-id.ts` (new) — reads or generates the stable `hubId` UUID, persisted at `data/hub-id`.
- `hub/src/lib/tls.ts` (new) — manages the self-signed cert + key at `data/tls.{cert,key}.pem`; regenerates if missing or expired within 30 days.
- `hub/src/routes/pair.ts` (new) — two-step pair endpoints.
- `hub/src/middleware/pair-rate-limit.ts` (new) — Fastify rate-limit for `/api/pair/*`.
- `hub/src/middleware/audit.ts` (new) — writes `pairing_events` rows.
- `hub/src/routes/admin/*` (new) — `clients`, `audit`, `settings`, and `rotate-admin-key` endpoints plus the React admin UI served at `/admin`.
- `hub/src/middleware/api-key.ts` (modified) — honors the new `revoked_at` column; closes WebSockets with code `4003` on revoke.
- `hub/src/app.ts` (modified) — HTTPS-only Fastify listen; wires advertiser + admin route registration.
- `hub/migrations/` (new file) — adds `pairing_events` table and `api_keys.revoked_at` + `.revoked_reason` + `.client_id` + `.display_name` + `.pubkey_fp` columns.

**Client main process (`src/main/`):**

- `src/main/features/hub/hub-discovery.ts` (new) — Bonjour browse, discovered-hub Map, IPC event emission, network-change handling.
- `src/main/features/hub/hub-pair.ts` (new) — two-step pair orchestration, fingerprint pinning, Ed25519 signing.
- `src/main/features/hub/client-identity.ts` (new) — per-hub Ed25519 keypair generation and `safeStorage` persistence.
- `src/main/features/hub/hub-connection.ts` (modified) — multi-hub storage, switch-active lifecycle, `beforeActiveHubChange` hook broadcast.
- `src/main/features/hub/hub-handlers.ts` (modified) — new IPC handlers `DISCOVERED.LIST`, `PAIR.REQUEST`, `SWITCH.ACTIVE`, `REMOVE.RECORD`, `MANUAL.PAIR`.
- `src/main/features/hub/config-store.ts` (modified) — schema migration from flat legacy config to `{hubs: HubRecord[], activeHubId}`.
- `src/main/lib/db.ts` (modified) — `getActiveDb()` resolves to `hubs/${activeHubId}/adc.db`.
- `src/main/index.ts` (modified) — starts `hub-discovery` at `app.whenReady`; gates on `ENABLE_HUB_DISCOVERY`.

**Client renderer (`src/renderer/`):**

- `src/renderer/features/hub/components/HubPickerPanel/` (new) — the Spotify-style picker (paired list + discovered list + manual-entry expander).
- `src/renderer/features/hub/components/HubSetupPage/` (modified) — wraps the new picker in the first-run frame.
- `src/renderer/features/settings/components/HubSettings/` (modified) — replaces current form layout with the picker.
- `src/renderer/features/hub/api/useHubDiscovery.ts` (new) — React Query hook subscribing to `event:hub.discovery.changed`.
- `src/renderer/features/hub/api/useHubPair.ts`, `useHubSwitchActive.ts`, `useHubRemoveRecord.ts`, `useHubManualPair.ts` (new).

**IPC contract (`src/shared/ipc/hub/`):**

- `channels.ts` (modified) — adds `HUB.DISCOVERED.LIST`, `HUB.PAIR.REQUEST`, `HUB.SWITCH.ACTIVE`, `HUB.REMOVE.RECORD`, `HUB.MANUAL.PAIR`; event channels `event:hub.discovery.changed`, `event:hub.active.changed`, `event:hub.revoked`.
- `contract.ts` (modified) — Zod schemas for all new channels.

## mDNS service shape

**Service type:** `_adc-hub._tcp.local`
**Port:** read from the live Fastify config at advertise time.
**Instance name:** the `hubId` UUID. UUID avoids hostname-collision edge cases.

**TXT record fields** (all values stringified; total payload budget 400 bytes):

| Key | Meaning | Example |
|---|---|---|
| `id` | Stable `hubId` UUID | `7e8a5b82-4f15-4a1d-9b2c-0ae7f33ba6c1` |
| `v` | Pair-protocol version, starts at `1` | `1` |
| `app` | App version for display | `0.1.7` |
| `ch` | Channel | `release` \| `local` \| `dev` |
| `name` | Human display name (defaults to hostname, renameable on hub) | `DESKTOP-34T6B1U` |
| `api` | Path prefix (future-proofs reverse proxies) | `/api` |
| `fp` | SHA-256 fingerprint of the TLS leaf cert (64-char hex) | `9f4e…` |

**Lifecycle:**

- Advertised once the Fastify HTTPS listen callback fires.
- Withdrawn on SIGTERM / SIGINT via `Bonjour.unpublish`, with a goodbye packet fallback.
- Not re-advertised if the server's own health endpoint hard-fails (prevents stale entries on crashed hubs).

**Client browsing:**

- Starts at `app.whenReady` and runs for the app's lifetime.
- Filters by `ch` matching the client's channel — a Dev build never surfaces a Release hub.
- In-memory Map keyed by `hubId`, entries over 60 s without refresh marked stale, dropped at 5 min.
- `event:hub.discovery.changed` emitted on any delta, debounced 250 ms.

## Cryptography and transport

### TLS

The hub listens on HTTPS only. Plaintext HTTP on the LAN port is removed.

**Cert generation:** on first run or when the cert file is missing, unreadable, or within 30 days of expiry, `hub/src/lib/tls.ts` generates a self-signed X.509 certificate with a fresh Ed25519 key. Validity is 365 days from issue. Stored at `${dataDir}/tls.cert.pem` and `${dataDir}/tls.key.pem`, mode `0600`. `CN = hubId`, `subjectAltName` = `DNS:localhost` + every IPv4 on non-loopback interfaces at generation time. The expiry check runs once per startup and every 24 h thereafter; when rotation fires, advertisement restarts so clients receive the new fingerprint within one discovery cycle.

**Fingerprint distribution:** SHA-256 of the leaf cert (binary DER form, hex-encoded) is placed in the mDNS TXT `fp` field. When the cert is regenerated, the advertisement is restarted so clients see the new fingerprint immediately.

**Client trust store:** each `HubRecord` carries `pinnedFingerprint`. Every connection the client opens to a paired hub uses a per-connection `https.Agent` with `rejectUnauthorized: true` and a `checkServerIdentity` callback that compares the peer cert's SHA-256 to `pinnedFingerprint`. Mismatch → connection rejected and the UI shows a "Hub identity changed — possible spoofing. Re-pair to accept." banner. No automatic re-pin.

### Client Ed25519 identity

Each paired hub gets its own client identity — revoking on hub A must not force re-pair on hub B.

**Generation:** on first pair attempt against a given hub, the client calls `crypto.generateKeyPairSync('ed25519')`. Private key is wrapped via `safeStorage.encryptString` (macOS Keychain / Windows DPAPI / Linux libsecret) and stored at `${userData}/hubs/${hubId}/client-identity.enc`; public key stored plaintext alongside as `client-identity.pub`.

**Derived `clientId`:** SHA-256 of the DER-encoded public key, first 16 bytes hex-encoded. Stable as long as the identity file is preserved.

### Pairing flow

Two-step exchange to prove key possession on every pair attempt, first or repeat.

```
POST /api/pair/init
req  { clientId, clientPubKey, displayName }
res  { nonce, expiresAt }              // 32-byte base64 nonce, 30 s TTL

POST /api/pair/confirm
req  { clientId, nonce, signature }    // Ed25519(nonce) with the client private key
res  { hubId, displayName, key }
```

- On `/api/pair/init`, the hub persists `(clientId → pubkey)` if this is the first time it has seen this `clientId`. If the `clientId` is already known and the submitted `clientPubKey` does not match the stored one, the hub responds `409 IdentityConflict` and logs a `pair.reject` audit event. Users hit this when a client wiped its identity file; the resolution is a manual "Reset identity" button in the admin UI that clears the stored pubkey for that `clientId`.
- On `/api/pair/confirm`, the hub verifies the signature against the stored pubkey, drops the nonce from its cache, mints a fresh 64-char hex key, inserts it into `api_keys` with `client_id`, `display_name`, `pubkey_fp`, and returns it.
- Existing key rows for the same `clientId` are marked `revoked_at = now()` so only one key per clientId is ever active.

**Nonce store:** in-memory Map, keyed by `(clientId, nonce)` → `expiresAt`. Nonces are single-use; a `confirm` call that references a spent or expired nonce responds `401 ExpiredNonce`.

### Rate limiting

- `/api/pair/init`: 20 requests per hour per source IP. Includes failures.
- `/api/pair/confirm`: 5 requests per hour per `clientId`. Failures count toward the budget to raise the cost of brute-forcing signatures.
- Both limits configurable via `HUB_PAIR_RATE_LIMIT_INIT` and `HUB_PAIR_RATE_LIMIT_CONFIRM` env vars.

## Audit log, revocation, and admin UI

### Audit table

New SQLite table `pairing_events` on the hub:

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | ULID |
| `ts` | INTEGER | Epoch ms |
| `event_type` | TEXT | `pair.init`, `pair.confirm`, `pair.reject`, `key.revoke`, `key.use` |
| `client_id` | TEXT | Nullable for pre-identity rejections |
| `display_name` | TEXT | |
| `source_ip` | TEXT | |
| `user_agent` | TEXT | |
| `pubkey_fp` | TEXT | SHA-256 of client pubkey, nullable |
| `outcome` | TEXT | `success`, `rate_limited`, `identity_conflict`, `bad_signature`, `expired_nonce`, `revoked`, `unknown_key` |
| `reason` | TEXT | Free-form detail |

- Written by the audit middleware on every `/api/pair/*` request and on key usage / revocation paths.
- Retention defaults to 90 days; a daily cron in `hub/src/lib/audit-retention.ts` deletes older rows. Configurable via `HUB_AUDIT_RETENTION_DAYS`.

### Revocation

- `api_keys` gains `revoked_at INTEGER NULL` and `revoked_reason TEXT`.
- The api-key middleware rejects any key with non-null `revoked_at` (401) and instructs the WebSocket manager to close every open connection for that `clientId` with close code `4003` and body `{ reason }`.
- Client receives the close, renders a modal: "Access to `${displayName}` was revoked: `${reason}`. Re-pair or switch hubs." No auto-retry.

### Admin endpoints

All require the admin key in header `X-Admin-Key` (separate from the pair-issued `X-API-Key`).

| Endpoint | Purpose |
|---|---|
| `GET /api/admin/clients` | List clients with `last_seen_at`, `paired_at`, `revoked_at`. |
| `POST /api/admin/clients/:clientId/revoke` | Body `{ reason }`. Revokes + closes WS. |
| `POST /api/admin/clients/:clientId/rename` | Body `{ displayName }`. Hub-local label. |
| `POST /api/admin/clients/:clientId/reset-identity` | Clears the stored pubkey; next pair behaves like a fresh install. |
| `GET /api/admin/audit` | Query `?from=&to=&clientId=&eventType=`. Paginated. |
| `POST /api/admin/rotate-admin-key` | Requires current key. Returns new key. |

### Admin UI

Tiny React SPA served at `/admin` under basic-auth (env `HUB_ADMIN_USER` + `HUB_ADMIN_PASSWORD_HASH`, where the hash is an argon2id digest produced by `node scripts/hash-admin-password.mjs <password>`). If either env is unset, the route returns 403. Three tabs:

- **Clients** — table of paired clients, last-seen timestamp, actions (Rename, Revoke, Reset identity).
- **Audit** — filterable event feed backed by `GET /api/admin/audit`.
- **Settings** — hub display name, TLS fingerprint (read-only), Regenerate cert button with warning that every client must re-pair afterward.

### Admin key management

Generated once on first hub run (64-char hex), printed to hub logs **once** and written to `${dataDir}/admin-key.txt` mode `0600`. Rotation via `POST /api/admin/rotate-admin-key` using the current key. Lost? The hub owner can read the file off disk. No recovery path is offered through the network for safety reasons.

## Client lifecycle

### Main-process discovery service

- Starts at `app.whenReady` and runs for the app's lifetime. No UI-driven lifecycle — the renderer consumes a materialized view.
- Map keyed by `hubId` with entries `{ txt, addresses, port, lastSeenAt, pinnedFingerprint? }`.
- Entries over 60 s stale are greyed out in the picker; dropped from the Map after 5 min. Keeps the UI stable during brief mDNS silences.
- Channel filter: records whose TXT `ch` does not match `resolveChannel()` are discarded at intake.
- `event:hub.discovery.changed` emitted on set or metadata delta, debounced 250 ms.

### Network change handling

Two signal sources merged:

1. `os.networkInterfaces()` polled every 5 s. A hash of the sorted list is compared frame-to-frame; any change triggers the handler.
2. Electron `powerMonitor` events (`resume`, `on-ac`, `on-battery`, `lock-screen`, `unlock-screen`) each force an immediate recheck.

Handler actions:

1. Clear the discovery Map.
2. Unsubscribe and resubscribe the Bonjour browse.
3. Trigger the active hub's reconnect path — re-resolve via mDNS and re-validate the pinned fingerprint before opening any socket. If the active hub is absent or its fingerprint changed, mark it offline and render the disconnected state. No attempts to reach the last-known URL directly.

### IPC additions to `HUB`

| Channel | Input | Output | Notes |
|---|---|---|---|
| `HUB.DISCOVERED.LIST` | `{}` | `{ paired: HubRecord[], discovered: DiscoveredHub[], activeHubId }` | Reads main-process state; no network. |
| `HUB.PAIR.REQUEST` | `{ hubId, displayName? }` | `{ ok: true, hubId } \| { ok: false, error }` | Drives the two-step init/confirm, writes/updates `HubRecord`, sets active. |
| `HUB.SWITCH.ACTIVE` | `{ hubId }` | `{ ok: true } \| { ok: false, error }` | Orchestrates active-hub swap. |
| `HUB.REMOVE.RECORD` | `{ hubId }` | `{ ok: true }` | Drops record locally; best-effort remote revoke using the current key. |
| `HUB.MANUAL.PAIR` | `{ url, displayName? }` | same shape as `PAIR.REQUEST` | Escape hatch for blocked mDNS. Synthesizes a discovered record by hitting `<url>/api/health` to pull back a mini TXT-like descriptor; then runs the normal pair flow including fingerprint pin. |
| event `event:hub.discovery.changed` | — | `{ paired, discovered, activeHubId }` | Debounced 250 ms. |
| event `event:hub.active.changed` | — | `{ activeHubId }` | Fired after the full swap completes. |
| event `event:hub.revoked` | — | `{ hubId, reason }` | Consumed by renderer to open the revocation modal. |

### Settings → Hub picker component

`HubPickerPanel` structure:

```
┌─ ADC Hub ─────────────────────────────────────────────┐
│ Currently connected: "DESKTOP-34T6B1U"  [●]  (v0.1.7) │
│                                                       │
│ Paired                                                │
│  ● DESKTOP-34T6B1U   connected    [Rename] [Remove]   │
│  ○ Office-Mini       offline      [Rename] [Remove]   │
│                                                       │
│ Discovered on your network                            │
│  ○ Kitchen-NUC       (v0.1.7)     [Pair & Switch]     │
│                                                       │
│ ▸ Add manually                                        │
└───────────────────────────────────────────────────────┘
```

- State indicators: `connected` (solid dot), `paired-offline` (hollow grey dot), `discovered` (dashed dot).
- Hover tooltip shows last-seen timestamp and fingerprint prefix for the user to eyeball-verify.
- Rows are `role="radio"` inside a `role="radiogroup"`; arrow keys move the selection; Enter / Space triggers the primary action (Switch for paired, Pair & Switch for discovered).
- "Add manually" expands inline; explanatory text says "Use this only if mDNS is blocked on your network."
- All mutations route through React Query hooks (`useHubPair`, `useHubSwitchActive`, `useHubRemoveRecord`, `useHubManualPair`) that call IPC and invalidate `hubKeys.all`.

### First-launch `HubSetupPage`

Reuses `HubPickerPanel` inside a wrapper frame:

```
┌────────────────────────────────────────────┐
│  Welcome to ADC                            │
│  Choose a hub to connect, or skip for now. │
│                                            │
│  [HubPickerPanel]                          │
│                                            │
│                     [Skip — use local only] │
└────────────────────────────────────────────┘
```

Skipping creates a synthetic `HubRecord` with `hubId: "local"` so the rest of the system can treat local-only mode uniformly.

## Per-hub data isolation

### Directory layout

```
${userData}/
├── hubs/
│   ├── local/
│   │   └── adc.db
│   ├── 7e8a5b82-…/
│   │   ├── adc.db
│   │   └── client-identity.{enc,pub}
│   └── c11d-…/
│       ├── adc.db
│       └── client-identity.{enc,pub}
└── hub-config.json        # {hubs: HubRecord[], activeHubId}
```

### HubRecord schema

```ts
interface HubRecord {
  hubId: string;                    // "local" for the synthetic local-only record
  displayName: string;
  lastKnownUrl: string | null;      // https://<ip>:3200 as last observed
  encryptedApiKey: string | null;   // null for "local"
  pinnedFingerprint: string | null; // null for "local"
  dbPath: string;                   // absolute path to adc.db
  clientIdentityRef: string | null; // relative path under hubs/<hubId>/
  addedAt: string;                  // ISO
  lastConnectedAt: string | null;   // ISO
}
```

### Active-hub switching

`switchActive(hubId: string)`:

1. Emit `beforeActiveHubChange` through the main-process event bus. Every service holding a SQLite handle subscribes and closes its `Database` instance. The WebSocket client closes its socket.
2. Update `hub-config.json` — `activeHubId = hubId`, `lastConnectedAt = now()` for the new record.
3. Repoint the `getActiveDb()` resolver to `hubs/${hubId}/adc.db`.
4. Run Drizzle migrations against the new DB (idempotent, fast).
5. Re-open services in their factory registration order.
6. Invalidate every React Query cache via `queryClient.clear()` on the renderer (triggered by `event:hub.active.changed`).
7. If the new record has credentials, establish the new TLS connection + WebSocket. Otherwise the app is in local-only mode.

### Cross-hub references are structurally impossible

Each DB is a separate file. Project UUIDs on hub A have no relationship to those on hub B. No schema-level cross-linkage is introduced.

## Migration

### Hub-side

At first post-upgrade start:

1. If `data/hub-id` is missing, generate and write a fresh UUID.
2. If `data/tls.{cert,key}.pem` are missing or expire within 30 days, generate a new cert pair.
3. If `data/admin-key.txt` is missing, generate one, log a one-time banner `[Hub] Admin key initialized. Read from data/admin-key.txt.`, persist mode `0600`.
4. Migration `0010_pair_identity.sql` adds the new columns to `api_keys`, creates `pairing_events`.
5. Existing keys survive: they have `NULL` `client_id` / `pubkey_fp` / `display_name`. The api-key middleware continues to accept them until they are rotated by a successful pair-confirm flow.

### Client-side

Runs at the first launch of a build with `ENABLE_HUB_DISCOVERY=true`, detected by the absence of the `hubs[]` array in `hub-config.json`:

1. Create `hubs/legacy/` and move the existing top-level `adc.db` into it.
2. Synthesize a `HubRecord` with `hubId: "legacy"`, the old `hubUrl`, `encryptedApiKey`, `pinnedFingerprint: null`, `dbPath: hubs/legacy/adc.db`.
3. Set `activeHubId: "legacy"`.
4. The app launches and attempts to connect. The upgraded hub now listens HTTPS-only, so the plaintext HTTP connection attempt fails with a TLS handshake error. The client catches this specific error (`ERR_SSL_WRONG_VERSION_NUMBER` or similar) on any `legacy` record and renders a blocking banner in Settings → Hub: "This hub upgraded to encrypted transport. Re-pair to reconnect." The app continues to function in local-only read-mode against the legacy DB while the banner is present; no sync attempts are retried.
5. The banner's action button triggers `HUB.PAIR.REQUEST` against the legacy hub's URL. The pair goes through the normal two-step init/confirm over HTTPS, producing a fresh `hubId` (the hub's real post-upgrade `hubId` from `data/hub-id`) and a pinned fingerprint. The new `HubRecord` is inserted, the legacy DB file is moved into `hubs/${newHubId}/adc.db`, the legacy record is removed, and `activeHubId` is flipped to the new record.
6. Once no `legacy` records remain, plaintext HTTP is unreachable — the client only opens HTTPS. The legacy fallback lives only for the duration of step 4-5 on the upgrading device.

## Testing strategy

### Unit (Vitest, approximately 40 cases)

- mDNS record encode/decode round-trip for all TXT fields.
- Ed25519 sign and verify; wrong-key rejection; tampered-nonce rejection.
- Nonce store TTL eviction and single-use semantics.
- Rate-limit buckets: window rollover, per-IP vs per-clientId scoping.
- Fingerprint compare including case-insensitivity and whitespace.
- `switchActive` orchestration using an in-memory fake of the service registry.
- Legacy config migrator: legacy input → expected `hubs[]` shape.
- TLS cert expiry check (mocked clock).

### Integration (Vitest with hub spun up on ephemeral port, approximately 20 cases)

- Full `/api/pair/init` → `/api/pair/confirm` happy path.
- Bad signature on confirm.
- Replayed nonce after TTL → 401.
- Two clients pairing back-to-back; both can reach the hub independently.
- Revocation: admin POST → WebSocket receives close 4003.
- Admin key rotation.
- Legacy-config migrator with a live hub: client starts on plaintext HTTP, re-pairs, ends up on HTTPS with the same DB contents.
- `409 IdentityConflict` reproduction.

### End-to-end (Playwright + electron-playwright-helpers, 6 scenarios)

1. Fresh install → first-launch picker shows a test hub → pair → verify `hub-config.json` shape and DB path.
2. Two clients on the same LAN pair with one hub; revoke one; verify the other is unaffected and receives no stray events.
3. Switch active hub → picker and DB-backed UI both reflect the new set; previously-selected project from hub A is not visible under hub B.
4. Network change simulated by toggling a virtual interface; discovery Map empties and repopulates; active hub reconnects with a fresh pin verification.
5. Rogue mDNS announce with the same `hubId` but a different fingerprint → rejected with the spoofing banner.
6. Admin UI revokes a client → client renders the revocation modal and is disconnected from the hub.

## Rollout

- **Feature flag:** `ENABLE_HUB_DISCOVERY` env var. Default `true`; exists solely as an emergency rollback lever that can be set via the installer/settings if the feature destabilizes a user's install. When `false`, `hub-discovery` never starts, the renderer falls back to the legacy `HubSetupPage`, and the main process still resolves `activeHubId = "legacy"` if present.
- **Single release** — ship the full enterprise bundle in one version (0.2.0 suggested, given the scope). No half-landings of sub-pieces.
- **Monitoring signal:** hub audit log surfaces pair success rate. Post-release watch is `pair.failure_rate` (any outcome other than `success`) averaged over 24 h; above 5% triggers investigation, above 10% triggers rollback by pinning the next build to `ENABLE_HUB_DISCOVERY=false` and releasing 0.2.1 immediately.
- **Documentation update:** `README.md` install section needs a rewrite — the pair-with-secret dance is no longer the supported path. Mention the picker and the "Add manually" fallback.

## Open questions intentionally deferred

- A future spec will cover **cross-hub data migration** — exporting a project from one hub and importing on another. Currently each hub is an island.
- **Cloud-hosted hub discovery** — the `HUB.MANUAL.PAIR` path covers it functionally, but there's room for a better onboarding UX (OAuth, SSO-behind-proxy) if ADC ever grows a hosted tier.
- **iOS / mobile client** — mDNS advertising shape is compatible with iOS Bonjour APIs, but nothing in this spec is blocked on mobile existing.

## Success criteria

- New user on a second device runs the app, sees the hub in the picker within 10 seconds of launch, taps once, is paired and syncing.
- A user who never wants a hub can skip at first launch and never sees hub UI again (until they open Settings → Hub).
- No plaintext API keys or bearer tokens cross the wire in the default configuration.
- Hub owner can, from a single UI surface, see who is paired and revoke any client within 5 seconds.
- Existing installs survive the upgrade with no user action beyond an optional re-pair prompt.
