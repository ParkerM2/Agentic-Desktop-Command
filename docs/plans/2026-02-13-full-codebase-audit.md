# Full Codebase Audit — Gaps, Missing Features & Guardrails

**Date**: 2026-02-13
**Sources**: VISION.md, MASTER-CHECKLIST.md, IMPLEMENTATION-PROMPTS.md, full codebase analysis
**Coverage**: 5 parallel audits — VISION mapping, IPC contract, services, renderer features, Hub + setup flows

---

## Executive Summary

**Overall completion: ~70% of VISION.md scope**

| Category | Done | Partial | Missing | Total |
|----------|------|---------|---------|-------|
| Services (main process) | 22 | 2 | 5 | 29 |
| IPC Channels (invoke) | 115 | 0 | 0 | 115 |
| IPC Events (defined) | 23 | 7 | 0 | 30 |
| Renderer Features | 18 | 1 | 3 | 22 |
| Setup/Onboarding Flows | 4 | 1 | 4 | 9 |
| Security Hardening | 7 | 2 | 0 | 9 |

What works well: Core infrastructure is solid — IPC contract has 100% handler coverage, all 22 main services are real implementations (not stubs), 18/19 renderer features are fully wired to real data, and the MCP framework is complete.

What's missing: User-facing setup flows, security hardening, several VISION Tier 3-5 features (voice, screen control, persistent Claude session, cost tracking), and wiring gaps between existing components.

---

## 1. CRITICAL — Security & Data Protection

These must be addressed before any public release or multi-user deployment.

### 1a. OAuth Credentials Stored in Plaintext — DONE
- **File**: `src/main/auth/providers/provider-config.ts`
- **Status**: FIXED (2026-02-13)
- **Implementation**: OAuth client credentials (clientId, clientSecret) are now encrypted using Electron `safeStorage` (OS-level encryption: Keychain on macOS, DPAPI on Windows, libsecret on Linux). Falls back to base64 when safeStorage is unavailable (CI/testing). Existing plaintext credentials are automatically migrated to encrypted format on first read.

### 1b. Webhook Secrets Stored in Plaintext — DONE
- **File**: `src/main/services/settings/settings-service.ts`
- **Status**: FIXED (2026-02-13)
- **Implementation**: Webhook secrets (Slack bot token, Slack signing secret, GitHub webhook secret) are now encrypted using Electron `safeStorage`. Same encryption pattern as OAuth credentials with automatic migration of plaintext values.

### 1c. Hub Bootstrap API Key Endpoint Unprotected — DONE
- **File**: `hub/src/routes/auth.ts`
- **Status**: FIXED (2026-02-13)
- **Implementation**: Bootstrap endpoint now requires `HUB_BOOTSTRAP_SECRET` environment variable. The secret is validated using `crypto.timingSafeEqual()` to prevent timing attacks. Returns 403 if secret is missing from env or doesn't match request header.

### 1d. No Rate Limiting on Hub Endpoints — DONE
- **File**: `hub/src/app.ts`
- **Status**: FIXED (2026-02-13)
- **Implementation**: Added `@fastify/rate-limit` with two tiers:
  - **Global**: 100 requests/minute per IP (all endpoints)
  - **Auth routes**: 10 requests/minute per IP (stricter for bootstrap/key generation)

### 1e. CORS Allows All Origins — DONE
- **File**: `hub/src/app.ts`
- **Status**: FIXED (2026-02-13)
- **Implementation**: CORS origin validation now uses `HUB_ALLOWED_ORIGINS` environment variable (comma-separated list). If set, only those origins are allowed. Falls back to `origin: true` if not configured (development mode).

### 1f. WebSocket Auth via Query Parameter — DONE
- **File**: `hub/src/app.ts`, `hub/src/ws/broadcaster.ts`
- **Status**: FIXED (2026-02-13)
- **Implementation**: WebSocket connections now require first-message authentication. Clients must send `{ type: "auth", apiKey: "..." }` as their first message within 5 seconds. The server validates the API key and upgrades to `addAuthenticatedClient()`. Connections that fail to authenticate are closed with code 4001.

### 1g. No API Key Rotation or Expiry
- **File**: `hub/src/routes/auth.ts`
- **Risk**: LOW (single-user) / HIGH (multi-user)
- **Fix**: Add key rotation endpoint, expiry timestamps, revocation

