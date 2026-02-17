# AI Agent Routing Index

> End-to-end file routing for every domain in ADC.
> Agents: scan Section 1 for fast lookup, then drill into Section 2 for full vertical slices.

---

## 1. Quick Lookup Table

Each row traces a domain from shared types through to the rendered route.

**IPC Contract column key:**
- `ipc/<domain>/` = dedicated domain folder under `src/shared/ipc/`
- `ipc/misc/<name>.contract.ts` = sub-contract inside the `misc` catch-all folder

| Domain | Types | IPC Contract | Service | Handler | Feature Module | Route Group |
|--------|-------|-------------|---------|---------|----------------|-------------|
| agents | `types/agent.ts` | `ipc/agents/` | `services/agent/` | `handlers/agent-handlers.ts` | `features/agents/` | `project.routes.ts` |
| agent-orchestrator | `types/agent.ts` | `ipc/agents/` (shared) | `services/agent-orchestrator/` | `handlers/agent-orchestrator-handlers.ts` | `features/tasks/` (hooks) | `project.routes.ts` |
| alerts | `types/alert.ts` | `ipc/misc/alerts.contract.ts` | `services/alerts/` | `handlers/alert-handlers.ts` | `features/alerts/` | `productivity.routes.ts` |
| app | -- | `ipc/app/` | `services/app/` | `handlers/app-handlers.ts`, `app-update-handlers.ts` | `features/onboarding/` | -- |
| assistant | `types/assistant.ts`, `types/assistant-watch.ts` | `ipc/assistant/` | `services/assistant/` | `handlers/assistant-handlers.ts` | `features/assistant/` | -- (widget) |
| auth | `types/auth.ts` | `ipc/auth/` | `services/hub/hub-auth-service.ts` | `handlers/auth-handlers.ts` | `features/auth/` | `auth.routes.tsx` |
| briefing | `types/briefing.ts` | `ipc/briefing/` | `services/briefing/` | `handlers/briefing-handlers.ts` | `features/briefing/` | `misc.routes.ts` |
| calendar | -- | `ipc/misc/calendar.contract.ts` | `services/calendar/` | `handlers/calendar-handlers.ts` | `features/productivity/` | `productivity.routes.ts` |
| changelog | `types/changelog.ts` | `ipc/misc/changelog.contract.ts` | `services/changelog/` | `handlers/changelog-handlers.ts` | `features/changelog/` | `project.routes.ts` |
| claude | `types/claude.ts` | `ipc/claude/` | `services/claude/` | `handlers/claude-handlers.ts` | `features/assistant/` (shared) | -- |
| communications | `types/notifications.ts` | -- (MCP tools) | `services/notifications/` | `handlers/notification-handlers.ts` | `features/communications/` | `communication.routes.ts` |
| dashboard | -- | -- (aggregates multiple) | -- (aggregates multiple) | -- | `features/dashboard/` | `dashboard.routes.ts` |
| devices | `types/hub/devices.ts` | `ipc/misc/devices.contract.ts` | `services/device/` | `handlers/device-handlers.ts` | `features/devices/` | -- |
| email | `types/email.ts` | `ipc/email/` | `services/email/` | `handlers/email-handlers.ts` | `features/communications/` (shared) | `communication.routes.ts` |
| fitness | `types/fitness.ts` | `ipc/fitness/` | `services/fitness/` | `handlers/fitness-handlers.ts` | `features/fitness/` | `misc.routes.ts` |
| git | `types/git.ts` | `ipc/git/` | `services/git/` | `handlers/git-handlers.ts` | `features/projects/` (`useGit`) | `project.routes.ts` |
| github | `types/github.ts` | `ipc/github/` | `services/github/` | `handlers/github-handlers.ts` | `features/github/` | `project.routes.ts` |
| hotkeys | -- | `ipc/misc/hotkeys.contract.ts` | -- (tray service) | `handlers/hotkey-handlers.ts` | -- | -- |
| hub | `types/hub-protocol.ts`, `types/hub/` | `ipc/hub/` | `services/hub/` | `handlers/hub-handlers.ts` | `features/settings/` (HubSettings) | `settings.routes.ts` |
| ideation | `types/idea.ts` | `ipc/misc/ideas.contract.ts` | `services/ideas/` | `handlers/ideas-handlers.ts` | `features/ideation/` | `project.routes.ts` |
| insights | `types/insights.ts` | `ipc/misc/insights.contract.ts` | `services/insights/` | `handlers/insights-handlers.ts` | `features/insights/` | `project.routes.ts` |
| mcp | -- | `ipc/misc/mcp.contract.ts` | `main/mcp/` | `handlers/mcp-handlers.ts` | `features/communications/` | -- |
| merge | -- | `ipc/misc/merge.contract.ts` | `services/merge/` | `handlers/merge-handlers.ts` | `features/merge/` | -- |
| milestones | `types/milestone.ts` | `ipc/misc/milestones.contract.ts` | `services/milestones/` | `handlers/milestones-handlers.ts` | `features/roadmap/` | `project.routes.ts` |
| my-work | -- | -- (uses `tasks.*`) | -- | -- | `features/my-work/` | `dashboard.routes.ts` |
| notes | `types/note.ts` | `ipc/misc/notes.contract.ts` | `services/notes/` | `handlers/notes-handlers.ts` | `features/notes/` | `productivity.routes.ts` |
| notifications | `types/notifications.ts` | `ipc/notifications/` | `services/notifications/` | `handlers/notification-handlers.ts` | `features/communications/` | `communication.routes.ts` |
| onboarding | -- | -- (uses `app.*`, `settings.*`) | -- | -- | `features/onboarding/` | -- (wizard modal) |
| planner | `types/planner.ts` | `ipc/planner/` | `services/planner/` | `handlers/planner-handlers.ts` | `features/planner/` | `productivity.routes.ts` |
| productivity | -- | -- (aggregates calendar + spotify) | -- | -- | `features/productivity/` | `productivity.routes.ts` |
| projects | `types/project.ts` | `ipc/projects/` | `services/project/` | `handlers/project-handlers.ts` | `features/projects/` | `project.routes.ts` |
| qa | -- | `ipc/qa/` | `services/qa/` | `handlers/qa-handlers.ts` | `features/tasks/` (`useQaMutations`) | -- |
| roadmap | `types/milestone.ts` (shared) | `ipc/misc/milestones.contract.ts` (shared) | `services/milestones/` (shared) | `handlers/milestones-handlers.ts` (shared) | `features/roadmap/` | `project.routes.ts` |
| screen | `types/screen.ts` | `ipc/misc/screen.contract.ts` | `services/screen/` | `handlers/screen-handlers.ts` | `features/screen/` | -- |
| settings | `types/settings.ts` | `ipc/settings/` | `services/settings/` | `handlers/settings-handlers.ts`, `webhook-settings-handlers.ts` | `features/settings/` | `settings.routes.ts` |
| spotify | -- | `ipc/spotify/` | `services/spotify/` | `handlers/spotify-handlers.ts` | `features/productivity/` | `productivity.routes.ts` |
| tasks | `types/task.ts` | `ipc/tasks/` | `services/project/task-service.ts`, `services/tasks/` | `handlers/tasks/` (5 files) | `features/tasks/` | `project.routes.ts` |
| terminals | `types/terminal.ts` | `ipc/terminals/` | `services/terminal/` | `handlers/terminal-handlers.ts` | `features/terminals/` | `project.routes.ts` |
| voice | `types/voice.ts` | `ipc/misc/voice.contract.ts` | `services/voice/` | `handlers/voice-handlers.ts` | `features/voice/` | -- |
| workflow | -- | `ipc/workflow/` | `services/workflow/` | `handlers/workflow-handlers.ts` | `features/workflow/` | -- (hooks only) |
| workspaces | `types/workspace.ts` | `ipc/misc/workspaces.contract.ts` | -- | `handlers/workspace-handlers.ts` | `features/workspaces/` | -- |

