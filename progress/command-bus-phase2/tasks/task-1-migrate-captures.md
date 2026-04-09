---
title: "Migrate Dashboard Captures to SQLite"
status: backlog
priority: medium
tags: [phase-2, wave-1, data-migration]
wave: 1
---

## Current State
- JSON file: `captures.json` in user data dir
- Service: `src/main/services/dashboard/dashboard-service.ts`
- Channels: `DASHBOARD.LIST.CAPTURES`, `DASHBOARD.CREATE.CAPTURE`, `DASHBOARD.DELETE.CAPTURE`

## Migration Steps
1. Add `captures` table to `src/main/db/schema.ts`
2. Write one-time migration: read JSON → insert into SQLite
3. Update dashboard-service to use Drizzle queries instead of JSON read/write
4. Verify captures CRUD works end-to-end
5. Update docs if needed
