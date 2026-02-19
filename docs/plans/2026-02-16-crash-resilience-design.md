# Crash Resilience & Error Handling — Production Hardening Design

> Tracker Key: `crash-resilience` | Status: **IMPLEMENTED** | Created: 2026-02-16

**Scope**: Crash resilience, error boundaries, data protection, health monitoring, error pipeline

---

## Executive Summary

ADC currently has zero React error boundaries, no main process exception handlers, no atomic file writes, and no service health monitoring. A single unhandled error can crash the entire app, and errors are scattered across `console.error` calls with no unified collection.

This design introduces a comprehensive crash resilience system:
- 4-tier React error boundaries (root, route, feature, widget)
- Main process exception/rejection handlers with renderer crash recovery
- Atomic file writes with automatic backups and corruption recovery
- Service health monitoring with pulse-based detection
- Centralized ErrorCollector with severity, context enrichment, and persistence
- 3-tier error UI (app health dot, project error header, unified toast system)

---

## 1. React Error Boundaries — 4 Tiers

### 1a. Root Boundary

**Wraps:** `<AppRouter />`
**Trigger:** Catches any error that escapes all lower boundaries
**Recovery:** Full-screen "Something went wrong" page with:
- Error message (non-technical summary)
- "Reload App" button → `window.location.reload()`
- "Copy error details" button → copies stack to clipboard
- Logs error to main process via `event:app.error` IPC

### 1b. Route Boundary

**Wraps:** Each route group's page component (inside the layout)
**Trigger:** Catches page-level render errors
**Recovery:** Inline error card within the content area:
- "Go to Dashboard" + "Retry" buttons
- Sidebar, command bar, title bar remain functional
- Error state resets on navigation (route change clears the boundary)

### 1c. Feature Boundary

**Wraps:** Each feature's main component inside a route (e.g., `TaskDataGrid`, `AgentDashboard`)
**Trigger:** Catches feature-specific errors (e.g., AG-Grid throws)
**Recovery:** Feature-level error card:
- "Retry" button to remount the component
- Rest of the page layout (header, sibling features) stays alive
- Logs error with project context

### 1d. Widget Boundary

**Wraps:** Isolated widgets (AssistantWidget, SpotifyWidget, CalendarWidget)
**Trigger:** Catches widget render errors
**Recovery:** Small "Failed to load" placeholder
- Other widgets on the same page remain working
- Silent recovery — no modal or full error display

### All Boundaries

- Log errors to main process via `ErrorCollector`
- Include "Copy error details" button
- Renderer route history is attached as context

---

## 2. Main Process Crash Protection

### 2a. Global Exception Handlers

Location: `src/main/index.ts`

**`process.on('uncaughtException')`:**
- Log via `electron-log`
- Show native `dialog.showErrorBox` with the error message
- Call existing `before-quit` cleanup, then `app.quit()`

**`process.on('unhandledRejection')`:**
- Log via `electron-log`
- Do NOT quit (most rejections are recoverable)
- Forward to renderer as `event:app.error` IPC event → toast
- Report to ErrorCollector

### 2b. Renderer Crash Recovery

**`webContents.on('render-process-gone')`:**
- Log crash reason + exit code
- Auto-recreate the BrowserWindow after 1 second delay
- Track consecutive crashes: if 3 crashes within 60 seconds, show native dialog:
  - "The app keeps crashing. Restart or Quit?"
  - Prevents infinite restart loops

### 2c. Service Initialization Resilience

Location: `src/main/bootstrap/service-registry.ts`

- Wrap each service factory call in try/catch
- **Critical services** (settings, hub-auth, ipc-router) — failure causes startup abort with error dialog
- **Non-critical services** (spotify, fitness, calendar, changelog, etc.) — failure logged, null stub returned, app continues booting
- Classification list maintained in the registry module

---

## 3. Atomic File Writes & Data Corruption Protection

### 3a. Atomic Write Utility

New shared utility: `src/main/lib/safe-write-json.ts`

```
safeWriteJson(filePath, data):
  1. Serialize data to JSON string
  2. Write to <filePath>.tmp
  3. Call fsync() on the file descriptor
  4. Rename .tmp → target path (atomic on all OSes)
  5. If rename fails, original file is untouched
```

