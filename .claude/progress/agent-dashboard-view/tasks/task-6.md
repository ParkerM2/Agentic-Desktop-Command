---
taskNumber: 6
taskName: Agent Dashboard IPC Handlers
taskSlug: agent-dashboard-ipc
wave: 2
complexity: medium
blockedBy: task-1
agent: ipc-handler-engineer
files_create:
  - src/main/ipc/handlers/agent-dashboard-handlers.ts
files_modify:
  - src/main/bootstrap/ipc-wiring.ts
---

## Task: Wire IPC handlers for agent dashboard channels

### Context

Connect the agent dashboard IPC contracts (defined in task-1) to the services (built in tasks 4-5). Thin handler layer — NO business logic here.

Read:
- `ai-docs/CODEBASE-GUARDIAN.md` — Handler Pattern section
- `ai-docs/DATA-FLOW.md` — IPC flow diagrams
- `src/main/ipc/handlers/` — existing handler files for pattern reference

### Requirements

**agent-dashboard-handlers.ts** — Register all agent dashboard IPC handlers:

```typescript
export function registerAgentDashboardHandlers(
  router: IpcRouter,
  agentManager: AgentManagerService,
  tmuxBridge: TmuxBridgeService,
  teamWatcher: TeamWatcherService,
  sessionJsonlReader: SessionJSONLReaderService,
) {
  // Invoke handlers
  router.handle('agent-dashboard.spawnProjectOwner', (config) =>
    Promise.resolve(agentManager.spawnProjectOwner(config)));

  router.handle('agent-dashboard.spawnTeamLead', (config) =>
    Promise.resolve(agentManager.spawnTeamLead(config)));

  router.handle('agent-dashboard.listSessions', () =>
    Promise.resolve(agentManager.listSessions()));

  router.handle('agent-dashboard.getSession', ({ sessionId }) =>
    Promise.resolve(agentManager.getSession(sessionId)));

  router.handle('agent-dashboard.sendMessage', ({ sessionId, message }) => {
    agentManager.sendMessage(sessionId, message);
    return Promise.resolve({ success: true });
  });

  router.handle('agent-dashboard.stopSession', ({ sessionId }) => {
    agentManager.stopSession(sessionId);
    return Promise.resolve({ success: true });
  });

  router.handle('agent-dashboard.getFilesChanged', ({ branch }) =>
    Promise.resolve(gitService.getFilesChanged(branch)));

  // Event forwarding — service events → IPC events
  agentManager.onEvent((event) => {
    switch (event.type) {
      case 'session-started':
        router.emit('event:agent-dashboard.sessionStarted', event.session);
        break;
      case 'session-ended':
        router.emit('event:agent-dashboard.sessionEnded', { sessionId: event.sessionId });
        break;
      case 'message-received':
        router.emit('event:agent-dashboard.messageReceived', event.message);
        break;
      case 'status-changed':
        router.emit('event:agent-dashboard.statusChanged', event.status);
        break;
    }
  });

  teamWatcher.onTeammateJoined((member) => {
    router.emit('event:agent-dashboard.teammateJoined', member);
  });

  teamWatcher.onTeammateLeft((memberId) => {
    router.emit('event:agent-dashboard.teammateLeft', { memberId });
  });
}
```

### Wire into bootstrap

Add `registerAgentDashboardHandlers(...)` call in `src/main/bootstrap/ipc-wiring.ts` alongside existing handler registrations.

### Acceptance Criteria

1. All 7 invoke handlers registered
2. All 6 event channels forwarded from services
3. Handlers are thin — no business logic, just call service + wrap in Promise.resolve
4. Registered in ipc-wiring.ts
5. `npm run lint && npm run typecheck && npm run build` pass
6. Uses existing IpcRouter pattern from the codebase
