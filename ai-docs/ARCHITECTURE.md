# Architecture Reference

## System Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│  RENDERER (Browser)                                              │
│  ┌──────────────┐   ┌───────────────┐   ┌────────────────────┐  │
│  │ React        │──▷│ React Query   │──▷│ ipc() helper       │  │
│  │ Components   │   │ hooks         │   │ (window.api.invoke) │  │
│  └──────────────┘   └───────────────┘   └────────┬───────────┘  │
│  ┌──────────────┐   ┌───────────────┐            │              │
│  │ Zustand      │   │ useIpcEvent() │◁─ events ──┤              │
│  │ stores       │   │ hooks         │            │              │
│  └──────────────┘   └───────────────┘            │              │
├──────────────────────────────────────────────────┼──────────────┤
│  PRELOAD (Context Bridge)                        │              │
│  ┌─────────────────────────────────────────────┐ │              │
│  │ api.invoke(channel, input) → IpcResult<T>   │─┤              │
│  │ api.on(channel, handler) → unsubscribe      │◁┘              │
│  └─────────────────────────────────────────────┘                │
├─────────────────────────────────────────────────────────────────┤
│  MAIN PROCESS (Node.js)                                         │
│  ┌──────────────┐   ┌───────────────┐   ┌────────────────────┐  │
│  │ IPC Router   │──▷│ Handlers      │──▷│ Services           │  │
│  │ (Zod valid.) │   │ (thin layer)  │   │ (business logic)   │  │
│  └──────────────┘   └───────────────┘   └────────────────────┘  │
│                                          ├─ AgentService        │
│                                          ├─ ProjectService      │
│                                          ├─ TaskService         │
│                                          ├─ TerminalService     │
│                                          └─ SettingsService     │
└─────────────────────────────────────────────────────────────────┘
```

## IPC Flow (Request/Response)

1. **Renderer** calls `ipc('projects.list', {})` via the shared helper
2. Helper calls `window.api.invoke('projects.list', {})` (preload bridge)
3. Preload forwards via `ipcRenderer.invoke(channel, input)`
4. **Main** `IpcRouter.handle()` receives the call:
   - Validates input against Zod schema from `ipc-contract.ts`
   - Calls the registered handler function
   - Wraps result in `{ success: true, data }` or `{ success: false, error }`
5. Result returns to renderer as `IpcResult<T>`

## IPC Flow (Events — Main → Renderer)

1. **Main** service calls `router.emit('event:terminal.output', payload)`
2. Router calls `BrowserWindow.webContents.send(channel, payload)`
3. Preload listener fires via `ipcRenderer.on(channel, listener)`
4. **Renderer** `useIpcEvent('event:terminal.output', handler)` hook receives payload
5. Handler typically calls `queryClient.invalidateQueries()` to refetch data

## Data Persistence

| Data | Storage | Location |
|------|---------|----------|
| Projects | JSON file | `{appData}/claude-ui/projects.json` |
| Settings | JSON file | `{appData}/claude-ui/settings.json` |
| Tasks | File directories | `{projectPath}/.auto-claude/specs/{taskId}/` |
| Task specs | JSON files | `requirements.json`, `implementation_plan.json`, `task_metadata.json` |
| Terminals | In-memory only | PTY processes managed by TerminalService |
| Agents | In-memory only | PTY processes managed by AgentService |

## Service Architecture

All main process services follow the factory pattern:

```typescript
// Interface defines the public API
export interface ProjectService {
  listProjects: () => Project[];
  addProject: (path: string) => Project;
  // ...
}

// Factory creates the service instance with dependencies
export function createProjectService(/* deps */): ProjectService {
  // Private state (closures)
  return {
    listProjects() { /* ... */ },
    addProject(path) { /* ... */ },
  };
}
```

Key rules:
- Services return **synchronous values** (not Promises)
- IPC handlers wrap sync returns with `Promise.resolve()`
- Only exception: `selectDirectory()` uses Electron's async dialog API
- Services emit events via `router.emit()` for real-time updates

## React Query Integration

Each feature module provides query hooks that wrap `ipc()`:

```typescript
export function useTasks(projectId: string | null) {
  return useQuery({
    queryKey: taskKeys.list(projectId ?? ''),
    queryFn: () => ipc('tasks.list', { projectId: projectId ?? '' }),
    enabled: projectId !== null,
    staleTime: 30_000,
  });
}
```

Pattern:
- `queryKeys.ts` defines a factory for cache keys (enables targeted invalidation)
- `use<Feature>.ts` defines query hooks (read operations)
- `useTaskMutations.ts` defines mutation hooks (write operations with optimistic updates)
- `use<Feature>Events.ts` subscribes to IPC events and invalidates relevant queries

## Terminal System

- **TerminalService** spawns real PTY processes via `@lydell/node-pty`
- **TerminalInstance.tsx** renders xterm.js with WebGL renderer
- Data flows: PTY stdout → `event:terminal.output` IPC event → xterm.write()
- Input flows: xterm.onData() → `terminals.sendInput` IPC call → PTY stdin
- Resize syncs between xterm FitAddon and PTY process

## Agent System

- **AgentService** spawns Claude CLI as PTY processes
- Parses CLI output for status indicators (starting, completed, error)
- Emits `event:agent.statusChanged` and `event:agent.log` events
- Agents are linked to tasks via `taskId` and projects via `projectId`
- Task spec files in `.auto-claude/specs/` provide context to the CLI

## Task System

Tasks are stored as file-system directories under `{project}/.auto-claude/specs/`:

```
specs/
├── 1-implement-login/
│   ├── requirements.json       # Task description, workflow type
│   ├── implementation_plan.json # Status, phases, execution state
│   └── task_metadata.json      # Model config, complexity
└── 2-fix-sidebar-bug/
    └── ...
