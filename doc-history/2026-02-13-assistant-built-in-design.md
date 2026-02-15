# Built-In Persistent Assistant — Full Design

**Date**: 2026-02-13
**Status**: IMPLEMENTED — all tasks complete, typecheck + lint clean
**Scope**: Remove standalone Assistant page, embed assistant into top nav as a global command bar, wire Slack/GitHub webhooks through Hub for external task creation, replace regex intent classifier with Claude API.

---

## 1. Philosophy

The assistant is NOT a chatbot page. It is a **background service** embedded in the app shell — always reachable from the top nav, always listening via webhooks. Its job: take cognitive load off the user by turning natural language from any source (keyboard, Slack, GitHub) into real actions (tasks, notes, time blocks, reminders).

No mock data. No stubs. Every path either executes a real action against a real service, or tells the user exactly what configuration is missing.

---

## 2. Architecture

```
                    ┌───────────────────────────────────────────┐
                    │              Electron App                  │
                    │  ┌────────────────────────────────────┐   │
                    │  │         Command Bar (top nav)       │   │
                    │  │  [icon] [___________________] [⏎]  │   │
                    │  └───────────┬────────────────────────┘   │
                    │              │ IPC: assistant.sendCommand  │
                    │  ┌───────────▼────────────────────────┐   │
                    │  │       Assistant Service (main)      │   │
                    │  │  ┌──────────┐  ┌────────────────┐  │   │
                    │  │  │ Fast Path│  │ Claude API Path│  │   │
                    │  │  │ (regex)  │  │ (structured)   │  │   │
                    │  │  └────┬─────┘  └───────┬────────┘  │   │
                    │  │       └───────┬─────────┘          │   │
                    │  │               ▼                     │   │
                    │  │       Command Executor              │   │
                    │  │  ┌─────┬──────┬──────┬─────────┐   │   │
                    │  │  │Notes│Tasks │Plann.│Alerts   │   │   │
                    │  │  │Svc  │Svc   │Svc   │Svc      │   │   │
                    │  │  └─────┴──────┴──────┴─────────┘   │   │
                    │  └────────────────────────────────────┘   │
                    │              ▲                             │
                    │              │ WebSocket (hub relay)       │
                    └──────────────┼────────────────────────────┘
                                   │
                    ┌──────────────┼────────────────────────────┐
                    │         Hub Server (Docker)               │
                    │              │                             │
                    │  ┌───────────┴────────────────────────┐   │
                    │  │      Webhook Router                 │   │
                    │  │  POST /api/webhooks/slack            │   │
                    │  │  POST /api/webhooks/github           │   │
                    │  └───────────┬────────────────────────┘   │
                    │              │                             │
                    │  ┌───────────▼────────────────────────┐   │
                    │  │  Webhook Processor                   │   │
                    │  │  - Validates signatures               │   │
                    │  │  - Extracts command text               │   │
                    │  │  - Creates task/note in Hub DB         │   │
                    │  │  - Broadcasts to Electron via WS       │   │
                    │  │  - Responds to Slack/GitHub             │   │
                    │  └────────────────────────────────────┘   │
                    └───────────────────────────────────────────┘
                                   ▲           ▲
                                   │           │
                    ┌──────────────┘           └──────────────┐
                    │ Slack                     GitHub          │
                    │ /claude or @Claude        @claudeassistant│
                    │ in any channel/thread     in PR comments  │
                    └─────────────────────────────────────────┘
```

### Why the Hub handles webhooks (not Electron directly)

1. **Always reachable** — Hub runs 24/7 in Docker. Electron may be closed.
2. **Public URL** — Hub can be exposed via nginx/cloudflare. Electron cannot.
3. **Fast response** — Slack requires a 3-second response. Hub responds immediately, broadcasts to Electron for enrichment.
4. **Single webhook endpoint** — No need for each client to register its own webhook.

### Data flow for external triggers

```
Slack/GitHub → Hub webhook endpoint → Hub validates signature
  → Hub creates item in Hub SQLite (task/note/capture)
  → Hub responds to Slack/GitHub in-thread with confirmation
  → Hub broadcasts WebSocket message to all connected Electron clients
  → Electron receives broadcast, creates item locally, updates UI
```

---

## 3. Command Bar — Top Nav

### Location

