---
title: "Migrate Notifications to SQLite"
status: backlog
priority: medium
tags: [phase-2, wave-2, data-migration]
wave: 2
---

## Current State
- JSON file: notification config + watcher state
- Service: `src/main/services/notifications/notification-manager.ts`
- Channels: `NOTIFICATIONS.LIST.ALL`, config, watching

## Migration Steps
1. Add `notifications` + `notification_config` tables
2. Migrate existing notification data
3. Update notification-manager to use Drizzle
4. Verify list + mark read + watcher lifecycle works