```

The TaskService reads/writes these files. The Kanban board displays tasks grouped by status.

## Design System & Theme Architecture

```
globals.css @theme block
  ├── Registers CSS vars as Tailwind tokens (--color-primary: var(--primary))
  ├── Defines fonts, radius scale, animations, keyframes
  └── Tailwind generates utility classes (bg-primary, text-foreground, etc.)

Theme variable blocks (in globals.css)
  ├── :root            — Default light theme
  ├── .dark            — Default dark theme (Oscura Midnight)
  ├── [data-theme="X"]       — Named theme light variant
  └── [data-theme="X"].dark  — Named theme dark variant

theme-store.ts (Zustand)
  ├── setMode('dark')       → adds class="dark" to <html>
  ├── setColorTheme('ocean') → sets data-theme="ocean" on <html>
  └── setUiScale(110)       → sets data-ui-scale="110" on <html>

Constants (src/shared/constants/themes.ts)
  ├── COLOR_THEMES — ['default', 'dusk', 'lime', 'ocean', 'retro', 'neo', 'forest']
  ├── ColorTheme type
  └── COLOR_THEME_LABELS — human-readable names
```

Key rules:
- **`color-mix(in srgb, var(--token) XX%, transparent)`** for all semi-transparent theme colors
- Raw color values ONLY in theme variable definitions, never in utility classes
- `postcss.config.mjs` is required for Tailwind v4 processing via `@tailwindcss/postcss`

## Security — Secret Storage

All sensitive credentials are encrypted using Electron's `safeStorage` API, which provides OS-level encryption:
- **macOS**: Keychain
- **Windows**: DPAPI (Data Protection API)
- **Linux**: libsecret

### What's Encrypted

| Secret Type | Storage Location | Service |
|-------------|-----------------|---------|
| OAuth client credentials | `<userData>/oauth-providers.json` | `provider-config.ts` |
| Webhook secrets (Slack, GitHub) | `<userData>/settings.json` | `settings-service.ts` |

### Encryption Pattern

```typescript
import { safeStorage } from 'electron';

// Encrypt before saving
function encryptSecret(value: string): EncryptedSecretEntry {
  if (safeStorage.isEncryptionAvailable()) {
    const buffer = safeStorage.encryptString(value);
    return { encrypted: buffer.toString('base64'), useSafeStorage: true };
  }
  // Fallback for CI/testing environments
  return { encrypted: Buffer.from(value, 'utf-8').toString('base64'), useSafeStorage: false };
}