Replace the current `ProjectTabBar` header with a unified top bar that includes both project tabs AND the command bar.

**Current layout:**
```
┌──────────┬─────────────────────────────────────────────┐
│ Sidebar  │ ProjectTabBar                                │
│          ├─────────────────────────────────────────────┤
│          │ <Outlet /> (page content)                    │
└──────────┴─────────────────────────────────────────────┘
```

**New layout:**
```
┌──────────┬─────────────────────────────────────────────┐
│ Sidebar  │ TopBar                                       │
│          │ [ProjectTabs...] [CommandBar___________] [⏎] │
│          ├─────────────────────────────────────────────┤
│          │ <Outlet /> (page content)                    │
└──────────┴─────────────────────────────────────────────┘
```

### Component: `TopBar.tsx`

Replaces `ProjectTabBar`. Contains:
- **Left**: Project tabs (same as current ProjectTabBar, slightly compressed)
- **Right**: Command bar input + submit button

### Component: `CommandBar.tsx`

```
┌──────────────────────────────────────────┐
│ ⌘  Ask Claude...                    [⏎]  │
└──────────────────────────────────────────┘
```

**Behavior:**
- Single-line text input, always visible
- Placeholder: "Ask Claude... (notes, tasks, reminders)"
- Submit on Enter
- Keyboard shortcut: `Ctrl+K` / `Cmd+K` to focus
- Shows inline loading spinner while processing
- Shows toast notification with result (success/error)
- Up/Down arrows cycle through command history
- Escape clears input and blurs

**States:**
1. **Idle** — Shows placeholder
2. **Focused** — Cursor in input, placeholder fades
3. **Processing** — Input disabled, spinner shows
4. **Result** — Toast appears below with response, input clears

### Response Toast

Shown below the command bar as a small floating element, auto-dismisses after 4 seconds:

```
┌─────────────────────────────────────────┐
│ ✓ Task created: "Fix type errors in PR" │
│   Added to today's plan                 │
└─────────────────────────────────────────┘
```

Uses existing theme colors: `bg-card`, `border-border`, `text-foreground`.

---

## 4. Enhanced Assistant Service

### 4a. Intent Classification — Two-Tier System

**Tier 1: Fast Path (regex, sync, <1ms)**

Keep the existing regex rules for deterministic commands where regex is reliable:

| Prefix | Intent | Action |
|--------|--------|--------|
| `note:` or `remember` | quick_command / notes | Create note |
| `#standup` | quick_command / standup | Create standup note |
| `remind` or `alert` | quick_command / reminder | Create alert |
| `play`, `pause`, `skip`, `next`, `previous`, `volume` | quick_command / spotify | Control Spotify |
| `open` or `launch` | quick_command / launcher | Open URL/app |

**Tier 2: Smart Path (Claude API, async, ~500ms)**

For anything that doesn't match a regex rule, use Claude API for structured classification:

```typescript
// System prompt for intent classification
const CLASSIFIER_SYSTEM_PROMPT = `You are an intent classifier for a developer productivity app.
Classify the user's input into exactly one action. Respond with JSON only.

Available actions:
- create_task: Create a task for a project (extract: title, description, projectName?)
- create_time_block: Add to today's schedule (extract: label, startTime, endTime, type)
- create_note: Save a note (extract: title, content, tags?)
- create_reminder: Set a reminder (extract: message, triggerAt)
- search: Search across tasks/notes/projects (extract: query, scope?)
- conversation: General question that needs a conversational answer

Respond with:
{"action": "...", "entities": {...}, "confidence": 0.0-1.0}`;
```

**API call:**
- Model: `claude-haiku-4-5-20251001` (fast, cheap, sufficient for classification)
- Max tokens: 200
- Temperature: 0
- Input: user's command text
- Output: structured JSON with action + entities

**Fallback chain:**
1. Try regex fast path
2. If no match → call Claude API
3. If API fails (no key, network error) → fall back to `conversation` intent with Claude CLI

### 4b. Expanded Command Executor

New capabilities beyond current:

| Action | Service | Method |
|--------|---------|--------|
| `create_task` | TaskService | `createTask(draft)` |
| `create_time_block` | PlannerService | `addTimeBlock(todayDate, block)` |
| `create_note` | NotesService | `createNote(data)` |
| `create_reminder` | AlertService | `createAlert(data)` |
| `search` | NotesService + TaskService | `searchNotes(q)` + task search |
| `conversation` | Claude CLI | `claude --print -p "..."` |

