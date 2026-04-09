---
title: "Migrate Progress Tasks to SQLite"
status: backlog
priority: medium
tags: [phase-2, wave-3, data-migration]
wave: 3
---

## Current State
- Directory-based: `progress/<slug>/task.md` with YAML frontmatter
- Service: `src/main/services/progress/progress-service.ts`
- Channels: `PROGRESS.LIST.TASKS`, CRUD, archive

## Migration Steps
1. Add `progress_tasks` table (preserve all frontmatter fields)
2. Write migration: scan progress dirs → parse frontmatter → insert
3. Update progress-service to use Drizzle for metadata (keep markdown content as files)
4. Verify full task pipeline lifecycle works
