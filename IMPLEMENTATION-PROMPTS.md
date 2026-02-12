# Claude-UI Expansion: Master Implementation Guide

**Project Location:** `C:\Users\Parke\Desktop\Claude-UI`
**AI Reference Docs:** `C:\Users\Parke\Desktop\Claude-UI\ai-docs\` (copied from Auto-Claude)
**Current State:** Phase 4 complete (services implemented), Phase 5 in progress (build works, dev mode launches)

---

## Overview

Claude-UI is being expanded from a coding-focused task manager into a comprehensive personal AI command center with:

1. **Coding Workspace** (existing) - Task board, kanban, terminals, agents for development
2. **Assistant Mode** (new) - Persistent AI for quick commands, notes, reminders
3. **Integrations Hub** (new) - Slack, Discord, GitHub, Spotify, Calendar, etc.
4. **Fitness Dashboard** (new) - Withings scale integration, workout logging
5. **Project Intelligence** (new) - Poly-repo support, worktree management

---

## Parallel Workstream Breakdown

Each section below is designed to run as a separate Claude Code instance. They are ordered by dependency - Workstream 1 should start first, others can run in parallel after the foundation is laid.


---

## WORKSTREAM 1: Foundation & Architecture (START FIRST)

### Prompt for Claude Code Instance 1:

```
You are working on Claude-UI, an Electron + React + TypeScript desktop application.

**Project:** C:\Users\Parke\Desktop\Claude-UI
**Reference:** Read ai-docs/AUTO-CLAUDE-REFERENCE.md for architecture patterns

## Your Task: Foundation Infrastructure

### 1. Fix the Current Startup Issue
The app builds but exits immediately in dev mode. Debug and fix:
- Run `npm run dev` and capture any errors
- Check if preload script path is correct (index.cjs vs index.mjs)
- Verify electron main process initialization
- Check for unhandled promise rejections

### 2. Create the MCP Integration Layer
Build a generic MCP (Model Context Protocol) client that can connect to multiple MCP servers:

Create: `src/main/mcp/`
- `mcp-client.ts` - Generic MCP client wrapper
- `mcp-registry.ts` - Registry of available MCP servers (spotify, calendar, slack, etc.)
- `mcp-manager.ts` - Manages connections, reconnection, health checks

The MCP client should:
- Support SSE-based MCP servers (standard protocol)
- Handle authentication per server
- Emit events when tools are available
- Queue requests when disconnected

### 3. Create the Assistant Service
Build the persistent assistant daemon that handles quick commands:

Create: `src/main/services/assistant/`
- `assistant-service.ts` - Main service
- `intent-classifier.ts` - Determines if input is: quick_command | task_creation | conversation
- `command-executor.ts` - Routes commands to appropriate MCP/service

Intent classification rules:
- "note: ..." or "remember ..." → quick_command (notes)
- "create task: ..." or "build ..." → task_creation (add to kanban)
- "play ..." → quick_command (spotify)
- "open ..." → quick_command (app launcher)
- Multi-sentence or ambiguous → conversation (send to Claude API)

### 4. Add IPC Channels for Assistant
Update `src/shared/ipc-contract.ts`:
- `assistant.sendCommand` - Send text command
- `assistant.getHistory` - Get command history
- `event:assistant.response` - Stream responses back
- `event:assistant.thinking` - Show "thinking" indicator

### 5. Create Assistant UI Tab
Add to renderer:
- `src/renderer/features/assistant/` - New feature folder
- `AssistantPage.tsx` - Main page component
- `CommandInput.tsx` - Always-visible input at bottom
- `ResponseStream.tsx` - Shows AI responses
- `QuickActions.tsx` - Common action buttons

The assistant tab should feel like a chat interface but optimized for commands.

### Deliverables:
1. App starts and runs without crashing
2. MCP client infrastructure in place
3. Assistant service with intent classification
4. Basic assistant UI tab
5. IPC wiring complete

### Tech Stack Reference:
- React 19, TypeScript strict, Zustand 5, Tailwind v4
- Path aliases: @shared, @renderer, @features, @ui
- IPC pattern: Zod schemas in ipc-contract.ts, handlers in src/main/ipc/handlers/
```


---

## WORKSTREAM 2: Integrations - Communication (Slack, Discord)

### Prompt for Claude Code Instance 2:

```
You are working on Claude-UI, an Electron + React + TypeScript desktop application.