### 1h. Docker Runs as Root
- **File**: `hub/Dockerfile`
- **Risk**: LOW — Container breakout gives root access
- **Fix**: Add `USER node` directive, create non-root user

### 1i. No .dockerignore
- **Risk**: LOW — Build context may include sensitive files
- **Fix**: Create `.dockerignore` excluding `node_modules`, `.env`, `certs/`, `data/`

---

## 2. HIGH — Missing Setup & Onboarding Flows

### 2a. First-Run Onboarding Experience — DONE
- **Status**: FIXED (2026-02-13)
- **Implementation**: Created onboarding feature module with 5-step wizard:
  1. **Welcome** — Introduction to the app
  2. **Claude CLI** — Checks CLI installation and authentication status
  3. **API Key** — Validates Anthropic API key configuration
  4. **Integrations** — Optional OAuth provider setup (skip/defer available)
  5. **Complete** — Marks `onboardingCompleted` and redirects to dashboard
- **Location**: `src/renderer/features/onboarding/` with components, hooks, and store
- **Wiring**: RootLayout checks `onboardingCompleted` and renders wizard on first run

### 2b. Claude CLI Detection Exists But Is Never Called — DONE
- **Handler exists**: `app.checkClaudeAuth` in `app-handlers.ts` — runs `claude --version`
- **Hook exists**: `useClaudeAuth.ts` — calls the IPC channel
- **Component exists**: `AuthNotification.tsx` — displays the notification
- **Status**: FIXED (2026-02-13)
- **Implementation**: `AuthNotification` is already rendered in `RootLayout.tsx` and calls `useClaudeAuth()` on startup. The hook checks Claude CLI authentication status and displays a banner if not authenticated.

### 2c. Webhook Setup Has No Guided Instructions — DONE
- **File**: `WebhookSettings.tsx`
- **Status**: FIXED (2026-02-13)
- **Implementation**: Added collapsible setup instruction sections for both Slack and GitHub webhooks. Each section includes step-by-step guidance with links to developer consoles, required scopes/permissions, and test URL buttons that copy webhook URLs to clipboard for easy testing.

### 2d. OAuth Provider Setup Has No Validation — DONE
- **File**: `OAuthProviderSettings.tsx`
- **Status**: FIXED (2026-02-13)
- **Implementation**: Added OAuth credential validation that tests credentials against provider endpoints before saving. Each provider card now includes links to developer consoles and displays required scopes. Validation feedback shows success/error states with helpful messages.

### 2e. Hub Connection Setup Has No Pre-Save Validation — DONE
- **File**: `HubSettings.tsx`
- **Status**: FIXED (2026-02-13)
- **Implementation**: Added `hub.validateConnection` IPC channel that pings the Hub's `/api/health` endpoint before saving. The HubSettings form now validates the connection and displays success/error feedback before persisting configuration.

### 2f. No Environment Variable Documentation — DONE
- **Status**: FIXED (2026-02-13)
- **Implementation**: Created `.env.example` at project root documenting all supported environment variables including: `ANTHROPIC_API_KEY`, OAuth provider credentials (GitHub, Google, Linear, Notion, Todoist, Withings), Hub configuration (`HUB_API_KEY`, `HUB_BOOTSTRAP_SECRET`, `HUB_ALLOWED_ORIGINS`), and database settings.

---

## 3. HIGH — Wiring Gaps (Components Exist But Aren't Connected)

### 3a. Communications — Action Buttons Are No-Ops — DONE
- **Files**: `SlackPanel.tsx`, `DiscordPanel.tsx`, `SlackActionModal.tsx`, `DiscordActionModal.tsx`
- **Status**: FIXED (2026-02-13)
- **Implementation**: Added `SlackActionModal` and `DiscordActionModal` components that wire panel action buttons to real MCP tool calls via new IPC channels (`mcp.callTool`, `mcp.listConnected`, `mcp.getConnectionState`). Users can now send messages, read channels, search, and set status through the Communications panel.

### 3b. DailyStats — tasksCompleted Still Hardcoded to 0 — DONE
- **File**: `DailyStats.tsx`
- **Status**: FIXED (2026-02-13)
- **Implementation**: DailyStats now uses `useProjectTasks()` to fetch real task data and counts tasks with `status === 'done'` that were completed today (by checking `completedAt` timestamp).

