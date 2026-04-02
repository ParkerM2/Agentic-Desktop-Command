---
taskNumber: G
taskName: IPC Thundering Herd Debounce
taskSlug: adc-fix-ipc-debounce
agentRole: ipc-handler-engineer
agentDefinition: null
wave: 2
blockedBy: []
blocks: []
estimatedTokens: 5000
complexity: low
teamLeaderName: "team-lead"
teamName: adc-fix-first
workbranch: work/adc-fix-first/adc-fix-ipc-debounce
worktreePath: /Users/parker/Desktop/Agentic-Desktop-Command
status: pending
---

## Task G: IPC Thundering Herd Debounce

### Context
When many task files change rapidly (e.g., agent writing multiple updates), `router.emit('event:agent-dashboard.taskUpdated', ...)` fires for each change — flooding the renderer. Need a per-slug debounce.

Note: The stdin guard for sendMessage() has been moved to Task E (process-manager.ts).

### Files to Modify
- `src/main/ipc/handlers/agent-dashboard-handlers.ts`

### What to Do
1. Read the current handler to find where `router.emit('event:agent-dashboard.taskUpdated', ...)` is called
2. Add a `Map<string, NodeJS.Timeout>` at the top of the register function (or as module-level): keyed by slug
3. Wrap the `router.emit` call in a per-slug debounce:
   - Clear the existing timeout for that slug (if any)
   - Set a new 50ms timeout that fires the emit with the most recent payload
4. The debounce coalesces rapid updates for the same slug into one emit after 50ms of quiet

### Files to Read First
- `src/main/ipc/handlers/agent-dashboard-handlers.ts` — find the taskUpdated emit

### Acceptance Criteria
- [ ] `router.emit('event:agent-dashboard.taskUpdated', ...)` is debounced per slug
- [ ] Debounce window is >= 50ms
- [ ] Most recent payload is used (not first)
- [ ] Map is properly cleaned up (clearTimeout before setting new)
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes

### Rules
- Read `ai-docs/CODEBASE-GUARDIAN.md` and `ai-docs/LINTING.md` before writing any code
- Handler stays thin — debounce is infrastructure, not business logic
- Use `NodeJS.Timeout` type (not `any`)