**Project:** C:\Users\Parke\Desktop\Claude-UI
**Reference:** Read ai-docs/prompts/ for prompt patterns

## Your Task: Slack & Discord Integration

### 1. Slack MCP Server
Create a local MCP server for Slack integration:

Create: `src/main/mcp-servers/slack/`
- `index.ts` - MCP server entry point
- `slack-client.ts` - Slack Web API wrapper
- `tools.ts` - MCP tool definitions

Required Slack tools:
- `slack_send_message` - Send to channel/DM
- `slack_read_channel` - Get recent messages from channel
- `slack_search` - Search messages
- `slack_get_threads` - Get thread replies
- `slack_set_status` - Update user status
- `slack_list_channels` - List available channels

Slack standup parser (user mentioned this use case):
When user types: "#standup channel Y: ticket 123 T: ticket 445 and 556 B: BE work"
Parse into structured standup format:
- Y (Yesterday): ticket 123
- T (Today): ticket 445, 556
- B (Blockers): BE work
Then format and post to the specified channel.

### 2. Discord MCP Server
Create: `src/main/mcp-servers/discord/`
- `index.ts` - MCP server entry point
- `discord-client.ts` - Discord.js or REST API wrapper
- `tools.ts` - MCP tool definitions

Required Discord tools:
- `discord_send_message` - Send to channel/DM
- `discord_call_user` - Initiate voice call (open Discord app)
- `discord_read_channel` - Get recent messages
- `discord_list_servers` - List servers/guilds
- `discord_set_status` - Update presence

For "open discord and call xyz":
- Use Discord deeplinks: discord://discord.com/users/{user_id}
- Or spawn Discord app with specific channel/call

### 3. Notification System
Create: `src/main/services/notifications/`
- `notification-service.ts` - Central notification hub
- `watchers/slack-watcher.ts` - Watch for Slack events
- `watchers/github-watcher.ts` - Watch for PR events (placeholder)

Notification rules engine:
- User can define rules like: "notify me when PR is opened on my blocking tickets"
- Rules are stored in settings
- Watchers poll or use webhooks to check conditions

### 4. Communication UI
Create: `src/renderer/features/communications/`
- `CommunicationsPage.tsx` - Overview of connected services
- `SlackPanel.tsx` - Quick Slack actions
- `DiscordPanel.tsx` - Quick Discord actions
- `NotificationRules.tsx` - Configure notification rules

### 5. OAuth Flow for Slack
Slack requires OAuth. Implement:
- `src/main/auth/slack-oauth.ts` - OAuth2 flow
- Store tokens in electron's safeStorage
- Token refresh handling

### Deliverables:
1. Slack MCP server with all tools
2. Discord MCP server with all tools
3. Standup parser for Slack
4. Notification watcher system
5. Basic communications UI
6. OAuth flow for Slack

### API References:
- Slack Web API: https://api.slack.com/methods
- Discord API: https://discord.com/developers/docs
- Consider using slack-bolt for Slack
- Consider discord.js for Discord
```


---

## WORKSTREAM 3: Integrations - Productivity (GitHub, Calendar, Spotify)

### Prompt for Claude Code Instance 3:

```
You are working on Claude-UI, an Electron + React + TypeScript desktop application.

**Project:** C:\Users\Parke\Desktop\Claude-UI
**Reference:** Read ai-docs/prompts/github/ for GitHub review patterns

## Your Task: GitHub, Calendar, Spotify Integration

### 1. GitHub MCP Server
Create: `src/main/mcp-servers/github/`
- `index.ts` - MCP server entry
- `github-client.ts` - GitHub REST/GraphQL API
- `tools.ts` - MCP tools

Required GitHub tools:
- `github_list_prs` - List PRs (mine, reviewing, all)
- `github_get_pr` - Get PR details
- `github_review_pr` - Submit review
- `github_list_issues` - List issues
- `github_create_issue` - Create new issue
- `github_get_notifications` - Get notifications
- `github_watch_repo` - Add repo to watch list