// Decrypt on read
function decryptSecret(entry: EncryptedSecretEntry): string {
  if (entry.useSafeStorage) {
    const buffer = Buffer.from(entry.encrypted, 'base64');
    return safeStorage.decryptString(buffer);
  }
  return Buffer.from(entry.encrypted, 'base64').toString('utf-8');
}
```

### Migration

Both services automatically migrate plaintext secrets to encrypted format on first read. The `useSafeStorage` flag tracks whether real encryption was used, enabling graceful fallback in environments where safeStorage is unavailable.

## Security — Hub API

The Hub server (`hub/`) includes security hardening for its REST API.

### Bootstrap Secret

The `POST /api/auth/generate-key` endpoint (used to create the first API key) requires the `HUB_BOOTSTRAP_SECRET` environment variable:

```bash
# .env
HUB_BOOTSTRAP_SECRET=your-random-secret-here
```

Clients must include the secret in the `X-Bootstrap-Secret` header. The server validates using `crypto.timingSafeEqual()` to prevent timing attacks.

### Rate Limiting

All Hub endpoints are protected by `@fastify/rate-limit`:

| Scope | Limit | Window |
|-------|-------|--------|
| Global (all endpoints) | 100 requests | 1 minute |
| Auth routes (`/api/auth/*`) | 10 requests | 1 minute |

Rate limit headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`) are included in responses.

### CORS Validation

CORS is configured via the `HUB_ALLOWED_ORIGINS` environment variable (comma-separated list of allowed origins). If not set, defaults to `origin: true` for development mode.

```bash
# .env
HUB_ALLOWED_ORIGINS=https://example.com,http://localhost:5173
```

### WebSocket First-Message Authentication

WebSocket connections use first-message authentication instead of query parameters (which can be logged by proxies):

1. Client connects to `/ws` without API key in URL
2. Server expects an auth message within 5 seconds:
   ```json
   { "type": "auth", "apiKey": "your-api-key" }
   ```
3. Server validates the API key against the database
4. On success: client is upgraded to `addAuthenticatedClient()` and receives broadcasts
5. On failure: connection is closed with code 4001 (Unauthorized)

The client implementation (`hub-connection.ts`) sends the auth message immediately upon WebSocket open.

---

## Hub Connection Layer

The Electron client connects to a self-hosted Hub server for multi-device sync.

### Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  ELECTRON CLIENT                                                     │
│  ┌─────────────────┐   ┌──────────────────┐   ┌──────────────────┐  │
│  │ React Hooks     │──▷│ IPC Handlers     │──▷│ Hub Services     │  │
│  │ (useTasks, etc) │   │ (hub-handlers)   │   │                  │  │
│  └─────────────────┘   └──────────────────┘   │  ┌────────────┐  │  │
│          ▲                                     │  │ API Client │  │  │
│          │                                     │  └─────┬──────┘  │  │
│  ┌───────┴─────────┐                          │        │         │  │
│  │ useHubEvent     │◁─────── events ──────────│  ┌─────▼──────┐  │  │
│  │ hub-query-sync  │                          │  │ WebSocket  │  │  │
│  └─────────────────┘                          │  └─────┬──────┘  │  │
│                                               │        │         │  │
│                                               │  ┌─────▼──────┐  │  │
│                                               │  │ Token Store│  │  │
│                                               │  │ Auth Svc   │  │  │
│                                               │  └────────────┘  │  │
│                                               └──────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                              │ REST + WebSocket
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  HUB SERVER (Docker)                                                 │
│  ┌─────────────────┐   ┌──────────────────┐   ┌──────────────────┐  │
│  │ Fastify Routes  │──▷│ SQLite Database  │   │ WS Broadcaster   │  │
│  │ /api/tasks/*    │   │ (tasks, devices) │   │ (real-time push) │  │
│  │ /api/auth/*     │   └──────────────────┘   └──────────────────┘  │
│  └─────────────────┘                                                 │
└─────────────────────────────────────────────────────────────────────┘
```

### Services

| Service | Location | Purpose |
|---------|----------|---------|
| `hub-api-client.ts` | `src/main/services/hub/` | REST API calls (tasks, auth, devices) |
| `hub-auth-service.ts` | `src/main/services/hub/` | Login/register/logout + token refresh |
| `hub-token-store.ts` | `src/main/services/hub/` | safeStorage encrypted token persistence |
| `hub-websocket.ts` | `src/main/services/hub/` | WebSocket with auto-reconnect |
| `hub-errors.ts` | `src/main/services/hub/` | Standardized error classes |

### IPC Channels

| Channel | Purpose |
|---------|---------|
| `hub.ws.status` | Get WebSocket connection status |
| `hub.tasks.list` | List tasks from Hub |
| `hub.tasks.get` | Get single task |
| `hub.tasks.create` | Create task on Hub |
| `hub.tasks.update` | Update task |
| `hub.tasks.updateStatus` | Update task status only |
| `hub.tasks.delete` | Delete task |
| `hub.tasks.execute` | Start task execution |
| `hub.tasks.cancel` | Cancel running task |

### Event Channels (WebSocket → Renderer)

| Channel | Payload | When |
|---------|---------|------|
| `event:hub.tasks.created` | `{ taskId, projectId }` | Task created on another device |
| `event:hub.tasks.updated` | `{ taskId, projectId }` | Task updated on another device |
| `event:hub.tasks.deleted` | `{ taskId, projectId }` | Task deleted on another device |
| `event:hub.tasks.progress` | `{ taskId, progress, phase }` | Task progress update |
| `event:hub.tasks.completed` | `{ taskId, projectId, result }` | Task execution completed |
| `event:hub.devices.online` | `{ deviceId, name }` | Device came online |
| `event:hub.devices.offline` | `{ deviceId }` | Device went offline |

### Authentication Flow

1. **Login**: `hub.auth.login` → Hub validates → returns access + refresh tokens
2. **Token Storage**: Tokens encrypted with `safeStorage` in `hub-token-store.ts`
3. **Auto-Refresh**: Token store checks expiry, refreshes when < 5 min remaining
4. **Device Registration**: On startup, registers device with Hub + 30s heartbeat
5. **WebSocket Auth**: First message after connect is `{ type: "auth", apiKey }`, validated within 5s

---

## Build System

- **electron-vite** handles three separate builds:
  - Main: CJS output for Electron main process
  - Preload: ESM output for context bridge
  - Renderer: Bundled SPA with Vite + React plugin
- Path aliases are configured in both `tsconfig.json` and `electron.vite.config.ts`
- Tailwind v4 uses `@theme` directive in `globals.css` to register design tokens
- PostCSS pipeline: `postcss.config.mjs` → `@tailwindcss/postcss` + `autoprefixer`

---

## Testing — MANDATORY VERIFICATION GATE

> **⚠️ ALL code changes require passing the test suite. This is non-negotiable.**

### Verification Commands (ALL MUST PASS)

```bash
# Run before ANY completion claim. All 4 must pass.
npm run lint         # Zero violations
npm run typecheck    # Zero errors
npm run test         # All tests pass
npm run build        # Builds successfully
```

**Skipping tests = work rejected. No exceptions.**

---

The project uses a 4-layer test pyramid for comprehensive coverage:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CLAUDE-UI TEST PYRAMID                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                         ┌─────────────────┐                                 │
│                         │   AI QA AGENT   │  ← Claude + MCP Electron        │
│                         │  (Exploratory)  │    Visual verification          │
│                         └────────┬────────┘                                 │
│                                  │                                          │
│                    ┌─────────────┴─────────────┐                            │
│                    │      E2E TESTS            │  ← Playwright + Electron   │
│                    │   (Critical Journeys)     │    Scripted, deterministic │
│                    └─────────────┬─────────────┘                            │
│                                  │                                          │
│          ┌───────────────────────┴───────────────────────┐                  │
│          │              INTEGRATION TESTS                 │  ← Vitest       │
│          └───────────────────────┬───────────────────────┘                  │
│                                  │                                          │
│  ┌───────────────────────────────┴───────────────────────────────────────┐  │
│  │                         UNIT TESTS                                     │  │
│  │        (Services, Utilities, Zod Schemas, Pure Functions)              │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Test Layers

| Layer | Tool | Purpose | When to Run |
|-------|------|---------|-------------|
| Unit | Vitest | Services, utilities, pure functions | Every save, pre-commit |
| Integration | Vitest | IPC handlers, React Query hooks | Pre-commit |
| E2E | Playwright + Electron | Critical user journeys | Pre-push, CI |
| AI QA | Claude + MCP Electron | Exploratory visual testing | PR review |

### Test Directory Structure

```
tests/
├── setup/
│   ├── vitest.setup.ts          # Global test setup
│   └── mocks/
│       ├── electron.ts          # Mock app, dialog, safeStorage
│       ├── node-fs.ts           # Mock file system (memfs)
│       ├── node-pty.ts          # Mock PTY spawning
│       └── ipc.ts               # Mock window.api.invoke
│
├── unit/                        # Unit tests (vitest.config.ts)
│   └── services/
│       ├── project-service.test.ts
│       ├── task-service.test.ts
│       └── hub-token-store.test.ts
│
├── integration/                 # Integration tests (vitest.integration.config.ts)
│   └── ipc-handlers/
│       ├── project-handlers.test.ts
│       └── task-handlers.test.ts
│
├── e2e/                         # E2E tests (playwright.config.ts)
│   ├── electron.setup.ts        # Electron launch fixtures
│   ├── app-launch.spec.ts
│   └── navigation.spec.ts
│
└── qa-scenarios/                # AI QA agent test scenarios
    ├── README.md
    ├── task-creation.md
    └── project-management.md
```

### Test Commands

```bash
npm run test              # Run unit + integration tests
npm run test:unit         # Unit tests only (fast, <1s)
npm run test:unit:watch   # Unit tests in watch mode
npm run test:integration  # Integration tests only (<10s)
npm run test:e2e          # E2E tests with Playwright (<60s)
npm run test:e2e:ui       # E2E tests with Playwright UI
npm run test:coverage     # Unit tests with V8 coverage report
```

### Configuration Files

| File | Purpose |
|------|---------|
| `vitest.config.ts` | Unit test configuration |
| `vitest.integration.config.ts` | Integration test configuration |
| `playwright.config.ts` | E2E test configuration |

### AI QA Agent

For exploratory testing, the AI QA agent uses MCP Electron tools to interact with the running app:

- Takes screenshots for visual verification
- Navigates UI elements via `send_command_to_electron`
- Reads console logs for error detection
- Follows natural language test scenarios in `tests/qa-scenarios/`

See `docs/plans/2026-02-14-test-suite-design.md` for the full testing strategy.