### 3b. Automatic Backup on Read

When a store successfully loads a JSON file at startup:
1. Write a `.bak` copy of the successfully-parsed file
2. Backup happens after parse validation (never back up corrupted data)

### 3c. Corruption Detection & Recovery

Wrap `JSON.parse` in each store's `load()` method:

1. Try loading primary file
2. If parse fails → try loading `.bak` file
3. If `.bak` also fails → initialize with defaults
4. In cases 2 and 3, emit `event:app.dataRecovery` IPC event
5. Renderer shows notification: "Settings recovered from backup" or "Settings reset to defaults"

**Stores to apply this to (5):**
- `settings-store.ts`
- `task-store.ts`
- `email-store.ts`
- `briefing-cache.ts`
- `conversation-store.ts`

---

## 4. Service Health Monitoring

### 4a. Health Registry

New singleton: `src/main/services/health/health-registry.ts`

- Services register with an expected heartbeat interval
- Services call `registry.pulse('serviceName')` on each successful cycle
- Registry sweeps every 30 seconds
- Any service that misses 3 consecutive expected pulses → flagged "unhealthy"

### 4b. Health Status IPC

New channel: `app.getHealthStatus`

Returns:
```typescript
{
  services: [{
    name: string;
    status: 'healthy' | 'unhealthy' | 'stopped';
    lastPulse: string;     // ISO timestamp
    missedCount: number;
  }]
}
```

Unhealthy services also emit `event:app.serviceUnhealthy` → toast notification

### 4c. Enrolled Services

| Service | Expected Interval | Monitored Operation |
|---------|-------------------|---------------------|
| Hub heartbeat | 60s | Device ping to Hub |
| Hub WebSocket | 30s | WS connection alive |
| Slack watcher | 60s | Slack API poll |
| GitHub watcher | 60s | GitHub API poll |
| Alert scheduler | 60s | Alert check cycle |
| Watch evaluator | 30s | Event evaluation sweep |
| JSONL progress watcher | 10s | File tail read |

