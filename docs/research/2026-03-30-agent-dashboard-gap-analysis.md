# Agent Dashboard Gap Analysis — Post-Implementation Research

**Author**: /deep-research
**Date**: 2026-03-30
**Status**: SUPERSEDED — see adc-fix-first merge (2026-04-01)
**Feature**: `agent-dashboard-view` (P0 ADC v2 refactor)
**Branch**: `feature/agent-dashboard-view`
**Research question**: What gaps, TODOs, cleanup items, and remaining features exist after the initial agent-dashboard-view implementation?

> **Update 2026-04-01**: All P0 items from §7 have been resolved by the `adc-fix-first` merge:
> - ✅ Route wiring fixed (`AgentDashboardPage` from `@features/agent-dashboard`)
> - ✅ `spawnTeamLead` wired to real `TmuxBridge.createSession()` with typed error union
> - ✅ `getFilesChanged` wired to `GitService.getFilesChanged()`
> - ✅ `listQaSessions` wired to `QaRunner.listSessions()` mapped through `mapQaSessionToDashboard`
> - ✅ File explorer wired to real IPC (`files.listTree` + `FileTreeService`)
> - ✅ Process group kill (detached spawn + negative PID), stdin writable guard
> - ✅ Set-based listeners + `offTaskUpdated()` + `watchFeature` missing-dir retry
> - ✅ `AgentConnectionStrategy` interface + `SubprocessStrategy` + UDS/MCP stubs
> Remaining gaps from §4 (layout modes, sidebar features, Phase 8 tracking events) are tracked as future P1/P2 work.

---

## Executive Summary

The initial implementation delivered **6,354 lines across 66 files** covering all 10 planned phases (0-9) at varying depths. The core data layer (types, IPC contracts, services) is solid. The UI layer has all major components but is missing several layout modes and features from the plan doc. The main gaps are: (1) Team Lead tmux integration is stubbed, (2) only 2 of 5 layout modes built, (3) several plan-doc UI features not yet implemented, (4) 5 packages from the research doc are not installed, and (5) the file-explorer uses placeholder data instead of real IPC.

---

## 1. Phase Completion Assessment

Cross-referencing `docs/research/2026-03-30-headless-agent-architecture.md` implementation phases against actual code:

| Phase | Description | Status | Evidence |
|-------|-------------|--------|----------|
| 0 | Verify session JSONL format, test Agent Teams in tmux | DONE (pre-existing) | Confirmed in research doc |
| 1 | AgentManager + stream-json parsing | **COMPLETE** | `src/main/services/agent-manager/` — 4 files, 955 lines. Full `stream-json` spawn, NDJSON parser, process lifecycle |
| 2 | TmuxBridge + TeamWatcher | **PARTIAL** | `src/main/services/tmux-bridge/` (3 files), `src/main/services/team-watcher/` (2 files) built. But AgentManager.spawnTeamLead() is **stubbed** — returns a fake session, doesn't actually call TmuxBridge |
| 3 | SessionJSONLReader | **COMPLETE** | `src/main/services/session-jsonl/` — 3 files. Tail-follow with offset tracking, debounced fs.watch |
| 4 | AgentChatPanel renderer | **COMPLETE** | 12 component files + store + hooks + api = 20 files, 2,147 lines |
| 5 | react-arborist file explorer | **COMPLETE** | `src/renderer/features/file-explorer/` — 7 files. Uses placeholder data (TODO: wire to IPC) |
| 6 | @git-diff-view/react diff viewer | **COMPLETE** | `src/renderer/features/diff-viewer/` — 6 files. Reuses existing merge IPC channels |
| 7 | Wire ProgressWatcher to dashboard | **NOT STARTED** | No AgentTicketCorrelator or DashboardAggregator services exist |
| 8 | claude-workflow tracking events | **NOT STARTED** | No changes to the workflow plugin's event schema |
| 9 | QA pipeline integration | **NOT STARTED** | Blocked on Phase 7 |

**Summary**: Phases 1, 3-6 complete. Phase 2 partial (stub). Phases 7-9 not started.

---

## 2. TODOs and Stubs Found

