---
title: "Migrate Fitness to SQLite"
status: backlog
priority: medium
tags: [phase-2, wave-2, data-migration]
wave: 2
---

## Current State
- JSON files: workouts, goals, measurements
- Service: `src/main/services/fitness/fitness-service.ts`
- Channels: `FITNESS.LOG.WORKOUT`, goals, measurements, stats

## Migration Steps
1. Add `workouts`, `fitness_goals`, `measurements` tables
2. Write migration from JSON files
3. Update fitness-service to use Drizzle
4. Verify all CRUD + stats queries work
