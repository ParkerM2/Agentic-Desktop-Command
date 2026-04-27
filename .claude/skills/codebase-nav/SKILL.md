---
name: codebase-nav
description: "Navigate the ADC codebase by domain name. Use when finding, locating, or tracing files for any domain (auth, tasks, visualization, github, etc.), when asked 'where is X', when needing to understand how a feature connects across layers, or when starting work on any domain. Also use proactively before reading/searching files to resolve the right paths first."
---

# ADC Codebase Navigation

Every domain in ADC follows a predictable **Feature Slice Design** layout across 8 layers. Given a domain name, resolve all paths before searching or reading files.

## Domain → File Resolution (FSD)

For any domain `{d}`:

```
Channels:  src/shared/ipc/{d}/channels.ts          (typed channel constants)
Contract:  src/shared/ipc/{d}/contract.ts           (Zod schemas, channel defs)
Schemas:   src/shared/ipc/{d}/schemas.ts            (shared Zod types)
Service:   src/main/features/{d}/*-service.ts       (business logic)
Handler:   src/main/features/{d}/*-handlers.ts      (IPC handler, co-located)
Schema:    src/main/features/{d}/schema.ts           (Drizzle SQLite table)
Feature:   src/renderer/features/{d}/                (React UI)
Types:     src/shared/types/{d}.ts                   (TypeScript interfaces)
Doc:       docs/features/{d}/plan.md                 (feature plan)
```

Not every domain has all 8 layers. Check existence before reading.

**Key change:** Services and handlers are co-located in `src/main/features/{d}/`, NOT in separate `services/` and `ipc/handlers/` directories.

## Infrastructure (Not Feature Slices)

These live in `src/main/` directly, not in `features/`:

```
Command Bus:       src/main/bus/command-bus.ts, session-manager.ts, schema.ts
Database:          src/main/db/connection.ts, schema.ts (re-export barrel)
Agent Manager:     src/main/services/agent-manager/
IPC Router:        src/main/ipc/router.ts
Bootstrap:         src/main/bootstrap/
```

## CLI Lookup

Run `node scripts/codebase-lookup.mjs` for instant resolution:

```bash
node scripts/codebase-lookup.mjs visualization     # full domain trace
node scripts/codebase-lookup.mjs service:alerts     # just the service
node scripts/codebase-lookup.mjs ipc:auth           # contract + handler + service
node scripts/codebase-lookup.mjs feature:tasks      # feature directory
node scripts/codebase-lookup.mjs ui:button          # UI primitive
node scripts/codebase-lookup.mjs hook:useIpcEvent   # shared hook
node scripts/codebase-lookup.mjs type:project       # type file
node scripts/codebase-lookup.mjs handler:git        # IPC handler
node scripts/codebase-lookup.mjs doc:visualization  # feature doc
```

## Full Index Files

- **All features, services, IPC channels**: `docs/routing/FEATURES-INDEX.md`
- **Domain end-to-end trace**: `docs/routing/AI-AGENT-ROUTING-INDEX.md`
- **Full codebase XML map**: `docs/INDEX.md`

## Feature Module Structure (Renderer)

Every renderer feature follows:
```
src/renderer/features/{d}/
├── index.ts           # barrel exports
├── api/
│   ├── queryKeys.ts   # React Query key factory
│   └── use{D}.ts      # query/mutation hooks calling ipc()
├── components/
│   └── {D}Page.tsx    # main page component
├── hooks/             # feature-specific hooks
└── store.ts           # Zustand (UI state only)
```

## Feature Module Structure (Main Process)

Every main-process feature follows:
```
src/main/features/{d}/
├── schema.ts           # Drizzle SQLite table(s)
├── {d}-service.ts      # Business logic factory
├── {d}-handlers.ts     # IPC handler registration
└── [sub-modules]       # Domain-specific helpers
```

## Structure Compliance

```bash
node scripts/scaffold-features.mjs          # audit (report only)
node scripts/scaffold-features.mjs --fix    # create missing files
```

## Common Domains

agent-dashboard, alerts, assistant, auth, briefing, bus, calendar, changelog, claude, dashboard, data-management, device, docker, email, file-tree, fitness, git, github, health, hotkeys, hub, ideas, insights, mcp, merge, milestones, notes, notifications, oauth, planner, progress, project, qa, runners, screen, security, settings, spotify, tasks, terminal, time-parser, tracker, visualization, voice, webhook-settings, window, workflow, workflow-engine, workflow-templates, workspace

## Path Aliases

```
@ui        → src/renderer/shared/components/ui
@features  → src/renderer/features
@shared    → src/shared
@main      → src/main
@renderer  → src/renderer
```