| Location | Content | Priority |
|----------|---------|----------|
| `src/renderer/features/file-explorer/api/useFileTree.ts:117` | `// TODO: Replace with IPC call when backend service is ready` — uses hardcoded placeholder tree data | HIGH — file explorer shows fake data |
| `src/main/services/agent-manager/agent-manager-service.ts:74` | `Spawn a tmux-based Team Lead session (Phase 2 — stub)` | HIGH — team lead spawn returns mock session |
| `src/main/services/agent-manager/agent-manager-service.ts:341` | `Phase 2 stub — Team Lead requires TmuxBridge (task-5)` | HIGH — same as above |
| `src/main/services/agent-manager/agent-manager-service.ts:361` | `Team Lead session created (stub): TmuxBridge pending` | HIGH — log message confirms stub |
| `src/main/ipc/handlers/agent-dashboard-handlers.ts:59` | `getFilesChanged` returns `Promise.resolve([])` — hardcoded empty array | MEDIUM — no git diff data flows to UI |

**No FIXME or HACK markers found** — code is clean of technical debt markers.

---

## 3. Codebase Cleanup Items

### 3.1 Type System Reconciliation

The chat panel agent created its own type definitions that partially overlap with the schema-designer's canonical types. The type-fix agent reconciled them, but residual complexity exists:

| Issue | Location | Severity |
|-------|----------|----------|
| `AgentChatMessage` (IPC layer) vs `AgentChatItem` (component layer) — two different shapes for the same concept | `src/shared/types/agent-dashboard.ts` | LOW — intentional split but adds cognitive overhead |
| `AgentStatus` vs `AgentStatusUi` — UI adds `'attention'` value not in IPC | Same file | LOW — documented, but could unify |
| `FileChange` vs `AgentFileChange` — two names for file change data | Same file | LOW — alias exists, could consolidate |
| `AgentTokenUsage` (IPC: `{ input, output }`) vs `AgentTokenUsageUi` (UI: `{ inputTokens, outputTokens, estimatedCost }`) | Same file | MEDIUM — two incompatible shapes |

### 3.2 Structural Issues

| Issue | Location | Severity |
|-------|----------|----------|
| `agent-dashboard-handlers.ts` `TeamWatcherService` interface defined locally instead of imported from service module | `src/main/ipc/handlers/agent-dashboard-handlers.ts:19` | LOW — works but could drift from real service |
| `getFilesChanged` IPC handler returns empty array — contract says `FileChange[]` but no service method provides this | Same file, line 59 | MEDIUM — dead channel |
| `ipc-contract.ts` has extra re-exports added by hooks agent that may duplicate `src/shared/ipc/index.ts` barrel | `src/shared/ipc-contract.ts` | LOW — backward-compat file, verify no duplication |
| `agents/` symlink directory at repo root created as workaround for init-gate hook bug | `agents/team-leader.md` | LOW — should be cleaned up, add to .gitignore |

### 3.3 Missing Barrel Exports

The `src/renderer/features/agent-dashboard/index.ts` barrel exists but may not export all components. The integration agent wired routing to `@features/agents` (the existing agents feature) rather than `@features/agent-dashboard` (the new feature). This needs verification — the route may point to the old agent feature, not the new dashboard.

---

## 4. Remaining UI Features (Plan Doc vs Implementation)

Cross-referencing `docs/features/agent-dashboard-view/plan.md` against actual components:

### 4.1 Layout Modes

| Layout | Status | Files |
|--------|--------|-------|
| Single (main 60% + agents 40%) | **BUILT** | `AgentLayoutSingle.tsx` |
| Grid (equal cells, auto-wrap) | **BUILT** | `AgentLayoutGrid.tsx` |
| Two-Column (main + lead side-by-side) | **NOT BUILT** | Plan doc specifies equal-width columns with agent cards below |
| Three-Column (main + lead + selected agent) | **NOT BUILT** | Plan doc specifies third column for expanded selected agent |
| Multi-Project (vertical project stacks) | **NOT BUILT** | Plan doc specifies per-project rows with horizontal scrolling |

### 4.2 Panel Features

| Feature | Status | Notes |
|---------|--------|-------|
| Compact panel (~120px) | **BUILT** | `AgentPanelCompact.tsx` |
| Expanded panel (in-place with tabs) | **BUILT** | `AgentPanelExpanded.tsx` |
| Popup modal (full dialog) | **BUILT** | `AgentPanelPopup.tsx` |
| Chat tab | **BUILT** | `AgentChatPanel.tsx` |
| Tasks tab (workflow phases) | **NOT BUILT** | Plan doc specifies checklist view of agent workflow phases |
| Files Changed tab | **BUILT** (in expanded/popup) | Shows list but diff viewer not wired inline |
| Errors tab | **BUILT** (in expanded/popup) | Filtered error/warning view |
| Terminal tab (escape hatch) | **NOT BUILT** | Plan doc specifies ghostty-web or xterm.js raw terminal |