### 3c. 7 IPC Events Defined But Not Fully Wired — PARTIAL (4 of 7 DONE)

| Event | Emitted? | Listened? | Issue |
|-------|----------|-----------|-------|
| `event:alert.changed` | NO | NO | Defined in contract but never emitted |
| `event:app.updateAvailable` | NO | NO | Stub for electron-updater (not implemented) |
| `event:app.updateDownloaded` | NO | NO | Stub for electron-updater (not implemented) |
| `event:assistant.commandCompleted` | YES | YES | **DONE** — HubNotification listens and shows toast |
| `event:git.worktreeChanged` | YES | YES | **DONE** — HubNotification listens and shows toast |
| `event:hub.connectionChanged` | YES | YES | **DONE** — HubNotification listens and shows toast |
| `event:hub.syncCompleted` | YES | YES | **DONE** — HubNotification listens and shows toast |

**Implementation** (2026-02-13): Added `HubNotification` component in `src/renderer/app/components/` with `useHubEvents` hook that listens to all 4 emitted events and displays toast notifications via the existing toast system. Rendered in `RootLayout.tsx`.

### 3d. 5 IPC Invoke Channels Have No Renderer Usage
- `tasks.update` — renderer uses `tasks.updateStatus` variant instead
- `terminals.invokeClaudeCli` — reserved, no UI trigger
- `changelog.addEntry` — read-only changelog viewer
- `github.createIssue` — handler exists, no UI button wires to it
- `app.getVersion` — internal use only

### 3e. Calendar-Planner Integration — DONE
- **Both exist**: CalendarWidget shows Google Calendar events, Planner manages time blocks
- **Status**: FIXED (2026-02-13)
- **Implementation**: Added CalendarOverlay component that displays Google Calendar events directly in the Planner view. Events are shown with distinct visual styling (info color, dashed border) to differentiate them from time blocks. Users can toggle the calendar overlay visibility via a button in the Planner header.

### 3f. Merge Workflow Has No UI
- **Service exists**: `merge-service.ts` with `previewDiff`, `checkConflicts`, `mergeBranch`, `abort`
- **IPC exists**: All 4 channels registered with handlers
- **Gap**: No renderer component for diff preview, conflict resolution, or merge confirmation

### 3g. Worktree Management Has Incomplete UI
- **Service exists**: `worktree-service.ts` with full CRUD
- **Component exists**: `WorktreeManager.tsx` in projects feature
- **Gap**: No task-worktree linking (auto-create worktree on task start)

### 3h. Insights Metrics Are Computed But May Be Shallow
- **Service exists**: `insights-service.ts` aggregates from TaskService, AgentService, ProjectService
- **UI exists**: Full metrics dashboard with charts
- **Gap**: Time-series data depends on tasks having timestamps; if no tasks completed, all metrics are zero

### 3i. Background Manager Handlers Are Empty Placeholders
- **File**: `background-manager.ts`
- **Evidence**: `handleAlertCheck()` and `handleHealthCheck()` only log, don't execute
- **Note**: Alert checking is already handled by `AlertService.startChecking()` (60s polling) — this may be dead code

---

## 4. MEDIUM — Missing VISION Features (Tier 3-5)

### 4a. Persistent Claude Session (Tier 3)
- **VISION**: "Always-on agent maintaining state across all app interactions"
- **Current**: Assistant processes one-shot commands via CLI (`claude --print -p`)
- **Missing**:
  - Background Claude process with persistent conversation state
  - Standing instructions system (per-user preferences)
  - Cross-app memory (remembers past interactions)
  - Anthropic SDK integration (currently shells out to CLI)
- **Scope**: LARGE — requires Anthropic Messages API, conversation persistence, context management

### 4b. Screen Capture & Computer Control (Tier 3)
- **VISION**: "Screenshot capture, mouse/keyboard control, vision API"
- **Current**: Nothing exists
- **Missing**:
  - `desktopCapturer` Electron API for screenshots
  - Vision API (Anthropic) for image analysis
  - Mouse/keyboard automation (robotjs or similar)
- **Scope**: LARGE

