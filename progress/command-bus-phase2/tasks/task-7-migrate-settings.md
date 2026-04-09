---
title: "Migrate Settings to SQLite"
status: backlog
priority: medium
tags: [phase-2, wave-1, data-migration]
wave: 1
---

## Current State
- JSON file: `settings.json` in user data dir
- Service: `src/main/services/settings/settings-service.ts`
- Channels: `SETTINGS.GET.ALL`, `SETTINGS.UPDATE.ALL`, profiles, layout, etc.

## Migration Steps
1. Add `settings` key-value table to `src/main/db/schema.ts`
2. Write one-time migration: read JSON → insert into SQLite
3. Update settings-service to use Drizzle queries
4. Verify all settings operations work (get/update/profiles/layout)
