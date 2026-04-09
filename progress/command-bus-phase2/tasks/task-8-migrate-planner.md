---
title: "Migrate Planner to SQLite"
status: backlog
priority: medium
tags: [phase-2, wave-2, data-migration]
wave: 2
---

## Current State
- Directory-based: `planner/` with daily JSON files
- Service: `src/main/services/planner/planner-service.ts`
- Channels: `PLANNER.GET.DAY`, `PLANNER.UPDATE.DAY`, time blocks, weekly review

## Migration Steps
1. Add `planner_days` + `time_blocks` tables to schema
2. Write migration: scan planner dir → insert into SQLite
3. Update planner-service to use Drizzle queries
4. Verify day/week views + time block CRUD works
