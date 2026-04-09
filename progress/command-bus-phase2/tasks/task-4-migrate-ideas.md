---
title: "Migrate Ideas to SQLite"
status: backlog
priority: medium
tags: [phase-2, wave-1, data-migration]
wave: 1
---

## Current State
- JSON file: `ideas.json` in user data dir
- Service: `src/main/services/ideas/ideas-service.ts`
- Channels: `IDEAS.LIST.ALL`, `IDEAS.CREATE.IDEA`, `IDEAS.UPDATE.IDEA`, `IDEAS.DELETE.IDEA`, `IDEAS.VOTE.IDEA`

## Migration Steps
1. Add `ideas` table to `src/main/db/schema.ts`
2. Write one-time migration: read JSON → insert into SQLite
3. Update ideas-service to use Drizzle queries
4. Verify CRUD + voting works