### 4c. Voice Interface (Tier 3)
- **VISION**: "Whisper STT, wake word, push-to-talk, TTS"
- **Current**: Nothing exists
- **Missing**:
  - Local speech-to-text (Whisper.cpp or Web Speech API)
  - Wake word detection ("Hey Claude")
  - Text-to-speech responses
  - Microphone permission handling
- **Scope**: LARGE

### 4d. Smart Task Creation (Tier 4)
- **VISION**: "NL description → subtask generation, GitHub issue import, screenshot → task"
- **Current**: Basic task creation via assistant command
- **Missing**:
  - LLM-powered task decomposition
  - GitHub issue URL → task import
  - Screenshot → task with image attachment
  - Voice-to-task
- **Scope**: MEDIUM

### 4e. Agent Queue & Parallelism (Tier 4)
- **Current**: Single agent spawn/stop/pause/resume
- **Missing**:
  - Queue system (FIFO, priority)
  - Parallelism config (max concurrent agents)
  - Auto-chaining (next task on completion)
  - Agent handoff protocols
- **Scope**: MEDIUM

### 4f. Agent Profiles (Tier 4)
- **VISION**: "Per-project Claude configuration: model, temperature, system prompt"
- **Current**: Nothing exists
- **Scope**: SMALL — store in project settings, pass to agent spawn

### 4g. Cost Tracking (Tier 4)
- **VISION**: "Token usage per agent run, spend dashboard"
- **Current**: Hub schema has `tokens_used` and `cost_usd` fields in `agent_runs` table but nothing populates them
- **Missing**:
  - Parse token usage from Claude CLI output
  - Accumulate costs per project/agent
  - Dashboard widget showing spend
- **Scope**: MEDIUM

### 4h. My Work View (Tier 4)
- **VISION**: "Unified view across all projects showing tasks assigned to user"
- **Current**: Tasks are per-project only
- **Missing**: Cross-project task query, dedicated "My Work" page/sidebar item
- **Scope**: SMALL

### 4i. Batch Operations (Tier 4)
- **VISION**: "Move multiple tasks, bulk assign to agents"
- **Current**: Single-task operations only
- **Missing**: Multi-select UI, bulk IPC calls
- **Scope**: SMALL

### 4j. Proactive Suggestions (Tier 5)
- **VISION**: "Stale project detection, parallel task identification, code reuse"
- **Current**: Nothing exists
- **Scope**: LARGE — requires heuristics or LLM analysis

### 4k. Daily Briefing (Tier 5)
- **VISION**: "Morning summary, overnight agent activity, GitHub notifications, blockers"
- **Current**: Nothing exists
- **Missing**: Summary generation, scheduled trigger, notification
- **Scope**: MEDIUM

### 4l. Weekly Review Auto-Generation (Tier 2)
- **VISION**: "Automatic weekly summary from planner data"
- **Current**: Nothing exists
- **Scope**: SMALL — aggregate planner data, format as note

---

## 5. MEDIUM — External Integration Gaps

### 5a. Withings Integration Is Dead Code
- **OAuth provider configured**: `WITHINGS_OAUTH_CONFIG` in `providers/withings.ts`
- **Fitness service references it**: Deduplication by source tag
- **Gap**: No actual Withings API calls, no sync, no MCP server
- **Decision**: Remove dead config OR implement real integration
- **Scope**: MEDIUM if implementing, SMALL if removing

### 5b. Email Integration Missing
- **VISION**: "Email drafting and sending"
- **Current**: Nothing exists
- **Missing**: SMTP service, email composer UI, MCP server for email
- **Scope**: MEDIUM

### 5c. Notification Watchers Missing
- **VISION**: "Watch Slack channels, GitHub repos for relevant events"
- **Current**: Webhooks receive pushed events, but no polling/watching
- **Missing**: `src/main/services/notifications/` — background watchers for Slack/GitHub
- **Scope**: MEDIUM

### 5d. Natural Language Time Parser Missing
- **VISION reference**: IMPLEMENTATION-PROMPTS mentions `chrono-node` integration
- **Current**: Alert reminders use hardcoded 30-minute offset
- **Missing**: Parse "tomorrow at 3pm", "in 2 hours", "next Monday" from assistant input
- **Scope**: SMALL — install chrono-node, wire into intent classifier

