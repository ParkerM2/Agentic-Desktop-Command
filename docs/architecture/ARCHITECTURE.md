# Architecture Reference

## System Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│  RENDERER (Browser)                                              │
│  ┌──────────────┐   ┌───────────────┐   ┌────────────────────┐  │
│  │ React 19     │──▷│ React Query   │──▷│ ipc() helper       │  │
│  │ Components   │   │ hooks         │   │ (window.api.invoke) │  │
│  └──────────────┘   └───────────────┘   └────────┬───────────┘  │
│  ┌──────────────┐   ┌───────────────┐            │              │
│  │ Zustand      │   │ EventBridge   │◁─ events ──┤              │
│  │ stores (UI)  │   │ (invalidation)│            │              │
│  └──────────────┘   └───────────────┘            │              │
│  ┌──────────────┐                    ◁─ MessagePort (streams) ──┤
│  │ TanStack     │  35 feature slices in src/renderer/features/  │
│  │ Router       │  8 route group files in app/routes/           │
│  └──────────────┘                                │              │
├──────────────────────────────────────────────────┼──────────────┤
│  PRELOAD (Context Bridge)                        │              │
│  ┌─────────────────────────────────────────────┐ │              │
│  │ api.invoke(channel, input) → Promise<T>     │─┤              │
│  │ api.on(channel, handler) → unsubscribe      │◁┘              │
│  │ + selector-builder + test-suite-recorder    │                │
│  └─────────────────────────────────────────────┘                │
├─────────────────────────────────────────────────────────────────┤
│  MAIN PROCESS (Node.js)                                         │
│  ┌──────────────┐   ┌───────────────┐   ┌────────────────────┐  │
│  │ Bootstrap    │──▷│ IPC Router    │──▷│ Services           │  │
│  │ (4 modules)  │   │ (Zod valid.)  │   │ (factory pattern)  │  │
│  │              │   │               │   │                    │  │
│  │ lifecycle    │   │ Handlers      │   │ Tier 0: 7 eager    │  │
│  │ svc-registry │   │ (thin layer)  │   │ Tier 1: ~60 lazy   │  │
│  │ ipc-wiring   │   └───────────────┘   │ via lazyService()  │  │
│  │ event-wiring │                       └────────────────────┘  │
│  └──────────────┘                        39 dirs in features/   │
│                                          4 dirs in services/    │
├─────────────────────────────────────────────────────────────────┤
│  AGENT HOST (Electron utilityProcess)                            │
│  ┌──────────────┐   ┌───────────────┐   ┌────────────────────┐  │
│  │ ProcessMgr   │──▷│ StreamJSON    │──▷│ AgentManagerSvc    │  │
│  │ (PTY spawn)  │   │ Parser        │   │ (session lifecycle) │  │
│  └──────────────┘   └───────────────┘   └────────────────────┘  │
│  Correlation-ID RPC over MessagePort (control)                   │
│  Direct MessagePort to renderer for stream events                │
│  Auto-restart with exponential backoff (5 retries / 60s)         │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │ IPC Contract: src/shared/ipc/ (53 domain folders)            ││
│  │ Each: channels.ts + contract.ts + schemas.ts + index.ts      ││
│  │ Root barrel merges all into ipcInvokeContract / ipcEventContract││
│  └──────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

## Channels (Multi-Build Isolation)

ADC ships three data-isolated channels that can run side-by-side. See `docs/architecture/channels.md` for the full table.

| Channel | How to run | App name | userData path | AppUserModelID |
|---------|-----------|----------|---------------|----------------|
| dev | `npm run dev` | `ADC-Dev` | `%APPDATA%/ADC-Dev/` | `com.adc.app.dev` |
| local | `npm run build:local` | `ADC-Local` | `%APPDATA%/ADC-Local/` | `com.adc.app.local` |
| release | Installed from GitHub release | `ADC` | `%APPDATA%/ADC/` | `com.adc.app` |

Resolution lives in `src/main/lib/channel.ts::resolveChannel`. Precedence: `ADC_CHANNEL` env → compile-time `__ADC_CHANNEL__` define → `ADC_DEV_MODE=true` → `!app.isPackaged` → `release`. Channels also isolate Claude CLI state by setting `CLAUDE_CONFIG_DIR=<userData>/.claude`. Auto-update is only enabled on the `release` channel.

