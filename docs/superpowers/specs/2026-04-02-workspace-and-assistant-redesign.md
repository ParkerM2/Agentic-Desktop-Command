# Workspace & Assistant Redesign — Design Spec
**Date:** 2026-04-02  
**Status:** Approved for planning  
**Scope:** Two tightly related features sharing one implementation plan

---

## Problem Statement

The current Agents view shows an empty state until the user manually spawns a session. There is no persistent primary Claude conversation. The assistant widget has unnecessary complexity (intent classification, confirmation cards) for its use case. Together these gaps mean there is no "always-on" AI work surface — the core value proposition of the app.

---

## Feature 1 — Workspace (Always-On Claude Sessions)

### Vision
The `Agents` route (renamed **Workspace**) becomes the primary work area for each project. When a project is opened, two Claude sessions auto-spawn and persist for the lifetime of the app:

- **Primary Claude** — the developer's direct conversation interface. Handles status reports, quick commands, research questions, and directs work to the team lead.
- **Team Lead 1** — always ready to receive a plan file or a handoff from Primary Claude. Can spawn teammates to execute work.

Additional Team Leads can be spawned on-demand. All sessions are project-scoped (CWD = project path) and persist in the background when switching between project tabs. The view is purely state-based — switching projects changes what is rendered, not what is running.

### Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│  ADC  │ ● Component Library │ ○ syrnia-helpsite │ + │  [4 live] →  │  ← app bar + project tabs
├──────┬──────────────────────────────────┬────────────────────────────┤
│      │  PRIMARY  · ADC · sonnet-4-6  ●  │  TEAM LEAD 1 · ADC  ●     │
│  sb  │                                  │  Reading plan...          │
│  ar  │  "Give me a status report"       │  → Teammate A  ● running  │
│      │  Status: 3 tasks, 1 PR open...   │  → Teammate B  ⟳ scanning │
│      │                                  │  → Teammate C  ○ queued   │
│      │  "Hand off audit to team lead"   ├────────────────────────────┤
│      │  Passed roadmap-audit.md to TL1  │  TEAM LEAD 2 · ADC  ●     │
│      │                                  │  Ready for plan...        │
│      │  [Ask Claude or give command...] │  [Send to TL2...]         │
│      │                                  ├────────────────────────────┤
│      │                                  │  + Spawn Team Lead         │
└──────┴──────────────────────────────────┴────────────────────────────┘
       ← 55-60% width →                   ← 40-45% width, scrollable →
```

**Future extension (no rebuild required):** The view layer can add a split-panel mode rendering two project workspace columns side-by-side. Sessions already persist per-project; the view just renders two of them simultaneously.

### Session Architecture

**`WorkspaceSessionManager`** — new main-process service.

```typescript
interface SessionKey {
  projectId: string
  type: 'primary' | 'team-lead'
  index: number  // 0 = always-on TL1, 1+ = user-spawned
}

interface WorkspaceSession {
  key: SessionKey
  agentSessionId: string     // references existing AgentManager session
  projectPath: string
  model: string
  status: 'starting' | 'live' | 'crashed' | 'restarting'
  startedAt: number
  crashCount: number
}
```

**Lifecycle rules:**
- `primary` and `team-lead[0]` are **immortal** — auto-restart on crash, never terminated by user action
- `team-lead[1..N]` are **mortal** — user can stop them, not auto-restarted
- Teammates are spawned by team leads via existing mechanism
- `initProject(projectId, projectPath)` is called when a project tab is first opened
- Sessions are keyed by `projectId` — switching tabs never touches sessions

**New IPC channels:**
```
workspace.initProject     { projectId, projectPath }  →  { primarySessionId, teamLeadSessionId }
workspace.getSessions     { projectId }               →  WorkspaceSession[]
workspace.spawnTeamLead   { projectId, planPath? }    →  WorkspaceSession
workspace.stopTeamLead    { projectId, index }        →  { success }
workspace.sendMessage     { sessionId, message }      →  { success }  (proxy to agent-dashboard.sendMessage)