PR notification integration:
- Watch for PRs on specific repos/branches
- Notify when PR is opened that affects blocking work
- Store "blocking tickets" list in task metadata

### 2. Google Calendar MCP Server
Create: `src/main/mcp-servers/calendar/`
- `index.ts` - MCP server entry
- `calendar-client.ts` - Google Calendar API
- `tools.ts` - MCP tools

Required Calendar tools:
- `calendar_list_events` - Get events for date range
- `calendar_create_event` - Create new event
- `calendar_update_event` - Modify event
- `calendar_delete_event` - Remove event
- `calendar_get_free_busy` - Check availability

Daily planner features:
- Morning summary: "Here's your day..."
- Reminder alerts before meetings
- Quick add: "meeting with John at 3pm"

### 3. Spotify MCP Server
Create: `src/main/mcp-servers/spotify/`
- `index.ts` - MCP server entry
- `spotify-client.ts` - Spotify Web API
- `tools.ts` - MCP tools

Required Spotify tools:
- `spotify_play` - Play track/album/playlist
- `spotify_pause` - Pause playback
- `spotify_next` - Skip track
- `spotify_previous` - Previous track
- `spotify_search` - Search music
- `spotify_get_playing` - Current track info
- `spotify_set_volume` - Adjust volume
- `spotify_add_to_queue` - Queue a track

Voice-style commands support:
- "play lo-fi" → search playlists, play first result
- "play some jazz" → search jazz, shuffle play
- "pause" / "skip" / "volume 50%"

### 4. Chrome/Browser Control
Create: `src/main/mcp-servers/browser/`
- `index.ts` - MCP server
- `tools.ts` - Browser tools

Tools:
- `browser_open_url` - Open URL in default browser
- `browser_search` - Open Google search
- `browser_open_app` - Open web app (gmail, docs, etc.)

Use: `shell.openExternal()` for URLs
Consider: Chrome DevTools Protocol for deeper control (optional)

### 5. OAuth Manager
Create: `src/main/auth/`
- `oauth-manager.ts` - Generic OAuth2 flow handler
- `token-store.ts` - Secure token storage (electron safeStorage)
- `providers/google.ts` - Google OAuth config
- `providers/spotify.ts` - Spotify OAuth config
- `providers/github.ts` - GitHub OAuth config

### 6. Productivity UI
Create: `src/renderer/features/productivity/`
- `ProductivityPage.tsx` - Dashboard overview
- `CalendarWidget.tsx` - Today's schedule
- `SpotifyWidget.tsx` - Now playing + controls
- `GitHubWidget.tsx` - PR/notification summary

### Deliverables:
1. GitHub MCP server with PR watching
2. Google Calendar MCP server
3. Spotify MCP server with play commands
4. Browser control tools
5. OAuth manager for all providers
6. Productivity dashboard UI

### API References:
- GitHub REST: https://docs.github.com/en/rest
- Google Calendar: https://developers.google.com/calendar/api
- Spotify Web API: https://developer.spotify.com/documentation/web-api
```


---

## WORKSTREAM 4: Fitness Dashboard & Health Tracking

### Prompt for Claude Code Instance 4:

```
You are working on Claude-UI, an Electron + React + TypeScript desktop application.

**Project:** C:\Users\Parke\Desktop\Claude-UI

## Your Task: Fitness Dashboard with Withings Integration

### 1. Withings MCP Server
Create: `src/main/mcp-servers/withings/`
- `index.ts` - MCP server entry
- `withings-client.ts` - Withings Public API client
- `tools.ts` - MCP tools

Withings API Setup:
- Register at https://developer.withings.com/
- Use OAuth2 for authentication
- Public API provides: weight, body fat, bone mass, muscle mass, water %, visceral fat

Required tools:
- `withings_get_measurements` - Get recent measurements
- `withings_get_weight_history` - Weight over time
- `withings_get_body_composition` - Full body comp data
- `withings_sync` - Trigger manual sync

### 2. Workout Logging System
Create: `src/main/services/fitness/`
- `fitness-service.ts` - Main service
- `workout-store.ts` - Store workouts (JSON file in app data)
- `models.ts` - Workout, Exercise, Set types