---

## 2. Domain Vertical Slices

Each block shows every file that participates in a domain's vertical slice. All paths are relative to `src/`.

---

### agents

Agent process management — spawn, stop, pause, resume Claude CLI agents.

| Layer | Path |
|-------|------|
| Types | `shared/types/agent.ts` |
| IPC Contract | `shared/ipc/agents/` (contract.ts + schemas.ts) |
| Service | `main/services/agent/agent-service.ts` |
| Service Sub-modules | `agent-spawner.ts`, `agent-output-parser.ts`, `agent-queue.ts`, `token-parser.ts` |
| Handler | `main/ipc/handlers/agent-handlers.ts` |
| Event Wiring | `main/bootstrap/event-wiring.ts` → `event:agent.*` |
| Feature Module | `renderer/features/agents/` |
| API Hooks | `renderer/features/agents/api/useAgents.ts` |
| Query Keys | `renderer/features/agents/api/queryKeys.ts` |
| Event Hook | `renderer/features/agents/hooks/useAgentEvents.ts` |
| Store | -- |
| Components | `renderer/features/agents/components/AgentDashboard.tsx` |
| Route | `renderer/app/routes/project.routes.ts` → `/projects/$projectId/agents` |

---

### agent-orchestrator

Headless Claude agent lifecycle (spawn sessions, progress watching, watchdog).

| Layer | Path |
|-------|------|
| Types | `shared/types/agent.ts` (shared with agents) |
| IPC Contract | `shared/ipc/agents/` (shared — orchestrator channels included) |
| Service | `main/services/agent-orchestrator/` |
| Service Sub-modules | `jsonl-progress-watcher.ts`, `agent-watchdog.ts` |
| Handler | `main/ipc/handlers/agent-orchestrator-handlers.ts` |
| Event Wiring | `event:agent.orchestrator.*`, `event:agent.orchestrator.progress`, `event:agent.orchestrator.planReady` |
| Feature Module | `renderer/features/tasks/` (consumes orchestrator events) |
| Event Hook | `renderer/features/tasks/hooks/useAgentEvents.ts` |

---

### alerts

Reminder/alert CRUD + scheduling system.

| Layer | Path |
|-------|------|
| Types | `shared/types/alert.ts` |
| IPC Contract | `shared/ipc/misc/alerts.contract.ts` |
| Service | `main/services/alerts/` |
| Handler | `main/ipc/handlers/alert-handlers.ts` |
| Event Wiring | `event:alert.changed` |
| Feature Module | `renderer/features/alerts/` |
| API Hooks | `renderer/features/alerts/api/useAlerts.ts` |
| Query Keys | `renderer/features/alerts/api/queryKeys.ts` |
| Event Hook | `renderer/features/alerts/hooks/useAlertEvents.ts` |
| Store | `renderer/features/alerts/store.ts` |
| Components | `renderer/features/alerts/components/AlertsPage.tsx` |
| Route | `renderer/app/routes/productivity.routes.ts` → `/alerts` |

---

### app

App lifecycle, version, auto-update, openAtLogin.

| Layer | Path |
|-------|------|
| Types | -- |
| IPC Contract | `shared/ipc/app/` (contract.ts) |
| Service | `main/services/app/` |
| Service (update) | `main/services/app-update/` |
| Handler | `main/ipc/handlers/app-handlers.ts` |
| Handler (update) | `main/ipc/handlers/app-update-handlers.ts` |
| Event Wiring | `event:app.updateAvailable`, `event:app.updateDownloaded` |
| Feature Module | `renderer/features/onboarding/` (first-run wizard) |
| Store | `renderer/features/onboarding/store.ts` |
| Shared Component | `renderer/shared/components/AppUpdateNotification.tsx` |

---

### assistant

Built-in Claude assistant — natural language commands, intent classification, command execution.

| Layer | Path |
|-------|------|
| Types | `shared/types/assistant.ts`, `shared/types/assistant-watch.ts` |
| IPC Contract | `shared/ipc/assistant/` (contract.ts + schemas.ts) |
| Service | `main/services/assistant/command-executor.ts` |
| Service Sub-modules | `intent-classifier/` (classifier + 13 pattern files), `executors/` (22 domain executors), `watch-store.ts`, `watch-evaluator.ts`, `cross-device-query.ts` |
| Handler | `main/ipc/handlers/assistant-handlers.ts` |
| Event Wiring | `event:assistant.*` |
| Feature Module | `renderer/features/assistant/` |
| API Hooks | `renderer/features/assistant/api/useAssistant.ts` |
| Query Keys | `renderer/features/assistant/api/queryKeys.ts` |
| Event Hook | `renderer/features/assistant/hooks/useAssistantEvents.ts` |
| Store | `renderer/features/assistant/store.ts` |
| Components | `AssistantWidget`, `AssistantPage`, `CommandBar` (in layouts) |
| Shared Store | `renderer/shared/stores/assistant-widget-store.ts`, `command-bar-store.ts` |

FEATURE.md files:
- `main/services/assistant/executors/FEATURE.md`
- `main/services/assistant/intent-classifier/FEATURE.md`

---

### auth

User authentication — JWT access/refresh tokens, login, register.