event:workspace.sessionReady    { projectId, sessionKey, sessionId }
event:workspace.sessionCrashed  { projectId, sessionKey, crashCount }
event:workspace.sessionRestarted { projectId, sessionKey, sessionId }
```

**Zod schemas** in `src/shared/ipc/workspace/contract.ts` (new domain).

### View Architecture

**`WorkspacePage`** — replaces `AgentDashboardPage` as the rendered component for the Agents route, or added as a new route `/workspace` with sidebar updated accordingly.

```typescript
// Store — purely view state, no session lifecycle
useWorkspaceStore = {
  // Which project's sessions are currently displayed
  viewingProjectId: string | null
  
  // Panel collapse state per team lead
  teamLeadCollapsed: Map<string, boolean>
  
  // Input draft per session
  inputDrafts: Map<string, string>
}
```

**React Query hooks:**
- `useWorkspaceSessions(projectId)` — polls `workspace.getSessions`, invalidates on `event:workspace.sessionReady/crashed/restarted`
- `useWorkspaceMessages(sessionId)` — reuses existing `useAgentSession` hook from agent-dashboard

### Sidebar Change
`Agents` → `Workspace` in the Development section sidebar label and icon. Route stays the same (`/:projectId/agents` or add `/:projectId/workspace`).

---

## Feature 2 — Assistant Widget Simplification

### Vision
The floating assistant widget stays but is stripped to its essential function: **fire-and-forget headless Claude commands**. No intent classification pipeline, no confirmation cards, no action routing. Type a command, Claude responds, done.

Use cases:
- "Create a task for X in this project"
- "Why did task Y fail the guardian check?"
- "Give me a status report for today"
- "Add a roadmap milestone for Z by end of month"

### What Gets Removed
- Intent classifier (regex fast-path + Claude CLI classification call)
- 17 executor modules (task, planner, notes, email, github, etc.)
- Quick action chips (New Note, New Task, Run Agent, Remind Me)
- Confirmation/preview cards
- Voice input toggle (or move to non-blocking background feature)
- `AssistantContext` with `activeProjectId`, `currentPage` enrichment complexity

### What Stays / Replaces It
- Floating FAB + panel (same position, same open/close behavior)
- Single input → direct Claude CLI subprocess call → streamed markdown response
- Response area with markdown rendering
- Clear history button
- The widget passes `cwd = activeProjectPath` so Claude has file context

### New `assistant-service.ts` shape
```typescript
// Before: sendCommand → classify intent → route to executor → response
// After:  sendCommand → claude --print -p "<message>" --cwd <projectPath> → stream response

async sendCommand(input: string, projectPath: string): Promise<void> {
  // Spawn claude CLI, stream output via event:assistant.response chunks
  // No intent, no routing, no confirmation
}
```

**IPC contracts simplified:**
- Keep: `assistant.sendCommand`, `event:assistant.response`, `event:assistant.thinking`
- Remove: `AssistantContext` fields except `projectPath`
- Remove: `AssistantActionSchema`, `IntentTypeSchema` (no longer needed)

---

## Feature 3 — Chrome Cleanup (Header Bar Consolidation)

### Problem
The content area currently stacks two horizontal bars before any content renders:
1. **Page title bar** (~44px): sidebar toggle icon + page name ("Agents", "Tasks", etc.)
2. **Project tabs bar** (~36px): Component Library | syrnia-helpsite | +

Total: **80px of chrome** before content. The page title bar is redundant — the active sidebar item already communicates location.

### Fix
**Remove the page title bar entirely.** Merge the sidebar toggle into the project tabs bar, which becomes the sole 36px top bar across all views. The active page label moves to a small right-aligned context indicator within the tabs bar (or is dropped entirely where the sidebar makes it clear).

```
BEFORE:
│ □  Agents                        │  ← 44px, redundant
│ ⊡ Component Library  ⊡ syrnia + │  ← 36px
│ content at 80px                  │