## IPC Flow (Request/Response)

1. **Renderer** calls `ipc('projects.list', {})` via the shared helper
2. Helper calls `window.api.invoke('projects.list', {})` (preload bridge)
3. Preload allowlist-checks the channel against `ipcInvokeContract`, then forwards via `ipcRenderer.invoke`
4. **Main** `IpcRouter.handle()` validates input against the Zod schema in the domain `contract.ts`, calls the handler, wraps the result in `{ success, data | error }`
5. Result returns to renderer

## IPC Flow (Events — Main → Renderer)

1. **Main** service calls `router.emit('event:terminal.output', payload)`
2. Router calls `BrowserWindow.webContents.send(channel, payload)`
3. Preload listener fires via `ipcRenderer.on(channel, listener)`
4. **Renderer** `EventBridge` (mounted once in `RootLayout`) receives the payload
5. EventBridge calls `queryClient.invalidateQueries()` for affected query keys, OR patches the cache directly via `setQueryData` for `append`-style events (sessions, op-log)

## Domain-Based IPC Structure

The IPC contract is split across 53 domain folders under `src/shared/ipc/`. Each folder contains:

- `channels.ts` — channel constants built via the `domain()` / `events()` helpers in `channel-builder.ts`
- `schemas.ts` — Zod schemas for the domain
- `contract.ts` — invoke + event contract entries using those schemas
- `index.ts` — barrel export

The root barrel at `src/shared/ipc/index.ts` spreads every domain contract into the unified `ipcInvokeContract` / `ipcEventContract` objects that the preload allowlist + main router both consume. Channel constants always use `DOMAIN.VERB.NOUN` for invoke and `event:domain.verb.noun` for events — never hardcoded strings.

## Bootstrap Module Pattern

`src/main/index.ts` resolves the channel, forks the agent-host utility process, then delegates to four bootstrap modules in `src/main/bootstrap/`:

| Module | Responsibility |
|--------|---------------|
| `service-registry.ts` | Instantiates all service factories with dependency injection. Tier 0 (eager): IpcRouter, SQLite DB, CommandBus, BusSessionManager, SettingsService, UserSessionManager, ProjectService, WorkspacesService, ErrorCollector + HealthRegistry, peer identity + replication engine. Tier 1 (~60 lazy via `lazyService()`): everything else, initialized on first IPC call. Also handles legacy DB migration, OAuth provider config loading, and the async PeersService bootstrap (TLS material + listen + mDNS) wrapped in a Proxy via `wrapAsyncPeersService`. |
| `ipc-wiring.ts` | Registers all IPC handlers — connects each domain's `*-handlers.ts` to the router. Includes OAuth handlers for `oauth.authorize` / `oauth.isAuthenticated` / `oauth.revoke`. |
| `event-wiring.ts` | Sets up service-event → renderer forwarding. Includes planning-completion detection and watch evaluation. |
| `lifecycle.ts` | Electron app lifecycle: BrowserWindow creation, before-quit cleanup that disposes services in reverse order including peers transport, runners, command bus, and HealthRegistry/ErrorCollector last. |

`bootstrap/index.ts` is a barrel re-export. There is no separate task system — `ProgressService` (SQLite) is the sole task authority.

### Bootstrap Resilience Features

- **ErrorCollector** — created in Tier 0. Captures service errors to a file-based log with capacity alerts. Reports via `event:app.error.occurred`.
- **HealthRegistry** — Tier 0. Services pulse during normal operation; missed pulses emit `event:app.service.unhealthy`.
- **lazyService()** — wraps Tier 1 factories in a Proxy that delays construction until first property access. Failures surface on first IPC call rather than at boot.
- **AgentHostClient auto-restart** — `src/main/index.ts::forkAgentHost` reforks the utility process with exponential backoff (5 attempts within a 60s sliding window), re-establishes MessagePort wiring, and re-forwards the renderer event port.
- **Renderer crash recovery** — up to 3 consecutive renderer crashes within 60s trigger automatic recreation; on the 4th, a dialog offers Restart / Quit.
- **Single-instance lock** — keyed off `app.getName()` so each channel locks independently. Second invocation focuses the existing window.

