# Plan: Session Persistence & Always-On Claude Sessions

> **NOTE:** This plan predates the caching layer consolidation. References to `LayoutHydrator` and `ThemeHydrator` components are outdated -- these have been replaced by `useLayoutSync` and `useThemeSync` hooks in `src/renderer/shared/hooks/`. See `docs/patterns/CACHING-LAYER-QUICKGUIDE.md`.

## Summary

Persist open project tabs across app restarts, spawn per-project Claude sessions (Primary + Team Lead) eagerly at startup, and create a single global Assistant instance with IPC tool access for in-app actions (task CRUD, project management, git status). Tray quick commands route through the global assistant. The assistant uses app IPC channels exclusively — never Claude Code CLI features.

## Impact Analysis

| Layer | Impact |
|-------|--------|
| `src/shared/ipc/` | New `settings` fields for persisted layout; new assistant tool-execution event contract |
| `src/main/services/settings/` | Add `openProjectTabs` and `lastRoute` fields to settings |
| `src/main/services/assistant/` | **Rewrite** — single global instance, IPC tool system prompt, tool execution routing |
| `src/main/services/workspace/` | Add `initAllProjects()` for eager startup |
| `src/main/bootstrap/` | Wire eager workspace init after auth restore; wire assistant auto-start |
| `src/main/index.ts` | Route tray quick commands through assistant |
| `src/main/tray/` | Connect quick-input → assistant.sendCommand |
| `src/renderer/shared/stores/layout-store.ts` | Add localStorage persistence + hydration |
| `src/renderer/features/assistant/` | Update store/hooks to work with global assistant (no per-project session param) |
| `src/renderer/app/layouts/RootLayout.tsx` | Add layout hydration on auth success |

## Data Model Changes

### Settings Additions (persisted to `settings.json`)

```typescript
// Added to AppSettings
interface AppSettings {
  // ... existing fields
  openProjectTabs: string[];        // project IDs in tab order
  activeProjectId: string | null;   // last active project
  lastRoutePerProject: Record<string, string>; // projectId → route path
  sidebarCollapsed: boolean;
  sidebarLayout: SidebarLayoutId;
}
```

### Assistant System Prompt (IPC Tool Definitions)

The global assistant's system prompt will include structured tool definitions describing available IPC actions. When the assistant calls a tool, the main process intercepts the `tool_use` content block from the stream-json output and routes it to the appropriate IPC handler.

```typescript
// New type for assistant tool routing
interface AssistantToolCall {
  toolName: string;          // e.g. 'tasks.create'
  input: Record<string, unknown>;
}

interface AssistantToolResult {
  toolName: string;
  result: unknown;
  success: boolean;
}
```

### New IPC Channels

```typescript
// settings contract additions
'settings.getLayout': {
  input: z.object({}),
  output: z.object({
    openProjectTabs: z.array(z.string()),
    activeProjectId: z.string().nullable(),
    lastRoutePerProject: z.record(z.string(), z.string()),
    sidebarCollapsed: z.boolean(),
    sidebarLayout: z.string(),
  }),
}

'settings.saveLayout': {
  input: z.object({
    openProjectTabs: z.array(z.string()).optional(),
    activeProjectId: z.string().nullable().optional(),
    lastRoutePerProject: z.record(z.string(), z.string()).optional(),
    sidebarCollapsed: z.boolean().optional(),
    sidebarLayout: z.string().optional(),
  }),
  output: z.object({ success: z.boolean() }),
}
```

## Service Layer Changes

### 1. Settings Service — Layout Persistence

Add `openProjectTabs`, `activeProjectId`, `lastRoutePerProject`, `sidebarCollapsed`, and `sidebarLayout` to the settings file defaults. Provide `getLayout()` / `saveLayout()` convenience methods that read/write just the layout subset.

### 2. Assistant Service — Global Singleton Rewrite

**Current:** Per-project sessions in a Map keyed by projectPath.
**New:** Single global session spawned at app startup. Lives until app quit.

Key changes:
- Remove `projectSessions` Map → single `sessionId`
- System prompt includes all open projects' names/paths and IPC tool definitions
- On tool_use blocks in the stream-json output, intercept and route to IPC handlers
- Return tool results back to the Claude session via stdin message
- Tray quick-input sends commands to this same session

Tool routing flow:
```
User says "add task for ADC: clean up code"
  → assistant Claude session receives message
  → Claude outputs tool_use: { name: "tasks.create", input: { projectId: "...", title: "clean up code" } }
  → stream-json parser detects tool_use block
  → assistantService.handleToolCall() invokes tasks.create via the service layer
  → result sent back to Claude session as tool_result
  → Claude outputs text summary: "Created task 'clean up code' in ADC"
  → text forwarded to renderer as assistant response
```

