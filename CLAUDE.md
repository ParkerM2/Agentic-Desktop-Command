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

## Key Docs

| Doc | When to Read |
|-----|-------------|
| `docs/patterns/CODEBASE-GUARDIAN.md` | File placement, naming, import rules — always |
| `docs/patterns/LINTING.md` | ESLint rules and fix patterns |
| `docs/patterns/PATTERNS.md` | Code conventions and examples |
| `docs/architecture/ARCHITECTURE.md` | System architecture, IPC flow |
| `docs/architecture/DATA-FLOW.md` | Data flow diagrams |
| `docs/routing/FEATURES-INDEX.md` | All features, services, and IPC channels |
| `docs/tracker.json` | Plan lifecycle (single source of truth) |