| Layer | Path |
|-------|------|
| Types | `shared/types/auth.ts` |
| Hub Types | `shared/types/hub/auth.ts` |
| IPC Contract | `shared/ipc/auth/` (contract.ts + schemas.ts) |
| Service | `main/services/hub/hub-auth-service.ts` |
| Handler | `main/ipc/handlers/auth-handlers.ts` |
| Event Wiring | -- |
| Feature Module | `renderer/features/auth/` |
| API Hooks | `renderer/features/auth/api/useAuth.ts` |
| Query Keys | `renderer/features/auth/api/queryKeys.ts` |
| Event Hook | `renderer/features/auth/hooks/useAuthEvents.ts` |
| Store | `renderer/features/auth/store.ts` |
| Components | `LoginPage`, `RegisterPage`, `AuthGuard` |
| Shared Component | `renderer/shared/components/AuthNotification.tsx` |
| Route | `renderer/app/routes/auth.routes.tsx` → `/login`, `/register` |

---

### briefing

Daily briefing generation & suggestion engine.

| Layer | Path |
|-------|------|
| Types | `shared/types/briefing.ts` |
| IPC Contract | `shared/ipc/briefing/` (contract.ts + schemas.ts) |
| Service | `main/services/briefing/briefing-service.ts` |
| Service Sub-modules | `briefing-cache.ts`, `briefing-config.ts`, `briefing-generator.ts`, `briefing-summary.ts`, `suggestion-engine.ts` |
| Handler | `main/ipc/handlers/briefing-handlers.ts` |
| Feature Module | `renderer/features/briefing/` |
| API Hooks | `renderer/features/briefing/api/useBriefing.ts` |
| Query Keys | `renderer/features/briefing/api/queryKeys.ts` |
| Event Hook | -- |
| Store | -- |
| Components | `BriefingPage`, `SuggestionCard` |
| Route | `renderer/app/routes/misc.routes.ts` → `/briefing` |

---

### calendar

Google Calendar integration.

| Layer | Path |
|-------|------|
| Types | -- |
| IPC Contract | `shared/ipc/misc/calendar.contract.ts` |
| Service | `main/services/calendar/` |
| Handler | `main/ipc/handlers/calendar-handlers.ts` |
| Feature Module | `renderer/features/productivity/` (CalendarWidget) |
| API Hooks | `renderer/features/productivity/api/useCalendar.ts` |
| Query Keys | `renderer/features/productivity/api/queryKeys.ts` |
| Route | `renderer/app/routes/productivity.routes.ts` → `/productivity` |

---

### changelog

Project changelog CRUD.

| Layer | Path |
|-------|------|
| Types | `shared/types/changelog.ts` |
| IPC Contract | `shared/ipc/misc/changelog.contract.ts` |
| Service | `main/services/changelog/` |
| Handler | `main/ipc/handlers/changelog-handlers.ts` |
| Feature Module | `renderer/features/changelog/` |
| API Hooks | `renderer/features/changelog/api/useChangelog.ts` |
| Query Keys | `renderer/features/changelog/api/queryKeys.ts` |
| Event Hook | -- |
| Store | -- |
| Components | `ChangelogPage` + 6 sub-components (`CategorySection`, `EditableCategory`, `EntryPreview`, `GenerateForm`, `VersionCard`, `category-config`) |
| Route | `renderer/app/routes/project.routes.ts` → `/projects/$projectId/changelog` |

---

### claude

Persistent Claude sessions via Anthropic SDK (separate from assistant).

| Layer | Path |
|-------|------|
| Types | `shared/types/claude.ts` |
| IPC Contract | `shared/ipc/claude/` (contract.ts + schemas.ts) |
| Service | `main/services/claude/` |
| Handler | `main/ipc/handlers/claude-handlers.ts` |
| Event Wiring | `event:claude.*` |
| Feature Module | `renderer/features/assistant/` (shared — persistent sessions feed the assistant) |

---

### communications

Slack/Discord/email integration — aggregation feature.

| Layer | Path |
|-------|------|
| Types | `shared/types/notifications.ts` |
| IPC Contract | `shared/ipc/notifications/` + `shared/ipc/email/` + `shared/ipc/misc/mcp.contract.ts` |
| Service | `main/services/notifications/` (slack-watcher, github-watcher) |
| Service | `main/services/email/` |
| Handler | `main/ipc/handlers/notification-handlers.ts`, `email-handlers.ts`, `mcp-handlers.ts` |
| Event Wiring | `event:notification.*` |
| Feature Module | `renderer/features/communications/` |
| API Hooks | `renderer/features/communications/api/useMcpTool.ts` |
| Query Keys | `renderer/features/communications/api/queryKeys.ts` |
| Event Hook | `renderer/features/communications/hooks/useCommunicationsEvents.ts` |
| Store | `renderer/features/communications/store.ts` |
| Components | `CommunicationsPage`, `SlackPanel`, `DiscordPanel` |
| Route | `renderer/app/routes/communication.routes.ts` → `/communications` |

---

### dashboard

Home dashboard — aggregates data from multiple domains.

| Layer | Path |
|-------|------|
| Types | -- (aggregates from multiple domains) |
| IPC Contract | -- (calls multiple domain channels) |
| Service | -- (no dedicated service) |
| Handler | -- |
| Feature Module | `renderer/features/dashboard/` |
| API Hooks | `renderer/features/dashboard/api/useDashboard.ts` |
| Query Keys | `renderer/features/dashboard/api/queryKeys.ts` |
| Event Hook | `renderer/features/dashboard/hooks/useDashboardEvents.ts` |
| Store | `renderer/features/dashboard/store.ts` |
| Components | `DashboardPage`, `TodayView`, `DailyStats`, `ActiveAgents` |
| Route | `renderer/app/routes/dashboard.routes.ts` → `/dashboard` |

---

### devices

Device registration & heartbeat via Hub API.

| Layer | Path |
|-------|------|
| Types | `shared/types/hub/devices.ts` |
| IPC Contract | `shared/ipc/misc/devices.contract.ts` |
| Service | `main/services/device/` |
| Service Sub-modules | `heartbeat/` (periodic pings) |
| Handler | `main/ipc/handlers/device-handlers.ts` |
| Event Wiring | `event:hub.devices.*` |
| Feature Module | `renderer/features/devices/` |
| API Hooks | `renderer/features/devices/api/useDevices.ts` |
| Query Keys | `renderer/features/devices/api/queryKeys.ts` |
| Event Hook | `renderer/features/devices/hooks/useDeviceEvents.ts` |
| Store | `renderer/features/devices/store.ts` |

---

### email

SMTP email sending, queue, encryption.

