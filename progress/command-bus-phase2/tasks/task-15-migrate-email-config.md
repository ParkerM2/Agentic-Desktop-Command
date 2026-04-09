---
title: "Migrate Email Config to SQLite"
status: backlog
priority: medium
tags: [phase-2, wave-4, data-migration]
wave: 4
---

## Current State
- JSON file: email service config + queue
- Service: `src/main/services/email/email-service.ts`
- Channels: `EMAIL.GET.CONFIG`, `EMAIL.UPDATE.CONFIG`, queue

## Migration Steps
1. Add `email_config` + `email_queue` tables
2. Migrate existing config to SQLite
3. Update email-service to use Drizzle
4. Verify send + queue + retry works
