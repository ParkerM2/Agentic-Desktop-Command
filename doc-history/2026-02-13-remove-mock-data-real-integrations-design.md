# Remove Mock Data & Wire Real Integrations

**Date**: 2026-02-13
**Status**: IMPLEMENTED — all tasks complete, typecheck + lint clean

---

## 1. Audit Summary

### Pages Explored (UI Walkthrough)

| Page | Status | Mock Data? | Notes |
|------|--------|-----------|-------|
| Dashboard | Visited | **YES** | 3 components with hardcoded mock data |
| Assistant | Visited | No | Empty state, rule-based classifier works |
| Notes | Visited | No | Real file-backed CRUD |
| Fitness (4 tabs) | Visited | No | Real file-backed CRUD, Withings is stub |
| Planner | Visited | No | Real file-backed, time blocks persist |
| Productivity (3 tabs) | Visited | No | Calendar/Spotify need OAuth |
| Alerts (3 tabs) | Visited | No | Real file-backed CRUD |
| Comms (4 tabs) | Visited | No | Buttons disabled when disconnected, but **no onClick handlers** |
| Projects | Visited | No | Real file-backed |
| Settings | Visited | No | All sections functional, **UI Scale bug** |
| Kanban | Blocked | N/A | Requires project — disabled in sidebar |
| Tasks | Blocked | N/A | Requires project — disabled in sidebar |
| Terminals | Blocked | N/A | Requires project — disabled in sidebar |
| Agents | Blocked | N/A | Requires project — disabled in sidebar |
| Roadmap | Blocked | N/A | Requires project — API-driven |
| Ideation | Blocked | N/A | Requires project — API-driven |
| GitHub | Blocked | N/A | Requires project + OAuth |
| Changelog | Blocked | N/A | Requires project — API-driven |
| Insights | Blocked | N/A | Requires project — computed from real data |

---

## 2. Mock Data To Remove (3 Components)

### 2a. `TodayView.tsx` — Fake Schedule

**File**: `src/renderer/features/dashboard/components/TodayView.tsx:28-35`

```typescript
const MOCK_TIME_BLOCKS: TimeBlock[] = [
  { id: 'tb-1', time: '9:00 AM', label: 'Daily standup', category: 'work' },
  { id: 'tb-2', time: '10:00 AM', label: 'Feature development', category: 'work' },
  { id: 'tb-3', time: '1:00 PM', label: 'Claude-UI dashboard', category: 'side-project' },
  { id: 'tb-4', time: '3:00 PM', label: 'Code review', category: 'work' },
  { id: 'tb-5', time: '5:30 PM', label: 'Gym', category: 'personal' },
];
```

**Fix**: Replace with React Query hook that calls `planner.getDay` IPC channel for today's date. The Planner service already stores time blocks on disk — this component just doesn't read them.

**Changes**:
- Import `usePlannerDay` hook from `@features/planner`
- Fetch today's plan: `usePlannerDay(todayDateString)`
- Map `plan.timeBlocks` to the existing UI
- Show "Nothing scheduled today" when empty (already handled)
- Remove `MOCK_TIME_BLOCKS` constant entirely

### 2b. `ActiveAgents.tsx` — Fake Agents

**File**: `src/renderer/features/dashboard/components/ActiveAgents.tsx:27-43`

```typescript
const MOCK_AGENTS: MockAgent[] = [
  { id: 'ma-1', projectName: 'Claude-UI', taskName: 'Build dashboard feature', status: 'running', progress: 65 },
  { id: 'ma-2', projectName: 'API Server', taskName: 'Fix auth middleware', status: 'running', progress: 30 },
];
```

**Fix**: Replace with React Query hook that calls `agents.list` IPC channel. The Agent service tracks real agent sessions in memory.

**Changes**:
- Import `useAgents` hook from `@features/agents`
- Fetch running agents: `useAgents()` filtered to `status === 'running'`
- Map real `AgentSession` data to the existing card UI
- Show "No agents running" when empty (already handled)
- Remove `MOCK_AGENTS`, `MockAgent`, `MockAgentStatus` types entirely

### 2c. `DailyStats.tsx` — Hardcoded Counts

**File**: `src/renderer/features/dashboard/components/DailyStats.tsx:10-12`

```typescript
const tasksCompleted = 0;
const agentsRan = 2;
```

**Fix**: Compute from real services.

**Changes**:
- `tasksCompleted`: Query `insights.getMetrics` or compute from today's completed tasks
- `agentsRan`: Query `agents.list` and count sessions started today
- `captureCount`: Already uses real store data (no change needed)
- Remove hardcoded constants

---

## 3. Non-Functional Features

