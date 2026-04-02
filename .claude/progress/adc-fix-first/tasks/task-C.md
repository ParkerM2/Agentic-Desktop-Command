---
taskNumber: C
taskName: Wire File Explorer IPC
taskSlug: adc-fix-file-explorer
agentRole: hook-engineer
agentDefinition: null
wave: 1
blockedBy: []
blocks: []
estimatedTokens: 6000
complexity: medium
teamLeaderName: "team-lead"
teamName: adc-fix-first
workbranch: work/adc-fix-first/adc-fix-file-explorer
worktreePath: /Users/parker/Desktop/Agentic-Desktop-Command
status: pending
---

## Task C: Wire File Explorer IPC

### Context
`useFileTree.ts` has a hardcoded placeholder tree at line 117 (`// TODO: Replace with IPC call`). It must be replaced with a real IPC call.

### Files to Modify
- `src/renderer/features/file-explorer/api/useFileTree.ts` — replace placeholder with real IPC

### Potentially Modify (only if channel doesn't exist)
- `src/shared/ipc/files/contract.ts` — add `files.listTree` channel
- `src/main/ipc/handlers/files-handlers.ts` (or similar) — add handler
- `src/main/bootstrap/ipc-wiring.ts` — wire new handler

### What to Do
1. Read `src/shared/ipc/files/contract.ts` — check if `files.listTree` channel already exists
2. Read `src/renderer/features/file-explorer/api/useFileTree.ts` — understand the hook structure
3. **If `files.listTree` exists**: replace the placeholder with `useQuery` calling `ipc('files.listTree', { path: rootPath })`. Handle loading and error states properly.
4. **If `files.listTree` does NOT exist**: 
   - Add the channel to `src/shared/ipc/files/contract.ts` with appropriate Zod schema (input: `{ path: string }`, output: array of file tree nodes)
   - Add the handler in the files handler file
   - Wire it in ipc-wiring.ts
   - Then update useFileTree.ts

### Acceptance Criteria
- [ ] Hardcoded placeholder tree removed from useFileTree.ts
- [ ] Hook calls `ipc('files.listTree', { path: rootPath })` via `useQuery`
- [ ] Loading state handled (return empty or loading indicator)
- [ ] Error state handled
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes

### Rules
- Read `ai-docs/CODEBASE-GUARDIAN.md` and `ai-docs/LINTING.md` before writing any code
- Read `ai-docs/DATA-FLOW.md` for IPC patterns
- Use `@ui` primitives if adding UI elements — no raw HTML
- Follow the existing hook patterns in the codebase (React Query `useQuery`)
- If creating an IPC channel, follow the Zod schema pattern in existing contracts