## Data Persistence

### SQLite — Single Source of Truth

All structured data lives in `adc.db` (better-sqlite3 + Drizzle ORM). Migrations live in `drizzle/` (currently 31 migrations, `0000` → `0030`). Schema files are colocated with their service under `src/main/features/<domain>/schema.ts`.

| Data | Table |
|------|-------|
| Tasks | `progress_tasks` |
| Sessions | `sessions` (bus) |
| Commands | `commands` (bus) |
| Settings | `settings_kv` |
| Workspaces | `workspaces` |
| Projects | `projects` |
| Test scripts / runs / screenshots / schedules / shared steps / diffs | `test_suite_*` |
| Runners | `runners` |
| Peers | `paired_peers` + `peer_state` |
| Op-log (replication) | `op_log` |
| Briefings, changelog, planner, OAuth tokens, ideas, fitness | their respective tables |

There is no filesystem task storage (`.adc/specs/` was removed). Settings, projects, OAuth tokens, briefings, planner, changelog, etc. all live in SQLite.

### User-Scoped vs Global Data

A handful of personal artifacts (notes, captures, briefings JSON, fitness, planner, alerts, ideas, milestones, changelog, assistant history) are still kept as JSON under `<userData>/users/<userId>/` for user-isolation. `UserSessionManager` emits session-change events; services implementing `ReinitializableService` swap their data directory on login/logout. `UserDataMigrator` copies pre-existing global data to the user folder on first login.

Key modules:
- `src/main/features/auth/user-session-manager.ts`
- `src/main/features/data-management/user-data-resolver.ts`
- `src/main/features/data-management/user-data-migrator.ts`

### UUID / Client-Generated IDs

Every persistable entity has a UUID `id` column (`crypto.randomUUID()`). Services accept an optional client-provided `id` to enable future optimistic updates; otherwise they fall back to `generateId()`.

## Service Architecture

All main process services follow the factory pattern in `src/main/features/<domain>/`:

```typescript
export interface ProjectService {
  listProjects: () => Project[];
  addProject: (path: string) => Project;
}

export function createProjectService(deps): ProjectService {
  return { /* closures */ };
}
```

Rules:
- Local services return synchronous values — IPC handlers wrap with `Promise.resolve()`.
- Async exceptions: anything that hits the network (peers, OAuth, GitHub CLI), Electron dialog (`selectDirectory`), Playwright runner, MCP, and the agent-host RPC.
- Services emit events via `router.emit()` for real-time updates.

### Feature Domains (`src/main/features/`)

39 directories. The full set:

```
agent-dashboard  alerts          app             assistant       auth
briefing         bus             changelog       claude          dashboard
data-management  docker          email           files           fitness
git              github          ideas           insights        integrations
mcp              merge           notes           notifications   oauth
peers            planner         progress        projects        qa
runners          security        settings        spotify         terminals
test-suite       visualization   workflow        workspace
```

Plus four cross-cutting services in `src/main/services/`:
- `agent-manager/` — shared `AgentManager` interface
- `session-jsonl/` — JSONL tail reader for agent output
- `team-watcher/` — watches `~/.claude/teams/<name>/config.json` for membership changes
- `worktree-provisioner/` — creates per-task git worktrees

## Agent Host Utility Process

Agent session management runs in a dedicated Electron `utilityProcess` for isolation:

- **AgentManagerService** (`src/main/agent-host/index.ts`) — runs inside the utility process. Owns `ProcessManager` (PTY spawn via `@lydell/node-pty`), `StreamJsonParser`, and per-session lifecycle.
- **AgentHostClient** (`src/main/agent-host/agent-host-client.ts`) — main-process proxy. Implements the shared `AgentManager` interface backed by correlation-ID RPC over MessagePort.
- **Direct MessagePort to renderer** — stream events (agent output, status changes) flow directly from the utility process to the renderer, bypassing the main process for lower latency. The port is forwarded once per window via `agent-host-events` channel.
- **Crash recovery** — `forkAgentHost()` in `src/main/index.ts` reforks the child on non-zero exit, with sliding-window throttle (5 / 60s) and exponential backoff.

Agents are headless Claude CLI sessions spawned via `child_process.spawn` — never SDK API calls.

