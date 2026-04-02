---
taskNumber: 4
taskName: AgentManager Service (stream-json)
taskSlug: agent-manager
wave: 2
complexity: high
blockedBy: task-1
agent: service-engineer
files_create:
  - src/main/services/agent-manager/agent-manager-service.ts
  - src/main/services/agent-manager/stream-json-parser.ts
  - src/main/services/agent-manager/process-manager.ts
  - src/main/services/agent-manager/index.ts
files_modify:
  - src/main/bootstrap/service-registry.ts
---

## Task: Build AgentManager service for headless stream-json Claude sessions

### Context

This is Phase 1 from the research doc — the foundational service for the v2 architecture. AgentManager spawns and manages headless Claude processes using the stream-json protocol.

Read these docs:
- `docs/research/2026-03-30-headless-agent-architecture.md` — Data Flow section, Output Capture Method 1
- `docs/features/agent-dashboard-view/plan.md` — Main Session Panel section

### Requirements

1. **agent-manager-service.ts** — Main service factory
   ```typescript
   interface AgentManagerService {
     spawnProjectOwner(config: ProjectOwnerConfig): AgentSession
     spawnTeamLead(config: TeamLeadConfig): AgentSession
     listSessions(): AgentSession[]
     getSession(sessionId: string): AgentSession | undefined
     sendMessage(sessionId: string, message: string): void
     stopSession(sessionId: string): void
     onEvent(handler: (event: AgentManagerEvent) => void): () => void
   }
   ```

2. **stream-json-parser.ts** — Parse NDJSON from Claude stdout
   - Parse each line as JSON
   - Handle incomplete lines (buffer partial data)
   - Emit typed events: `system`, `assistant`, `stream_event`, `result`
   - Extract tool calls from `assistant` messages (content blocks with type `tool_use`)
   - Handle `stream_event` for token-level streaming deltas
   - Error handling for malformed JSON lines

3. **process-manager.ts** — Child process lifecycle
   - Spawn Claude CLI: `spawn('claude', ['-p', '--input-format', 'stream-json', '--output-format', 'stream-json', '--verbose', '--include-partial-messages', '--replay-user-messages'])`
   - Manage stdin/stdout streams
   - Send user messages via stdin as NDJSON
   - Track process health (heartbeat, crash detection)
   - Clean shutdown on stop

4. **Service Pattern** — Follow existing ADC service patterns:
   - Factory function `createAgentManagerService(deps)`
   - Synchronous return values where possible
   - Event emission via callback registration
   - Register in service-registry.ts

### Critical Notes

- Do NOT use node-pty or terminal-service — this is the replacement
- Do NOT use xterm.js — output is structured JSON, not ANSI
- Use `child_process.spawn` directly for the headless process
- For team-lead, use tmux (see task-5 for TmuxBridge)
- Import types from `@shared/types/agent-dashboard` (created in task-1)

### Acceptance Criteria

1. Can spawn a headless Claude process with stream-json flags
2. Parses NDJSON output into typed AgentChatMessage events
3. Can send messages to the process via stdin
4. Tracks session state (running, idle, failed, completed)
5. Clean process termination on stopSession
6. Registered in service-registry.ts
7. `npm run lint && npm run typecheck && npm run build` pass
8. Service follows factory pattern per CODEBASE-GUARDIAN.md
