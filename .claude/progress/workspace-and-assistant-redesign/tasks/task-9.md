---
taskNumber: 9
taskName: Assistant Service Simplification
taskSlug: assistant-service-simplify
agentRole: backend-developer
agentDefinition: null
wave: 4
blockedBy: []
blocks: [10, 11]
estimatedTokens: 8000
complexity: high
teamLeaderName: "team-lead"
teamName: workspace-and-assistant-redesign
workbranch: work/workspace-and-assistant-redesign/assistant-service-simplify
worktreePath: C:/Users/Parke/Desktop/Claude-UI
status: pending
---

## Task 9: Assistant Service Simplification

### Context
Strip the assistant service from a complex intent-classification + executor-routing system to a simple fire-and-forget Claude CLI subprocess. `sendCommand(input, projectPath)` spawns `claude --print -p "<input>" --cwd <projectPath>` and streams output via IPC events.
Full implementation details in `docs/superpowers/plans/2026-04-02-workspace-and-assistant-redesign.md` — Task 9.

### Files to Modify
- `src/main/services/assistant/assistant-service.ts` — replace entirely with simplified version
- `src/main/ipc/handlers/assistant-handlers.ts` — update sendCommand handler to pass (input, projectPath)
- `src/main/bootstrap/service-registry.ts` — simplify createAssistantService call to just `createAssistantService(getMainWindow)`

### Files to Delete
- `src/main/services/assistant/intent-classifier/` — entire directory
- `src/main/services/assistant/executors/` — entire directory

### What to Do
1. Read `docs/superpowers/plans/2026-04-02-workspace-and-assistant-redesign.md` Task 9 for the full replacement service code
2. Read `src/main/services/assistant/assistant-service.ts` in full — note the current factory signature and all deps
3. Read `src/main/ipc/handlers/assistant-handlers.ts` to understand current handler structure
4. Read `src/main/bootstrap/service-registry.ts` to find the assistantService instantiation line
5. Replace assistant-service.ts with the simplified direct-CLI version
6. Update the assistant handler to call `assistantService.sendCommand(input, projectPath)`
7. Simplify the service-registry instantiation: remove the old deps object
8. Delete the intent-classifier and executors directories (`rm -rf`)
9. Fix any remaining import errors — any service that was injected into old AssistantServiceDeps but is NOT used by other services can have its import removed from service-registry.ts (check before removing)
10. Run `npm run typecheck && npm run build`

### Acceptance Criteria
- [ ] `assistant-service.ts` exports `createAssistantService(getWindow)` returning `AssistantService`
- [ ] `sendCommand(input, projectPath)` spawns `claude --print -p <input> --cwd <projectPath>` via `child_process.spawn`
- [ ] Stdout streams as `event:assistant.response` chunks; process close emits `event:assistant.thinking { isThinking: false }`
- [ ] `intent-classifier/` and `executors/` directories no longer exist
- [ ] `npm run typecheck` passes clean
- [ ] `npm run lint` passes clean
- [ ] `npm run build` passes

### Rules
- Read `ai-docs/CODEBASE-GUARDIAN.md` before any changes
- Do NOT remove service-registry imports for services used by OTHER services — only remove deps that were exclusively used by the old assistant service
- The `AssistantService` interface changes: old `sendCommand(input, context?)` → new `sendCommand(input: string, projectPath: string): void`
- IPC handler output changes to `{ success: boolean }` (fire-and-forget)