**Task creation flow:**
```
Input: "fix the login redirect bug"
→ Claude classifies: {action: "create_task", entities: {title: "Fix login redirect bug"}}
→ Executor: calls taskService.createTask({title, description, projectId: activeProjectId})
→ Also: calls plannerService.addTimeBlock(today, {label: title, type: 'focus'})
→ Response: "Task created: 'Fix login redirect bug' — added to today's plan"
```

**Time block creation flow:**
```
Input: "block 2-3pm for code review"
→ Claude classifies: {action: "create_time_block", entities: {label: "Code review", startTime: "14:00", endTime: "15:00", type: "focus"}}
→ Executor: calls plannerService.addTimeBlock(today, block)
→ Response: "Time block added: Code review 2:00 PM – 3:00 PM"
```

### 4c. Context Awareness

The assistant receives context about the current state:

```typescript
interface AssistantContext {
  activeProjectId: string | null;
  activeProjectName: string | null;
  currentPage: string;        // e.g. '/projects/abc/tasks'
  todayDate: string;           // '2026-02-13'
}
```

This context is passed with every `assistant.sendCommand` call so the assistant can:
- Create tasks in the active project (not requiring the user to specify which project)
- Add time blocks to today's plan
- Know what page the user is on for contextual actions

### 4d. AssistantService Interface Changes

```typescript
export interface AssistantService {
  /** Process a command from any source (UI, Slack, GitHub). */
  sendCommand: (input: string, context?: AssistantContext) => Promise<AssistantResponse>;
  /** Process a webhook-triggered command. */
  processWebhookCommand: (command: WebhookCommand) => Promise<AssistantResponse>;
  /** Get command history entries, newest first. */
  getHistory: (limit?: number) => CommandHistoryEntry[];
  /** Clear all command history. */
  clearHistory: () => void;
}
```

---

## 5. Hub Webhook System

### 5a. Slack Webhook Route

**File:** `hub/src/routes/webhooks/slack.ts`

**Endpoints:**

```
POST /api/webhooks/slack/commands     — Slash command handler (/claude)
POST /api/webhooks/slack/events       — Event subscription (app_mention)
POST /api/webhooks/slack/interactions  — Interactive component callbacks
```

**Slash command flow (`/claude fix the login bug`):**

```
1. Slack sends POST to /api/webhooks/slack/commands
2. Hub validates request signature (HMAC-SHA256 with signing secret)
3. Hub extracts:
   - command text: "fix the login bug"
   - user_id, user_name
   - channel_id, channel_name
   - response_url (for deferred responses)
4. Hub creates capture in SQLite:
   INSERT INTO captures (text, source, source_id, source_channel, created_at)
   VALUES ('fix the login bug', 'slack', 'U123', '#qa', now())
5. Hub broadcasts WebSocket message:
   {type: 'webhook', source: 'slack', action: 'command', data: {...}}
6. Hub responds to Slack immediately (within 3s):
   {"response_type": "ephemeral", "text": "✓ Got it — creating task: 'Fix the login bug'"}
7. Electron receives WS message, processes through assistant service
8. Electron creates task locally
9. (Optional) Electron calls Hub API to update Slack thread via response_url
```

**App mention flow (`@Claude Assistant add this to my tasks`):**

```
1. Slack sends event to /api/webhooks/slack/events
2. Hub validates, extracts mention text (strips bot mention prefix)
3. Hub captures the Slack message context:
   - thread_ts (for thread context)
   - channel
   - user
   - permalink (constructed from channel + ts)
4. Hub creates capture with full context
5. Hub broadcasts to Electron
6. Hub posts ephemeral response in channel
```

**Slack App Configuration Required:**

| Setting | Value |
|---------|-------|
| Slash Command | `/claude` with request URL `https://<hub>/api/webhooks/slack/commands` |
| Event Subscription | `app_mention` with request URL `https://<hub>/api/webhooks/slack/events` |
| Bot Token Scopes | `chat:write`, `channels:history`, `groups:history`, `users:read` |
| Signing Secret | Stored in Hub settings (via Settings page) |
| Bot OAuth Token | Stored in Hub settings (via Settings page) |

