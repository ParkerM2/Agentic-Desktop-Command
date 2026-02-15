# Claude-UI Master Implementation Checklist

> Generated from IMPLEMENTATION-PROMPTS.md + VISION.md analysis
> Status: What's done, what's left, what to build next

---

## CURRENT STATE SUMMARY

### Fully Implemented & Working
- [x] Dashboard (GreetingHeader, TodayView, RecentProjects, ActiveAgents, QuickCapture, DailyStats)
- [x] Project Management (CRUD, file persistence, directory picker)
- [x] Task System (create, update, delete, execute, subtasks, progress)
- [x] Task Dashboard (table-based with filters, sorting, and status columns; replaced former Kanban board)
- [x] Terminal Grid (xterm.js + node-pty, tabs, resize, PTY spawning)
- [x] Agent Dashboard (spawn Claude CLI, stop/pause/resume, log parsing)
- [x] Settings (theme, profiles, UI scale, font family/size, color themes)
- [x] IPC Architecture (26 invoke channels, 10 event channels, Zod validation)
- [x] 5 Main Process Services (project, task, agent, terminal, settings)
- [x] 5 IPC Handler Files (all wired and registered)
- [x] ESLint 0 violations, Prettier clean, TypeScript compiles
- [x] Production build verified

### Stubs (Placeholder UI Only)
- [ ] GitHub integration page → needs real implementation
- [ ] Roadmap page → needs real implementation
- [ ] Ideation page → needs real implementation
- [ ] Task list view (route exists, no component)

### Mock Data (Hardcoded, Not Connected)
- [ ] Changelog (static v0.1.0-v0.3.0) → needs real data source
- [ ] Insights (static stats) → needs real metrics from services

### Hub Backend (Exists but NOT Integrated)
- [x] Hub Fastify server exists (hub/)
- [x] SQLite database schema
- [x] 7 REST route groups
- [x] WebSocket broadcaster
- [x] API key auth middleware
- [ ] Hub NOT connected to Electron app
- [ ] No offline mode / local cache
- [ ] No connection manager in Electron
- [ ] No cross-device sync

---

## WORKSTREAM 1: Foundation & Architecture

### 1.1 MCP Integration Layer
- [ ] Create `src/main/mcp/mcp-client.ts` — Generic MCP client wrapper
- [ ] Create `src/main/mcp/mcp-registry.ts` — Registry of available MCP servers
- [ ] Create `src/main/mcp/mcp-manager.ts` — Connection management, reconnection, health checks
- [ ] SSE-based MCP server support
- [ ] Per-server authentication handling
- [ ] Event emission when tools are available
- [ ] Request queuing when disconnected

### 1.2 Assistant Service
- [ ] Create `src/main/services/assistant/assistant-service.ts` — Main service
- [ ] Create `src/main/services/assistant/intent-classifier.ts` — Classify: quick_command | task_creation | conversation
- [ ] Create `src/main/services/assistant/command-executor.ts` — Route commands to MCP/service
- [ ] Intent rules: note/remember → notes, create task/build → task dashboard, play → spotify, open → launcher, multi-sentence → conversation

### 1.3 Assistant IPC Channels
- [ ] Add `assistant.sendCommand` to ipc-contract.ts
- [ ] Add `assistant.getHistory` to ipc-contract.ts
- [ ] Add `event:assistant.response` to ipc-contract.ts
- [ ] Add `event:assistant.thinking` to ipc-contract.ts
- [ ] Create `src/main/ipc/handlers/assistant-handlers.ts`
- [ ] Register handlers in `src/main/ipc/index.ts`

### 1.4 Assistant UI
- [ ] Create `src/renderer/features/assistant/` feature folder
- [ ] Create `AssistantPage.tsx` — Main page component
- [ ] Create `CommandInput.tsx` — Always-visible input at bottom
- [ ] Create `ResponseStream.tsx` — Shows AI responses
- [ ] Create `QuickActions.tsx` — Common action buttons
- [ ] Create `src/renderer/features/assistant/api/` — React Query hooks
- [ ] Create `src/renderer/features/assistant/hooks/` — Event hooks
- [ ] Create `src/renderer/features/assistant/store.ts` — Zustand store
- [ ] Add route `/assistant` to router
- [ ] Add sidebar navigation entry

### 1.5 Shared Types for Assistant
- [ ] Add `AssistantCommand` type to `src/shared/types/`
- [ ] Add `AssistantResponse` type
- [ ] Add `IntentType` union type
- [ ] Add `CommandHistory` type