## Command Bus + Bus SessionManager

`CommandBus` and `BusSessionManager` (`src/main/bus/`) are the unified replacement for the legacy orchestrator:

- **CommandBus** — accepts commands, routes to handlers, persists state to SQLite (`commands` table).
- **BusSessionManager** — session lifecycle (spawn/kill/list), boot-time crash recovery from the `sessions` table, delegates spawning to `AgentHostClient`. Recovers interrupted sessions on startup via `recoverInterrupted()`.

### IPC channels

`bus.dispatch`, `bus.query`, `bus.listSessions`, `bus.getSession`, `bus.killSession`, `bus.subscribe`. Events: `event:bus.session.*`, `event:bus.command.*`.

## Peer Replication (P2P)

`src/main/features/peers/` implements TLS-pinned WebSocket P2P sync between devices. No central server required — peers discover each other via mDNS and pair via a 6-digit PIN.

### Components

- **`peer-identity.ts`** — Ed25519 keypair on disk (`<userData>/peer-identity.json`). Optionally encrypted with `safeStorage`; plaintext only when `ADC_PEERS_ALLOW_PLAINTEXT_IDENTITY=1`. Yields `peerIdFull` (full pubkey hex) + `peerIdShort` (8 hex chars).
- **`peer-tls.ts`** — generates a self-signed X.509 cert via `@peculiar/x509` keyed to the peer identity. Cert fingerprint becomes the pin.
- **`peer-server.ts`** — HTTPS server hosting both REST `/pair/*` endpoints and `wss://` for op-log replication.
- **`peer-mdns.ts`** — `bonjour-service` advertise + browse for `_adc-peer._tcp` services on the LAN.
- **`peer-pairing.ts`** — `/pair/hello` exchange + 6-digit PIN verification + Ed25519 signed proof. Trust persisted to `paired_peers` table.
- **`peer-tls-pin.ts` + `peer-http.ts`** — per-peer TLS pin enforcement. Rejects connections whose cert fingerprint doesn't match the pinned value.
- **`ws-transport.ts` + `outbound-dialer.ts`** — outbound WebSocket dialer that pins TLS post-handshake and notifies disconnects.
- **`replication-engine.ts`** — op-log replication: append-only `op_log` table with HLC timestamps, LWW merge (`lww-merge.ts`), per-row metadata (`op-log-and-row-meta` migration). GC watermark (`gc-watermark.ts`) based on observed peer ack.
- **`peer-store.ts`** — paired-peer CRUD against SQLite.
- **`peers-service.ts`** — top-level service. Bootstrap is async (TLS material → listen → mDNS), wrapped in `wrapAsyncPeersService` so handlers transparently `await` the in-flight promise.

### Bootstrap

`service-registry.ts` resolves identity once at boot via `getOrCreatePeerIdentity()`, constructs `PeerStore` + `ReplicationEngine` eagerly, then kicks off `createPeersService()` asynchronously. When `peerConfig.listenPort <= 0` peers is disabled (the wrapper hands back a never-resolving promise so handlers hang rather than silent no-op — see audit-04 C1 TODO).

### Dev harness

See `docs/peers/phase1-dev-harness.md`.

## Runners (Long-Running Processes)

`src/main/features/runners/` manages long-running per-project processes (dev servers, workers, custom scripts) outside the agent system.

- **`runners-service.ts`** — CRUD over the `runners` table. Each runner is keyed by `ScopeRef` (`project | worktree`).
- **`process-supervisor.ts`** — spawns + supervises child processes, captures stdout/stderr.
- **`health-check.ts`** — optional HTTP/TCP probe with backoff.
- Events stream over `event:runners.instance.*` (`started`, `output`, `exited`, `health.changed`).

Renderer slice: `src/renderer/features/runners/` (RunnersPanel, etc.).

## Test Suite (Browser Recording + Playwright)

`src/main/features/test-suite/` is a full browser-based test recorder + Playwright runner. See `docs/architecture/TEST-SUITE.md` for the table-by-table reference.

### Capabilities