| Layer | Path |
|-------|------|
| Types | `shared/types/email.ts` |
| IPC Contract | `shared/ipc/email/` (contract.ts + schemas.ts) |
| Service | `main/services/email/` |
| Service Sub-modules | `email-config.ts`, `email-encryption.ts`, `email-queue.ts`, `email-store.ts`, `smtp-transport.ts` |
| Handler | `main/ipc/handlers/email-handlers.ts` |
| Feature Module | `renderer/features/communications/` (shared with notifications) |

---

### fitness

Health/fitness tracking.

| Layer | Path |
|-------|------|
| Types | `shared/types/fitness.ts` |
| IPC Contract | `shared/ipc/fitness/` (contract.ts + schemas.ts) |
| Service | `main/services/fitness/` |
| Handler | `main/ipc/handlers/fitness-handlers.ts` |
| Feature Module | `renderer/features/fitness/` |
| API Hooks | `renderer/features/fitness/api/useFitness.ts` |
| Query Keys | `renderer/features/fitness/api/queryKeys.ts` |
| Event Hook | `renderer/features/fitness/hooks/useFitnessEvents.ts` |
| Store | `renderer/features/fitness/store.ts` |
| Components | `FitnessPage`, `WorkoutLog`, `MetricsChart` |
| Route | `renderer/app/routes/misc.routes.ts` → `/fitness` |

---

### git

Git operations — status, commit, branches, worktrees.

| Layer | Path |
|-------|------|
| Types | `shared/types/git.ts` |
| IPC Contract | `shared/ipc/git/` (contract.ts + schemas.ts) |
| Service | `main/services/git/` |
| Handler | `main/ipc/handlers/git-handlers.ts` |
| Event Wiring | `event:git.*` |
| Feature Module | `renderer/features/projects/` (consumed via `useGit` hook) |
| API Hooks | `renderer/features/projects/api/useGit.ts` |

---

### github

GitHub API integration — PRs, issues, repos.

| Layer | Path |
|-------|------|
| Types | `shared/types/github.ts` |
| IPC Contract | `shared/ipc/github/` (contract.ts + schemas.ts) |
| Service | `main/services/github/` |
| Handler | `main/ipc/handlers/github-handlers.ts` |
| Feature Module | `renderer/features/github/` |
| API Hooks | `renderer/features/github/api/useGitHub.ts` |
| Query Keys | `renderer/features/github/api/queryKeys.ts` |
| Event Hook | `renderer/features/github/hooks/useGitHubEvents.ts` |
| Store | `renderer/features/github/store.ts` |
| Components | `GitHubPage`, `PRList`, `IssueList` |
| Route | `renderer/app/routes/project.routes.ts` → `/projects/$projectId/github` |

---

### hotkeys

Global keyboard shortcuts.

| Layer | Path |
|-------|------|
| Types | -- |
| IPC Contract | `shared/ipc/misc/hotkeys.contract.ts` |
| Service | `main/tray/` (tray service handles hotkeys) |
| Handler | `main/ipc/handlers/hotkey-handlers.ts` |
| Feature Module | -- (consumed by layout components) |

---

### hub

Hub server connection, sync, config, WebSocket.

| Layer | Path |
|-------|------|
| Types | `shared/types/hub-protocol.ts`, `shared/types/hub-connection.ts`, `shared/types/hub-events.ts` |
| Hub Types | `shared/types/hub/` (12 modules — see FEATURE.md index below) |
| IPC Contract | `shared/ipc/hub/` (contract.ts + schemas.ts) |
| Service | `main/services/hub/` |
| Service Sub-modules | `hub-api-client.ts`, `hub-auth-service.ts`, `hub-client.ts`, `hub-config-store.ts`, `hub-connection.ts`, `hub-errors.ts`, `hub-event-mapper.ts`, `hub-sync.ts`, `hub-ws-client.ts`, `webhook-relay.ts` |
| Handler | `main/ipc/handlers/hub-handlers.ts` |
| Event Wiring | `event:hub.*` |
| Feature Module | `renderer/features/settings/` (HubSettings component) |
| API Hooks | `renderer/features/settings/api/useHub.ts` |
| Shared Components | `HubConnectionIndicator.tsx`, `HubNotification.tsx`, `HubStatus.tsx` |
| Shared Hook | `renderer/shared/hooks/useHubEvents.ts` |

FEATURE.md: `shared/types/hub/FEATURE.md`

---

### ideation

Idea capture & tracking.

| Layer | Path |
|-------|------|
| Types | `shared/types/idea.ts` |
| IPC Contract | `shared/ipc/misc/ideas.contract.ts` |
| Service | `main/services/ideas/` |
| Handler | `main/ipc/handlers/ideas-handlers.ts` |
| Feature Module | `renderer/features/ideation/` |
| API Hooks | `renderer/features/ideation/api/useIdeas.ts` |
| Query Keys | `renderer/features/ideation/api/queryKeys.ts` |
| Event Hook | `renderer/features/ideation/hooks/useIdeaEvents.ts` |
| Store | `renderer/features/ideation/store.ts` |
| Components | `IdeationPage`, `IdeaForm` |
| Route | `renderer/app/routes/project.routes.ts` → `/projects/$projectId/ideation` |

---

### insights

Analytics dashboard — metrics, time series, distributions.

| Layer | Path |
|-------|------|
| Types | `shared/types/insights.ts` |
| IPC Contract | `shared/ipc/misc/insights.contract.ts` |
| Service | `main/services/insights/` |
| Handler | `main/ipc/handlers/insights-handlers.ts` |
| Feature Module | `renderer/features/insights/` |
| API Hooks | `renderer/features/insights/api/useInsights.ts` |
| Query Keys | `renderer/features/insights/api/queryKeys.ts` |
| Components | `InsightsPage`, `MetricsCards`, `Charts` |
| Route | `renderer/app/routes/project.routes.ts` → `/projects/$projectId/insights` |

---

### merge

Branch merge workflow — diff preview, conflict detection.

| Layer | Path |
|-------|------|
| Types | -- |
| IPC Contract | `shared/ipc/misc/merge.contract.ts` |
| Service | `main/services/merge/` |
| Handler | `main/ipc/handlers/merge-handlers.ts` |
| Feature Module | `renderer/features/merge/` |
| API Hooks | `renderer/features/merge/api/useMerge.ts` |
| Query Keys | `renderer/features/merge/api/queryKeys.ts` |
| Components | `ConflictResolver`, `MergeConfirmModal`, `MergePreviewPanel` |

---

### milestones / roadmap

Milestone CRUD — shared backend, two renderer features use it.