### 3. Workspace Session Manager — Eager Init

Add `initAllProjects(projects: Array<{id: string, path: string}>)` method that calls `initProject()` for each open project tab. Called once after auth restore succeeds.

### 4. Tray Quick Input — Route Through Assistant

Change `onCommand` callback to send the command to `assistantService.sendCommand()` instead of a custom handler. The assistant processes it like any sidebar message.

## UI Changes

### Layout Store Persistence

The layout store (`layout-store.ts`) will:
1. On every state change → debounce and call `ipc('settings.saveLayout', ...)` to persist
2. On app startup (after auth) → call `ipc('settings.getLayout')` and hydrate the store
3. Clear layout state on logout

### Layout Hydrator Component

New `LayoutHydrator` component (similar pattern to `ThemeHydrator`):
- Mounted inside `AuthGuard`
- On mount: fetches layout from settings, hydrates layout store
- Triggers workspace session init for all persisted project tabs
- Navigates to last active project + last route

### Assistant Sidebar

Remove `projectPath` parameter from `sendCommand` — the global assistant already knows all projects. The sidebar input just sends text; the assistant figures out which project from context.

## Task Breakdown

### Task 1: Settings — Layout Persistence Fields
- **Agent:** service-engineer
- **Files:**
  - `src/shared/types/settings.ts` — add layout fields to AppSettings
  - `src/main/services/settings/settings-service.ts` — add defaults, getLayout/saveLayout methods
  - `src/shared/ipc/settings/contract.ts` — add getLayout/saveLayout channels
  - `src/shared/ipc/settings/schemas.ts` — add layout schemas
  - `src/main/ipc/handlers/settings-handlers.ts` — add handler wiring
- **Depends on:** none
- **Acceptance criteria:**
  - [ ] `settings.getLayout` returns layout state from settings.json
  - [ ] `settings.saveLayout` persists layout state to settings.json
  - [ ] Default values work when no layout has been saved yet
  - [ ] Layout fields merge cleanly with existing settings

### Task 2: Layout Store — Persistence & Hydration
- **Agent:** store-engineer
- **Files:**
  - `src/renderer/shared/stores/layout-store.ts` — add debounced persistence to settings
  - `src/renderer/shared/stores/LayoutHydrator.tsx` — new component (mirrors ThemeHydrator pattern)
  - `src/renderer/shared/stores/index.ts` — export LayoutHydrator
  - `src/renderer/app/layouts/RootLayout.tsx` — mount LayoutHydrator
- **Depends on:** Task 1
- **Acceptance criteria:**
  - [ ] On app restart, project tabs restored from settings
  - [ ] Active project and sidebar state restored
  - [ ] Last route per project restored (navigates to correct view)
  - [ ] Logout clears persisted layout
  - [ ] Debounced save (not on every keystroke)

### Task 3: Eager Workspace Session Init
- **Agent:** service-engineer
- **Files:**
  - `src/main/services/workspace/workspace-session-manager.ts` — add `initAllProjects()` method
  - `src/main/bootstrap/service-registry.ts` — wire eager init after service creation
  - `src/main/ipc/handlers/workspace-handlers.ts` — add initAll handler
  - `src/shared/ipc/workspace/contract.ts` — add `workspace.initAllProjects` channel
- **Depends on:** Task 1 (needs to read persisted project tabs)
- **Acceptance criteria:**
  - [ ] On app startup, all persisted project tabs get Primary + Team Lead sessions
  - [ ] Sessions spawn after auth restore succeeds (not before)
  - [ ] Idempotent — re-calling doesn't duplicate sessions
  - [ ] Sessions survive project tab switches (no teardown)
  - [ ] Sessions only terminate on app quit

### Task 4: Global Assistant — Single Instance Rewrite
- **Agent:** service-engineer
- **Files:**
  - `src/main/services/assistant/assistant-service.ts` — rewrite to single global session
  - `src/main/services/assistant/assistant-tools.ts` — new: tool definitions and routing
  - `src/main/services/assistant/tool-definitions.ts` — new: system prompt tool descriptions
  - `src/main/bootstrap/service-registry.ts` — start assistant at boot, not lazily
