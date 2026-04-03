---
taskNumber: 11
taskName: IPC Schema Cleanup
taskSlug: ipc-schema-cleanup
agentRole: backend-developer
agentDefinition: null
wave: 5
blockedBy: [9, 10]
blocks: [12]
estimatedTokens: 4000
complexity: medium
teamLeaderName: "team-lead"
teamName: workspace-and-assistant-redesign
workbranch: work/workspace-and-assistant-redesign/ipc-schema-cleanup
worktreePath: C:/Users/Parke/Desktop/Claude-UI
status: pending
---

## Task 11: IPC Schema Cleanup

### Context
Remove IntentTypeSchema, AssistantActionSchema, and simplify AssistantContextSchema + CommandHistoryEntrySchema. Update the assistant contract to match the new direct-CLI sendCommand shape.
Full implementation details in `docs/superpowers/plans/2026-04-02-workspace-and-assistant-redesign.md` — Task 11.

### Files to Modify
- `src/shared/ipc/assistant/schemas.ts` — delete IntentTypeSchema + AssistantActionSchema, simplify AssistantContextSchema to `{ projectPath: z.string() }`, simplify AssistantResponseSchema, simplify CommandHistoryEntrySchema
- `src/shared/ipc/assistant/contract.ts` — update `assistant.sendCommand` input to `{ input, projectPath }`, output to `{ success: boolean }`, remove proactive + commandCompleted events if emitter is gone
- `src/shared/ipc/index.ts` — remove `AssistantActionSchema` and `IntentTypeSchema` from the assistant re-export block

### What to Do
1. Read `docs/superpowers/plans/2026-04-02-workspace-and-assistant-redesign.md` Task 11 for exact schema replacements
2. Read `src/shared/ipc/assistant/schemas.ts` in full
3. Read `src/shared/ipc/assistant/contract.ts` in full
4. Read `src/shared/ipc/index.ts` lines 159–167 (assistant re-exports)
5. Make the targeted edits per the plan
6. Run `npm run typecheck 2>&1 | grep -i "intent\|action\|AssistantAction\|IntentType"` — fix any remaining references
7. Run `npm run typecheck && npm run build`

### Acceptance Criteria
- [ ] `IntentTypeSchema` and `AssistantActionSchema` are no longer exported from `src/shared/ipc/`
- [ ] `AssistantContextSchema` is `z.object({ projectPath: z.string() })`
- [ ] `assistant.sendCommand` contract input is `{ input: z.string(), projectPath: z.string() }`, output is `z.object({ success: z.boolean() })`
- [ ] No references to `IntentType` or `AssistantAction` remain in `src/` (grep confirms)
- [ ] Any `@ts-expect-error` comments added in Task 10 are now resolved and removed
- [ ] `npm run typecheck` passes clean
- [ ] `npm run lint` passes clean
- [ ] `npm run build` passes

### Rules
- Read `ai-docs/CODEBASE-GUARDIAN.md` before modifying IPC contracts
- Check for any other files that import `IntentTypeSchema` or `AssistantActionSchema` before deleting — run `grep -r "IntentType\|AssistantAction" src/` first
- Keep all non-assistant schemas in schemas.ts that belong to other domains (Email, Briefing, etc. — check what barrel exports these through)
