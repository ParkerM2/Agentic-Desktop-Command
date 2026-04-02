# ADC Fix-First Plan — Stubs, Architecture Risks, UDS_INBOX Spike

**Generated**: 2026-04-01 by /autoplan (dual CEO+CTO review synthesis)
**Scope**: Fix-first — wire all stubs, patch 5 architecture risks, spike UDS_INBOX + --channels interface
**Branch**: feature/adc-fix-first (from master post agent-dashboard-view merge)
**Prerequisite**: master has agent-dashboard-view merged (confirmed 2026-04-01, 80 files, 8055 insertions)

---

## Strategic Context Note — Claude Channels (Research Preview)

**New Claude Code feature: `--channels`** — MCP servers can push messages into sessions; permission relay to mobile device.

**Direct impact on this plan and the broader roadmap:**

The `--channels` feature is a push-based MCP transport. An MCP server can emit messages into a running Claude Code session without the session having to poll. Permission relay to phone means approvals that currently require a human at the terminal can be relayed to a mobile device.

**How this simplifies the plan:**

1. **Permission bubble model** (currently P2 gap): ADC could be the MCP server that pushes permission requests into the session; the user responds from their phone. This collapses the permission bubble implementation into a standard MCP pattern rather than requiring custom IPC.

2. **Multi-device sync** (committed to P1-P2 sequencing): The `--channels` push transport may partially replace the Hub server's session-streaming role for the mobile viewer use case — significantly lowering Hub infrastructure requirements.

3. **Team Lead input path** (Task D in this plan): Current TL input is `tmux send-keys` (fragile string injection). `--channels` could replace this for the input side — ADC sends messages to the TL session via MCP push. Output would still need JSONL watching or streaming.

**Action in this plan:** Task H adds `McpChannelStrategy` as a third stub alongside `SubprocessStrategy` and `UdsInboxStrategy`. The strategy pattern already planned is the right abstraction.

**Risk flag:** `--channels` is "research preview" — same caution as KAIROS/UDS_INBOX. Stub only, do not build production code against it.

---

## Why This Plan Exists

The agent-dashboard-view feature shipped 9 phases of UI and service work. All five tasks were marked done. But the dual CEO+CTO review found:

1. The entire feature is **unreachable** — route imports wrong feature module
2. Three documented stubs + one undocumented stub mean no live data flows anywhere
3. Five architecture risks that compound into reliability problems at scale
4. UDS_INBOX deferred to P3 — should be an interface hedge now

This plan makes the app actually work before any new features are added.

---

## Success Criteria

- [ ] `/agents` route loads `AgentDashboardPage` from `@features/agent-dashboard`
- [ ] `spawnTeamLead()` invokes `TmuxBridge.createSession()` — no fake session
- [ ] `getFilesChanged` returns real git diff data
- [ ] File explorer renders real directory tree via IPC
- [ ] `listQaSessions` returns actual QA session list from QaRunner
- [ ] Agent process termination kills the full process group (no orphans)
- [ ] `onTaskUpdated` listener registration is idempotent
- [ ] `watchFeature()` handles missing tasks dir with retry
- [ ] `router.emit` in fs.watch callback debounced at >= 50ms
- [ ] `sendMessage()` guards stdin writable state before writing
- [ ] `AgentConnectionStrategy` interface with `SubprocessStrategy`, `UdsInboxStrategy`, `McpChannelStrategy` stubs
- [ ] `npm run lint && npm run typecheck && npm run build` all pass

---

## Wave 1 — All parallel (touch different files)

### Task A: Fix Route Wiring
**Files**: `src/renderer/app/routes/dashboard.routes.ts`, `src/renderer/app/routes/project.routes.ts`

`dashboard.routes.ts:44` and `project.routes.ts:66` import from `@features/agents` (old PTY component).
Change both to import `AgentDashboardPage` from `@features/agent-dashboard`.
Verify exported name in `src/renderer/features/agent-dashboard/index.ts`.

Acceptance: both routes import from `@features/agent-dashboard`, typecheck passes, no `@features/agents` in route files.

---

### Task B: Wire getFilesChanged + listQaSessions
**Files**: `src/main/ipc/handlers/agent-dashboard-handlers.ts`

**B1**: `getFilesChanged` (line 59) returns `Promise.resolve([])`. Replace with `gitService.getFilesChanged(branch)`. Add gitService param to `registerAgentDashboardHandlers` if not present. Update `src/main/bootstrap/ipc-wiring.ts`.

**B2**: `listQaSessions` stub returns `Promise.resolve([])`. Replace with `qaRunner.listSessions()` mapped through `mapQaSessionToDashboard()`. Add `listSessions(): QaSession[]` to QaRunner interface if missing.

Acceptance: both channels return real data, handler stays thin, lint/typecheck pass.

---

### Task C: Wire File Explorer IPC
**Files**: `src/renderer/features/file-explorer/api/useFileTree.ts`

`useFileTree.ts:117` has hardcoded placeholder tree (`// TODO: Replace with IPC call`).
Replace with `useQuery` calling `ipc('files.listTree', { path: rootPath })`.
Verify `files.listTree` channel exists in `src/shared/ipc/files/contract.ts`. If not, add channel + handler + wire.

Acceptance: placeholder removed, hook calls IPC, loading/error states handled, typecheck passes.

---

### Task D: Wire spawnTeamLead to TmuxBridge
**Files**: `src/main/services/agent-manager/agent-manager-service.ts` (lines 74, 341, 361)

`spawnTeamLead()` returns a fake session. Replace with real `tmuxBridgeService.createSession({ sessionName, workDir, env: { CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: '1' } })`. Add tmux availability check — unavailable returns typed error `{ error: 'tmux_unavailable' | 'tmux_failed', session: null }`, not a fake success.