- **Recording** — `test-suite-recorder.ts` preload runs inside a `WebContentsView`, captures user interactions, generates Playwright-preferred locators (`getByTestId` > `getByLabel` > `getByRole` > `getByText` > CSS fallback).
- **Spec generation** — `script-writer.ts` emits `.spec.ts` with smart waits.
- **Runner** — `runner.ts` shells out to `npx playwright test --reporter=json,html`, parses results, persists per-step pass/fail.
- **Multi-browser / parallel** — chromium / firefox / webkit; 1-16 workers; configurable retries (0-5).
- **Visual baselines** — `baseline-service.ts` + `diff-engine.ts`; pixel-diff against stored baselines, results in `test_suite_diffs`.
- **Data-driven** — `data-runner.ts` substitutes `{{key}}` from CSV/JSON.
- **Shared step groups** — `shared-steps-service.ts`, `test_suite_shared_steps` table.
- **Scheduling** — `scheduler.ts` polls every 30s, fires `runScript({ triggeredBy: 'scheduled' })`.
- **CI export** — `workflow-exporter.ts` generates GitHub Actions YAML.
- **Tags + batch execution** — JSON-array `tags` column, intersection filtering, "Run Tagged" batch mode.
- **Auth state** — Playwright `storageState` persisted per project for logged-in flows.
- **Environments** — named URL profiles, runtime switch via `BASE_URL` env var.
- **Analytics** — letter-grade health score (pass rate / stability / speed), flaky-test sparklines.

### Renderer

Single Zustand store (`test-suite-store.ts`), 7-tab page in `src/renderer/features/test-suite/`. HTML report viewer opens the Playwright report via `shell.openPath`. Run completion fires toasts. Save dialog auto-suggests assertions from recorded context. Results integrate with progress pipeline (Create Task / Start Workflow).

## Workspaces

`src/main/features/workspace/` provides multi-session workspaces (a workspace owns multiple agent sessions, often across worktrees).

- **`workspaces-service.ts`** — CRUD over the `workspaces` table.
- **`workspace-session-manager.ts`** — session lifecycle scoped to a workspace, integrates with `BusSessionManager` and `WorkspaceProvisioner`.

Renderer slice: `src/renderer/features/workspace/` (WorkspacePage, PrimarySessionPanel, TeamLeadPanel, TeamLeadPanelList).

## Renderer Feature Slices

35 slices in `src/renderer/features/`:

```
agent-dashboard  agents          alerts          assistant       briefing
bus              changelog       dashboard       diff-viewer     files
fitness          git             ideas           insights        integrations
merge            my-work         notes           onboarding      peers
personal         planner         planning        productivity    projects
runners          settings        tasks           terminals       test-suite
tools            visualization   workflow        workflow-pipeline workspace
```

Each slice follows the Feature Slice Design layout: `api/` (React Query hooks + queryKeys), `components/`, `hooks/` (optional), `lib/` (optional), `store.ts` or `*-store.ts` (Zustand UI-only state), `index.ts` (barrel).

## Routes

8 route group files in `src/renderer/app/routes/`:

- `assistant.routes.ts`
- `dashboard.routes.ts`
- `integrations.routes.ts`
- `misc.routes.ts`
- `personal.routes.ts`
- `productivity.routes.ts`
- `project.routes.ts`
- `settings.routes.ts`

`index.ts` is the barrel. TanStack Router builds the tree from these creators.

## React Query Integration (3-Layer Caching)

**EventBridge → React Query → UI Stores**

1. **EventBridge** (`src/renderer/shared/components/EventBridge.tsx`) — mounted once in `RootLayout`. Subscribes to all `event:*` channels and either `invalidateQueries` or `setQueryData` (append-style for sessions, op-log).
2. **React Query** — feature hooks in each slice's `api/` directory wrap `ipc()`. Query key factories enable targeted invalidation.
3. **Zustand stores** — UI-only state (selections, filters, layout). Never domain data.

Mutations use simple `onSuccess` invalidation (IPC is < 1ms, so optimistic updates are not used). All write hooks call `useMutationErrorToast()` to surface failures via the bottom-right `MutationErrorToast`.

For the full caching recipe see `docs/patterns/CACHING-LAYER-QUICKGUIDE.md`.

## Terminal System