AFTER:
│ □  ● Component Library  ○ syrnia  +  [context]  │  ← 36px only
│ content at 36px                                  │
```

**Savings: 44px of usable vertical space on every view in the app.**

### Scope
- Remove the `PageHeader` / `ContentHeader` component from the root layout
- Move sidebar toggle button into the project tabs bar (leftmost slot)
- Any per-page action buttons (e.g. "New Task", "New Milestone") move into their respective page content headers, not the chrome bar — they already exist there
- Apply globally: all Development and Personal views get this cleanup automatically since it's in the shared layout

### Files to change
- `src/renderer/shared/layouts/` — remove page title bar from layout shell
- `src/renderer/shared/components/` — project tabs bar component gets sidebar toggle slot added

---

## What Is NOT Changing
- All project feature pages (Tasks, Roadmap, Ideation, GitHub, Changelog, Pipeline, Terminals) — untouched
- Personal section (Dashboard, My Work, Fitness, Productivity) — untouched
- Auth, Hub connection, settings — untouched
- Existing agent-dashboard IPC contracts — WorkspaceSessionManager delegates to AgentManager
- The project tab bar at the top — already works correctly for project switching

---

## Implementation Phases

### Phase 1 — WorkspaceSessionManager (main process)
1. New IPC domain: `src/shared/ipc/workspace/contract.ts` + schemas
2. New service: `src/main/services/workspace/workspace-session-manager.ts`
3. IPC handlers: `src/main/ipc/handlers/workspace-handlers.ts`
4. Bootstrap wiring: register service + handlers in main bootstrap
5. Auto-call `initProject` when project is opened (hook into project activation event)

### Phase 2 — Workspace UI
6. New store: `src/renderer/features/workspace/store.ts`
7. New React Query hooks: `src/renderer/features/workspace/api/useWorkspace.ts`
8. `WorkspacePage` component (replaces AgentDashboardPage)
9. `PrimarySessionPanel` — left panel, full chat + input
10. `TeamLeadPanel` — right panel card, collapsible, input, teammate list
11. Update sidebar label + route binding
12. Project tab switching wires to `viewingProjectId` (no session teardown)

### Phase 2b — Chrome Cleanup (can run parallel with Phase 2)
- Remove page title bar from shared layout shell
- Add sidebar toggle to project tabs bar component
- Verify all views render correctly without the title bar
- No new components — pure deletion + minor restructure

### Phase 3 — Assistant Widget Simplification
13. Strip `assistant-service.ts` to direct CLI invocation
14. Remove intent classifier, executors, MCP routing
15. Remove quick action chips from `WidgetPanel`
16. Update IPC schemas to remove unused fields
17. Test widget end-to-end with simplified service

### Phase 4 — Polish
18. Session crash recovery UX (show "restarting..." state in panel)
19. Spawn Team Lead button + optional plan file picker
20. Session status indicators in app bar (N live sessions)
21. `+ Spawn Team Lead` action in right panel footer

---

## Files Created / Modified (summary)

**New files:**
- `src/shared/ipc/workspace/contract.ts`
- `src/shared/ipc/workspace/schemas.ts`
- `src/main/services/workspace/workspace-session-manager.ts`
- `src/main/ipc/handlers/workspace-handlers.ts`
- `src/renderer/features/workspace/store.ts`
- `src/renderer/features/workspace/api/useWorkspace.ts`
- `src/renderer/features/workspace/components/WorkspacePage.tsx`
- `src/renderer/features/workspace/components/PrimarySessionPanel.tsx`
- `src/renderer/features/workspace/components/TeamLeadPanel.tsx`
- `src/renderer/features/workspace/components/TeamLeadPanelList.tsx`
- `src/renderer/features/workspace/index.ts`

**Modified files:**
- `src/shared/ipc/index.ts` — add workspace barrel
- `src/main/bootstrap.ts` — register WorkspaceSessionManager + handlers
- `src/main/services/assistant/assistant-service.ts` — strip to direct CLI
- `src/main/services/assistant/intent-classifier/` — delete directory
- `src/main/services/assistant/executors/` — delete directory (or keep for reference)
- `src/shared/ipc/assistant/schemas.ts` — remove intent/action types
- `src/renderer/features/assistant/components/WidgetPanel.tsx` — remove quick actions + confirmation cards
- `src/renderer/app/routes/` — add workspace route or remap agents route
- `src/renderer/shared/layouts/` — update sidebar Agents→Workspace label

---

## Success Criteria
- Opening a project auto-spawns Primary Claude + Team Lead 1 sessions within 3 seconds
- Switching project tabs does not terminate any session
- Primary Claude session accepts freeform input and streams responses
- Team Lead session can receive a plan file and spawn teammates
- Spawned teammates appear as live status cards in the right panel
- Sessions auto-restart after crash without user action (Primary + TL1 only)
- Assistant widget sends a command and receives a streamed response in under 5 seconds
- No confirmation cards or intent classification in the widget flow
- All above passes `npm run lint && npm run typecheck && npm run build`