Workout data model:
```typescript
interface Workout {
  id: string;
  date: string;
  type: 'strength' | 'cardio' | 'flexibility' | 'sport';
  duration: number; // minutes
  exercises: Exercise[];
  notes?: string;
}

interface Exercise {
  name: string;
  sets: Set[];
  muscleGroup?: string;
}

interface Set {
  reps?: number;
  weight?: number;
  duration?: number; // for timed exercises
  distance?: number; // for cardio
}
```

Workout tools for assistant:
- `fitness_log_workout` - Log a workout
- `fitness_log_weight` - Manual weight entry
- `fitness_get_stats` - Get fitness statistics
- `fitness_get_progress` - Progress over time

Natural language workout logging:
- "logged chest day: bench 3x10 185lbs, incline 3x8 135lbs"
- Parse into structured workout data

### 3. Fitness Dashboard UI
Create: `src/renderer/features/fitness/`
- `FitnessPage.tsx` - Main dashboard
- `WeightChart.tsx` - Weight trend over time (use Recharts)
- `BodyComposition.tsx` - Body comp breakdown
- `WorkoutLog.tsx` - Recent workouts list
- `WorkoutForm.tsx` - Log new workout
- `StatsOverview.tsx` - Summary stats (weekly volume, consistency)

Dashboard components:
- Weight trend chart (line graph, goal line)
- Body composition pie/bar chart
- Workout streak/consistency indicator
- Recent workouts list
- Quick log button

### 4. Goals & Targets
Create goal tracking:
- `goals-store.ts` - Store fitness goals
- Weight goal (target weight, deadline)
- Workout frequency goal (X workouts per week)
- Specific lift goals (bench 225, etc.)

UI for goals:
- `GoalsPanel.tsx` - Set and view goals
- Progress indicators on dashboard

### 5. Withings OAuth Flow
- `src/main/auth/providers/withings.ts` - Withings OAuth config
- Withings uses OAuth2 with specific scopes
- Store refresh token for background sync

### 6. Background Sync
- Periodic sync of Withings data (every 4 hours)
- Store locally for offline access
- Notification when new measurement detected

### Deliverables:
1. Withings MCP server with OAuth
2. Workout logging service
3. Natural language workout parser
4. Fitness dashboard with charts
5. Goal tracking system
6. Background sync for Withings

### API Reference:
- Withings: https://developer.withings.com/api-reference/
- Use Recharts for charts (already in dependencies)
```


---

## WORKSTREAM 5: Advanced Project Management (Poly-repo, Worktrees)

### Prompt for Claude Code Instance 5:

```
You are working on Claude-UI, an Electron + React + TypeScript desktop application.

**Project:** C:\Users\Parke\Desktop\Claude-UI
**Reference:** Read ai-docs/core/worktree.py and ai-docs/core/workspace.py for worktree patterns

## Your Task: Advanced Git & Project Management

### 1. Enhanced Project Model
Update the project system to support complex repo structures:

Update: `src/shared/types/project.ts`
```typescript
interface Project {
  id: string;
  name: string;
  path: string;
  type: 'single' | 'monorepo' | 'polyrepo';
  subprojects?: SubProject[];
  // ... existing fields
}

interface SubProject {
  id: string;
  name: string;
  relativePath: string; // e.g., "backend", "frontend"
  gitRemote?: string; // If separate git repo
  defaultBranch?: string;
}

interface Worktree {
  id: string;
  projectId: string;
  subprojectId?: string; // Which sub-repo this worktree is for
  path: string;
  branch: string;
  taskId?: string; // Linked task
  createdAt: string;
}
```

### 2. Git Service Enhancement
Create: `src/main/services/git/`
- `git-service.ts` - Git operations wrapper
- `worktree-service.ts` - Worktree management
- `polyrepo-service.ts` - Multi-repo coordination

Git operations needed:
- `git_status` - Get repo status
- `git_branches` - List branches
- `git_create_branch` - Create new branch
- `git_switch_branch` - Switch branches
- `git_create_worktree` - Create isolated worktree
- `git_remove_worktree` - Clean up worktree
- `git_detect_structure` - Detect mono/poly repo structure