### 5b. GitHub Webhook Route

**File:** `hub/src/routes/webhooks/github.ts`

**Endpoint:**

```
POST /api/webhooks/github
```

**PR comment flow (`@claudeassistant create a task to fix the type errors`):**

```
1. GitHub sends issue_comment or pull_request_review_comment event
2. Hub validates webhook signature (HMAC-SHA256 with webhook secret)
3. Hub checks if comment body contains @claudeassistant (case-insensitive)
4. Hub extracts:
   - Command text (everything after @claudeassistant)
   - Repository: owner/name
   - PR number
   - Comment author
   - PR title, branch, URL
5. Hub creates capture in SQLite:
   INSERT INTO captures (text, source, source_id, source_url, project_id, created_at)
   VALUES ('fix type errors', 'github', 'owner/repo#42', 'https://...', project_id, now())
6. Hub broadcasts to Electron:
   {type: 'webhook', source: 'github', action: 'command', data: {
     command: 'create a task to fix the type errors',
     repo: 'owner/repo',
     prNumber: 42,
     prTitle: 'Add user auth',
     prUrl: 'https://github.com/...',
     author: 'parke'
   }}
7. Hub responds to GitHub with a PR comment:
   POST /repos/owner/repo/issues/42/comments
   Body: "✓ Task created: 'Fix the type errors'\n\n— Claude Assistant"
8. Electron receives WS message, creates task in matching project
```

**GitHub Webhook Configuration Required:**

| Setting | Value |
|---------|-------|
| Payload URL | `https://<hub>/api/webhooks/github` |
| Content type | `application/json` |
| Secret | Stored in Hub settings |
| Events | `Issue comments`, `Pull request review comments` |

**Project matching logic:**
When a GitHub webhook arrives, the Hub broadcasts the repo name. Electron matches it against projects that have `githubRepo` set in their project settings. If no match, the task is created as a standalone capture.

### 5c. Hub Settings for Webhooks

New settings stored in Hub SQLite `settings` table:

| Key | Description |
|-----|-------------|
| `slack.botToken` | Slack Bot OAuth Token (xoxb-...) |
| `slack.signingSecret` | Slack App Signing Secret |
| `github.webhookSecret` | GitHub Webhook Secret |

These are configured from the Electron Settings page and synced to the Hub.

### 5d. Hub Database Changes

New columns on `captures` table (or create if not exists):

```sql
CREATE TABLE IF NOT EXISTS webhook_commands (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,          -- 'slack' | 'github' | 'manual'
  source_id TEXT,                -- user/repo identifier
  source_channel TEXT,           -- Slack channel or GitHub repo
  source_url TEXT,               -- permalink to original message
  command_text TEXT NOT NULL,     -- extracted command
  project_id TEXT,               -- matched project (nullable)
  status TEXT DEFAULT 'pending', -- 'pending' | 'processed' | 'failed'
  result_text TEXT,              -- response sent back
  created_at TEXT NOT NULL,
  processed_at TEXT
);
```

---

## 6. Remove Assistant Page

### What to remove

- Remove `Assistant` from sidebar nav in `Sidebar.tsx`
- Remove `assistantRoute` from `router.tsx`
- Remove `ROUTES.ASSISTANT` usage from sidebar navigation
- Keep the `@features/assistant` module — its hooks and API layer are reused by the command bar
- Remove `AssistantPage.tsx`, `QuickActions.tsx`, `ResponseStream.tsx`, `CommandInput.tsx` components

### What to keep

- `src/main/services/assistant/` — the entire service layer stays
- `src/renderer/features/assistant/api/useAssistant.ts` — React Query hooks stay
- `src/renderer/features/assistant/hooks/useAssistantEvents.ts` — event hooks stay
- `src/shared/types/assistant.ts` — types stay and expand

---

## 7. IPC Contract Changes

### New channels