| Layer | Path |
|-------|------|
| Types | `shared/types/milestone.ts` |
| IPC Contract | `shared/ipc/misc/milestones.contract.ts` |
| Service | `main/services/milestones/` |
| Handler | `main/ipc/handlers/milestones-handlers.ts` |
| Feature Module | `renderer/features/roadmap/` |
| API Hooks | `renderer/features/roadmap/api/useMilestones.ts` |
| Query Keys | `renderer/features/roadmap/api/queryKeys.ts` |
| Event Hook | `renderer/features/roadmap/hooks/useMilestoneEvents.ts` |
| Store | `renderer/features/roadmap/store.ts` |
| Components | `RoadmapPage`, `MilestoneCard` |
| Route | `renderer/app/routes/project.routes.ts` → `/projects/$projectId/roadmap` |

---

### my-work

Cross-project task view — thin aggregation feature.

| Layer | Path |
|-------|------|
| Types | -- (uses `types/task.ts`) |
| IPC Contract | -- (uses `tasks.*` channels) |
| Feature Module | `renderer/features/my-work/` |
| API Hooks | `renderer/features/my-work/api/useMyWork.ts` |
| Query Keys | `renderer/features/my-work/api/queryKeys.ts` |
| Components | `MyWorkPage` |
| Route | `renderer/app/routes/dashboard.routes.ts` → `/my-work` |

---

### notes

Note-taking — CRUD, folders.

| Layer | Path |
|-------|------|
| Types | `shared/types/note.ts` |
| IPC Contract | `shared/ipc/misc/notes.contract.ts` |
| Service | `main/services/notes/` |
| Handler | `main/ipc/handlers/notes-handlers.ts` |
| Feature Module | `renderer/features/notes/` |
| API Hooks | `renderer/features/notes/api/useNotes.ts` |
| Query Keys | `renderer/features/notes/api/queryKeys.ts` |
| Event Hook | `renderer/features/notes/hooks/useNoteEvents.ts` |
| Store | `renderer/features/notes/store.ts` |
| Components | `NotesPage`, `NoteEditor`, `NoteList` |
| Route | `renderer/app/routes/productivity.routes.ts` → `/notes` |

---

### notifications

Background watchers (Slack, GitHub) — backend for communications feature.

| Layer | Path |
|-------|------|
| Types | `shared/types/notifications.ts` |
| IPC Contract | `shared/ipc/notifications/` (contract.ts + schemas.ts) |
| Service | `main/services/notifications/` |
| Service Sub-modules | `slack-watcher.ts`, `github-watcher.ts`, `notification-filter.ts`, `notification-manager.ts`, `notification-store.ts` |
| Handler | `main/ipc/handlers/notification-handlers.ts` |
| Event Wiring | `event:notification.*` |
| Feature Module | `renderer/features/communications/` (shared — watcher config UI) |

---

### onboarding

First-run setup wizard.

| Layer | Path |
|-------|------|
| Types | -- |
| IPC Contract | -- (uses `app.*`, `settings.*`) |
| Feature Module | `renderer/features/onboarding/` |
| Store | `renderer/features/onboarding/store.ts` |
| Components | `OnboardingWizard`, `ClaudeCliStep`, `ApiKeyStep` |

---

### planner

Daily time blocks + weekly review.

| Layer | Path |
|-------|------|
| Types | `shared/types/planner.ts` |
| IPC Contract | `shared/ipc/planner/` (contract.ts + schemas.ts) |
| Service | `main/services/planner/` |
| Handler | `main/ipc/handlers/planner-handlers.ts` |
| Event Wiring | `event:planner.*` |
| Feature Module | `renderer/features/planner/` |
| API Hooks | `renderer/features/planner/api/usePlanner.ts`, `useWeeklyReview.ts` |
| Query Keys | `renderer/features/planner/api/queryKeys.ts` |
| Event Hook | `renderer/features/planner/hooks/usePlannerEvents.ts` |
| Store | `renderer/features/planner/store.ts` |
| Components | `PlannerPage`, `WeeklyReviewPage` + 5 sub-components (`CategoryBar`, `DayCompact`, `StatCard`, `WeeklyReflectionSection`, `weekly-review-utils`) |
| Route | `renderer/app/routes/productivity.routes.ts` → `/planner`, `/planner/weekly` |

---

### productivity

Aggregation feature — calendar widget + spotify widget.

| Layer | Path |
|-------|------|
| Types | -- |
| IPC Contract | -- (uses `calendar.*`, `spotify.*`) |
| Feature Module | `renderer/features/productivity/` |
| API Hooks | `renderer/features/productivity/api/useCalendar.ts`, `useSpotify.ts` |
| Query Keys | `renderer/features/productivity/api/queryKeys.ts` |
| Store | `renderer/features/productivity/store.ts` |
| Components | `ProductivityPage`, `CalendarWidget`, `SpotifyWidget` |
| Route | `renderer/app/routes/productivity.routes.ts` → `/productivity` |

---

### projects

Project management — CRUD, multi-repo, sub-projects, directory detection.

| Layer | Path |
|-------|------|
| Types | `shared/types/project.ts` |
| IPC Contract | `shared/ipc/projects/` (contract.ts + schemas.ts) |
| Service | `main/services/project/` |
| Service Sub-modules | `project-detector.ts`, `task-service.ts`, `task-slug.ts`, `task-spec-parser.ts`, `task-store.ts` |
| Handler | `main/ipc/handlers/project-handlers.ts` |
| Event Wiring | `event:project.*` |
| Feature Module | `renderer/features/projects/` |
| API Hooks | `renderer/features/projects/api/useProjects.ts`, `useGit.ts` |
| Query Keys | `renderer/features/projects/api/queryKeys.ts` |
| Event Hook | `renderer/features/projects/hooks/useProjectEvents.ts` |
| Components | `ProjectListPage`, `ProjectSettings`, `WorktreeManager`, `ProjectEditDialog`, `ProjectInitWizard` + `wizard-steps/` (6 files) |
| Route | `renderer/app/routes/project.routes.ts` → `/projects`, `/projects/$projectId` |

---

### qa

Automated QA system — quiet + full tiers.

| Layer | Path |
|-------|------|
| Types | -- |
| IPC Contract | `shared/ipc/qa/` (contract.ts + schemas.ts) |
| Service | `main/services/qa/qa-runner.ts` |
| Service Sub-modules | `qa-agent-poller.ts`, `qa-prompt.ts`, `qa-report-parser.ts`, `qa-session-store.ts`, `qa-trigger.ts`, `qa-types.ts` |
| Handler | `main/ipc/handlers/qa-handlers.ts` |
| Event Wiring | `event:assistant.proactive` (on QA failure) |
| Feature Module | `renderer/features/tasks/` (via `useQaMutations.ts`) |
| API Hooks | `renderer/features/tasks/api/useQaMutations.ts` |

