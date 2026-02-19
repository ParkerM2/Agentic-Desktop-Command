# Data Management Audit — Storage, Memory, Tracking & Lifecycle

> Tracker Key: `data-management-audit` | Status: **DRAFT** | Created: 2026-02-17

**Triggered by**: Discovery that workflow progress files, Playwright MCP screenshots, and agent session artifacts were leaking into git history

---

## Objective

Full audit of every data store, cache, log, and tracking artifact the application produces — both in the Electron `userData` directory and in user project directories. Define clear lifecycle rules: what gets created, when it gets cleaned up, what syncs to Hub, and what stays local-only.

## Scope

### 1. Electron userData Storage (`app.getPath('userData')`)

Audit all services that write to `dataDir`:
- **ErrorCollector** — `errors.json` (7-day prune, capacity alerts)
- **HealthRegistry** — in-memory only? Or persisted?
- **NotesService** — `notes.json`
- **AlertService** — `alerts.json`
- **TaskService** — `tasks.json`
- **PlannerService** — `planner/` directory
- **IdeasService** — `ideas.json`
- **MilestonesService** — `milestones.json`
- **ChangelogService** — `changelog.json`
- **FitnessService** — `fitness.json`
- **SettingsService** — `settings.json`
- **TokenStore** — OAuth tokens (encrypted?)
- **EmailStore** — `email/` directory
- **BriefingCache** — `briefings/` directory
- **HubConfigStore** — Hub connection config
- **NotificationStore** — Notification history
- **WatchStore** — Assistant watches
- **HistoryStore** — Command history
- **Agent logs** — `progress/*.log` (now cleaned on session end)
- **Agent progress** — `progress/*.jsonl` (now cleaned on session end)

Questions per store:
- What is the retention policy? (forever, N days, N items, explicit delete)
- Is it synced to Hub? If so, is the local copy redundant after sync?
- What happens if the file grows unbounded?
- Is there a user-facing way to clear/export this data?
- Is sensitive data encrypted at rest?

### 2. User Project Directory Artifacts

What does ADC create inside user project repos when agents run?
- Claude hooks config (cleaned up on session exit)
- Any `.claude/` directories?
- Any temp files or lock files?
- Git branches (worktrees, work branches)

Rules to define:
- ADC must NEVER leave artifacts in user project repos after session cleanup
- Any temp files created during agent execution must have cleanup handlers
- Git branches should have clear ownership and cleanup policy

### 3. Hub Sync Strategy

For each data store, define:
- Is this local-only, Hub-synced, or Hub-primary?
- What is the conflict resolution strategy?
- What happens when Hub is unreachable?
- Is there a local queue for pending syncs?

Current Hub-synced data:
- Tasks (Hub-primary via Hub API proxy)
- Devices (heartbeat registration)
- Projects (Hub-synced)
- Agent sessions (events forwarded via WebSocket)
- Workspaces (Hub-primary)

### 4. Cleanup & Lifecycle

Define lifecycle for each data type:
- **Transient** — cleaned up immediately after use (hooks config, progress files)
- **Session** — cleaned up when app closes (in-memory state)
- **Short-lived** — auto-pruned after N days (error logs: 7 days)
- **Persistent** — kept until user deletes (notes, tasks, settings)
- **Synced** — local copy is cache, Hub is source of truth

### 5. User-Facing Data Management

Settings page should expose:
- Storage usage breakdown (per-service disk usage)
- Clear cache / clear local data buttons
- Export data (JSON dump of all local stores)
- Data retention preferences (how long to keep logs, error history)
- Hub sync status (what's synced, what's pending, last sync time)

### 6. Privacy & Security

- Which stores contain sensitive data? (tokens, API keys, email content)
- Are they encrypted at rest?
- What happens on app uninstall — is data cleaned up?
- Can a user wipe all local data from the settings page?

## Deliverables

1. **Audit document** — comprehensive map of every data store with lifecycle classification
2. **Retention policy config** — user-configurable retention settings per data type
3. **Cleanup service** — centralized service that runs periodic cleanup (prune old logs, clear stale caches)
4. **Storage settings UI** — settings page section for data management
5. **Hub sync dashboard** — visibility into what's synced vs local-only

## Dependencies

- Settings service (for user preferences)
- Hub API (for sync status)
- All services that persist data (audit each one)
