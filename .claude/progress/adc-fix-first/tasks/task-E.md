---
taskNumber: E
taskName: Process Group Kill + Dead Stdin Guard
taskSlug: adc-fix-process-manager
agentRole: service-engineer
agentDefinition: null
wave: 2
blockedBy: []
blocks: []
estimatedTokens: 6000
complexity: medium
teamLeaderName: "team-lead"
teamName: adc-fix-first
workbranch: work/adc-fix-first/adc-fix-process-manager
worktreePath: /Users/parker/Desktop/Agentic-Desktop-Command
status: pending
---

## Task E: Process Group Kill + Dead Stdin Guard

### Context
Two bugs in process-manager.ts:
1. Agent termination kills only the parent process — child processes become orphans
2. `sendMessage()` writes to stdin without checking if it's writable — crashes on dead processes

Both fixes are in the same file, so they're combined into one task.

### Files to Modify
- `src/main/services/agent-manager/process-manager.ts`

### What to Do

**E1 — Process Group Kill**:
1. Find the `spawn()` call — add `{ detached: true }` option
2. Find the kill logic — change to `process.kill(-pid, 'SIGTERM')` (negative PID kills entire process group)
3. After 5-second timeout, escalate to `process.kill(-pid, 'SIGKILL')`
4. Add Windows guard: `if (process.platform === 'win32')` fall back to single-process kill (no negative PID)

**E2 — Dead Stdin Guard** (from original Task G2):
1. Find `sendMessage()` method
2. Add guard: `&& managed.process.stdin?.writable === true` before writing to stdin
3. If stdin not writable, return false (or throw appropriate error)

### Files to Read First
- `src/main/services/agent-manager/process-manager.ts` — full file

### Acceptance Criteria
- [ ] `spawn()` called with `detached: true`
- [ ] Kill uses `process.kill(-pid, 'SIGTERM')` on macOS/Linux
- [ ] 5s timeout then `process.kill(-pid, 'SIGKILL')`
- [ ] Windows falls back to single-process kill
- [ ] `sendMessage()` checks `stdin?.writable === true` before writing
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes

### Rules
- Read `ai-docs/CODEBASE-GUARDIAN.md` and `ai-docs/LINTING.md` before writing any code
- Minimal changes — do not refactor beyond what's described
- Use `import type` for all interfaces