### 3a. Communications — Buttons Have No onClick Handlers

**Files**:
- `src/renderer/features/communications/components/SlackPanel.tsx:44-59`
- `src/renderer/features/communications/components/DiscordPanel.tsx:44-59`

**Problem**: The action buttons (Send Message, Read Channel, Search, Set Status) have `disabled={status !== 'connected'}` but **zero onClick handlers**. Even if connected, clicking does nothing.

**Fix**: Wire buttons to MCP server tool calls or open modals:
- "Send Message" → Open modal with channel/message inputs → call `slack.sendMessage` MCP tool
- "Read Channel" → Open modal with channel selector → call `slack.readChannel` MCP tool
- "Search" → Open modal with search input → call `slack.search` MCP tool
- "Set Status" → Open modal with status/emoji inputs → call `slack.setStatus` MCP tool
- Same pattern for Discord actions

### 3b. Spotify — Requires OAuth, No Setup Prompt

**File**: `src/renderer/features/productivity/components/SpotifyPanel.tsx`

**Problem**: Shows "No active playback" with a search bar, but no indication that Spotify OAuth is required. If user searches or interacts, it silently fails.

**Fix**: Check OAuth token status. If no Spotify token exists, show a setup card:
> "Connect Spotify to control playback and search tracks."
> [Configure in Settings] button → navigates to Settings > OAuth Providers

### 3c. Calendar — Requires OAuth, No Setup Prompt

**File**: `src/renderer/features/productivity/components/CalendarWidget.tsx`

**Problem**: Shows "No events scheduled for today" but doesn't tell user they need Google Calendar OAuth.

**Fix**: Same pattern as Spotify — check token, show setup card if missing.

### 3d. GitHub — Requires OAuth, No Setup Prompt

**File**: `src/renderer/features/github/components/GitHubPage.tsx`

**Problem**: Requires GitHub OAuth token. No indication to user.

**Fix**: Check token, show setup card with link to Settings > OAuth Providers.

### 3e. Fitness > Withings — Service is a Stub

**File**: `src/main/services/fitness/fitness-service.ts`

**Problem**: The service references "withings" as a data source but has NO actual Withings API integration. It only deduplicates data by source tag. The Withings OAuth provider is configured in settings but connecting does nothing for fitness.

**Fix (two options)**:
1. **Wire it**: Add actual Withings API calls to sync body measurements → `fitness-service.ts`
2. **Remove it**: Remove Withings from OAuth providers if not implementing the integration. Hide the "Withings" option in Settings.

**Recommendation**: Option 2 for now — remove the dead Withings provider until real integration is built.

### 3f. Assistant — No Claude API, Rule-Based Only

**Files**:
- `src/main/services/assistant/intent-classifier.ts` — Regex-based classification
- `src/main/services/assistant/command-executor.ts` — Routes to local services or Claude CLI

**Problem**: The Assistant page looks like a chat interface but uses hardcoded regex patterns for intent classification. It can:
- Create notes, reminders, alerts (works locally)
- Control Spotify (works if OAuth configured)
- Fall back to Claude CLI for conversations (requires `claude` in PATH)

But there's no indication to the user about what it can/can't do, and no error handling when Claude CLI is missing.

**Fix**:
- Add placeholder suggestions showing supported commands
- When Claude CLI fallback fails, show actionable error: "Claude CLI not found. Install it to enable AI conversations."
- Consider adding a "capabilities" tooltip or help card

### 3g. Hub Connection — No Connection Status Indicator

**File**: `src/renderer/features/settings/components/HubSettings.tsx`

**Problem**: Hub connection shows "Disconnected" only on the Settings page. No global indicator.

**Fix**: This is lower priority — hub is optional infrastructure.

---

## 4. Missing Auth/Setup Notifications

### 4a. Claude CLI Authentication — Bottom-Left Notification

**Problem**: The core app functionality (running agents, AI assistant conversations) depends on Claude CLI being installed and authenticated. There is NO check for this anywhere in the UI.

**Implementation**:
1. Add IPC channel `app.checkClaudeAuth` that runs `claude --version` and checks for valid auth
2. On app startup, check Claude CLI status
3. If not found or not authenticated, show a persistent notification in the **bottom-left corner** of the app:
   ```
   ⚠ Claude CLI not configured
   [Set Up] [Re-authenticate]
   ```
4. "Set Up" → opens a guided setup flow or links to install docs
5. "Re-authenticate" → runs `claude login` in a terminal
6. Notification component: `src/renderer/shared/components/AuthNotification.tsx`
7. Position: fixed bottom-left, above sidebar, non-blocking

### 4b. OAuth Provider Status — Contextual Prompts