Non-enrolled: one-shot services, sync operations, CRUD services (they don't run continuously).

---

## 5. ErrorCollector — Centralized Error Pipeline

### Architecture

```
Service error / uncaughtException / unhandledRejection / boundary catch
    ↓
ErrorCollector (main process singleton)
    ↓ writes to
{appData}/adc/error-log.json (persisted, atomic writes)
    ↓ emits
event:app.error (IPC event to renderer)
    ↓ received by
Renderer ErrorListener hook
    ↓ triggers
Toast + health indicator update + assistant knowledge
```

### Error Entry Schema

```typescript
interface ErrorEntry {
  id: string;                          // UUID
  timestamp: string;                   // ISO 8601
  severity: 'error' | 'warning' | 'info';
  tier: 'app' | 'project' | 'personal';
  category: string;                    // connection, filesystem, agent, service, ipc, renderer
  message: string;
  stack?: string;

  context: {
    route: string;                     // Current renderer route
    routeHistory: string[];            // Last 5 routes visited
    projectId?: string;
    projectName?: string;

    task?: {
      taskId: string;
      taskSlug: string;
      status: string;
      lastSavedState?: string;         // Last progress checkpoint
    };

    agent?: {
      sessionId: string;
      agentName: string;               // e.g., "team-lead", "qa-reviewer"
      lastToolUse?: string;
      lastLogLines?: string[];         // Last 10 lines of agent output
      progressFile?: string;           // Path to JSONL progress file
    };
  };
}
```

### ErrorCollector API

```typescript
interface ErrorCollector {
  report(entry: Omit<ErrorEntry, 'id' | 'timestamp'>): void;
  getLog(since?: Date): ErrorEntry[];
  getStats(): { total: number; byTier: Record<string, number>; bySeverity: Record<string, number>; last24h: number };
  clear(): void;  // Manual clear only — not on restart
}
```

### Categories

| Category | Examples |
|----------|---------|
| `connection` | Hub disconnect, WebSocket failure, API timeout |
| `filesystem` | Write failure, corruption detected, permission denied |
| `service` | Service unhealthy, initialization failure |
| `agent` | Agent crash, orchestrator fallback, team-lead rogue |
| `ipc` | Handler threw, Zod validation failure |
| `renderer` | Error boundary caught, component crash |

### Context Population

- **Route info:** Renderer maintains a route history ring buffer (last 5) in a Zustand store. Attached to errors on boundary catch or IPC error report.
- **Project/task info:** ErrorCollector has access to service registry. When `projectId` is provided, it pulls active task state from `task-store`.
- **Agent info:** Pulled from orchestrator session state + last 10 lines from JSONL progress watcher.

### Persistence & Retention

- Written to `{appData}/adc/error-log.json` using atomic write utility
- **NOT cleared on restart** — survives crashes
- Cleanup on app launch: entries older than **7 days** are pruned
- Session capacity alert: toast fires at **50+ entries** in a single session

---

## 6. Error Surfacing UI — Three Tiers

### 6a. App Health Indicator (Title Bar)

Location: Top toolbar, next to minimize/maximize/close buttons

**Healthy:** Small green pulsing dot
- Hover tooltip: "ADC is healthy" (positioned below/beside to avoid clipping outside window frame)

**Warnings:** Amber dot, condensed label (e.g., "2 warnings")

**Errors:** Red dot, condensed label (e.g., "3 errors")

**Click → Health Panel popover** anchored below the dot:
- Service health status table (name, status badge, last seen)
- Scrollable error log with full context (route, project, task, agent)
- Severity filter tabs (all / errors / warnings / info)
- "Copy all" button → exports full error log to clipboard
- "Clear" button → clears log (with confirmation)

### 6b. Project Error Header (Above Task Table)

Location: Project detail view, header area above AG-Grid

**Project info card:**
- Project image, title, description, links
- Rendered as markdown (could be saved to repo as `PROJECT.md`)
- Editable inline

**Error indicator:**
- Error icon badge showing project-scoped error count
- Click → expandable error panel:
  - Git merge conflicts
  - Agent team-lead fallback events (orchestrator hit error, fell back to saved progress)
  - Task execution failures
  - Each entry: timestamp, description, expandable full error output, "Copy" button
  - Links to agent progress files for deep debugging

### 6c. Unified Toast System

All errors from all tiers fire through a single toast pipeline:

- Bottom-right toasts (extending existing `MutationErrorToast` pattern)
- Auto-dismiss after 5 seconds (errors stay longer — 8 seconds)
- Click a toast to jump to the health panel or project error header
- Every toast persists to the error log (no data loss)

**Assistant integration:**
- Assistant service queries `ErrorCollector.getLog()` for error-related intents
- "Hey Claude, any errors today?" → enumerates all logged errors with timestamps and context
- "What happened with the last agent failure?" → pulls agent context from the most recent `agent` category error

---

## 7. Implementation Order

Suggested phased implementation:

| Phase | Components | Rationale |
|-------|-----------|-----------|
| **Phase 1** | ErrorCollector + atomic writes + persisted log | Foundation — everything else depends on this |
| **Phase 2** | Main process handlers + renderer crash recovery | Prevents silent crashes |
| **Phase 3** | React error boundaries (4 tiers) | Prevents white screens |
| **Phase 4** | Health registry + service enrollment | Background service monitoring |
| **Phase 5** | App health indicator (title bar) | User-visible status |
| **Phase 6** | Unified toast system (enhanced) | Error notification pipeline |
| **Phase 7** | Project error header | Project-scoped error visibility |
| **Phase 8** | Assistant error integration | "Any errors today?" knowledge |

---

## Future Items (Tracked Separately)

1. **Personal vs Work UX/Code Separation** — Design a phased plan for separating Personal features (calendar, fitness, todos, journal) from Work features (projects, tasks, agents). Includes personal dashboard, personal error handling in sidebar, customizable widget grid, multi-account Google Calendar integration.

2. **Personal Dashboard Feature** — Week/day schedule planner view, customizable widget dashboard, fitness tracking widget, calendar with add/edit/RSVP, multi-email Google Calendar support.

3. **Vision.md Update** — Update VISION.md to reflect the Personal/Work separation and personal dashboard features.
