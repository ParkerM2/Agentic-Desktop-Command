---
title: "Migrate Workflow Engine State to SQLite"
status: backlog
priority: medium
tags: [phase-2, wave-3, data-migration]
wave: 3
---

## Current State
- JSON files: workflow-state.json per run
- Service: `src/main/services/workflow-engine/`
- Channels: `WORKFLOW_ENGINE.START.RUN`, state changes

## Migration Steps
1. Add `workflow_runs` + `workflow_steps` tables
2. Migrate existing state files to SQLite
3. Update workflow-engine to persist state via Drizzle
4. Verify start/stop/resume + state transitions work
