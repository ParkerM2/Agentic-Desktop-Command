---
taskNumber: H
taskName: AgentConnectionStrategy Interface
taskSlug: adc-fix-strategy-pattern
agentRole: service-engineer
agentDefinition: null
wave: 3
blockedBy: [D]
blocks: []
estimatedTokens: 8000
complexity: medium
teamLeaderName: "team-lead"
teamName: adc-fix-first
workbranch: work/adc-fix-first/adc-fix-strategy-pattern
worktreePath: /Users/parker/Desktop/Agentic-Desktop-Command
status: pending
---

## Task H: AgentConnectionStrategy Interface

### Context
Task D wires spawnTeamLead to TmuxBridge. This task adds the strategy pattern abstraction over agent connection methods, with three strategies: subprocess (current behavior), UDS_INBOX (future KAIROS), and MCP channels (--channels research preview). This must run AFTER Task D is merged.

### Files to Create (all new)
- `src/main/services/agent-manager/agent-connection-strategy.ts` — interface + types
- `src/main/services/agent-manager/subprocess-strategy.ts` — wraps current spawn logic
- `src/main/services/agent-manager/uds-inbox-strategy.ts` — stub
- `src/main/services/agent-manager/mcp-channel-strategy.ts` — stub

### Files to Modify
- `src/main/services/agent-manager/agent-manager-service.ts` — accept strategy in constructor

### Interface to Implement
```typescript
export interface AgentConnectionStrategy {
  spawn(config: AgentSpawnConfig): Promise<AgentSession>;
  sendMessage(sessionId: string, message: string): boolean;
  terminate(sessionId: string): Promise<void>;
  getStatus(sessionId: string): AgentConnectionStatus;
}
```

Define `AgentSpawnConfig`, `AgentSession`, and `AgentConnectionStatus` types in the interface file.

### What to Do
1. Read `src/main/services/agent-manager/agent-manager-service.ts` (post Task D merge) — understand current spawn/send/terminate/status patterns
2. Read `src/main/services/agent-manager/process-manager.ts` — understand the subprocess layer
3. Create `agent-connection-strategy.ts` with the interface + required types
4. Create `subprocess-strategy.ts`:
   - Implements `AgentConnectionStrategy`
   - Pure refactor of current spawn logic — wraps `ProcessManager`
   - No new behavior
5. Create `uds-inbox-strategy.ts`:
   - Stub implementation — all methods throw `new Error('UDS_INBOX: waiting for KAIROS GA')`
   - Comment block: document expected socket path and protocol (ref: `docs/research/2026-04-01-claude-code-source-leak-analysis.md §3`)
6. Create `mcp-channel-strategy.ts`:
   - Stub implementation — all methods throw `new Error('MCP_CHANNELS: research preview, not production ready')`
   - Comment block: document `--channels` as future TL input transport replacing tmux send-keys
7. Update `AgentManagerService` constructor to accept `strategy: AgentConnectionStrategy` with default `new SubprocessStrategy(processManager)`
   - No behavior change — SubprocessStrategy wraps existing logic

### Acceptance Criteria
- [ ] Interface + 3 strategy files created
- [ ] `SubprocessStrategy` wraps current behavior (no regression)
- [ ] `UdsInboxStrategy` stub throws with descriptive error + comment
- [ ] `McpChannelStrategy` stub throws with descriptive error + comment
- [ ] `AgentManagerService` constructor accepts strategy param, defaults to `SubprocessStrategy`
- [ ] Behavior identical to before Task H
- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes
- [ ] `npm run build` passes

### Rules
- Read `ai-docs/CODEBASE-GUARDIAN.md`, `ai-docs/LINTING.md`, `ai-docs/PATTERNS.md` before writing any code
- This is architecture scaffolding — pure refactor + stubs, zero new behavior
- Use `import type` for all interfaces
- Keep stubs clearly marked as stubs (comment headers)