---

### screen

Screen capture via desktopCapturer.

| Layer | Path |
|-------|------|
| Types | `shared/types/screen.ts` |
| IPC Contract | `shared/ipc/misc/screen.contract.ts` |
| Service | `main/services/screen/` |
| Handler | `main/ipc/handlers/screen-handlers.ts` |
| Feature Module | `renderer/features/screen/` |
| API Hooks | `renderer/features/screen/api/useScreenCapture.ts` |
| Query Keys | `renderer/features/screen/api/queryKeys.ts` |
| Components | `ScreenshotButton`, `ScreenshotViewer` |

---

### settings

App settings persistence — profiles, encryption, webhooks.

| Layer | Path |
|-------|------|
| Types | `shared/types/settings.ts` |
| IPC Contract | `shared/ipc/settings/` (contract.ts + schemas.ts) |
| IPC Contract (webhooks) | `shared/ipc/misc/webhook.contract.ts` |
| Service | `main/services/settings/settings-service.ts` |
| Service Sub-modules | `settings-defaults.ts`, `settings-encryption.ts`, `settings-store.ts` |
| Handler | `main/ipc/handlers/settings-handlers.ts`, `webhook-settings-handlers.ts` |
| Event Wiring | `event:settings.changed` |
| Feature Module | `renderer/features/settings/` |
| API Hooks | `renderer/features/settings/api/useSettings.ts`, `useHub.ts`, `useWebhookConfig.ts` |
| Components | `SettingsPage` + 14 sub-components (`AppearanceModeSection`, `CollapsibleInstructions`, `ColorThemeSection`, `CredentialInput`, `GitHubSetupInstructions`, `OAuthProviderForm`, `OAuthProviderSettings`, `ProviderConsoleInfo`, `SecretInput`, `SlackSetupInstructions`, `TypographySection`, `UiScaleSection`, `WebhookSettings`, `WebhookUrlDisplay`, `oauth-provider-constants`, `webhook-constants`) |
| Route | `renderer/app/routes/settings.routes.ts` → `/settings` |

---

### spotify

Spotify playback integration.

| Layer | Path |
|-------|------|
| Types | -- |
| IPC Contract | `shared/ipc/spotify/` (contract.ts) |
| Service | `main/services/spotify/` |
| Handler | `main/ipc/handlers/spotify-handlers.ts` |
| Feature Module | `renderer/features/productivity/` (SpotifyWidget) |
| API Hooks | `renderer/features/productivity/api/useSpotify.ts` |

---

### tasks

Task management — local + Hub tasks, AG-Grid dashboard, task execution.

| Layer | Path |
|-------|------|
| Types | `shared/types/task.ts` |
| Hub Types | `shared/types/hub/tasks.ts` |
| IPC Contract | `shared/ipc/tasks/` (contract.ts + schemas.ts) |
| Service | `main/services/project/task-service.ts`, `main/services/tasks/` |
| Service Sub-modules | `task-decomposer.ts`, `github-importer.ts` |
| Handler | `main/ipc/handlers/tasks/` (5 files) |
| Handler Sub-modules | `hub-task-handlers.ts`, `legacy-task-handlers.ts`, `status-mapping.ts`, `task-transform.ts`, `index.ts` |
| Event Wiring | `event:hub.*` (task-related), `event:agent.orchestrator.*` |
| Feature Module | `renderer/features/tasks/` |
| API Hooks | `renderer/features/tasks/api/useTasks.ts`, `useTaskMutations.ts`, `useAgentMutations.ts`, `useQaMutations.ts` |
| Query Keys | `renderer/features/tasks/api/queryKeys.ts` |
| Event Hooks | `renderer/features/tasks/hooks/useTaskEvents.ts`, `useAgentEvents.ts` |
| Store | `renderer/features/tasks/store.ts` |
| Components | `TaskDataGrid`, `TaskFiltersToolbar`, `TaskDetailRow`, `TaskStatusBadge`, `CreateTaskDialog` |
| Route | `renderer/app/routes/project.routes.ts` → `/projects/$projectId/tasks` |

FEATURE.md: `main/ipc/handlers/tasks/FEATURE.md`

---

### terminals

Terminal emulator — PTY session management.

| Layer | Path |
|-------|------|
| Types | `shared/types/terminal.ts` |
| IPC Contract | `shared/ipc/terminals/` (contract.ts + schemas.ts) |
| Service | `main/services/terminal/` |
| Handler | `main/ipc/handlers/terminal-handlers.ts` |
| Event Wiring | `event:terminal.*` |
| Feature Module | `renderer/features/terminals/` |
| API Hooks | `renderer/features/terminals/api/useTerminals.ts` |
| Query Keys | `renderer/features/terminals/api/queryKeys.ts` |
| Event Hook | `renderer/features/terminals/hooks/useTerminalEvents.ts` |
| Store | `renderer/features/terminals/store.ts` |
| Components | `TerminalGrid`, `TerminalInstance` |
| Route | `renderer/app/routes/project.routes.ts` → `/projects/$projectId/terminals` |

---

### voice

Voice interface — STT/TTS via Web Speech API.

| Layer | Path |
|-------|------|
| Types | `shared/types/voice.ts` |
| IPC Contract | `shared/ipc/misc/voice.contract.ts` |
| Service | `main/services/voice/` |
| Handler | `main/ipc/handlers/voice-handlers.ts` |
| Event Wiring | `event:voice.*` |
| Feature Module | `renderer/features/voice/` |
| API Hooks | `renderer/features/voice/api/useVoice.ts` |
| Query Keys | `renderer/features/voice/api/queryKeys.ts` |
| Components | `VoiceButton`, `VoiceSettings` |

---

### workflow

Workflow execution & progress watching.

| Layer | Path |
|-------|------|
| Types | -- |
| IPC Contract | `shared/ipc/workflow/` (contract.ts) |
| Service | `main/services/workflow/` |
| Handler | `main/ipc/handlers/workflow-handlers.ts` |
| Event Wiring | `event:workflow.*` |
| Feature Module | `renderer/features/workflow/` |
| API Hooks | `renderer/features/workflow/api/useWorkflow.ts` |
| Query Keys | `renderer/features/workflow/api/queryKeys.ts` |
| Event Hook | `renderer/features/workflow/hooks/useWorkflowEvents.ts` |
| Store | `renderer/features/workflow/store.ts` |
| Components | -- (hooks only, no UI components) |

---

### workspaces

Workspace management via Hub.

