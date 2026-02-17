# Bootstrap Modules

Extracted from `main/index.ts` to keep the Electron entry point small. These modules run once at app startup to initialize the entire main process.

## Key Files

- **`service-registry.ts`** — Instantiates all services and their dependencies (30+ services). Returns the full service bag used by IPC handlers and event wiring.
- **`ipc-wiring.ts`** — Registers all IPC request/response handlers on the router by delegating to `registerAllHandlers()`
- **`event-wiring.ts`** — Forwards service events (agent sessions, progress, webhooks, watch evaluator) to the renderer via IPC
- **`lifecycle.ts`** — Electron app lifecycle handlers: `window-all-closed`, `before-quit` (service disposal), `activate` (macOS dock re-open)
- **`index.ts`** — Barrel re-export of all bootstrap functions and types

## Startup Sequence

1. `createServiceRegistry()` — build all services
2. `wireIpcHandlers()` — connect IPC channels to handlers
3. `wireEventForwarding()` — bridge service events to renderer
4. `setupLifecycle()` — register Electron lifecycle hooks