- **Depends on:** Task 1 (needs project list for system prompt)
- **Acceptance criteria:**
  - [ ] Single Claude session spawned at app startup
  - [ ] Session lives until app quit
  - [ ] System prompt includes available IPC tools (tasks, projects, git)
  - [ ] System prompt includes list of open projects with names/paths
  - [ ] tool_use blocks in stream output are intercepted and routed to services
  - [ ] tool_result returned to Claude session
  - [ ] Text responses forwarded to renderer as before

### Task 5: Assistant Tool Routing — Task CRUD
- **Agent:** service-engineer
- **Files:**
  - `src/main/services/assistant/tool-handlers/task-tools.ts` — new: task tool implementations
  - `src/main/services/assistant/assistant-tools.ts` — register task tools
- **Depends on:** Task 4
- **Acceptance criteria:**
  - [ ] "add task for ADC: clean up code" creates a task via `tasks.create` IPC
  - [ ] "list tasks for ADC" returns task list
  - [ ] "update task X status to done" calls `tasks.updateStatus`
  - [ ] "delete task X" calls `tasks.delete`
  - [ ] Created tasks appear in the Tasks page table without refresh

### Task 6: Assistant Tool Routing — Project & Git Tools
- **Agent:** service-engineer
- **Files:**
  - `src/main/services/assistant/tool-handlers/project-tools.ts` — new: project tool implementations
  - `src/main/services/assistant/tool-handlers/git-tools.ts` — new: git tool implementations
  - `src/main/services/assistant/assistant-tools.ts` — register project + git tools
- **Depends on:** Task 4
- **Acceptance criteria:**
  - [ ] "list projects" returns project list
  - [ ] "switch to project X" sets active project
  - [ ] "git status for ADC" returns branch + changed files
  - [ ] "show open PRs" returns PR list from GitHub

### Task 7: Tray Quick Command → Assistant
- **Agent:** service-engineer
- **Files:**
  - `src/main/index.ts` — change tray onQuickCommand to route through assistant
  - `src/main/tray/quick-input.ts` — send command to assistant, show response in popup
- **Depends on:** Task 4
- **Acceptance criteria:**
  - [ ] Tray quick command input sends text to global assistant
  - [ ] Assistant response shown in quick input popup (or main window)
  - [ ] Same tool routing works from tray as from sidebar

### Task 8: Renderer Assistant Updates
- **Agent:** component-engineer
- **Files:**
  - `src/renderer/features/assistant/components/SidebarAssistantButton.tsx` — remove projectPath from sendCommand
  - `src/renderer/features/assistant/components/WidgetPanel.tsx` — remove project path logic
  - `src/renderer/features/assistant/api/useAssistant.ts` — simplify sendCommand mutation (no projectPath)
  - `src/renderer/features/assistant/hooks/useAssistantEvents.ts` — handle tool execution events (invalidate query caches)
  - `src/shared/ipc/assistant/contract.ts` — update sendCommand input (remove projectPath), keep toolExecuted event
- **Depends on:** Task 4
- **Acceptance criteria:**
  - [ ] Sidebar assistant sends messages without specifying a project
  - [ ] Tool execution events invalidate relevant React Query caches
  - [ ] Creating a task via assistant → task list auto-refreshes
  - [ ] No projectPath in assistant IPC contract

### Task 9: Assistant Input UX — Project Selector & Quick Actions
- **Agent:** component-engineer
- **Files:**
  - `src/renderer/features/assistant/components/AssistantInputBar.tsx` — new shared input component used by sidebar inline, popup panel, and tray
  - `src/renderer/features/assistant/components/ProjectSelector.tsx` — new: dropdown showing active projects with colored dot indicators
  - `src/renderer/features/assistant/components/QuickActionChips.tsx` — new: flex-wrap row of quick action buttons
  - `src/renderer/features/assistant/components/SidebarAssistantButton.tsx` — use AssistantInputBar
  - `src/renderer/features/assistant/components/WidgetPanel.tsx` — use AssistantInputBar
  - `src/renderer/features/assistant/components/WidgetInput.tsx` — replace with AssistantInputBar
  - `src/main/tray/quick-input.ts` — add project dropdown + action chips to inline HTML
- **Depends on:** Task 8
- **Acceptance criteria:**
  - [ ] Dropdown icon next to input shows list of active/open projects
  - [ ] Selecting a project prefixes the command with project context (e.g. "@ADC")
  - [ ] Default selection = currently active project in tab bar
  - [ ] Quick action chips below input: `+ Task`, `+ Todo`, `Status`, `Git Status`, `PRs`, `Briefing`
  - [ ] Clicking a chip pre-fills the input with a template (e.g. "+ Task" → "add task for {project}: ")
  - [ ] Chips wrap to multiple rows on narrow sidebar
  - [ ] Works in sidebar inline mode, popup panel, and tray quick-input
  - [ ] Project dropdown uses StatusIndicator to show session health (green=live, yellow=starting)