Poly-repo detection:
- Scan for nested .git directories
- Check for common patterns (backend/, frontend/, packages/)
- Ask user to confirm structure on first open

### 3. Worktree UI for Task Isolation
When user creates a coding task:
1. Ask which sub-project (if poly-repo)
2. Create worktree from appropriate branch
3. Link worktree to task
4. Clean up worktree when task completes/merges

Create: `src/renderer/features/projects/`
- `ProjectSetup.tsx` - Configure project structure
- `WorktreeManager.tsx` - View/manage worktrees
- `BranchSelector.tsx` - Select branch for new worktree
- `SubprojectSelector.tsx` - Choose which sub-repo

### 4. Task-Worktree Integration
Update task creation flow:
- `CreateTaskModal.tsx` - Add worktree options
- Auto-create worktree when task starts
- Show worktree path in task detail
- Terminal opens in worktree directory

### 5. Merge Workflow
Reference: ai-docs/merge/ for merge patterns

Create: `src/main/services/merge/`
- `merge-service.ts` - Handle merging worktrees back

Merge flow:
1. Task complete → User clicks "Merge"
2. Show diff preview
3. Handle conflicts (show in UI, allow manual resolution)
4. Merge to target branch
5. Clean up worktree

### 6. Project Dashboard Enhancement
Update: `src/renderer/features/projects/`
- `ProjectDashboard.tsx` - Overview with sub-projects
- `RepoHealth.tsx` - Branch status, pending merges
- `ActiveWorktrees.tsx` - List of active worktrees

### Deliverables:
1. Enhanced project model for poly-repos
2. Git service with worktree support
3. Poly-repo detection on project add
4. Worktree creation UI
5. Task-worktree linking
6. Merge workflow with conflict handling

### Reference:
- Study ai-docs/core/worktree.py for worktree patterns
- Study ai-docs/core/workspace.py for workspace isolation
- Use simple-git npm package for git operations
```


---

## WORKSTREAM 6: Notes, Daily Planner & Task System

### Prompt for Claude Code Instance 6:

```
You are working on Claude-UI, an Electron + React + TypeScript desktop application.

**Project:** C:\Users\Parke\Desktop\Claude-UI
**Reference:** Read ai-docs/spec/ for task specification patterns

## Your Task: Notes, Daily Planner, Alerts System

### 1. Notes Service
Create: `src/main/services/notes/`
- `notes-service.ts` - CRUD for notes
- `notes-store.ts` - Persist notes to disk

Notes data model:
```typescript
interface Note {
  id: string;
  content: string;
  tags: string[];
  projectId?: string; // Link to project
  taskId?: string; // Link to task
  createdAt: string;
  updatedAt: string;
  pinned: boolean;
}
```

Quick note commands:
- "note: buy groceries" → Create note with content
- "note for project X: remember to update API" → Link to project
- "show notes" → List recent notes
- "search notes: groceries" → Search

### 2. Daily Planner Service
Create: `src/main/services/planner/`
- `planner-service.ts` - Daily plan management
- `planner-store.ts` - Persist plans

Daily plan model:
```typescript
interface DailyPlan {
  date: string; // YYYY-MM-DD
  goals: string[];
  scheduledTasks: ScheduledTask[];
  timeBlocks: TimeBlock[];
  reflection?: string;
}

interface ScheduledTask {
  taskId: string;
  scheduledTime?: string;
  estimatedDuration?: number;
  completed: boolean;
}

interface TimeBlock {
  startTime: string;
  endTime: string;
  label: string;
  type: 'focus' | 'meeting' | 'break' | 'other';
}
```

Planner features:
- Morning planning: Set daily goals
- Evening reflection: What got done
- Integration with Calendar (show meetings as time blocks)
- Integration with Tasks (schedule coding tasks)

### 3. Alerts & Reminders Service
Create: `src/main/services/alerts/`
- `alert-service.ts` - Schedule and trigger alerts
- `alert-store.ts` - Persist alerts

Alert types:
```typescript
interface Alert {
  id: string;
  type: 'reminder' | 'deadline' | 'notification' | 'recurring';
  message: string;
  triggerAt: string; // ISO datetime
  recurring?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string; // HH:mm
    daysOfWeek?: number[]; // 0-6 for weekly
  };
  linkedTo?: {
    type: 'task' | 'event' | 'note';
    id: string;
  };
  dismissed: boolean;
}
```