### 4.3 Chat Message Components

| Component | Status | Notes |
|-----------|--------|-------|
| Text messages (markdown) | **BUILT** | `TextMessage.tsx` with react-markdown |
| User messages | **BUILT** | `UserMessage.tsx` |
| ToolCallCard — Read | **BUILT** | Collapsible file read card |
| ToolCallCard — Edit | **BUILT** | With inline diff preview |
| ToolCallCard — Bash | **BUILT** | Command + output + exit code |
| ToolCallCard — Write | **BUILT** | New file indicator |
| ToolCallCard — Agent Spawn | **BUILT** | Team lead agent spawn card |
| Slash command palette | **NOT BUILT** | Plan doc specifies `/` trigger for command list |
| "Send to Team Lead" button | **NOT BUILT** | Plan doc specifies one-click plan forwarding |
| Plan output card | **NOT BUILT** | Structured rendering of `/new-plan` results |

### 4.4 Sidebar Integration

| Feature | Status | Notes |
|---------|--------|-------|
| "Agents" nav item in sidebar | **BUILT** | Added by integration agent |
| Agent quick-list with status dots | **NOT BUILT** | Plan doc specifies sidebar agent list (●/◆/○ dots) |
| Task quick-view in sidebar | **NOT BUILT** | Plan doc specifies ticket/task checklist |
| File tree (react-arborist) in sidebar | **BUILT** (standalone) | Component exists but not wired to sidebar |
| Git changes panel in sidebar | **NOT BUILT** | Plan doc specifies click-for-diff sidebar section |

### 4.5 Other Missing Features

| Feature | Status | Notes |
|---------|--------|-------|
| Responsive breakpoints | **NOT IMPLEMENTED** | Plan doc specifies layout changes at 1024/1440/1920px |
| Agent count badge on sidebar | **NOT BUILT** | Plan doc specifies running agent count badge |
| Input box at bottom of panels | **PARTIAL** | Popup has input box, compact/expanded may not |
| Auto-scroll to latest message | **BUILT** | In AgentChatPanel |
| Token-level streaming | **BUILT** | `useAgentStream.ts` with RAF debouncing |

---

## 5. Package Audit

### Installed and Used

| Package | Installed | Used In |
|---------|-----------|---------|
| `react-arborist` | ✓ | `file-explorer/FileExplorer.tsx` |
| `@git-diff-view/react` | ✓ | `diff-viewer/DiffViewer.tsx` |
| `@git-diff-view/core` | ✓ | Peer dep of above |
| `react-markdown` | ✓ | `TextMessage.tsx` |
| `remark-gfm` | ✓ | `TextMessage.tsx` |
| `react-syntax-highlighter` | ✓ | `TextMessage.tsx`, `ToolCallCard.tsx` |

### Not Installed — Still Needed

| Package | Purpose | When Needed |
|---------|---------|-------------|
| `@llm-ui/react` + `@llm-ui/markdown` | Smooth LLM streaming at native frame rate | Phase 4 enhancement — current react-markdown works but @llm-ui would give smoother character-by-character rendering |
| `@assistant-ui/react` | Composable chat UI primitives, auto-scroll | Optional — current custom implementation works |
| `ghostty-web` | Terminal escape hatch tab (Ghostty→WASM) | When Terminal tab is built |
| `ansi-to-react` | ANSI fallback rendering | Only if raw terminal output needs rendering |

### Assessment

The current implementation uses `react-markdown` + `react-syntax-highlighter` instead of `@llm-ui/react` for message rendering. This works but lacks the smooth character-by-character streaming that `@llm-ui/react` provides. The `useAgentStream.ts` hook implements RAF-based debouncing which partially compensates.

`@assistant-ui/react` was planned for chat primitives but the components were built custom. This is fine — the custom implementation follows the project's patterns and avoids an extra dependency.

`ghostty-web` is only needed when the Terminal escape hatch tab is implemented. Not urgent.

---

## 6. QA Findings — Resolution Status

From the QA reviewer's report:

