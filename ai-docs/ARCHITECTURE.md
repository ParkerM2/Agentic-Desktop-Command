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

---

## Build System

- **electron-vite** handles three separate builds:
  - Main: CJS output for Electron main process
  - Preload: ESM output for context bridge
  - Renderer: Bundled SPA with Vite + React plugin
- Path aliases are configured in both `tsconfig.json` and `electron.vite.config.ts`
- Tailwind v4 uses `@theme` directive in `globals.css` to register design tokens
- PostCSS pipeline: `postcss.config.mjs` → `@tailwindcss/postcss` + `autoprefixer`
