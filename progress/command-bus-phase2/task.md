---
title: "Command Bus Phase 2: Migrate JSON Stores to SQLite"
status: backlog
priority: medium
tags: [phase-2, data-migration, sqlite]
---

# Command Bus Phase 2: Data Migration

Migrate all JSON file-based stores to SQLite tables in `adc.db`.
Phase 1 (complete) established the command bus, channel constants,
session manager, and deleted deprecated systems.

## Waves

| Wave | Tasks | Description |
|------|-------|-------------|
| 1 | 7 | Simple JSON stores (settings, captures, notes, alerts, ideas, milestones, changelog) |
| 2 | 4 | Directory-based stores (planner, fitness, briefings, notifications) |
| 3 | 4 | Complex domains (progress tasks, sessions, task specs, workflow engine) |
| 4 | 3 | Auth-adjacent stores (OAuth tokens, email config, hub config) |
| 5 | 2 | Cleanup (remove JSON store code, remove progress/ filesystem) |
