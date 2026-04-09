---
title: "Migrate Changelog to SQLite"
status: backlog
priority: medium
tags: [phase-2, wave-1, data-migration]
wave: 1
---

## Current State
- JSON file: `changelog.json` in user data dir
- Service: `src/main/services/changelog/changelog-service.ts`
- Channels: `CHANGELOG.LIST.ENTRIES`, `CHANGELOG.ADD.ENTRY`, `CHANGELOG.GENERATE.ENTRY`

## Migration Steps
1. Add `changelog_entries` table to `src/main/db/schema.ts`
2. Write one-time migration
3. Update changelog-service to use Drizzle queries
4. Verify list + add + generate works
