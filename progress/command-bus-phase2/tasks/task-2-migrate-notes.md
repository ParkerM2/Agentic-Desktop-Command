---
title: "Migrate Notes to SQLite"
status: backlog
priority: medium
tags: [phase-2, wave-1, data-migration]
wave: 1
---

## Current State
- JSON file: `notes.json` in user data dir
- Service: `src/main/services/notes/notes-service.ts`
- Channels: `NOTES.LIST.ALL`, `NOTES.CREATE.NOTE`, `NOTES.UPDATE.NOTE`, `NOTES.DELETE.NOTE`, `NOTES.SEARCH.NOTES`

## Migration Steps
1. Add `notes` table to `src/main/db/schema.ts`
2. Write one-time migration: read JSON → insert into SQLite
3. Update notes-service to use Drizzle queries
4. Verify CRUD + search works end-to-end
