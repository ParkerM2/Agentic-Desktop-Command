---
title: "Migrate Briefings to SQLite"
status: backlog
priority: medium
tags: [phase-2, wave-2, data-migration]
wave: 2
---

## Current State
- JSON file: briefing cache/config
- Service: `src/main/services/briefing/briefing-service.ts`
- Channels: `BRIEFING.GET.DAILY`, `BRIEFING.GENERATE.DAILY`, config

## Migration Steps
1. Add `briefings` + `briefing_config` tables
2. Migrate cached briefings to SQLite
3. Update briefing-service to use Drizzle
4. Verify generate + cache + config works
