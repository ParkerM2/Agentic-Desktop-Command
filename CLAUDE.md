# ADC — Project Rules

> Read this before writing any code. These rules are enforced by ESLint, TypeScript, and the Codebase Guardian.

---

## Architecture

- **Main process**: `src/main/` — Electron main, services, IPC handlers, bootstrap
- **Renderer**: `src/renderer/` — React + TanStack Router + Zustand
- **Shared**: `src/shared/` — IPC contracts (Zod schemas), shared types

Full architecture: `docs/architecture/ARCHITECTURE.md`
Data flow: `docs/architecture/DATA-FLOW.md`

---

## Critical Rules

### IPC Contract
Every IPC channel must have:
1. Zod schema in `src/shared/ipc/<domain>/contract.ts`
2. Thin handler in `src/main/ipc/handlers/<domain>-handlers.ts` (one service call, `Promise.resolve()`)
3. Entry in root barrel `src/shared/ipc/index.ts`

Never add business logic to handlers. Never access services from renderer.

### Service Pattern
- Export a factory function `createXService()` returning an interface `XService`
- Services live in `src/main/services/<name>/`
- Use `import type` for all interfaces

### React Components
- Use `@ui` primitives (`Button`, `Input`, `Card`, etc.) — never raw `<button>`, `<input>`, `<label>`
- Feature modules: `index.ts` barrel + `api/` + `components/` + `hooks/` + `store.ts`
- Zustand stores for UI state only — server state via React Query

### Path Aliases
```
@ui        → src/renderer/shared/components/ui
@features  → src/renderer/features
@shared    → src/shared
@main      → src/main
```

---

## ADC v2 Refactor — COMPLETE

All 9 phases shipped. Do NOT build on `terminal-service` or xterm.js — they are deprecated.
Agent output comes from stream-json / session JSONL. See `docs/architecture/V2-REFACTOR.md`.

---

## Verification Requirements

Before marking any task done, run:
```bash
npm run lint       # Must pass on your modified files (pre-existing errors in other files OK)
npm run typecheck  # Must pass clean
npm run build      # Must compile
```

---

## Docs Reference

Full index: `docs/INDEX.md`

<docs-ref>
<essential>
<doc path="docs/patterns/CODEBASE-GUARDIAN.md" for="file-placement naming imports" />
<doc path="docs/patterns/PATTERNS.md" for="conventions feature-scaffold routes" />
<doc path="docs/architecture/ARCHITECTURE.md" for="system-layers ipc-flow" />
</essential>
<lookup>
<doc path="docs/routing/FEATURES-INDEX.md" for="find-feature find-service find-ipc" note="30 features, 33 services, 28 IPC domains" />
<doc path="docs/routing/AI-AGENT-ROUTING-INDEX.md" for="trace-domain-end-to-end types-to-route" />
<doc path="docs/tracker.json" for="plan-status plan-lifecycle" />
</lookup>
<by-task>
<task do="fix-lint" read="docs/patterns/LINTING.md" />
<task do="style-component" read="docs/patterns/DESIGN-SYSTEM.md" />
<task do="trace-data-flow" read="docs/architecture/DATA-FLOW.md" />
<task do="add-feature" read="docs/patterns/PATTERNS.md" then="docs/features/{name}/plan.md" />
<task do="run-agent-teams" read="docs/prompts/implementing-features/README.md" />
<task do="update-docs-after-code-change" read="docs/workflows/DOC-UPDATE-MAP.md" />
<task do="check-v2-refactor" read="docs/architecture/V2-REFACTOR.md" />
<task do="hub-protocol" read="docs/contracts/hub-device-protocol.md" />
</by-task>
<browse>
<dir path="docs/features/" count="10" pattern="plan.md" for="feature-plans" />
<dir path="docs/specs/" count="4" for="design-specs ux-audits" />
<dir path="docs/plans/" count="6" for="implementation-roadmaps" />
<dir path="docs/research/" count="5" for="technical-analysis evaluations" />
<dir path="docs/workflows/" count="5" for="agent-workflow task-pipeline worktree-setup" />
<dir path="docs/prompts/" count="4" for="agent-playbooks spawn-templates qa-checklists" />
</browse>
</docs-ref>
