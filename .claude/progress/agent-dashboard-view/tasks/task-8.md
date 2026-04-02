---
taskNumber: 8
taskName: Agent Dashboard React Query Hooks + Event Subscriptions
taskSlug: agent-hooks
wave: 3
complexity: medium
blockedBy: task-6
agent: hook-engineer
files_create:
  - src/renderer/features/agent-dashboard/api/queryKeys.ts
  - src/renderer/features/agent-dashboard/api/useAgentSessions.ts
  - src/renderer/features/agent-dashboard/api/useAgentMessages.ts
  - src/renderer/features/agent-dashboard/api/useAgentMutations.ts
  - src/renderer/features/agent-dashboard/hooks/useAgentEvents.ts
  - src/renderer/features/agent-dashboard/hooks/useAgentStream.ts
files_modify: []
---

## Task: Build React Query hooks and IPC event subscriptions for Agent Dashboard

### Context

Data fetching layer for the agent dashboard. Connects renderer components to main process services via IPC. Follows the standard feature module api/ and hooks/ pattern.

Read:
- `ai-docs/PATTERNS.md` — Hook patterns, React Query usage
- `ai-docs/DATA-FLOW.md` — IPC data flow
- `src/renderer/features/tasks/api/` — reference implementation for query hooks

### Requirements

#### queryKeys.ts
```typescript
export const agentDashboardKeys = {
  all: ['agent-dashboard'] as const,
  sessions: () => [...agentDashboardKeys.all, 'sessions'] as const,
  session: (id: string) => [...agentDashboardKeys.all, 'session', id] as const,
  messages: (sessionId: string) => [...agentDashboardKeys.all, 'messages', sessionId] as const,
  filesChanged: (branch: string) => [...agentDashboardKeys.all, 'files', branch] as const,
}
```

#### useAgentSessions.ts
- `useAgentSessions()` — query all active sessions via `agent-dashboard.listSessions`
- `useAgentSession(sessionId)` — query single session via `agent-dashboard.getSession`
- Appropriate staleTime (5s for session list, 2s for individual session)
- Returns typed `AgentSession` / `AgentSession[]`

#### useAgentMessages.ts
- `useAgentMessages(sessionId)` — query messages for a session
- This is event-driven, not polling: messages accumulate from IPC events
- Maintains a local cache of messages per session
- New messages arrive via `event:agent-dashboard.messageReceived`

#### useAgentMutations.ts
- `useSpawnProjectOwner()` — mutation to spawn headless session
- `useSpawnTeamLead()` — mutation to spawn tmux team-lead
- `useSendMessage()` — mutation to send message to agent
- `useStopSession()` — mutation to stop session
- All invalidate relevant query keys on success

#### useAgentEvents.ts
- Subscribe to all agent-dashboard IPC events
- On `sessionStarted` / `sessionEnded` → invalidate sessions query
- On `messageReceived` → append to messages cache for that session
- On `statusChanged` → invalidate session query
- On `teammateJoined` / `teammateLeft` → invalidate sessions query
- Clean up subscriptions on unmount

#### useAgentStream.ts
- Handle `stream_event` for token-level streaming
- Accumulate partial text into the current message
- Debounce renders (requestAnimationFrame) to avoid excessive re-renders during fast streaming
- Expose `isStreaming` state per session

### Acceptance Criteria

1. All query hooks return properly typed data
2. Event subscriptions auto-invalidate relevant queries
3. Streaming hook accumulates partial messages smoothly
4. Mutations invalidate caches on success
5. All subscriptions cleaned up on unmount
6. `npm run lint && npm run typecheck && npm run build` pass
7. No floating promises
8. Uses `import type` for type-only imports