```typescript
// ── Assistant (expanded) ────────────────────────────────────

'assistant.sendCommand': {
  input: z.object({
    input: z.string(),
    context: z.object({
      activeProjectId: z.string().nullable(),
      activeProjectName: z.string().nullable(),
      currentPage: z.string(),
      todayDate: z.string(),
    }).optional(),
  }),
  output: AssistantResponseSchema,
},

'assistant.getHistory': {
  input: z.object({ limit: z.number().optional() }),
  output: z.array(CommandHistoryEntrySchema),
},

'assistant.clearHistory': {
  input: z.object({}),
  output: z.object({ success: z.boolean() }),
},

// ── Webhook settings ────────────────────────────────────────

'settings.getWebhookConfig': {
  input: z.object({}),
  output: z.object({
    slack: z.object({
      botToken: z.string(),
      signingSecret: z.string(),
      configured: z.boolean(),
    }),
    github: z.object({
      webhookSecret: z.string(),
      configured: z.boolean(),
    }),
  }),
},

'settings.updateWebhookConfig': {
  input: z.object({
    slack: z.object({
      botToken: z.string().optional(),
      signingSecret: z.string().optional(),
    }).optional(),
    github: z.object({
      webhookSecret: z.string().optional(),
    }).optional(),
  }),
  output: z.object({ success: z.boolean() }),
},
```

### New events

```typescript
'event:assistant.commandCompleted': {
  payload: {
    id: string;
    source: 'commandbar' | 'slack' | 'github';
    action: string;
    summary: string;
    timestamp: string;
  },
},

'event:webhook.received': {
  payload: {
    source: 'slack' | 'github';
    commandText: string;
    sourceContext: Record<string, string>;
    timestamp: string;
  },
},
```

---

## 8. Type Definitions

### Updated `src/shared/types/assistant.ts`

```typescript
/**
 * Assistant-related types
 */

export type IntentType = 'quick_command' | 'task_creation' | 'conversation';

/** Expanded action types for Claude API classification */
export type AssistantAction =
  | 'create_task'
  | 'create_time_block'
  | 'create_note'
  | 'create_reminder'
  | 'search'
  | 'spotify_control'
  | 'open_url'
  | 'conversation';

export interface AssistantContext {
  activeProjectId: string | null;
  activeProjectName: string | null;
  currentPage: string;
  todayDate: string;
}

export interface AssistantCommand {
  input: string;
  context?: AssistantContext;
}

export interface AssistantResponse {
  type: 'text' | 'action' | 'error';
  content: string;
  intent?: IntentType;
  action?: AssistantAction;
  metadata?: Record<string, unknown>;
}

export interface CommandHistoryEntry {
  id: string;
  input: string;
  source: 'commandbar' | 'slack' | 'github';
  intent: IntentType;
  action?: AssistantAction;
  responseSummary: string;
  timestamp: string;
}

export interface WebhookCommand {
  source: 'slack' | 'github';
  commandText: string;
  sourceContext: {
    userId?: string;
    userName?: string;
    channelId?: string;
    channelName?: string;
    threadTs?: string;
    permalink?: string;
    repo?: string;
    prNumber?: number;
    prTitle?: string;
    prUrl?: string;
    commentAuthor?: string;
  };
}

export interface WebhookConfig {
  slack: {
    botToken: string;
    signingSecret: string;
    configured: boolean;
  };
  github: {
    webhookSecret: string;
    configured: boolean;
  };
}
```

---

## 9. Settings Page — Webhook Configuration

### New section in SettingsPage: "Assistant & Webhooks"

Add a new section to the existing Settings page (NOT a new page):

