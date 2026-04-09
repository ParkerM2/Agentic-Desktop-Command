---
title: "Migrate Milestones to SQLite"
status: backlog
priority: medium
tags: [phase-2, wave-1, data-migration]
wave: 1
---

## Current State
- JSON file: `milestones.json` in user data dir
- Service: `src/main/services/milestones/milestones-service.ts`
- Channels: `MILESTONES.LIST.ALL`, `MILESTONES.CREATE.MILESTONE`, etc.

## Migration Steps
1. Add `milestones` + `milestone_tasks` tables to `src/main/db/schema.ts`
2. Write one-time migration
3. Update milestones-service to use Drizzle queries
4. Verify CRUD + task linking works
