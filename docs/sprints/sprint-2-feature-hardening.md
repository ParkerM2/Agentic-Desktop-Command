# Sprint 2: Feature Hardening (Non-Core)

**Goal:** Harden all the features that aren't part of the core install → task pipeline. These are the personal productivity, metrics, health, and management features. Many may get feature-flagged or hidden until they're fully fleshed out.

**Status:** NOT STARTED

---

## Priority 0 — User-Reported UX Fixes

> These came from hands-on testing during Sprint 1 and are higher priority than the feature hardening work below.

### P0-1. Persist Auth Session (safeStorage)
- [ ] Store refresh token in Electron `safeStorage` (encrypted at rest)
- [ ] On app launch, check for stored refresh token and silently exchange for new access token
- [ ] Only show login page if refresh token is missing or expired
- [ ] Clear stored token on explicit logout
- **Why:** Users currently have to re-sign-in every time the app restarts. The main process owns auth tokens but they live only in memory — they're lost on restart.
- **Files:** `src/main/services/auth/auth-service.ts`, `src/main/bootstrap/lifecycle.ts`
- **Ref:** Gap analysis G-20 (plaintext API keys), Sprint 1 T2 (auth refresh hardening)

### P0-2. Route All GitHub Through gh CLI
- [ ] Replace API token-based GitHub calls with `gh` CLI subprocess calls
- [ ] GitHub page should detect `gh auth status` and show connection state
- [ ] All GitHub features (repos, issues, PRs, status) route through `gh api` calls
- [ ] Remove or deprecate the manual API token configuration in Settings > OAuth
- **Why:** The GitHub page isn't connecting or filling out info. The previous API token system is unreliable — `gh` CLI handles auth, rate limits, and enterprise configs natively.
- **Files:** `src/main/services/github/github-service.ts`, `src/main/ipc/handlers/github-handlers.ts`, GitHub feature components
- **Ref:** Gap analysis 1g (GitHub issue creation UI), 2g (`github.createIssue` unused)

### P0-3. AG-Grid Card Wrapper + Custom Theme Tokens
- [ ] Wrap AG-Grid instances in `@ui/Card` component for consistent container styling
- [ ] Create AG-Grid theme token mapping that pulls from CSS custom properties (`--primary`, `--foreground`, `--border`, etc.)
- [ ] AG-Grid header, row, selection, and accent colors adapt to active color theme
- [ ] Ensure dark/light mode + all color themes work correctly
- **Why:** AG-Grid currently uses its own default theme which doesn't match the app's design system. It looks out of place.
- **Files:** `src/renderer/features/tasks/components/TaskDataGrid.tsx`, `src/renderer/styles/globals.css` (AG-Grid overrides)
- **Ref:** Design system conventions in CLAUDE.md (never hardcode RGBA, use `color-mix()` with `var()`)

---

## Focus Areas

### 1. Ideation & Brainstorming
- [ ] Ideation board create/edit/view/manage states
- [ ] Idea capture and categorization
- [ ] Idea → Task promotion flow
- [ ] Determine: keep, feature-flag, or redesign

### 2. Roadmap & Planning
- [ ] Roadmap view with timeline
- [ ] Milestone tracking
- [ ] Roadmap ↔ Project association
- [ ] Edit/view/manage states for roadmap items
- [ ] Determine: keep, feature-flag, or redesign

### 3. Communications
- [ ] Slack integration (MCP server) — send/read messages, standup parser
- [ ] Discord integration (MCP server) — send/read messages
- [ ] Email integration (nodemailer) — notifications, summaries
- [ ] Communication hub view — unified inbox or feed
- [ ] Determine: keep, feature-flag, or redesign

### 4. Productivity & Metrics
- [ ] Productivity dashboard with meaningful metrics
- [ ] Task completion rates, streaks, velocity
- [ ] Time tracking or estimation accuracy
- [ ] Cost tracking per task/project (API usage)
- [ ] Determine: keep, feature-flag, or redesign

### 5. Fitness & Health (Withings)
- [ ] Research Withings API endpoints and OAuth flow
- [ ] Withings OAuth provider setup
- [ ] Body composition data sync (weight, body fat, muscle mass)
- [ ] Workout logging (manual + parsed from natural language)
- [ ] Fitness goals and progress tracking
- [ ] Determine: keep, feature-flag, or redesign

### 6. User Settings
- [ ] Settings page fully functional (all sections)
- [ ] Theme selection works (all color themes, dark/light)
- [ ] UI scale adjustment works
- [ ] Keyboard shortcuts configurable
- [ ] Notification preferences
- [ ] Data export / import

### 7. MCP Management
- [ ] MCP server status dashboard (connected/disconnected/error per server)
- [ ] Add/remove/configure MCP servers from UI
- [ ] MCP server health monitoring
- [ ] Tool discovery and usage stats per MCP server

### 8. Briefing / Daily Summary
- [ ] Daily briefing aggregation (tasks, calendar, notifications, etc.)
- [ ] Briefing wired into sidebar navigation
- [ ] Morning summary generation
- [ ] Configurable briefing content

### 9. Spotify Integration
- [ ] Spotify OAuth setup
- [ ] Playback controls (play, pause, next, previous)
- [ ] Now playing display
- [ ] Search and queue management
- [ ] Determine: keep, feature-flag, or redesign

---

## Feature Flag Candidates

Features that may be hidden until Sprint 2 work is complete:

| Feature | Current State | Action |
|---------|--------------|--------|
| Ideation | Stub UI | Feature-flag until fleshed out |
| Roadmap | Stub UI | Feature-flag until fleshed out |
| Communications | Stub UI | Feature-flag until MCP servers connected |
| Fitness | Stub UI | Feature-flag until Withings researched |
| Productivity | Stub UI | Feature-flag until metrics defined |
| Spotify | Not started | Feature-flag until OAuth + MCP ready |
| Briefing | Partial | Feature-flag until aggregation works |

---

## Success Criteria

> Every non-core feature either: (a) works end-to-end with proper edit/view/manage states, or (b) is cleanly feature-flagged with a clear path to completion. No half-built features visible to users.

---

## Research Required

- [ ] Withings API: endpoints, OAuth flow, rate limits, data formats
- [ ] Spotify API: playback control requirements, premium vs free tier limits
- [ ] Feature flag system: simple config-based toggle or runtime system?

---

## Notes

_As I click around the app, I'll compile a list of features to feature-flag or hide. This doc will be updated with specific findings._