Acceptance: real TmuxBridge call, typed error on unavailable, no `process: null` on success, typecheck passes.

---

## Wave 2 — Architecture risk patches (after Wave 1, run parallel)

### Task E: Process Group Kill
**Files**: `src/main/services/agent-manager/process-manager.ts`

Add `{ detached: true }` to `spawn()`. Change kill path to `process.kill(-pid, 'SIGTERM')` (negative PID = kill process group). After 5s timeout use `process.kill(-pid, 'SIGKILL')`. Windows guard: fall back to single-process kill on `process.platform === 'win32'`.

Acceptance: detached spawn, negative-PID kill on macOS/Linux, Windows fallback, typecheck passes.

---

### Task F: Listener Leak + watchFeature Startup Bug
**Files**: `src/main/services/progress-watcher-v2/progress-watcher-v2-service.ts`

**F1**: Change `listeners: TaskUpdateCallback[]` → `Set<TaskUpdateCallback>`. Add `offTaskUpdated(cb)` method.

**F2**: If tasks directory does not exist at `watchFeature()` call time, watch parent dir for `tasks/` to appear, then create watcher. Remove slug from `watchedSlugs` and retry on directory creation.

Acceptance: Set-based listeners (idempotent), `offTaskUpdated` added, missing-dir retry works, lint/typecheck pass.

---

### Task G: IPC Thundering Herd + Dead Stdin
**Files**: `src/main/ipc/handlers/agent-dashboard-handlers.ts` (G1), `src/main/services/agent-manager/process-manager.ts` (G2)

**G1**: Wrap `router.emit('event:agent-dashboard.taskUpdated', ...)` in per-slug debounce. `Map<string, NodeJS.Timeout>` keyed by slug. 50ms coalesce window. Fire with most recent payload after window.

**G2**: Add `&& managed.process.stdin?.writable === true` to `sendMessage()` guard before writing.

Acceptance: emit debounced at >= 50ms, stdin guard added, typecheck passes.

---

## Wave 3 — Transport architecture spike (after Waves 1+2)

### Task H: AgentConnectionStrategy Interface
**Files** (all new):
- `src/main/services/agent-manager/agent-connection-strategy.ts`
- `src/main/services/agent-manager/subprocess-strategy.ts`
- `src/main/services/agent-manager/uds-inbox-strategy.ts`
- `src/main/services/agent-manager/mcp-channel-strategy.ts`

**Modified**: `src/main/services/agent-manager/agent-manager-service.ts`

Interface:
```typescript
export interface AgentConnectionStrategy {
  spawn(config: AgentSpawnConfig): Promise<AgentSession>;
  sendMessage(sessionId: string, message: string): boolean;
  terminate(sessionId: string): Promise<void>;
  getStatus(sessionId: string): AgentConnectionStatus;
}
```

- `SubprocessStrategy`: wraps current spawn logic. Pure refactor, no new behavior.
- `UdsInboxStrategy`: stub. Throws `new Error('UDS_INBOX: waiting for KAIROS GA')`. Comment block documents expected socket path and protocol (ref: docs/research/2026-04-01-claude-code-source-leak-analysis.md §3).
- `McpChannelStrategy`: stub. Comment documents `--channels` research preview as future TL input transport replacing tmux send-keys.

`AgentManagerService`: accept `strategy: AgentConnectionStrategy` in constructor, default to `new SubprocessStrategy(processManager)`. No behavior change.

Acceptance: interface + 3 strategies exist, AgentManagerService uses strategy pattern, behavior identical to before, all checks pass.

---

## Updated Strategy Priorities

**UDS_INBOX**: Promoted P3 → P1. Task H spikes the interface.

**`--channels`**: Added as third transport option. Monitor for GA. Potential to simplify: permission bubble (P2), Hub mobile viewer (P4), TL input (Task D improvement).

**Multi-device sync prerequisites** (P1-P2 sequenced):
1. P1: User identity model (Hub auth/JWT)
2. P1: SQLite session persistence (unblock user-scoped-storage plan, 20 tasks IN_PROGRESS)
3. P2: Hub auth integration
4. P3: Cross-device session sync (may be simplified by --channels GA)
5. P4: Mobile/web viewer

**Layout modes**: Stay in P1 for the plan after this one ships.

---

## Wave Execution Order

```
Wave 1 (parallel): A + B + C + D
  ↓
Wave 2 (parallel): E + F + G
  ↓
Wave 3: H  [after D, since AgentManagerService is touched by both]
  ↓
QA + Guardian → merge to master
```

---

## Estimated Effort

| Wave | Tasks | Human | CC+gstack |
|------|-------|-------|-----------|
| 1 | A, B, C, D | ~2 days | ~1.5 hrs |
| 2 | E, F, G | ~1.5 days | ~45 min |
| 3 | H | ~1 day | ~30 min |
| QA+merge | — | ~4 hrs | ~15 min |
| **Total** | **8 tasks** | **~4.5 days** | **~3 hrs** |

---

## Open Questions

1. Does `files.listTree` IPC channel already exist? Task C must verify before adding a duplicate.
2. Is `QaRunner.listSessions()` defined? Task B may need to add it to the interface.
3. gstack v0.15 release timeline? P2 gstack consumers should wait for confirmed GA.
4. Should `user-scoped-storage` (20 tasks, IN_PROGRESS) be the P1 identity layer for multi-device sync?
5. Does ADC have a Windows build target? If not, Task E can drop the Windows guard.
6. Is there a public changelog for `--channels` to track stability?