#### UI Design

**Sidebar inline (expanded) layout:**
```
┌─────────────────────────┐
│ 🗨 Assistant    [⤢] [✕] │
├─────────────────────────┤
│  (message area)         │
├─────────────────────────┤
│ [▾ ADC] [Ask anything…] │
│ +Task  +Todo  Status  …│
└─────────────────────────┘
```

**Popup panel layout:**
```
┌──────────────────────────────────┐
│  Assistant        [🔊] [🗑] [✕]  │
├──────────────────────────────────┤
│  (message area)                  │
├──────────────────────────────────┤
│ +Task  +Todo  Status  Git  PRs  │
│ [▾ ADC] [Ask anything…      ] ↑ │
└──────────────────────────────────┘
```

**Tray quick-input layout:**
```
┌──────────────────────────────────────┐
│ [▾ ADC] [Quick command…          ] ↵ │
│ +Task  +Todo  Status  Git  PRs       │
└──────────────────────────────────────┘
```

#### Quick Action Chips

| Chip | Prefill Template | Tool Routed To |
|------|-----------------|----------------|
| `+ Task` | `add task for {project}: ` | `tasks.create` |
| `+ Todo` | `add todo for {project}: ` | `tasks.create` (priority=low) |
| `Status` | `status of {project}` | `git.status` + `tasks.list` |
| `Git` | `git status for {project}` | `git.status` |
| `PRs` | `open PRs for {project}` | `github.listPrs` |
| `Briefing` | `briefing for {project}` | `briefing.generate` |

### Task 10: Documentation
- **Agent:** docs
- **Files:**
  - `docs/architecture/ARCHITECTURE.md` — update assistant section
  - `docs/routing/FEATURES-INDEX.md` — update assistant, workspace entries
  - `.claude/agents/` — update relevant agent definitions
- **Depends on:** Tasks 1–9
- **Acceptance criteria:**
  - [ ] Architecture doc reflects global assistant + tool routing
  - [ ] Features index updated
  - [ ] Agent definitions updated

## Wave Plan

```
Wave 1 (parallel):
  Task 1 — Settings layout persistence (no deps)

Wave 2 (parallel after Wave 1):
  Task 2 — Layout store persistence & hydration
  Task 3 — Eager workspace session init
  Task 4 — Global assistant rewrite

Wave 3 (parallel after Wave 2):
  Task 5 — Assistant task tools
  Task 6 — Assistant project + git tools
  Task 7 — Tray quick command routing
  Task 8 — Renderer assistant updates

Wave 4 (after Wave 3):
  Task 9 — Assistant input UX (project selector + quick actions)

Wave 5:
  Task 10 — Documentation
```

## Testing Strategy

### Unit Tests
- Settings getLayout/saveLayout round-trip
- Layout store persistence debouncing
- Assistant tool routing (mock IPC handlers)
- Tool definition schema validation

### Integration Tests
- Settings IPC handler → settings file → read back
- Assistant tool_use → service call → tool_result flow

### Manual Verification
- [ ] Close app → reopen → same project tabs, same active project, same route
- [ ] Open sidebar assistant → "add task for ADC: test task" → task appears in table
- [ ] Tray icon → Quick Command → "list tasks" → see response
- [ ] Kill app via tray Quit → all sessions terminate cleanly
- [ ] Logout → re-login → layout restored (same user)
- [ ] Switch users → layout is per-user (different tabs)
- [ ] Project dropdown in assistant input shows all open projects
- [ ] Selecting a project from dropdown changes command context
- [ ] Quick action chips pre-fill input with correct template
- [ ] "+ Task" chip → type title → creates task in selected project
- [ ] Chips work in sidebar inline, popup panel, and tray quick-input

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Claude CLI tool_use interception is complex | Start with a minimal tool set (3-4 tools), validate the stream-json parsing before expanding |
| Eager session spawn = many Claude processes at startup | Rate-limit spawning (100ms delay between projects), cap at 5 concurrent project sessions |
| Stale persisted state (deleted project) | Validate project IDs against `projects.list` during hydration, drop invalid ones |
| Settings file corruption | Use atomic write (write to .tmp then rename), same pattern as existing settings service |
| Assistant tool execution races with UI | Emit `event:assistant.toolExecuted` with query key hints so renderer can invalidate caches |