### 5e. Changelog Auto-Generation
- **Service exists**: `changelog-service.ts` with `list` and `addEntry`
- **Gap**: No auto-generation from git tags/commits — entries are manual only
- **Scope**: SMALL — parse `git log` between tags, format as entries

### 5f. Electron Auto-Updater
- **IPC events defined**: `event:app.updateAvailable`, `event:app.updateDownloaded`
- **Gap**: `electron-updater` is listed as dependency but never initialized
- **Scope**: SMALL — wire `autoUpdater` in main process, emit events

---

## 6. LOW — Polish & UX Gaps

### 6a. No Global Hub Connection Indicator
- **Current**: Hub status only visible on Settings page
- **Fix**: Add status dot in sidebar footer or top bar

### 6b. No Configurable Hotkeys UI
- **Service exists**: `hotkey-manager.ts` with global hotkey registration
- **Gap**: Hotkeys are hardcoded, no Settings UI to customize them

### 6c. No App Launch at System Startup
- **VISION**: Mentioned in Workstream 7
- **Fix**: Use `app.setLoginItemSettings()` Electron API, add toggle in Settings

### 6d. No Database Migration Versioning
- **Current**: `hub/src/db/schema.sql` is run once on creation
- **Gap**: No migration system for schema changes
- **Fix**: Use `better-sqlite3` migrations or a simple version table

### 6e. No Hub Database Backup Strategy
- **Current**: SQLite file in Docker volume, no backups
- **Fix**: Scheduled `VACUUM INTO` or file copy

### 6f. MCP Client SSE Transport Is Placeholder
- **File**: `mcp/mcp-client.ts:329`
- **Evidence**: Comment indicates SSE transport is not fully implemented
- **Impact**: Only stdio transport works; SSE-based MCP servers won't connect

### 6g. TaskService.executeTask() Is a Stub
- **File**: `src/main/services/project/task-service.ts:313-327`
- **Evidence**: Returns fake agentId, only marks task as in_progress
- **Note**: Real execution is in `AgentService.startAgent()` — this stub is intentional but could be removed or properly delegated

---

## 7. Guardrails for Future Development

### 7a. IPC Contract Discipline
- **Rule**: Every new IPC channel MUST be added to `ipc-contract.ts` with Zod schemas FIRST
- **Rule**: Every channel MUST have a handler AND a renderer hook before merging
- **Rule**: Every event channel MUST have both an emitter and a listener
- **Check**: Run audit script comparing contract channels vs handler registrations

### 7b. No New Mock Data
- **Rule**: Zero hardcoded mock data in any component — use real services or show empty state
- **Rule**: If a service isn't ready, show "Not configured" with a link to Settings
- **Check**: `grep -r "MOCK\|mock\|hardcoded\|fake\|placeholder" src/renderer/`

### 7c. Security Baseline
- **Rule**: All secrets (OAuth creds, webhook secrets, API keys) MUST use `safeStorage` encryption
- **Rule**: No `origin: true` CORS — specify explicit allowed origins
- **Rule**: All Hub endpoints MUST have rate limiting
- **Rule**: WebSocket auth MUST NOT use query parameters
- **Check**: Security review before any public-facing deployment

### 7d. Feature Completeness Standard
- **Rule**: A feature is not "done" until it has: real data source, loading state, empty state, error state, and "not configured" state (if applicable)
- **Rule**: Every button MUST have an onClick handler — no empty/noop buttons
- **Rule**: Every form MUST have onSubmit + validation + error display
- **Check**: `grep -r "TODO\|FIXME\|STUB\|HACK" src/`

### 7e. Type Safety
- **Rule**: Zero `any` types — use `unknown` + narrowing
- **Rule**: Zero `as` type assertions without eslint-disable justification
- **Rule**: `tsc --noEmit` MUST pass clean before every commit
- **Rule**: `npm run lint` MUST pass clean before every commit