Alert commands:
- "remind me at 3pm to call John"
- "remind me tomorrow to review PR"
- "every day at 9am remind me to check email"

System tray notifications:
- Use Electron's Notification API
- Show notification at trigger time
- Click to open relevant item

### 4. Notes UI
Create: `src/renderer/features/notes/`
- `NotesPage.tsx` - Notes list and editor
- `NoteEditor.tsx` - Markdown editor for notes
- `NotesList.tsx` - Searchable/filterable list
- `QuickNote.tsx` - Floating quick-add widget

### 5. Planner UI
Create: `src/renderer/features/planner/`
- `PlannerPage.tsx` - Daily/weekly view
- `DayView.tsx` - Today's plan
- `TimeBlockEditor.tsx` - Visual time block editor
- `GoalsList.tsx` - Daily goals checklist
- `WeekOverview.tsx` - Week at a glance

### 6. Alerts UI
Create: `src/renderer/features/alerts/`
- `AlertsPage.tsx` - Manage all alerts
- `CreateAlertModal.tsx` - Create new alert
- `AlertNotification.tsx` - System notification component
- `RecurringAlerts.tsx` - Manage recurring reminders

### 7. Natural Language Parsing
Create: `src/main/services/nlp/`
- `time-parser.ts` - Parse time expressions
  - "at 3pm" → specific time
  - "tomorrow" → date
  - "in 2 hours" → relative time
  - "every weekday at 9am" → recurring

Use chrono-node for time parsing (add to dependencies)

### Deliverables:
1. Notes service with tagging and linking
2. Daily planner service
3. Alerts/reminders with recurring support
4. Notes UI with markdown editor
5. Planner UI with time blocks
6. Alerts UI with notification system
7. Natural language time parsing

### Dependencies to add:
- chrono-node (time parsing)
- Consider: @uiw/react-md-editor for markdown
```


---

## WORKSTREAM 7: System Tray, Background Mode & Voice Input (Future)

### Prompt for Claude Code Instance 7:

```
You are working on Claude-UI, an Electron + React + TypeScript desktop application.

**Project:** C:\Users\Parke\Desktop\Claude-UI

## Your Task: Background Operations & Voice Input

### 1. System Tray Integration
Create: `src/main/tray/`
- `tray-manager.ts` - System tray icon and menu
- `quick-input.ts` - Global hotkey popup

System tray features:
- Minimize to tray option
- Tray icon shows status (idle, working, notification)
- Right-click menu:
  - Show/Hide window
  - Quick command (opens input popup)
  - Recent commands
  - Active tasks
  - Quit

Quick input popup (global hotkey, e.g., Ctrl+Shift+Space):
- Small floating window
- Single input field
- Type command, press Enter
- Closes after execution

### 2. Global Hotkeys
Use electron's globalShortcut:
- `Ctrl+Shift+Space` - Quick command popup
- `Ctrl+Shift+N` - Quick note
- `Ctrl+Shift+T` - Quick task
- Make hotkeys configurable in settings

### 3. Background Service Manager
Create: `src/main/services/background/`
- `background-manager.ts` - Orchestrate background tasks
- `scheduler.ts` - Cron-like scheduler

Background tasks:
- Withings sync (every 4 hours)
- Slack/Discord message watching
- GitHub PR notifications
- Calendar reminder checks
- Alert trigger checks

### 4. Voice Input (Optional/Future)
Create: `src/main/services/voice/`
- `voice-service.ts` - Voice input handling
- `whisper-client.ts` - OpenAI Whisper API or local whisper.cpp

Voice flow:
1. User holds hotkey or clicks mic button
2. Audio recorded
3. Sent to Whisper for transcription
4. Transcription sent to assistant

Options:
- OpenAI Whisper API (requires API key)
- Local whisper.cpp (larger, but offline)
- Azure Speech Services
- Consider: voice activity detection

### 5. Persistent Mode Toggle
Allow app to run in two modes:
- **Window Mode**: Normal desktop app
- **Background Mode**: Minimized to tray, responds to hotkeys

