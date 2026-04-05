# ADC — Project Rules

> Electron 39 + React 19 + TypeScript strict + Zustand 5 + Tailwind v4. Solo project, AI is primary code writer.

## Architecture

- **Main**: `src/main/` — services, IPC handlers, bootstrap
- **Renderer**: `src/renderer/` — React + TanStack Router + Zustand
- **Shared**: `src/shared/` — Zod IPC contracts, types
- **Aliases**: `@ui` `@features` `@shared` `@main` `@renderer`

## Rules That Prevent Mistakes

1. **IPC**: Zod schema in `src/shared/ipc/<domain>/contract.ts` → thin handler in `src/main/ipc/handlers/` → barrel in `src/shared/ipc/index.ts`. No business logic in handlers.
2. **Services**: Factory `createXService()` returning interface. `import type` for all interfaces.
3. **UI**: Use `@ui` primitives — never raw `<button>` `<input>` `<label>`. Import from `@ui`.
4. **Features**: `index.ts` barrel + `api/` + `components/` + `hooks/` + `store.ts`. Zustand = UI state only.
5. **v2**: Do NOT build on `terminal-service` or xterm.js — deprecated. Use stream-json / JSONL.
6. **Docs**: EVERY code change MUST update relevant docs. Non-negotiable.
7. **Verify**: `npm run lint` + `npm run typecheck` + `npm run build` before marking done.

## Finding Things

- Features/services/IPC lookup: `docs/routing/FEATURES-INDEX.md`
- Domain end-to-end trace: `docs/routing/AI-AGENT-ROUTING-INDEX.md`
- Full codebase map: `docs/INDEX.md`
- Feature plans: `docs/features/<name>/plan.md`
- Code patterns: `docs/patterns/PATTERNS.md`
- File placement rules: `docs/patterns/CODEBASE-GUARDIAN.md`
- Plan status: `docs/tracker.json`

## Skills Available

Use installed skills proactively — invoke before doing work manually:
- `adc-design-system` — theme tokens, UI primitives, color-mix() rules
- `electron-ipc` — adding IPC channels end-to-end with examples
- `tailwind-css` — layout, alignment, responsive patterns
- `create-frontend-ui` — building UI components
- `frontend-developer` — React architecture, state, performance
- `tanstack-router` / `tanstack-query` / `tanstack-form` / `tanstack-table` — TanStack patterns
- `shadcn-ui` — component patterns
- Run `node scripts/codebase-lookup.mjs <domain>` for instant file resolution