| Layer | Path |
|-------|------|
| Types | `shared/types/workspace.ts` |
| Hub Types | `shared/types/hub/workspaces.ts` |
| IPC Contract | `shared/ipc/misc/workspaces.contract.ts` |
| Service | -- (handled via Hub API client directly) |
| Handler | `main/ipc/handlers/workspace-handlers.ts` |
| Feature Module | `renderer/features/workspaces/` |
| API Hooks | `renderer/features/workspaces/api/useWorkspaces.ts` |
| Query Keys | `renderer/features/workspaces/api/queryKeys.ts` |
| Event Hook | `renderer/features/workspaces/hooks/useWorkspaceEvents.ts` |
| Store | `renderer/features/workspaces/store.ts` |
| Components | `WorkspaceCard`, `WorkspacesTab`, `WorkspaceEditor` |

---

## 3. Wiring Completeness Matrix

Shows which layers exist for each domain. `Y` = exists, `-` = not applicable or intentionally absent.

| Domain | Types | IPC | Service | Handler | Events | API Hooks | Query Keys | Store | Components | Route |
|--------|:-----:|:---:|:-------:|:-------:|:------:|:---------:|:----------:|:-----:|:----------:|:-----:|
| agents | Y | Y | Y | Y | Y | Y | Y | - | Y | Y |
| agent-orchestrator | Y | Y | Y | Y | Y | - | - | - | - | - |
| alerts | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| app | - | Y | Y | Y | Y | - | - | - | Y | - |
| assistant | Y | Y | Y | Y | Y | Y | Y | Y | Y | - |
| auth | Y | Y | Y | Y | - | Y | Y | Y | Y | Y |
| briefing | Y | Y | Y | Y | - | Y | Y | - | Y | Y |
| calendar | - | Y | Y | Y | - | Y | Y | - | Y | Y |
| changelog | Y | Y | Y | Y | - | Y | Y | - | Y | Y |
| claude | Y | Y | Y | Y | Y | - | - | - | - | - |
| communications | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| dashboard | - | - | - | - | - | Y | Y | Y | Y | Y |
| devices | Y | Y | Y | Y | Y | Y | Y | Y | - | - |
| email | Y | Y | Y | Y | - | - | - | - | - | - |
| fitness | Y | Y | Y | Y | - | Y | Y | Y | Y | Y |
| git | Y | Y | Y | Y | Y | Y | - | - | - | - |
| github | Y | Y | Y | Y | - | Y | Y | Y | Y | Y |
| hotkeys | - | Y | - | Y | - | - | - | - | - | - |
| hub | Y | Y | Y | Y | Y | Y | - | - | Y | Y |
| ideation | Y | Y | Y | Y | - | Y | Y | Y | Y | Y |
| insights | Y | Y | Y | Y | - | Y | Y | - | Y | Y |
| merge | - | Y | Y | Y | - | Y | Y | - | Y | - |
| milestones | Y | Y | Y | Y | - | Y | Y | Y | Y | Y |
| my-work | - | - | - | - | - | Y | Y | - | Y | Y |
| notes | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| notifications | Y | Y | Y | Y | Y | - | - | - | - | - |
| onboarding | - | - | - | - | - | - | - | Y | Y | - |
| planner | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| productivity | - | - | - | - | - | Y | Y | Y | Y | Y |
| projects | Y | Y | Y | Y | Y | Y | Y | - | Y | Y |
| qa | - | Y | Y | Y | Y | Y | - | - | - | - |
| screen | Y | Y | Y | Y | - | Y | Y | - | Y | - |
| settings | Y | Y | Y | Y | Y | Y | - | - | Y | Y |
| spotify | - | Y | Y | Y | - | Y | - | - | Y | Y |
| tasks | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| terminals | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| voice | Y | Y | Y | Y | Y | Y | Y | - | Y | - |
| workflow | - | Y | Y | Y | Y | Y | Y | Y | - | - |
| workspaces | Y | Y | - | Y | - | Y | Y | Y | Y | - |

**Fully wired domains** (all applicable layers present): agents, alerts, notes, planner, tasks, terminals.

**Backend-only domains** (no dedicated route/components): agent-orchestrator, claude, email, hotkeys, notifications.

**Aggregation features** (no own backend — compose other domains): dashboard, my-work, onboarding, productivity.

---

## 4. FEATURE.md Index

| Path | Describes |
|------|-----------|
| `src/shared/ipc/FEATURE.md` | 22 IPC domain contract folders — structure, root files, domain list |
| `src/shared/types/hub/FEATURE.md` | 12 Hub protocol type modules — auth, devices, events, tasks, etc. |
| `src/main/bootstrap/FEATURE.md` | 5 bootstrap modules — service-registry, ipc-wiring, event-wiring, lifecycle |
| `src/main/services/assistant/executors/FEATURE.md` | 22 domain command executors — how intents route to actions |
| `src/main/services/assistant/intent-classifier/FEATURE.md` | Two-tier intent classifier — regex patterns + Claude API fallback |
| `src/main/ipc/handlers/tasks/FEATURE.md` | Split task handlers — Hub-first vs legacy, status mapping, transforms |
| `src/renderer/app/routes/FEATURE.md` | 8 route group files — domain-to-route mapping |

---

## 5. Shared Infrastructure

Cross-cutting utilities used by all domains.

### Shared Hooks (`src/renderer/shared/hooks/`)

| Hook | Purpose | Used By |
|------|---------|---------|
| `useIpcEvent` | Subscribe to IPC events from main process | All `use*Events.ts` hooks |
| `useIpcQuery` | IPC-backed React Query hook factory | Not exported from barrel — internal use |
| `useHubEvents` | Subscribe to Hub-specific IPC events | Hub-connected features |
| `useClaudeAuth` | Check Claude CLI auth status | Onboarding, dashboard |
| `useOAuthStatus` | Check OAuth provider config status | Settings, integrations |
| `useMutationErrorToast` | `onError` factory for React Query mutations | All mutation hooks |
| `useLooseParams` | Read `$projectId` without strict route context | Project sub-features |

### Shared Stores (`src/renderer/shared/stores/`)

| Store | Purpose |
|-------|---------|
| `theme-store.ts` | Dark/light mode, color theme, UI scale |
| `layout-store.ts` | Sidebar state, active project, project tabs |
| `toast-store.ts` | Toast notification queue (max 3, auto-dismiss 5s) |
| `command-bar-store.ts` | CommandBar processing state, input history |
| `assistant-widget-store.ts` | Floating assistant widget open/close state |
| `ThemeHydrator.tsx` | Component that hydrates theme CSS vars on `<html>` |

### Shared Lib (`src/renderer/shared/lib/`)