**Problem**: When a user navigates to a feature requiring OAuth (Spotify, Calendar, GitHub, Slack), there's no indication that setup is needed.

**Implementation**:
1. Create a reusable `<IntegrationRequired>` component:
   ```tsx
   <IntegrationRequired
     provider="spotify"
     title="Connect Spotify"
     description="Link your Spotify account to control playback."
     settingsPath="/settings#oauth"
   />
   ```
2. Each feature page checks its provider's token status via an `useOAuthStatus(provider)` hook
3. If no token: show the setup card instead of (or above) the feature content
4. "Configure in Settings" button navigates to Settings > OAuth Providers section

### 4c. MCP Server Status — Connection Indicators

**Problem**: Slack and Discord show "Disconnected" but no way to connect from the Comms page.

**Implementation**:
1. Add "Connect" button next to "Disconnected" status on Comms page
2. "Connect" → opens Settings > OAuth Providers (for Slack) or shows MCP server config
3. Optionally: add MCP server health status to a global status bar

---

## 5. Bugs Found During Audit

### 5a. UI Scale Shows "Current: 1%"

**File**: `src/renderer/features/settings/components/SettingsPage.tsx:208`
**Store**: `src/renderer/shared/stores/theme-store.ts:49` (default: 100)

**Problem**: The UI Scale slider shows "Current: 1%" which is outside the valid range (75-150%). The theme store defaults to 100 but the persisted settings value isn't synced back to the Zustand store on load.

**Fix**: When settings load from IPC, sync `uiScale` from persisted settings into the theme store:
```typescript
// In SettingsPage or a startup effect
useEffect(() => {
  if (settings?.uiScale) setUiScale(settings.uiScale);
}, [settings?.uiScale]);
```

### 5b. Theme Store Not Hydrated From Persisted Settings

**Related to 5a**: The theme store (`mode`, `colorTheme`, `uiScale`) uses hardcoded defaults and doesn't hydrate from the persisted settings on app startup. The Settings page changes persist to disk but the Zustand store resets on reload.

**Fix**: Add a startup hydration effect that reads settings and calls `setMode()`, `setColorTheme()`, `setUiScale()`.

---

## 6. Implementation Priority

### Phase 1 — Remove Mock Data (Quick wins)
1. Wire `TodayView` to Planner service
2. Wire `ActiveAgents` to Agent service
3. Wire `DailyStats` to computed real values
4. Fix UI Scale hydration bug

### Phase 2 — Auth Notifications
5. Add Claude CLI auth check + bottom-left notification
6. Create `<IntegrationRequired>` component
7. Add OAuth status checks to Spotify, Calendar, GitHub pages

### Phase 3 — Wire Non-Functional UI
8. Add onClick handlers to Slack action buttons (with modals)
9. Add onClick handlers to Discord action buttons (with modals)
10. Add "Connect" buttons on Comms page for disconnected services

### Phase 4 — Cleanup
11. Remove or properly implement Withings integration
12. Add Assistant capabilities help/suggestions
13. Hydrate full theme store from persisted settings on startup

---

## 7. Files To Modify

| File | Change |
|------|--------|
| `src/renderer/features/dashboard/components/TodayView.tsx` | Replace MOCK_TIME_BLOCKS with planner query |
| `src/renderer/features/dashboard/components/ActiveAgents.tsx` | Replace MOCK_AGENTS with agents query |
| `src/renderer/features/dashboard/components/DailyStats.tsx` | Replace hardcoded counts with real queries |
| `src/renderer/features/communications/components/SlackPanel.tsx` | Add onClick handlers + modals |
| `src/renderer/features/communications/components/DiscordPanel.tsx` | Add onClick handlers + modals |
| `src/renderer/features/productivity/components/SpotifyPanel.tsx` | Add OAuth status check + setup card |
| `src/renderer/features/productivity/components/CalendarWidget.tsx` | Add OAuth status check + setup card |
| `src/renderer/features/github/components/GitHubPage.tsx` | Add OAuth status check + setup card |
| `src/renderer/shared/stores/theme-store.ts` | Add hydration from persisted settings |
| `src/renderer/features/settings/components/SettingsPage.tsx` | Fix UI scale sync |
| `src/shared/ipc-contract.ts` | Add `app.checkClaudeAuth` channel |
| `src/main/ipc/handlers/` | Add Claude auth check handler |
| **NEW** `src/renderer/shared/components/AuthNotification.tsx` | Claude CLI auth notification |
| **NEW** `src/renderer/shared/components/IntegrationRequired.tsx` | Reusable OAuth setup card |
| **NEW** `src/renderer/shared/hooks/useOAuthStatus.ts` | Hook to check provider token status |