Settings:
- Start minimized to tray
- Keep running on window close
- Launch at system startup
- Background sync intervals

### 6. Settings UI for Background
Update: `src/renderer/features/settings/`
- `BackgroundSettings.tsx` - Configure background behavior
- `HotkeySettings.tsx` - Customize global hotkeys
- `TraySettings.tsx` - Tray icon behavior
- `VoiceSettings.tsx` - Voice input config (future)

### Deliverables:
1. System tray with context menu
2. Quick input popup window
3. Global hotkeys (configurable)
4. Background service scheduler
5. Settings UI for all background features
6. (Optional) Voice input integration

### Notes:
- Test hotkeys don't conflict with other apps
- Handle tray icon on different OS (Windows vs Mac)
- Background mode should use minimal resources
```


---

## Execution Order & Dependencies

```
WORKSTREAM 1 (Foundation) ─────────────────────────────────────────┐
   Must complete first: MCP layer, Assistant service, App startup  │
                                                                    │
   ┌────────────────────────────────────────────────────────────────┘
   │
   ▼
┌──────────────────────┬──────────────────────┬──────────────────────┐
│ WORKSTREAM 2         │ WORKSTREAM 3         │ WORKSTREAM 4         │
│ Slack/Discord        │ GitHub/Calendar/     │ Fitness/Withings     │
│                      │ Spotify              │                      │
│ Can run in parallel  │ Can run in parallel  │ Can run in parallel  │
└──────────────────────┴──────────────────────┴──────────────────────┘
   │                        │                        │
   └────────────────────────┼────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────────┐
│ WORKSTREAM 5                    │ WORKSTREAM 6                       │
│ Git/Worktrees/Poly-repo         │ Notes/Planner/Alerts               │
│                                 │                                    │
│ Can run in parallel             │ Can run in parallel                │
└─────────────────────────────────┴────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────────┐
│ WORKSTREAM 7                                                         │
│ System Tray / Background / Voice                                     │
│                                                                      │
│ Should run last (ties everything together)                           │
└──────────────────────────────────────────────────────────────────────┘
```

## Quick Start Instructions

### For Each Terminal Instance:

1. **Navigate to project:**
   ```bash
   cd C:\Users\Parke\Desktop\Claude-UI
   ```

2. **Read your workstream prompt from:**
   ```
   IMPLEMENTATION-PROMPTS.md
   ```

3. **Read reference docs:**
   ```
   ai-docs/AUTO-CLAUDE-REFERENCE.md
   ai-docs/prompts/  (relevant prompts)
   ai-docs/agents/   (agent patterns)
   ai-docs/core/     (core utilities)
   ```

4. **Understand current codebase:**
   ```
   src/main/         - Electron main process
   src/renderer/     - React frontend
   src/shared/       - Shared types, IPC contracts
   src/preload/      - Electron preload scripts
   ```

5. **Follow the patterns:**
   - Services go in `src/main/services/`
   - MCP servers go in `src/main/mcp-servers/`
   - IPC handlers go in `src/main/ipc/handlers/`
   - UI features go in `src/renderer/features/`
   - All IPC channels defined in `src/shared/ipc-contract.ts`

---

## API Keys & OAuth Apps You'll Need

| Service | Where to Get |
|---------|-------------|
| Slack | https://api.slack.com/apps |
| Discord | https://discord.com/developers/applications |
| GitHub | https://github.com/settings/tokens |
| Google (Calendar) | https://console.cloud.google.com/ |
| Spotify | https://developer.spotify.com/dashboard |
| Withings | https://developer.withings.com/ |
| OpenAI (Whisper) | https://platform.openai.com/ |

Store API keys/tokens securely using Electron's safeStorage.

---

## Notes for All Instances

1. **Use TypeScript strict mode** - The project has strict: true
2. **Follow existing patterns** - Look at existing services as templates
3. **Zod for validation** - All IPC uses Zod schemas
4. **Zustand for state** - Frontend state management
5. **Tailwind for styling** - v4 with CSS variables
6. **Test as you go** - Run `npm run dev` frequently
7. **Commit often** - Make atomic commits per feature

Good luck! 🚀