| Issue | Severity | Status | Resolution |
|-------|----------|--------|------------|
| #1 — Duplicate `AgentManagerService` import in ipc/index.ts | CRITICAL | **FIXED** | Removed duplicate import |
| #2 — Duplicate `agentManagerService` in Services interface | CRITICAL | **FIXED** | Removed duplicate property |
| #3 — service-registry double `agentManagerService` (null override) | CRITICAL | **FIXED** | Removed null override line |
| #4 — Handler defines local `TeamWatcherService` instead of importing | MAJOR | **PARTIALLY FIXED** | Local interface still exists but signature was corrected. Full fix: import from service module |
| #5 — Double event emission (handler + service both emit) | MAJOR | **FIXED** | Removed `agentManager.onEvent()` block from handler. Events emitted by service directly |
| #6 — TODO without task reference in file-explorer | MINOR | **OPEN** | Still says `// TODO: Replace with IPC call when backend service is ready` |
| #7 — Non-existent IPC event channels in file-explorer hooks | MINOR | **OPEN** | `event:project.updated` and `event:git.worktreeChanged` may not exist in IPC contracts |

---

## 7. Recommended Next Steps (Priority Order)

### P0 — Critical (Wire real functionality)

1. **Wire Team Lead spawn to TmuxBridge** — Remove stub in `agent-manager-service.ts`, call `tmuxBridgeService.createSession()` with agent teams env var
2. **Wire `getFilesChanged` handler** — Implement via `gitService.getFilesChanged(branch)` instead of returning empty array
3. **Wire file-explorer to real IPC** — Replace placeholder data in `useFileTree.ts` with actual `ipc('files.listTree', ...)` call
4. **Verify route wiring** — Confirm `/agents` route points to `agent-dashboard/AgentDashboardPage`, not the old `agents` feature

### P1 — High (Missing plan-doc features)

5. **Build Two-Column layout** — `AgentLayoutTwoColumn.tsx`
6. **Build Three-Column layout** — `AgentLayoutThreeColumn.tsx`
7. **Build Tasks tab** — Workflow phase checklist view in expanded/popup panels
8. **Add sidebar agent quick-list** — Status dots for running agents
9. **Add responsive layout breakpoints** — Auto-select layout by window width
10. **Install + integrate @llm-ui/react** — Replace react-markdown for streaming messages

### P2 — Medium (Phase 7-9 work)

11. **Build AgentTicketCorrelator** — Match agent teams to ticket IDs (Layer 3)
12. **Build DashboardAggregator** — Merge agent status + workflow progress
13. **Wire ProgressWatcher to dashboard** — Phase 7
14. **Flesh out claude-workflow tracking events** — Phase 8
15. **QA pipeline integration** — Phase 9

### P3 — Low (Nice-to-have)

16. **Terminal escape hatch tab** — Install ghostty-web, add to popup
17. **Multi-Project layout** — Vertical project stacks
18. **Slash command palette** — `/` trigger in input box
19. **"Send to Team Lead" button** — One-click plan forwarding
20. **Plan output card** — Structured `/new-plan` rendering
21. **Sidebar git changes panel** — Click-for-diff section

---

## 8. Implementation Statistics

| Metric | Value |
|--------|-------|
| Total new files | 66 |
| Total lines added | 6,354 |
| New types defined | ~35 interfaces + type aliases |
| New IPC channels | 7 invoke + 7 event = 14 |
| New services | 4 (AgentManager, TmuxBridge, TeamWatcher, SessionJSONLReader) |
| New renderer features | 3 (agent-dashboard, file-explorer, diff-viewer) |
| New React components | 12 (agent-dashboard) + 2 (file-explorer) + 2 (diff-viewer) = 16 |
| Agent waves executed | 4 waves + 1 QA + 1 type-fix = 12 agents total |
| Merge conflicts resolved | 3 (types file reconciliation) |
| QA issues found | 7 (5 fixed, 2 open minor) |

---

## Sources

| # | Source | Type | Contribution |
|---|--------|------|-------------|
| 1 | `docs/research/2026-03-30-headless-agent-architecture.md` | Internal design doc | Phase definitions, service architecture, data flow |
| 2 | `docs/features/agent-dashboard-view/plan.md` | Internal UI spec | Layout modes, panel states, component requirements |
| 3 | QA reviewer report (agent-af1e9eea) | Internal QA | 7 issues identified, severity assessment |
| 4 | `git diff master --stat` | Git | Actual implementation scope (66 files, 6354 lines) |
| 5 | `npm run typecheck` output | Build tool | Type compatibility verification |
| 6 | `package.json` dependency audit | Package manifest | Installed vs needed packages |
