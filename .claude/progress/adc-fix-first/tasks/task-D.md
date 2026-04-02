---
taskNumber: D
taskName: Wire spawnTeamLead to TmuxBridge
taskSlug: adc-fix-spawn-team-lead
agentRole: service-engineer
agentDefinition: null
wave: 1
blockedBy: []
blocks: [H]
estimatedTokens: 7000
complexity: medium
teamLeaderName: "team-lead"
teamName: adc-fix-first
workbranch: work/adc-fix-first/adc-fix-spawn-team-lead
worktreePath: /Users/parker/Desktop/Agentic-Desktop-Command
status: pending
---

## Task D: Wire spawnTeamLead to TmuxBridge

### Context
`spawnTeamLead()` in agent-manager-service.ts currently returns a fake session. It must call the real TmuxBridge service.

### Files to Modify
- `src/main/services/agent-manager/agent-manager-service.ts` — lines 74, 341, 361

### What to Do
1. Read `src/main/services/agent-manager/agent-manager-service.ts` — find `spawnTeamLead()` and the fake session creation
2. Read the TmuxBridge service interface to find `createSession()` signature
3. Replace fake session with: `tmuxBridgeService.createSession({ sessionName, workDir, env: { CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: '1' } })`
4. Add tmux availability check:
   - If tmux unavailable: return typed error `{ error: 'tmux_unavailable', session: null }`
   - If tmux call fails: return typed error `{ error: 'tmux_failed', session: null }`
   - On success: real session object (never `process: null`)
5. Add `tmuxBridgeService` to constructor params if not already present

### Files to Read First
- `src/main/services/agent-manager/agent-manager-service.ts` — full file
- `src/main/services/tmux/tmux-bridge-service.ts` (or similar) — TmuxBridge interface
- `src/main/bootstrap/service-registry.ts` — how TmuxBridge is instantiated

### Acceptance Criteria
- [ ] `spawnTeamLead()` calls `tmuxBridgeService.createSession()` with correct params
- [ ] `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: '1'` passed in env
- [ ] Typed error returned on tmux unavailable or failure (no fake success)
- [ ] No `process: null` on success path
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes

### Rules
- Read `ai-docs/CODEBASE-GUARDIAN.md`, `ai-docs/LINTING.md`, `ai-docs/PATTERNS.md` before writing any code
- Service pattern: no IPC logic in services, no business logic in handlers
- Use `import type` for all interfaces
