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
| Setup/Onboarding Flows | 2 | 3 | 4 | 9 |
| Security Hardening | 3 | 2 | 4 | 9 |

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

### 1c. Hub Bootstrap API Key Endpoint Unprotected
- **File**: `hub/src/routes/auth.ts`
- **Risk**: HIGH — `POST /api/auth/generate-key` is callable by anyone when no keys exist
- **Fix**: Require an environment variable seed or initial passphrase

### 1d. No Rate Limiting on Hub Endpoints
- **Risk**: MEDIUM — All Hub API and webhook endpoints accept unlimited requests
- **Fix**: Add `@fastify/rate-limit` plugin

### 1e. CORS Allows All Origins
- **File**: `hub/src/app.ts` — `origin: true`
- **Risk**: MEDIUM — Any website can call the Hub API if they know the URL + key
- **Fix**: Restrict to known origins (Electron app URL, localhost)

### 1f. WebSocket Auth via Query Parameter
- **File**: `hub/src/app.ts` — `/ws` route skips API key middleware
- **Risk**: MEDIUM — API key in URL is logged by proxies/load balancers
- **Fix**: Use WebSocket protocol header or first-message auth

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

### 2a. No First-Run Onboarding Experience
- **Status**: MISSING (CRITICAL gap for usability)
- **Evidence**: `onboardingCompleted` field exists in `AppSettings` type but is never checked
- **What's needed**:
  1. Detect first launch (no settings file or `onboardingCompleted === false`)
  2. Step-by-step wizard: Claude CLI check → Anthropic API key → OAuth providers → Hub connection
  3. Skip/defer options for optional integrations
  4. Mark complete so it doesn't show again

### 2b. Claude CLI Detection Exists But Is Never Called
- **Handler exists**: `app.checkClaudeAuth` in `app-handlers.ts` — runs `claude --version`
- **Hook exists**: `useClaudeAuth.ts` — calls the IPC channel
- **Component exists**: `AuthNotification.tsx` — displays the notification
- **Gap**: Nothing calls `useClaudeAuth()` on startup or renders `AuthNotification` conditionally
- **Fix**: Wire into `RootLayout.tsx` or onboarding flow

### 2c. Webhook Setup Has No Guided Instructions
- **File**: `WebhookSettings.tsx`
- **What exists**: Input fields for secrets + auto-computed URLs
- **What's missing**: Step-by-step instructions linking to Slack app creation, GitHub webhook setup, scope requirements, test/ping button

### 2d. OAuth Provider Setup Has No Validation
- **File**: `OAuthProviderSettings.tsx`
- **What exists**: Client ID + Secret input forms per provider
- **What's missing**: Credential validation before saving, links to provider developer consoles, required scope documentation

### 2e. Hub Connection Setup Has No Pre-Save Validation
- **File**: `HubSettings.tsx`
- **What exists**: URL + API key form, connect/disconnect buttons
- **What's missing**: Ping/health-check before saving config, error messages for unreachable URLs

### 2f. No Environment Variable Documentation
- **Needed but undocumented**: `ANTHROPIC_API_KEY`, OAuth provider env vars, `HUB_API_KEY`, `LOG_LEVEL`, `DATABASE_URL`
- **Fix**: Create `.env.example` with all supported variables + descriptions

---

## 3. HIGH — Wiring Gaps (Components Exist But Aren't Connected)

### 3a. Communications — Action Buttons Are No-Ops
- **Files**: `SlackPanel.tsx:40`, `DiscordPanel.tsx:40`
- **Evidence**: `// TODO: Wire to MCP tool call` — `handleAction()` only logs a warning
- **What exists**: MCP servers for both Slack and Discord with full tool definitions
- **Fix**: Wire action buttons → MCP manager tool calls (send_message, read_channel, search, set_status)
- **Scope**: ~100 lines per panel (modal UI + MCP call)

### 3b. DailyStats — tasksCompleted Still Hardcoded to 0
- **File**: `DailyStats.tsx:13`
- **Evidence**: `// TODO: Wire tasksCompleted when task tracking is available`
- **Fix**: Query `tasks.list` filtered to today's date + `status === 'done'`, count results

### 3c. 7 IPC Events Defined But Not Fully Wired

| Event | Emitted? | Listened? | Issue |
|-------|----------|-----------|-------|
| `event:alert.changed` | NO | NO | Defined in contract but never emitted |
| `event:app.updateAvailable` | NO | NO | Stub for electron-updater (not implemented) |
| `event:app.updateDownloaded` | NO | NO | Stub for electron-updater (not implemented) |
| `event:assistant.commandCompleted` | YES | NO | Emitted but nothing listens |
| `event:git.worktreeChanged` | YES | NO | Emitted but no renderer listener |
| `event:hub.connectionChanged` | YES | NO | Emitted but no global status indicator |
| `event:hub.syncCompleted` | YES | NO | Emitted but no sync feedback in UI |

### 3d. 5 IPC Invoke Channels Have No Renderer Usage
- `tasks.update` — renderer uses `tasks.updateStatus` variant instead
- `terminals.invokeClaudeCli` — reserved, no UI trigger
- `changelog.addEntry` — read-only changelog viewer
- `github.createIssue` — handler exists, no UI button wires to it
- `app.getVersion` — internal use only

### 3e. Calendar-Planner Integration Missing
- **Both exist**: CalendarWidget shows Google Calendar events, Planner manages time blocks
- **Gap**: No overlay of calendar events in planner view, no syncing events as time blocks
- **VISION reference**: "Calendar integrations overlay on planner"

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
3. Protect Hub bootstrap endpoint
4. Add rate limiting to Hub
5. Fix CORS to explicit origins
6. Fix WebSocket auth

### P1 — Wiring Gaps (Components Exist, Just Need Connection)
7. Wire Slack/Discord action buttons to MCP tools
8. Wire DailyStats tasksCompleted to real query
9. Wire Claude CLI auth check into app startup / RootLayout
10. Add listeners for 4 emitted-but-unlistened events (hub.connectionChanged, hub.syncCompleted, git.worktreeChanged, assistant.commandCompleted)
11. Wire Calendar overlay into Planner view

### P2 — Setup & Onboarding
12. Build first-run onboarding wizard
13. Add webhook setup instructions + test/ping button
14. Add OAuth credential validation before saving
15. Create `.env.example` with all supported variables
16. Hub connection pre-save validation (ping before save)

### P3 — Missing Features (High Value)
17. Natural language time parser (chrono-node)
18. Agent queue + parallelism config
19. Cost tracking (parse Claude CLI token output)
20. My Work view (cross-project tasks)
21. Merge workflow UI (diff preview + conflict resolution)
22. Changelog auto-generation from git
23. Weekly review auto-generation

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
