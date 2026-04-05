---
name: codebase-nav
description: "Navigate the ADC codebase by domain name. Use when finding, locating, or tracing files for any domain (auth, tasks, visualization, github, etc.), when asked 'where is X', when needing to understand how a feature connects across layers, or when starting work on any domain. Also use proactively before reading/searching files to resolve the right paths first."
---

# ADC Codebase Navigation

Every domain in ADC follows a predictable file layout across 6 layers. Given a domain name, resolve all paths before searching or reading files.

## Domain → File Resolution

For any domain `{d}`:

```
Contract:  src/shared/ipc/{d}/contract.ts     (Zod schemas, channel defs)
Schemas:   src/shared/ipc/{d}/schemas.ts       (shared Zod types)
Service:   src/main/services/{d}/index.ts      (business logic)
Handler:   src/main/ipc/handlers/{d}-handlers.ts (thin IPC bridge)
Feature:   src/renderer/features/{d}/          (React UI)
Types:     src/shared/types/{d}.ts             (TypeScript interfaces)
Doc:       docs/features/{d}/plan.md           (feature plan)
```

Not every domain has all 6 layers. Check existence before reading.

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

## Feature Module Structure

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

## Common Domains

auth, tasks, visualization, github, assistant, settings, projects, agents, agent-dashboard, alerts, briefing, changelog, dashboard, fitness, hub, ideas, insights, merge, milestones, notes, notifications, planner, qa, spotify, terminals, voice, workflow, workspace

## Path Aliases

```
@ui        → src/renderer/shared/components/ui
@features  → src/renderer/features
@shared    → src/shared
@main      → src/main
@renderer  → src/renderer
```