### 7f. Service Architecture
- **Rule**: Services return sync values; handlers wrap with `Promise.resolve()`
- **Rule**: Services MUST handle "not configured" gracefully (return null/error, don't throw)
- **Rule**: External API services MUST validate OAuth tokens before making calls
- **Rule**: All file I/O MUST be in services, never in components or handlers

### 7g. Testing (Currently Zero Tests)
- **Current state**: `vitest` is configured but no test files exist
- **Rule**: Critical services (assistant, agent, task, planner) SHOULD have unit tests
- **Rule**: IPC handlers SHOULD have integration tests
- **Minimum**: Test intent classifier patterns, command executor routing, service CRUD operations

---

## 8. Prioritized Action Items

### P0 — Security (Do Before Any Deployment)
1. ~~Encrypt OAuth credentials via safeStorage~~ **DONE** (2026-02-13)
2. ~~Encrypt webhook secrets via safeStorage~~ **DONE** (2026-02-13)
3. ~~Protect Hub bootstrap endpoint~~ **DONE** (2026-02-13)
4. ~~Add rate limiting to Hub~~ **DONE** (2026-02-13)
5. ~~Fix CORS to explicit origins~~ **DONE** (2026-02-13)
6. ~~Fix WebSocket auth~~ **DONE** (2026-02-13)

### P1 — Wiring Gaps (Components Exist, Just Need Connection)
7. ~~Wire Slack/Discord action buttons to MCP tools~~ **DONE** (2026-02-13)
8. ~~Wire DailyStats tasksCompleted to real query~~ **DONE** (2026-02-13)
9. ~~Wire Claude CLI auth check into app startup / RootLayout~~ **DONE** (2026-02-13) — already wired
10. ~~Add listeners for 4 emitted-but-unlistened events (hub.connectionChanged, hub.syncCompleted, git.worktreeChanged, assistant.commandCompleted)~~ **DONE** (2026-02-13)
11. ~~Wire Calendar overlay into Planner view~~ **DONE** (2026-02-13)

### P2 — Setup & Onboarding
12. ~~Build first-run onboarding wizard~~ **DONE** (2026-02-13)
13. ~~Add webhook setup instructions + test/ping button~~ **DONE** (2026-02-13)
14. ~~Add OAuth credential validation before saving~~ **DONE** (2026-02-13)
15. ~~Create `.env.example` with all supported variables~~ **DONE** (2026-02-13)
16. ~~Hub connection pre-save validation (ping before save)~~ **DONE** (2026-02-13)

### P3 — Missing Features (High Value)
17. ~~Natural language time parser (chrono-node)~~ **DONE** (2026-02-13)
18. ~~Agent queue + parallelism config~~ **DONE** (2026-02-13)
19. ~~Cost tracking (parse Claude CLI token output)~~ **DONE** (2026-02-13)
20. ~~My Work view (cross-project tasks)~~ **DONE** (2026-02-13)
21. ~~Merge workflow UI (diff preview + conflict resolution)~~ **DONE** (2026-02-13)
22. ~~Changelog auto-generation from git~~ **DONE** (2026-02-13)
23. ~~Weekly review auto-generation~~ **DONE** (2026-02-13)

### P4 — Missing Features (Large Scope)
24. Persistent Claude session (Anthropic Messages API)
25. Notification watchers (background Slack/GitHub polling)
26. Voice interface (Whisper STT + TTS)
27. Screen capture + computer control
28. Smart task creation (LLM decomposition)
29. Email integration
30. Proactive suggestions / daily briefing

### P5 — Polish
31. Global Hub connection indicator
32. Configurable hotkeys UI
33. App launch at system startup
34. Database migration versioning
35. Electron auto-updater wiring
36. Remove Withings dead code (or implement)
37. Clean up background-manager.ts dead code

---

## Appendix: Files Referenced

**Security fixes**: `hub/src/routes/auth.ts`, `hub/src/app.ts`, `hub/Dockerfile`, `src/main/services/settings/settings-service.ts`, `src/main/auth/providers/provider-config.ts`

**Wiring gaps**: `SlackPanel.tsx`, `DiscordPanel.tsx`, `DailyStats.tsx`, `RootLayout.tsx`, `CalendarWidget.tsx`, `PlannerPage.tsx`

**Setup flows**: `SettingsPage.tsx`, `WebhookSettings.tsx`, `HubSettings.tsx`, `app-handlers.ts`, `useClaudeAuth.ts`, `AuthNotification.tsx`

**Missing services**: No files yet for: notification watchers, voice, screen control, email, NLP time parser

**Dead code candidates**: `background-manager.ts`, `scheduler.ts`, Withings OAuth config, `TaskService.executeTask()` stub
