---
title: "Migrate Alerts to SQLite"
status: backlog
priority: medium
tags: [phase-2, wave-1, data-migration]
wave: 1
---

## Current State
- JSON file: `alerts.json` in user data dir
- Service: `src/main/services/alerts/alert-service.ts` + `alert-store.ts`
- Channels: `ALERTS.LIST.ALL`, `ALERTS.CREATE.ALERT`, `ALERTS.DISMISS.ALERT`, `ALERTS.DELETE.ALERT`

## Migration Steps
1. Add `alerts` table to `src/main/db/schema.ts`
2. Write one-time migration: read JSON → insert into SQLite
3. Update alert-store to use Drizzle queries
4. Verify alert CRUD + trigger checking works