| File | Purpose |
|------|---------|
| `ipc.ts` | Type-safe `ipc()` invoke helper + `on()` event listener |
| `utils.ts` | `cn()` class name utility |
| `hub-query-sync.ts` | Hub query synchronization utilities |

### Shared Components (`src/renderer/shared/components/`)

| Component | Purpose |
|-----------|---------|
| `AppUpdateNotification.tsx` | Auto-update banner |
| `AuthNotification.tsx` | Auth error/expiry notification |
| `ConfirmDialog.tsx` | Reusable confirmation dialog |
| `HubConnectionIndicator.tsx` | Hub connected/disconnected dot |
| `HubNotification.tsx` | Hub connection event notifications |
| `HubStatus.tsx` | Hub status display |
| `IntegrationRequired.tsx` | Placeholder for unconfigured integrations |
| `MutationErrorToast.tsx` | Error toast renderer (bottom-right) |
| `WebhookNotification.tsx` | Webhook execution result notifications |

### Bootstrap (`src/main/bootstrap/`)

| Module | Purpose |
|--------|---------|
| `service-registry.ts` | Instantiates all 37 services with dependency wiring |
| `ipc-wiring.ts` | Registers all IPC handlers on the router |
| `event-wiring.ts` | Forwards service events to renderer via IPC |
| `lifecycle.ts` | Electron app lifecycle handlers |

### IPC Plumbing

| File | Purpose |
|------|---------|
| `src/shared/ipc/index.ts` | Root barrel — merges all 22 domain contracts into unified objects |
| `src/shared/ipc/types.ts` | Type utilities: `InvokeChannel`, `InvokeInput`, `InvokeOutput`, `EventChannel`, `EventPayload` |
| `src/shared/ipc-contract.ts` | Thin backward-compatible re-export of the barrel |
| `src/shared/ipc/common/schemas.ts` | Shared Zod schemas: `SuccessResponse`, `TokenUsage` |
| `src/main/ipc/router.ts` | IPC router that dispatches invoke/event channels to handlers |
| `src/preload/index.ts` | Context bridge — exposes typed `ipc()` and `on()` to renderer |

---

## 6. Change Impact Rules

When you modify a file, these rules tell you what else must be updated.

### IPC Contract Changes

| Changed | Must Also Update |
|---------|-----------------|
| `src/shared/ipc/<domain>/contract.ts` | Handler file, API hooks, preload bridge (auto-typed), `FEATURES-INDEX.md` |
| `src/shared/ipc/<domain>/schemas.ts` | Contract.ts (if schema is referenced), handler (validation), components (if shape changed) |
| Add new IPC domain folder | `src/shared/ipc/index.ts` barrel import, handler file, API hook, `FEATURES-INDEX.md` |
| Add new channel to existing domain | Handler, API hook, event hook (if event channel) |

### Type Changes

| Changed | Must Also Update |
|---------|-----------------|
| `src/shared/types/<domain>.ts` | Service, handler, feature components, API hooks using the type |
| `src/shared/types/hub/<module>.ts` | Hub API client, handler transforms, IPC boundary transforms |

### Service Changes

| Changed | Must Also Update |
|---------|-----------------|
| Service method signature | Handler that wraps it, API hook that calls it |
| New service | `service-registry.ts` (instantiation), `ipc-wiring.ts` (if IPC-exposed) |
| Service event emission | `event-wiring.ts` (forwarding), renderer event hook |

### Handler Changes

| Changed | Must Also Update |
|---------|-----------------|
| New handler file | `ipc-wiring.ts` registration, IPC contract (channel definition) |
| Handler response shape | API hook (query data), components (data consumption) |

### Feature Module Changes

| Changed | Must Also Update |
|---------|-----------------|
| New feature module | Route group file, sidebar nav, `FEATURES-INDEX.md` |
| New component | Feature barrel `index.ts`, route (if page component) |
| New API hook | Feature barrel `index.ts`, `queryKeys.ts` |
| New event hook | Feature barrel `index.ts` |
| New store | Feature barrel `index.ts` |

### Route Changes

| Changed | Must Also Update |
|---------|-----------------|
| New route | Route group file, `src/shared/constants/routes.ts`, sidebar nav |
| Route path change | `routes.ts` constants, any `navigate()` or `<Link>` calls |

### Documentation Changes

| Changed | Must Also Update |
|---------|-----------------|
| New file in any layer | `FEATURES-INDEX.md` |
| New data flow or IPC wiring | `DATA-FLOW.md`, `ARCHITECTURE.md` |
| New pattern or convention | `PATTERNS.md` |
| UI layout changes | `user-interface-flow.md` |
| Architecture changes | `ARCHITECTURE.md` |

---

## 7. Misc IPC Domain Map

The `src/shared/ipc/misc/` folder bundles 17 smaller domain contracts. Here's what maps where:

| Contract File | IPC Channels | Handler | Service |
|--------------|-------------|---------|---------|
| `alerts.contract.ts` | `alerts.*` | `alert-handlers.ts` | `services/alerts/` |
| `calendar.contract.ts` | `calendar.*` | `calendar-handlers.ts` | `services/calendar/` |
| `changelog.contract.ts` | `changelog.*` | `changelog-handlers.ts` | `services/changelog/` |
| `devices.contract.ts` | `devices.*` | `device-handlers.ts` | `services/device/` |
| `hotkeys.contract.ts` | `hotkeys.*` | `hotkey-handlers.ts` | `main/tray/` |
| `ideas.contract.ts` | `ideas.*` | `ideas-handlers.ts` | `services/ideas/` |
| `insights.contract.ts` | `insights.*` | `insights-handlers.ts` | `services/insights/` |
| `mcp.contract.ts` | `mcp.*` | `mcp-handlers.ts` | `main/mcp/` |
| `merge.contract.ts` | `merge.*` | `merge-handlers.ts` | `services/merge/` |
| `milestones.contract.ts` | `milestones.*` | `milestones-handlers.ts` | `services/milestones/` |
| `notes.contract.ts` | `notes.*` | `notes-handlers.ts` | `services/notes/` |
| `rate-limit.contract.ts` | `rateLimit.*` | -- (internal) | -- |
| `screen.contract.ts` | `screen.*` | `screen-handlers.ts` | `services/screen/` |
| `time.contract.ts` | `time.*` | `time-handlers.ts` | `services/time-parser/` |
| `voice.contract.ts` | `voice.*` | `voice-handlers.ts` | `services/voice/` |
| `webhook.contract.ts` | `webhooks.*` | `webhook-settings-handlers.ts` | `services/settings/` |
| `workspaces.contract.ts` | `workspaces.*` | `workspace-handlers.ts` | -- (Hub API) |