- **TerminalService** spawns real PTY processes via `@lydell/node-pty`.
- **TerminalInstance** in the renderer renders xterm.js with the WebGL renderer (`@xterm/addon-webgl`), FitAddon, web-links, and serialize addons.
- Output: PTY stdout → `event:terminal.output` → `xterm.write()`.
- Input: `xterm.onData()` → `terminals.sendInput` IPC → PTY stdin.
- Resize: FitAddon → PTY resize.

## Design System

- **All UI uses `@ui` primitives.** Never raw HTML `<button>`, `<input>`, `<label>`, `<select>`, `<textarea>`. The barrel is `src/renderer/shared/components/ui/index.ts` (~85 exports across 6 tiers: form primitives, display, layout/typography, Radix wrappers for dialogs/menus/feedback/sidebar/breadcrumb, TanStack form bindings, app-specific primitives like StatusBadge/Icon/MetricCard/SearchInput/MetadataList/SectionHeader/InlineAlert/ThinkingIndicator).
- **Tier 5 (composition):** `ActionBar`, `DetailPanel`, `FilterBar`.
- **Tier 6 (data-display):** `DataGrid`, `LiveIndicator`, `StatusFlow`.
- Theme tokens registered via Tailwind v4 `@theme` block in `globals.css`. Color themes: `default`, `dusk`, `lime`, `ocean`, `retro`, `neo`, `forest`. Mode + theme + UI scale managed by `theme-store.ts` (Zustand) which sets `class="dark"`, `data-theme="X"`, `data-ui-scale="X"` on `<html>`.
- Semi-transparent theme colors always use `color-mix(in srgb, var(--token) XX%, transparent)`.
- Page structure uses `PageLayout` / `PageHeader` / `PageContent`.

## App Layout Components (`src/renderer/app/layouts/`)

| Component | Purpose |
|-----------|---------|
| `RootLayout` | Renders `TitleBar` + `react-resizable-panels` (sidebar + content). Hosts `EventBridge`, overlay notifications, and `AssistantWidget`. Layout persists to localStorage via `useDefaultLayout`. |
| `TitleBar` | Custom 32px frameless title bar with drag region, screenshot/health/hub buttons, separator, then min/max/close via `window.*` IPC. |
| `Sidebar` | Navigation (fills its panel container). |
| `TopBar` | CommandBar trigger. |
| `CommandBar` | Cmd+K palette. |
| `ProjectTabBar` | Horizontal tab bar for open projects. |
| `UserMenu` | Avatar + logout dropdown. |

Overlays mounted after the main content, in order: `AppUpdateNotification`, `AuthNotification`, `HubNotification`, `MutationErrorToast` (z-50), `WebhookNotification`, `AssistantWidget` (FAB z-40, panel z-50; Ctrl+J / Cmd+J).

## Security — Secret Storage

All sensitive credentials are encrypted via Electron's `safeStorage` (Keychain / DPAPI / libsecret). Plaintext fallback only when `safeStorage.isEncryptionAvailable()` returns false (CI/headless).

| Secret | Location |
|--------|----------|
| OAuth client credentials | `<userData>/oauth-providers.json` |
| OAuth access/refresh tokens | `oauth_tokens` table (encrypted column) |
| Webhook secrets (Slack, GitHub) | `settings_kv` (encrypted) |
| Peer identity private key | `<userData>/peer-identity.json` (encrypted unless `ADC_PEERS_ALLOW_PLAINTEXT_IDENTITY=1`) |

Both paths auto-migrate plaintext entries on first read; the `useSafeStorage` flag tracks whether real encryption was used.

## QA System

Two-tier automated QA spawning Claude agents via the bus:
- **Quiet mode** — fast scripted checks (lint, typecheck, tests, build, check:docs).
- **Full mode** — interactive Claude review with screenshots and accessibility testing.

Files: `qa-runner.ts`, `qa-report-parser.ts`, `qa-handlers.ts`, `qa-trigger.ts`. `QaTrigger` listens for bus session completion where `phase === 'executing'` and auto-starts quiet QA after a 2s settle when the task is in `review`. Test-suite integration is wired through `qaTrigger`'s `testSuiteService` dep — failed test runs can promote to QA.

Events: `event:qa.started`, `event:qa.progress`, `event:qa.completed`. Renderer: `useQaMutations`, `useQaEvents`, `QaReportViewer`.

## Build System