---

## WORKSTREAM 2: Communication Integrations (Slack & Discord)

### 2.1 Slack MCP Server
- [ ] Create `src/main/mcp-servers/slack/index.ts` — MCP server entry
- [ ] Create `src/main/mcp-servers/slack/slack-client.ts` — Slack Web API wrapper
- [ ] Create `src/main/mcp-servers/slack/tools.ts` — MCP tool definitions
- [ ] Implement `slack_send_message` tool
- [ ] Implement `slack_read_channel` tool
- [ ] Implement `slack_search` tool
- [ ] Implement `slack_get_threads` tool
- [ ] Implement `slack_set_status` tool
- [ ] Implement `slack_list_channels` tool
- [ ] Standup parser (#standup channel Y: T: B:)

### 2.2 Discord MCP Server
- [ ] Create `src/main/mcp-servers/discord/index.ts`
- [ ] Create `src/main/mcp-servers/discord/discord-client.ts`
- [ ] Create `src/main/mcp-servers/discord/tools.ts`
- [ ] Implement `discord_send_message` tool
- [ ] Implement `discord_call_user` tool (deeplink)
- [ ] Implement `discord_read_channel` tool
- [ ] Implement `discord_list_servers` tool
- [ ] Implement `discord_set_status` tool

### 2.3 Notification System
- [ ] Create `src/main/services/notifications/notification-service.ts`
- [ ] Create `src/main/services/notifications/watchers/slack-watcher.ts`
- [ ] Create `src/main/services/notifications/watchers/github-watcher.ts`
- [ ] Notification rules engine (user-defined rules)
- [ ] Rules stored in settings

### 2.4 Communication UI
- [ ] Create `src/renderer/features/communications/CommunicationsPage.tsx`
- [ ] Create `SlackPanel.tsx` — Quick Slack actions
- [ ] Create `DiscordPanel.tsx` — Quick Discord actions
- [ ] Create `NotificationRules.tsx` — Configure notification rules
- [ ] Add route and sidebar entry

### 2.5 Slack OAuth
- [ ] Create `src/main/auth/slack-oauth.ts` — OAuth2 flow
- [ ] Token storage in electron safeStorage
- [ ] Token refresh handling

---

## WORKSTREAM 3: Productivity Integrations (GitHub, Calendar, Spotify)

### 3.1 GitHub MCP Server
- [ ] Create `src/main/mcp-servers/github/index.ts`
- [ ] Create `src/main/mcp-servers/github/github-client.ts`
- [ ] Create `src/main/mcp-servers/github/tools.ts`
- [ ] Implement `github_list_prs` tool
- [ ] Implement `github_get_pr` tool
- [ ] Implement `github_review_pr` tool
- [ ] Implement `github_list_issues` tool
- [ ] Implement `github_create_issue` tool
- [ ] Implement `github_get_notifications` tool
- [ ] Implement `github_watch_repo` tool
- [ ] PR notification integration
- [ ] Replace GitHub stub page with real implementation

### 3.2 Google Calendar MCP Server
- [ ] Create `src/main/mcp-servers/calendar/index.ts`
- [ ] Create `src/main/mcp-servers/calendar/calendar-client.ts`
- [ ] Create `src/main/mcp-servers/calendar/tools.ts`
- [ ] Implement `calendar_list_events` tool
- [ ] Implement `calendar_create_event` tool
- [ ] Implement `calendar_update_event` tool
- [ ] Implement `calendar_delete_event` tool
- [ ] Implement `calendar_get_free_busy` tool
- [ ] Morning summary generation
- [ ] Meeting reminders

### 3.3 Spotify MCP Server
- [ ] Create `src/main/mcp-servers/spotify/index.ts`
- [ ] Create `src/main/mcp-servers/spotify/spotify-client.ts`
- [ ] Create `src/main/mcp-servers/spotify/tools.ts`
- [ ] Implement `spotify_play` tool
- [ ] Implement `spotify_pause` tool
- [ ] Implement `spotify_next` / `spotify_previous` tools
- [ ] Implement `spotify_search` tool
- [ ] Implement `spotify_get_playing` tool
- [ ] Implement `spotify_set_volume` tool
- [ ] Implement `spotify_add_to_queue` tool
- [ ] Natural language play commands

### 3.4 Browser Control
- [ ] Create `src/main/mcp-servers/browser/index.ts`
- [ ] Create `src/main/mcp-servers/browser/tools.ts`
- [ ] Implement `browser_open_url` tool (shell.openExternal)
- [ ] Implement `browser_search` tool
- [ ] Implement `browser_open_app` tool

### 3.5 OAuth Manager
- [ ] Create `src/main/auth/oauth-manager.ts` — Generic OAuth2 flow
- [ ] Create `src/main/auth/token-store.ts` — Secure token storage (safeStorage)
- [ ] Create `src/main/auth/providers/google.ts`
- [ ] Create `src/main/auth/providers/spotify.ts`
- [ ] Create `src/main/auth/providers/github.ts`

### 3.6 Productivity UI
- [ ] Create `src/renderer/features/productivity/ProductivityPage.tsx`
- [ ] Create `CalendarWidget.tsx` — Today's schedule
- [ ] Create `SpotifyWidget.tsx` — Now playing + controls
- [ ] Create `GitHubWidget.tsx` — PR/notification summary
- [ ] Add route and sidebar entry

---

## WORKSTREAM 4: Fitness Dashboard

### 4.1 Withings MCP Server
- [ ] Create `src/main/mcp-servers/withings/index.ts`
- [ ] Create `src/main/mcp-servers/withings/withings-client.ts`
- [ ] Create `src/main/mcp-servers/withings/tools.ts`
- [ ] Implement `withings_get_measurements` tool
- [ ] Implement `withings_get_weight_history` tool
- [ ] Implement `withings_get_body_composition` tool
- [ ] Implement `withings_sync` tool

### 4.2 Fitness Service
- [ ] Create `src/main/services/fitness/fitness-service.ts`
- [ ] Create `src/main/services/fitness/workout-store.ts`
- [ ] Create `src/main/services/fitness/models.ts` — Workout, Exercise, Set types
- [ ] Implement `fitness_log_workout` tool
- [ ] Implement `fitness_log_weight` tool
- [ ] Implement `fitness_get_stats` tool
- [ ] Implement `fitness_get_progress` tool
- [ ] Natural language workout parser

### 4.3 Fitness UI
- [ ] Create `src/renderer/features/fitness/FitnessPage.tsx`
- [ ] Create `WeightChart.tsx` — Weight trend (Recharts)
- [ ] Create `BodyComposition.tsx` — Body comp breakdown
- [ ] Create `WorkoutLog.tsx` — Recent workouts list
- [ ] Create `WorkoutForm.tsx` — Log new workout
- [ ] Create `StatsOverview.tsx` — Summary stats
- [ ] Add route and sidebar entry

### 4.4 Fitness Goals
- [ ] Create `src/main/services/fitness/goals-store.ts`
- [ ] Create `GoalsPanel.tsx` — Set and view goals
- [ ] Weight goal tracking
- [ ] Workout frequency goals
- [ ] Lift progression goals

### 4.5 Withings OAuth & Sync
- [ ] Create `src/main/auth/providers/withings.ts`
- [ ] Background sync (every 4 hours)
- [ ] Local storage for offline access
- [ ] New measurement notifications

---

## WORKSTREAM 5: Advanced Project Management

### 5.1 Enhanced Project Model
- [ ] Update `src/shared/types/project.ts` — Add `type`, `subprojects` fields
- [ ] Add `SubProject` type
- [ ] Add `Worktree` type
- [ ] Update IPC contract for new project fields

### 5.2 Git Service
- [ ] Create `src/main/services/git/git-service.ts` — Git operations wrapper
- [ ] Create `src/main/services/git/worktree-service.ts` — Worktree management
- [ ] Create `src/main/services/git/polyrepo-service.ts` — Multi-repo coordination
- [ ] Implement `git_status`, `git_branches`, `git_create_branch`, `git_switch_branch`
- [ ] Implement `git_create_worktree`, `git_remove_worktree`
- [ ] Implement `git_detect_structure` — Detect mono/poly-repo
- [ ] Install `simple-git` npm package

### 5.3 Worktree UI
- [ ] Create `src/renderer/features/projects/ProjectSetup.tsx`
- [ ] Create `WorktreeManager.tsx`
- [ ] Create `BranchSelector.tsx`
- [ ] Create `SubprojectSelector.tsx`

### 5.4 Task-Worktree Integration
- [ ] Update `CreateTaskModal` with worktree options
- [ ] Auto-create worktree on task start
- [ ] Show worktree path in task detail
- [ ] Terminal opens in worktree directory

### 5.5 Merge Workflow
- [ ] Create `src/main/services/merge/merge-service.ts`
- [ ] Diff preview UI
- [ ] Conflict handling UI
- [ ] Merge + cleanup flow

---

## WORKSTREAM 6: Notes, Daily Planner & Alerts

### 6.1 Notes Service
- [ ] Create `src/main/services/notes/notes-service.ts`
- [ ] Create `src/main/services/notes/notes-store.ts`
- [ ] Add `Note` type to shared types
- [ ] Add IPC channels: `notes.list`, `notes.create`, `notes.update`, `notes.delete`, `notes.search`
- [ ] Add IPC handlers
- [ ] Tagging system
- [ ] Project/task linking

### 6.2 Notes UI
- [ ] Create `src/renderer/features/notes/NotesPage.tsx`
- [ ] Create `NoteEditor.tsx` — Markdown editor
- [ ] Create `NotesList.tsx` — Searchable/filterable list
- [ ] Create `QuickNote.tsx` — Floating quick-add
- [ ] Add route and sidebar entry

### 6.3 Daily Planner Service
- [ ] Create `src/main/services/planner/planner-service.ts`
- [ ] Create `src/main/services/planner/planner-store.ts`
- [ ] Add `DailyPlan`, `ScheduledTask`, `TimeBlock` types
- [ ] Add IPC channels for planner
- [ ] Calendar integration (show meetings as time blocks)
- [ ] Task scheduling integration

### 6.4 Planner UI
- [ ] Create `src/renderer/features/planner/PlannerPage.tsx`
- [ ] Create `DayView.tsx` — Today's plan
- [ ] Create `TimeBlockEditor.tsx` — Visual time block editor
- [ ] Create `GoalsList.tsx` — Daily goals checklist
- [ ] Create `WeekOverview.tsx` — Week at a glance
- [ ] Add route and sidebar entry

### 6.5 Alerts Service
- [ ] Create `src/main/services/alerts/alert-service.ts`
- [ ] Create `src/main/services/alerts/alert-store.ts`
- [ ] Add `Alert` type with recurring support
- [ ] Electron Notification API integration
- [ ] Natural language time parsing (chrono-node)
- [ ] Reminder commands: "remind me at 3pm..."

### 6.6 Alerts UI
- [ ] Create `src/renderer/features/alerts/AlertsPage.tsx`
- [ ] Create `CreateAlertModal.tsx`
- [ ] Create `AlertNotification.tsx`
- [ ] Create `RecurringAlerts.tsx`
- [ ] Add route and sidebar entry

### 6.7 NLP Time Parser
- [ ] Create `src/main/services/nlp/time-parser.ts`
- [ ] Install `chrono-node` dependency
- [ ] Parse: "at 3pm", "tomorrow", "in 2 hours", "every weekday at 9am"

---

## WORKSTREAM 7: System Tray, Background & Voice

### 7.1 System Tray
- [ ] Create `src/main/tray/tray-manager.ts` — Tray icon and menu
- [ ] Create `src/main/tray/quick-input.ts` — Global hotkey popup
- [ ] Minimize to tray option
- [ ] Tray icon status (idle, working, notification)
- [ ] Right-click context menu (show/hide, quick command, recent, active tasks, quit)

### 7.2 Global Hotkeys
- [ ] `Ctrl+Shift+Space` — Quick command popup
- [ ] `Ctrl+Shift+N` — Quick note
- [ ] `Ctrl+Shift+T` — Quick task
- [ ] Configurable hotkeys in settings

### 7.3 Background Service Manager
- [ ] Create `src/main/services/background/background-manager.ts`
- [ ] Create `src/main/services/background/scheduler.ts` — Cron-like scheduler
- [ ] Schedule: Withings sync, Slack/Discord watching, GitHub notifications, calendar reminders, alert triggers

### 7.4 Voice Input (Future)
- [ ] Create `src/main/services/voice/voice-service.ts`
- [ ] Create `src/main/services/voice/whisper-client.ts`
- [ ] Push-to-talk / hotkey recording
- [ ] Whisper API transcription
- [ ] Route transcription to assistant

### 7.5 Persistent Mode
- [ ] Window mode vs background mode toggle
- [ ] Start minimized to tray setting
- [ ] Keep running on window close
- [ ] Launch at system startup
- [ ] Background sync intervals

### 7.6 Background Settings UI
- [ ] Create `BackgroundSettings.tsx`
- [ ] Create `HotkeySettings.tsx`
- [ ] Create `TraySettings.tsx`
- [ ] Create `VoiceSettings.tsx` (future)

---

## CROSS-CUTTING: Hub Integration (VISION Phase 2)

### Hub Connection
- [ ] Create `src/main/services/hub/hub-connection.ts` — Connection manager
- [ ] Hub URL + API key configuration in settings
- [ ] WebSocket client for real-time sync
- [ ] REST client for CRUD operations
- [ ] Fallback to local storage when hub unreachable

### Offline Mode
- [ ] Local SQLite cache in Electron app
- [ ] Queue mutations when offline
- [ ] Sync on reconnect
- [ ] Conflict resolution (last-write-wins)

### Data Migration
- [ ] Migrate JSON file storage to SQLite (local cache)
- [ ] Sync local SQLite ↔ hub SQLite
- [ ] Machine-specific data (terminals, paths) stays local

---

## CROSS-CUTTING: Existing Stubs → Real Features

### GitHub Page (Replace Stub)
- [ ] Replace `src/renderer/features/github/index.tsx` stub
- [ ] Create full GitHub feature module (api/, components/, hooks/, store.ts)
- [ ] PR list, issue list, notification views
- [ ] Depends on: GitHub MCP Server (WS3)

### Roadmap Page (Replace Stub)
- [ ] Replace `src/renderer/features/roadmap/index.tsx` stub
- [ ] Create roadmap feature with timeline/milestone views
- [ ] Integration with task system

### Ideation Page (Replace Stub)
- [ ] Replace `src/renderer/features/ideation/index.tsx` stub
- [ ] Create ideation board (brainstorming, idea capture)
- [ ] Integration with notes and tasks

### Changelog (Connect to Real Data)
- [ ] Replace mock data with real version tracking
- [ ] Auto-generate from git tags/commits

### Insights (Connect to Real Data)
- [ ] Replace mock data with real metrics
- [ ] Query actual task completion rates, agent runs, etc.

---

## AGENT REQUIREMENTS PER WORKSTREAM

### WS1 Agents Needed
- `mcp-engineer` — MCP client/registry/manager implementation
- `assistant-engineer` — Assistant service + intent classifier
- Schema Designer → assistant types
- Service Engineer → assistant service
- IPC Handler Engineer → assistant handlers
- Hook Engineer → assistant React Query hooks
- Component Engineer → assistant UI components
- Router Engineer → assistant route

### WS2 Agents Needed
- `integration-engineer` — Slack/Discord MCP servers
- `oauth-engineer` — OAuth2 flow implementation
- `notification-engineer` — Notification service + watchers
- Component Engineer → communication UI

### WS3 Agents Needed
- `integration-engineer` — GitHub/Calendar/Spotify MCP servers
- `oauth-engineer` — OAuth manager + providers
- Component Engineer → productivity UI

### WS4 Agents Needed
- `integration-engineer` — Withings MCP server
- `fitness-engineer` — Workout logging + goals
- Component Engineer → fitness dashboard + charts
- `oauth-engineer` → Withings OAuth

### WS5 Agents Needed
- `git-engineer` — Git/worktree/polyrepo services
- Schema Designer → enhanced project types
- Component Engineer → worktree UI
- Service Engineer → merge service

### WS6 Agents Needed
- Service Engineer → notes, planner, alerts services
- `nlp-engineer` — Time parser (chrono-node)
- Component Engineer → notes, planner, alerts UI
- Hook Engineer → React Query hooks for all 3

### WS7 Agents Needed
- `tray-engineer` — System tray + global hotkeys
- `scheduler-engineer` — Background task scheduler
- Component Engineer → settings UI for background features

---

## PRIORITY ORDER

1. **WS1** (Foundation) — FIRST, others depend on MCP layer
2. **WS6** (Notes/Planner/Alerts) — High user value, fewer external deps
3. **WS5** (Git/Worktrees) — Core coding workflow enhancement
4. **WS3** (GitHub/Calendar/Spotify) — Productivity integrations
5. **WS2** (Slack/Discord) — Communication integrations
6. **WS4** (Fitness) — Personal dashboard
7. **WS7** (System Tray/Voice) — Polish, ties everything together

---

## DEPENDENCIES TO INSTALL

```bash
# WS1: MCP
npm install @modelcontextprotocol/sdk

# WS5: Git
npm install simple-git

# WS6: NLP
npm install chrono-node

# WS4: Charts (already have recharts? verify)
npm install recharts

# WS2: Communication
npm install @slack/web-api discord.js

# WS3: OAuth
# Built-in with Electron (no extra deps for OAuth flow)

# WS7: Voice (future)
# npm install whisper.cpp or use API
```
