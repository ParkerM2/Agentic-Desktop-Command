---
title: "Migrate Hub Config to SQLite"
status: backlog
priority: medium
tags: [phase-2, wave-4, data-migration]
wave: 4
---

## Current State
- JSON file: hub connection config
- Service: `src/main/services/hub/hub-connection.ts`
- Channels: `HUB.GET.CONFIG`, `HUB.CONNECT.SERVER`

## Migration Steps
1. Add `hub_config` table
2. Migrate existing config to SQLite
3. Update hub-connection to use Drizzle
4. Verify connect/disconnect/sync works