```
┌─ Assistant & Webhooks ───────────────────────────────────┐
│                                                          │
│  Anthropic API Key                                       │
│  [••••••••••••••••••••] [Show] [Test]                    │
│  Required for smart command classification               │
│                                                          │
│  ── Slack Integration ──────────────────────────────     │
│  Bot Token (xoxb-...)                                    │
│  [________________________________] [Save]               │
│  Signing Secret                                          │
│  [________________________________] [Save]               │
│  Webhook URL (copy this to Slack App settings):          │
│  https://<hub-url>/api/webhooks/slack/commands            │
│  [Copy]                                                  │
│                                                          │
│  ── GitHub Integration ─────────────────────────────     │
│  Webhook Secret                                          │
│  [________________________________] [Save]               │
│  Webhook URL (copy this to GitHub repo settings):        │
│  https://<hub-url>/api/webhooks/github                    │
│  [Copy]                                                  │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

The webhook URLs are computed from the Hub URL already configured in Settings.

---

## 10. Implementation Plan

### Phase 1: Command Bar UI (renderer only)

**Goal:** Replace ProjectTabBar with TopBar that includes CommandBar.

1. Create `src/renderer/app/layouts/TopBar.tsx` — contains ProjectTabs + CommandBar
2. Create `src/renderer/app/layouts/CommandBar.tsx` — input + submit + toast
3. Create `src/renderer/shared/stores/command-bar-store.ts` — Zustand store for:
   - `isProcessing: boolean`
   - `lastResponse: AssistantResponse | null`
   - `history: string[]` (recent inputs for up/down cycling)
4. Update `RootLayout.tsx` — replace `<ProjectTabBar />` with `<TopBar />`
5. Remove `Assistant` from sidebar nav items in `Sidebar.tsx`
6. Wire CommandBar to existing `assistant.sendCommand` IPC (works with current regex classifier immediately)

**Files created:**
- `src/renderer/app/layouts/TopBar.tsx`
- `src/renderer/app/layouts/CommandBar.tsx`
- `src/renderer/shared/stores/command-bar-store.ts`

**Files modified:**
- `src/renderer/app/layouts/RootLayout.tsx` (swap ProjectTabBar → TopBar)
- `src/renderer/app/layouts/Sidebar.tsx` (remove Assistant nav item)

### Phase 2: Enhanced Intent Classifier

**Goal:** Replace regex-only classifier with two-tier system.

1. Create `src/main/services/assistant/claude-classifier.ts`:
   - Uses Anthropic SDK (already in dependencies) or `claude` CLI with `--print`
   - Takes user input + system prompt
   - Returns structured JSON: `{action, entities, confidence}`
   - Falls back gracefully on API failure
2. Update `src/main/services/assistant/intent-classifier.ts`:
   - Keep regex fast path
   - Add `classifyWithClaude()` async fallback
   - Export new `classifyIntentAsync()` that tries regex first, then Claude
3. Update `src/main/services/assistant/assistant-service.ts`:
   - Use `classifyIntentAsync()` instead of `classifyIntent()`
4. Add `anthropicApiKey` to settings schema + settings service

**Files created:**
- `src/main/services/assistant/claude-classifier.ts`

**Files modified:**
- `src/main/services/assistant/intent-classifier.ts`
- `src/main/services/assistant/assistant-service.ts`
- `src/main/services/settings/settings-service.ts` (add API key to settings)
- `src/shared/ipc-contract.ts` (update assistant channels)
- `src/shared/types/assistant.ts` (expanded types)
- `src/shared/types/settings.ts` (add anthropicApiKey)

### Phase 3: Expanded Command Executor

**Goal:** Wire all action types to real services.

1. Update `src/main/services/assistant/command-executor.ts`:
   - Add `handleCreateTask()` — calls TaskService, optionally adds time block to today
   - Add `handleCreateTimeBlock()` — calls PlannerService
   - Add `handleSearch()` — calls NotesService.searchNotes + project task search
   - Update `handleNotes()` — enrich with auto-tagging
   - Accept `AssistantContext` so actions know the active project/date
2. Update `CommandExecutorDeps` to include TaskService, PlannerService, ProjectService
3. Wire new deps in `src/main/index.ts` where assistant service is created

**Files modified:**
- `src/main/services/assistant/command-executor.ts`
- `src/main/services/assistant/assistant-service.ts` (pass context)
- `src/main/index.ts` (inject new service deps)
- `src/main/ipc/handlers/assistant-handlers.ts` (pass context through)

### Phase 4: Assistant Context from Renderer

**Goal:** Send current app state with every command.

1. Update `useSendCommand` hook to include context:
   ```typescript
   function useSendCommand() {
     const activeProjectId = useLayoutStore(s => s.activeProjectId);
     const projects = useProjects();
     const routerState = useRouterState();

     return useMutation({
       mutationFn: (input: string) => ipc('assistant.sendCommand', {
         input,
         context: {
           activeProjectId,
           activeProjectName: projects.data?.find(p => p.id === activeProjectId)?.name ?? null,
           currentPage: routerState.location.pathname,
           todayDate: new Date().toISOString().slice(0, 10),
         },
       }),
     });
   }
   ```

**Files modified:**
- `src/renderer/features/assistant/api/useAssistant.ts`

### Phase 5: Hub Webhook Routes

**Goal:** Hub receives and processes Slack/GitHub webhooks.

1. Create `hub/src/routes/webhooks/slack.ts`:
   - Slack signature validation (timecode + HMAC-SHA256)
   - Slash command handler
   - Event subscription handler (app_mention + URL verification challenge)
   - Broadcast to connected clients
   - Respond to Slack with confirmation
2. Create `hub/src/routes/webhooks/github.ts`:
   - GitHub HMAC-SHA256 signature validation
   - `issue_comment` + `pull_request_review_comment` event handling
   - `@claudeassistant` mention detection
   - Broadcast to connected clients
   - Reply on PR via GitHub API
3. Create `hub/src/routes/webhooks/index.ts` — registers both routes
4. Create `hub/src/lib/webhook-validator.ts` — shared HMAC validation
5. Update `hub/src/app.ts` — register webhook routes
6. Add webhook_commands table migration in `hub/src/db/database.ts`

**Files created:**
- `hub/src/routes/webhooks/slack.ts`
- `hub/src/routes/webhooks/github.ts`
- `hub/src/routes/webhooks/index.ts`
- `hub/src/lib/webhook-validator.ts`

**Files modified:**
- `hub/src/app.ts` (register webhook routes)
- `hub/src/db/database.ts` (add webhook_commands table)
- `hub/src/lib/types.ts` (add webhook types)

### Phase 6: Electron Webhook Relay

**Goal:** Electron receives Hub WebSocket broadcasts and processes webhook commands.

1. Create `src/main/services/hub/webhook-relay.ts`:
   - Listens for `webhook` type messages from Hub WebSocket
   - Parses into `WebhookCommand` type
   - Passes to `assistantService.processWebhookCommand()`
   - Emits `event:webhook.received` for UI notification
2. Update `src/main/services/assistant/assistant-service.ts`:
   - Add `processWebhookCommand()` method
   - Maps webhook source context to assistant context
   - Matches GitHub repos to projects
3. Create `src/renderer/shared/components/WebhookNotification.tsx`:
   - Toast notification when a webhook command is processed
   - "Slack: Task created from #qa" or "GitHub: Task created from PR #42"

**Files created:**
- `src/main/services/hub/webhook-relay.ts`
- `src/renderer/shared/components/WebhookNotification.tsx`

**Files modified:**
- `src/main/services/assistant/assistant-service.ts`
- `src/main/index.ts` (wire webhook relay)
- `src/renderer/app/layouts/RootLayout.tsx` (add WebhookNotification)

### Phase 7: Webhook Settings UI

**Goal:** Settings page for configuring Slack/GitHub webhook credentials.

1. Create `src/renderer/features/settings/components/WebhookSettings.tsx`:
   - Slack bot token + signing secret inputs
   - GitHub webhook secret input
   - Webhook URL display (computed from Hub URL) with copy button
   - Test connection button for each
2. Add to existing `SettingsPage.tsx` as a new section
3. Add IPC channels for webhook config CRUD
4. Add `webhook-settings-handlers.ts` in Hub + Electron

**Files created:**
- `src/renderer/features/settings/components/WebhookSettings.tsx`
- `src/main/ipc/handlers/webhook-settings-handlers.ts`

**Files modified:**
- `src/renderer/features/settings/components/SettingsPage.tsx`
- `src/shared/ipc-contract.ts`
- `src/main/ipc/index.ts`
- `src/main/services/settings/settings-service.ts`

---

## 11. Full File Manifest

### New Files (15)

| File | Purpose |
|------|---------|
| `src/renderer/app/layouts/TopBar.tsx` | Top bar with project tabs + command bar |
| `src/renderer/app/layouts/CommandBar.tsx` | Global assistant input |
| `src/renderer/shared/stores/command-bar-store.ts` | Command bar UI state |
| `src/main/services/assistant/claude-classifier.ts` | Claude API intent classification |
| `src/main/services/hub/webhook-relay.ts` | Hub WS → assistant service bridge |
| `src/renderer/shared/components/WebhookNotification.tsx` | Webhook action toast |
| `src/renderer/features/settings/components/WebhookSettings.tsx` | Webhook config UI |
| `src/main/ipc/handlers/webhook-settings-handlers.ts` | Webhook settings IPC |
| `hub/src/routes/webhooks/slack.ts` | Slack webhook handler |
| `hub/src/routes/webhooks/github.ts` | GitHub webhook handler |
| `hub/src/routes/webhooks/index.ts` | Webhook route registration |
| `hub/src/lib/webhook-validator.ts` | HMAC signature validation |

### Modified Files (18)

| File | Change |
|------|--------|
| `src/renderer/app/layouts/RootLayout.tsx` | Swap ProjectTabBar → TopBar, add WebhookNotification |
| `src/renderer/app/layouts/Sidebar.tsx` | Remove Assistant nav item |
| `src/renderer/app/router.tsx` | Remove assistantRoute (keep feature module for hooks) |
| `src/main/services/assistant/intent-classifier.ts` | Add async Claude API fallback |
| `src/main/services/assistant/assistant-service.ts` | Add processWebhookCommand, accept context |
| `src/main/services/assistant/command-executor.ts` | Add task/timeblock/search handlers, accept context |
| `src/main/services/settings/settings-service.ts` | Add anthropicApiKey, webhook config |
| `src/main/index.ts` | Wire new deps, webhook relay |
| `src/main/ipc/index.ts` | Register webhook settings handlers |
| `src/main/ipc/handlers/assistant-handlers.ts` | Pass context through |
| `src/shared/ipc-contract.ts` | New channels + updated schemas |
| `src/shared/types/assistant.ts` | Expanded types |
| `src/shared/types/settings.ts` | Add anthropicApiKey |
| `src/renderer/features/assistant/api/useAssistant.ts` | Include context in mutation |
| `src/renderer/features/settings/components/SettingsPage.tsx` | Add webhook section |
| `hub/src/app.ts` | Register webhook routes |
| `hub/src/db/database.ts` | Add webhook_commands table |
| `hub/src/lib/types.ts` | Add webhook message types |

---

## 12. What the User Needs to Configure

After implementation, the user needs to provide:

| Item | Where | Required For |
|------|-------|-------------|
| Anthropic API Key | Settings > Assistant | Smart intent classification |
| Slack Bot Token | Settings > Webhooks > Slack | Slack integration |
| Slack Signing Secret | Settings > Webhooks > Slack | Slack webhook validation |
| Slack App creation | api.slack.com | Slash command + event subscriptions |
| GitHub Webhook Secret | Settings > Webhooks > GitHub | GitHub webhook validation |
| GitHub Webhook setup | Repo Settings > Webhooks | PR comment events |
| Hub URL (already configured) | Settings > Hub | Webhook endpoint base URL |

Everything else is handled by the app. No API keys = no smart classification (falls back to regex + CLI). No Slack config = no Slack integration (command bar still works). No GitHub config = no GitHub integration (command bar still works). Each integration degrades gracefully.

---

## 13. Guard Rails & Anti-Pattern Checks

### Follows existing patterns:
- Services return sync values, handlers wrap with `Promise.resolve()` ✓
- IPC contract is the source of truth ✓
- Feature modules use api/, components/, hooks/, store.ts structure ✓
- React Query for server state, Zustand for UI state ✓
- Named function declarations for components ✓
- `import type` for type-only imports ✓
- `color-mix()` for theme-aware colors (no hardcoded RGBA) ✓

### Does NOT introduce:
- No new Context providers ✓
- No Redux ✓
- No floating promises (all async paths use void or await) ✓
- No `any` types ✓
- No array index as key ✓
- No hardcoded colors outside theme variables ✓
- No mock data anywhere ✓

### Exception: Claude classifier is async
The `claude-classifier.ts` makes an async API call. This is acceptable because:
- It's an external API call (same category as `selectDirectory()`)
- The handler wraps it properly
- The fast path (regex) remains sync for <1ms response on simple commands

---

## 14. End State

After all phases:

1. **Command bar** in top nav — type anything, get real results
2. **Slack** — `/claude fix the login bug` in any channel → task appears in app
3. **GitHub** — `@claudeassistant add task for this` on a PR → task created in project
4. **No Assistant page** — it's built into the shell, not a destination
5. **Smart classification** — Claude API understands natural language, regex handles simple commands
6. **Full context** — knows active project, today's date, current page
7. **Graceful degradation** — works without API key (regex + CLI fallback), works without Slack/GitHub config (command bar only)