- **electron-vite** drives three builds: main (CJS), preload (ESM), renderer (Vite + React).
- Path aliases configured in both `tsconfig.json` and `electron.vite.config.ts`: `@shared`, `@main`, `@renderer`, `@features`, `@ui`.
- Tailwind v4 via `@tailwindcss/postcss` in `postcss.config.mjs`.
- Compile-time channel baking via `__ADC_CHANNEL__` define; set with `cross-env ADC_CHANNEL=local electron-vite build`.
- `postinstall` runs `electron-rebuild -f -w better-sqlite3` to match Electron's Node ABI. Test scripts swap ABIs via `scripts/rebuild-sqlite-for-{node,electron}.mjs` so Vitest can use better-sqlite3 directly.
- Native deps that ship in the bundle: `@lydell/node-pty`, `better-sqlite3`. `reflect-metadata` is forced external — bundling it broke `tsyringe` initialization order in packaged builds.

## Dependency Versions (selected)

| Package | Version |
|---------|---------|
| electron | 39.2.7 |
| react | ^19.2.3 |
| typescript | ^5.9.3 |
| vite | ^7.2.7 |
| vitest | ^4.0.16 |
| @tanstack/react-query | ^5.62.0 |
| @tanstack/react-router | ^1.95.0 |
| @tanstack/react-table | ^8.21.3 |
| @tanstack/react-form | ^1.28.3 |
| drizzle-orm | ^0.45.2 |
| better-sqlite3 | ^12.8.0 |
| zod | ^4.2.1 |
| zustand | ^5.0.9 |
| tailwindcss | ^4.1.17 |
| @lydell/node-pty | ^1.1.0 |
| @peculiar/x509 | ^2.0.0 |
| bonjour-service | ^1.3.0 |
| @anthropic-ai/sdk | ^0.74.0 |
| @playwright/test | ^1.58.2 |

---

## Testing — MANDATORY VERIFICATION GATE

> **All code changes require passing the test suite.**

```bash
npm run lint         # Zero violations
npm run typecheck    # Zero errors
npm run test         # Unit + integration
npm run build        # Builds successfully
npm run test:e2e     # Playwright + Electron (requires build)
npm run check:docs   # Documentation updated for source changes
```

The 4-layer test pyramid:

```
                  ┌─────────────────┐
                  │   AI QA AGENT   │  ← Claude + MCP Electron
                  │  (Exploratory)  │
                  └────────┬────────┘
              ┌────────────┴────────────┐
              │      E2E TESTS          │  ← Playwright + Electron
              │   (Critical Journeys)   │
              └────────────┬────────────┘
        ┌──────────────────┴──────────────────┐
        │         INTEGRATION TESTS           │  ← Vitest
        └──────────────────┬──────────────────┘
┌───────────────────────────┴───────────────────────────────┐
│                       UNIT TESTS                          │  ← Vitest
│   (Services, Utilities, Zod Schemas, Pure Functions)      │
└───────────────────────────────────────────────────────────┘
```

| Layer | Tool | Purpose | When |
|-------|------|---------|------|
| Unit | Vitest | Services, utilities, pure functions | Every save, pre-commit |
| Integration | Vitest | IPC handlers, React Query hooks | Pre-commit |
| E2E | Playwright + Electron | Critical user journeys | Pre-push, CI |
| AI QA | Claude + MCP Electron | Exploratory visual testing | PR review |

### Configuration Files

| File | Purpose |
|------|---------|
| `vitest.config.ts` | Unit test configuration |
| `vitest.integration.config.ts` | Integration test configuration |
| `playwright.config.ts` | E2E configuration |

### Native ABI Rebuild Hooks

`pretest:unit` and `pretest:e2e` run `scripts/rebuild-sqlite-for-{node,electron}.mjs` so that `better-sqlite3` matches the runtime: Node ABI for Vitest, Electron ABI for Playwright/electron-builder. `posttest:unit` restores Electron ABI so subsequent `npm run dev` works without manual rebuild.

### Test Commands

```bash
npm run test              # unit + integration
npm run test:unit         # unit only
npm run test:integration  # integration only
npm run test:e2e          # Playwright + Electron
npm run test:e2e:ui       # Playwright UI mode
npm run test:coverage     # V8 coverage
```
