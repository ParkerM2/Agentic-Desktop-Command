# Notification System

Background polling system that aggregates notifications from GitHub and Slack, with configurable filters, duplicate detection, and persistent storage.

## Key Files

- **`notification-manager.ts`** — Orchestrator that registers source watchers, polls on configurable intervals, deduplicates via ID cache, and manages start/stop lifecycle
- **`notification-store.ts`** — JSON file persistence for watcher config and cached notifications (up to 500 entries)
- **`notification-filter.ts`** — Filter matching logic that evaluates notifications against source, priority, and read-status criteria
- **`notification-watcher.ts`** — Re-export barrel that delegates to manager, store, and filter modules
- **`github-watcher.ts`** — Polls GitHub REST API for PR reviews, issue mentions, CI status, and merge events (60s default interval)
- **`slack-watcher.ts`** — Polls Slack Web API for mentions, DMs, thread replies, and channel activity (60s default interval)
- **`index.ts`** — Barrel export of createNotificationManager, watchers, and public types

## How It Connects

- **Upstream:** IPC handlers (`notification-handlers.ts`), agent watchdog (for alert notifications)
- **Downstream:** GitHub REST API (via github-client), Slack Web API (via slack-client), OAuth manager for tokens
- **Events:** Emits `notifications.new` events to the renderer via IPC for real-time badge updates
