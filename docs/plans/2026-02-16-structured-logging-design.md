# Structured Logging & Diagnostics — Production Hardening Design

**Date**: 2026-02-16
**Status**: Approved design — ready for implementation
**Scope**: Replace console.* with structured electron-log, log rotation, diagnostic export, ESLint enforcement

---

## Executive Summary

ADC has 136 `console.*` calls across 50 main process files with zero structure — no levels, no timestamps, no persistence, no rotation. `electron-log` is already installed as a dependency but never imported. This design wires it up, migrates all logging, adds rotation, a user-configurable log level, and a diagnostic export bundle for bug reports.

---

## 1. Logger Service

### Location

`src/main/lib/logger.ts` — thin wrapper around `electron-log`

### API

```typescript
import log from 'electron-log';

// Configure on startup
log.transports.file.maxSize = 5 * 1024 * 1024; // 5MB per file
log.transports.file.format = '{y}-{m}-{d} {h}:{i}:{s}.{ms} [{level}] [{scope}] {text}';

// Category-scoped usage
const hubLog = log.scope('hub');
hubLog.info('Connected to hub at', url);
hubLog.warn('Connection retry', { attempt: 3 });
hubLog.error('Hub sync failed', error);
```

### Categories (Scopes)

| Scope | Used By |
|-------|---------|
| `app` | Lifecycle, startup, shutdown, auto-update |
| `ipc` | IPC router, handler calls, validation |
| `hub` | Hub connection, sync, API, WebSocket |
| `agent` | Agent spawn/stop, orchestrator, progress |
| `service` | Generic service operations |
| `watcher` | Notification watchers, progress watchers |
| `auth` | Login, token refresh, OAuth flows |
| `mcp` | MCP client, MCP server tools |
| `fs` | File read/write, store operations |

### ErrorCollector Integration

The logger hooks into ErrorCollector automatically:
- `log.error(...)` and `log.warn(...)` calls are intercepted via `electron-log`'s hook system
- Each intercepted call creates an ErrorCollector entry with the scope as category
- This means every `logger.error()` call automatically appears in the health panel and error log

---

## 2. Log Rotation & File Management

### Configuration

| Setting | Value |
|---------|-------|
| Max file size | 5MB |
| Max rotated files | 3 (`main.log`, `main.1.log`, `main.2.log`) |
| Total max disk usage | ~15MB |
| Log directory | `{appData}/adc/logs/` |
| Format | `{timestamp} [{level}] [{scope}] {message}` |

### Log Level Setting

Added to `AppSettings` type and Settings page:

- **UI location:** Settings page → Advanced section
- **Options:** error, warn, info (default), verbose, debug
- **Persisted in:** `settings.json`
- **Applied on:** App startup + live when changed via settings
- **IPC channel:** Uses existing `settings.update` channel (no new IPC needed)

---

## 3. Diagnostic Bundle Export

### UI

"Export Diagnostics" button in Settings page → Advanced section

### Bundle Contents (ZIP)

| File | Contents |
|------|----------|
| `main.log` + `main.1.log` + `main.2.log` | Last ~15MB of operational logs |
| `error-log.json` | Persisted ErrorCollector entries (last 7 days) |
| `app-info.json` | App version, Electron version, OS, Node, service health, redacted settings, project list (names only) |
| `renderer-errors.json` | Last 50 renderer-side error boundary catches |

### Redaction Rules

The export scrubs:
- API keys, tokens, secrets (matched by key name: `*key*`, `*token*`, `*secret*`, `*password*`, `*credential*`)
- Full file paths (replaced with `{appData}/...` or `{home}/...`)
- Hub server URLs (replaced with `[hub-url]`)
- OAuth client IDs/secrets

### Export Flow

1. User clicks "Export Diagnostics"
2. Main process collects all files, applies redaction
3. Creates ZIP in memory using Node.js `zlib`
4. Shows native save dialog (default: `adc-diagnostics-{date}.zip` on Desktop)
5. Toast: "Diagnostics exported successfully"

Agent session logs are intentionally excluded to keep the bundle small and avoid leaking code context. Users can attach those manually if needed.

---

## 4. Migration Strategy

### Phase 1: Wire Logger (Standalone PR)

- Create `src/main/lib/logger.ts`
- Configure electron-log (rotation, format, levels)
- Add `logLevel` to settings schema (`src/shared/types/settings.ts`)
- Add log level selector to Settings page (Advanced section)
- Add "Export Diagnostics" button to Settings page
- Wire logger.error/warn to ErrorCollector hook
- Add `logger` to service registry as shared dependency

### Phase 2: Migrate Top 10 Files

Prioritized by console call count:

| File | Calls | Scope |
|------|-------|-------|
| `mcp-client.ts` | 9 | mcp |
| `mcp-manager.ts` | 8 | mcp |
| `hotkey-manager.ts` | 8 | app |
| `app-update-service.ts` | 7 | app |
| `hub-sync.ts` | 7 | hub |
| `jsonl-progress-watcher.ts` | 6 | agent |
| `progress-watcher.ts` | 6 | watcher |
| `service-registry.ts` | 6 | app |
| `hub-ws-client.ts` | 5 | hub |
| `hub-connection.ts` | 4 | hub |

### Phase 3: Migrate Remaining 40 Files

Remaining files average ~2 calls each. Can be done:
- File-by-file as services are touched for other work
- As a dedicated sweep PR

### Phase 4: ESLint Enforcement

After all 136 calls are migrated:
- Add `no-console: 'error'` to ESLint config
- Allowlist only `src/main/lib/logger.ts` (the wrapper itself)
- Prevents any regression — new `console.log` calls are caught at lint time

---

## 5. Current State Reference

| Metric | Current | After |
|--------|---------|-------|
| `console.*` calls in main | 136 across 50 files | 0 (migrated to logger) |
| `electron-log` usage | Installed, never imported | Wrapped, configured, used everywhere |
| Log persistence | None (dev console only) | 15MB rotated files |
| Log levels | None | 5 levels, user-configurable |
| Diagnostic export | None | ZIP bundle with redaction |
| ESLint enforcement | None | `no-console: 'error'` |
