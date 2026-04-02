---
taskNumber: 1
taskName: Agent Dashboard Types + IPC Contracts
taskSlug: agent-types-ipc
wave: 1
complexity: high
blockedBy: none
agent: schema-designer
files_create:
  - src/shared/types/agent-dashboard.ts
  - src/shared/ipc/agent-dashboard/schemas.ts
  - src/shared/ipc/agent-dashboard/contract.ts
  - src/shared/ipc/agent-dashboard/index.ts
files_modify:
  - src/shared/ipc/index.ts
---

## Task: Define all TypeScript types and IPC contracts for the Agent Dashboard View

### Context

ADC v2 replaces xterm.js terminal grids with headless agents using stream-json + session JSONL. This task defines the complete type system and IPC contract surface for the new agent dashboard.

Read these docs for full context:
- `docs/research/2026-03-30-headless-agent-architecture.md` — Architecture, data flows, service design
- `docs/features/agent-dashboard-view/plan.md` — UI spec, panel states, chat components

### Types to Define (`src/shared/types/agent-dashboard.ts`)

```typescript
// Agent session types
AgentSessionType = 'project-owner' | 'team-lead' | 'teammate'
AgentStatus = 'running' | 'idle' | 'needs-attention' | 'failed' | 'completed'

// Core session
AgentSession {
  id: string
  name: string
  type: AgentSessionType
  status: AgentStatus
  model: string
  teamName?: string
  taskId?: string
  branch?: string
  tmuxPaneId?: string
  sessionJsonlPath?: string
  tokenUsage: { input: number; output: number }
  startedAt: string
  lastActivityAt: string
}

// NDJSON event types from stream-json / session JSONL
StreamJsonEventType = 'system' | 'assistant' | 'stream_event' | 'result'

StreamJsonEvent {
  type: StreamJsonEventType
  // system: { session_id, tools, model, etc. }
  // assistant: { message: { content: ContentBlock[] } }
  // stream_event: { event_type, delta, etc. }
  // result: { result, usage, cost, etc. }
}

ContentBlock = TextBlock | ToolUseBlock | ToolResultBlock

TextBlock { type: 'text'; text: string }
ToolUseBlock { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
ToolResultBlock { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean }

// Chat message for renderer
AgentChatMessage {
  id: string
  agentId: string
  role: 'assistant' | 'user'
  content: ContentBlock[]
  timestamp: string
  isStreaming?: boolean
}

// Tool call display types
ToolCallDisplay {
  id: string
  name: string  // 'Read' | 'Edit' | 'Bash' | 'Write' | 'Glob' | 'Grep' | etc.
  input: Record<string, unknown>
  output?: string
  exitCode?: number
  duration?: number
  isError?: boolean
  isCollapsed?: boolean
}

// Team config (from ~/.claude/teams/*/config.json)
TeamConfig {
  teamName: string
  members: TeamMember[]
}

TeamMember {
  agentId: string
  name: string
  sessionId: string
  tmuxPaneId?: string
  cwd: string
  status: AgentStatus
}

// Layout types
AgentLayoutMode = 'single' | 'two-column' | 'three-column' | 'grid' | 'multi-project'
AgentPanelState = 'compact' | 'expanded' | 'popup'

// Agent panel view model
AgentPanelData {
  session: AgentSession
  messages: AgentChatMessage[]
  filesChanged: FileChange[]
  errors: AgentError[]
  taskProgress?: TaskProgress
}

FileChange { path: string; status: 'A' | 'M' | 'D'; additions: number; deletions: number }
AgentError { id: string; type: 'bash' | 'tool' | 'qa' | 'warning'; message: string; timestamp: string; context?: string }
TaskProgress { taskNumber: number; taskName: string; phases: Phase[]; acceptanceCriteria: Criterion[] }
Phase { name: string; status: 'completed' | 'in-progress' | 'pending'; duration?: number }
Criterion { text: string; met: boolean }
```

### IPC Contracts to Define

**Invoke channels** (`src/shared/ipc/agent-dashboard/contract.ts`):
- `agent-dashboard.spawnProjectOwner` — spawn headless stream-json session
- `agent-dashboard.spawnTeamLead` — spawn tmux team-lead session
- `agent-dashboard.listSessions` — list all active agent sessions
- `agent-dashboard.getSession` — get single session details
- `agent-dashboard.sendMessage` — send message to agent (stdin or tmux send-keys)
- `agent-dashboard.stopSession` — stop an agent session
- `agent-dashboard.getFilesChanged` — get git diff for agent's branch

**Event channels**:
- `event:agent-dashboard.sessionStarted` — new agent session detected
- `event:agent-dashboard.sessionEnded` — agent session ended
- `event:agent-dashboard.messageReceived` — new chat message from agent
- `event:agent-dashboard.statusChanged` — agent status changed
- `event:agent-dashboard.teammateJoined` — new teammate detected
- `event:agent-dashboard.teammateLeft` — teammate left
- `event:agent-dashboard.streamEvent` — token-level streaming delta

### Acceptance Criteria

1. All types compile with `npm run typecheck` — zero errors
2. All Zod schemas defined and exported from `src/shared/ipc/agent-dashboard/schemas.ts`
3. Contract entries exported from `src/shared/ipc/agent-dashboard/contract.ts`
4. Root barrel at `src/shared/ipc/index.ts` updated to merge agent-dashboard contracts
5. Types match the three-layer architecture (Layer 1: agent visibility, Layer 2: workflow, Layer 3: dashboard)
6. No `any` types — use `unknown` + narrowing
7. All imports use `import type` for type-only values
