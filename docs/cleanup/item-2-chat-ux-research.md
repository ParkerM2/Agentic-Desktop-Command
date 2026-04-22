# Item 2: Chat UX Message Flow — Research & Root Cause Analysis

## Current Message Flow Diagrams

### A. Workspace Sessions (Primary + Team Lead)

```
User types message in PrimarySessionPanel / TeamLeadPanel
  |
  v
handleSend() -> useWorkspaceSend().mutate({ sessionId, message })
  |  (clears draft immediately via clearDraft(sessionId))
  |  (NO optimistic user message added to UI)
  |
  v
IPC invoke: WORKSPACE.SEND.MESSAGE -> workspace-handlers.ts
  |
  v
WorkspaceSessionManager.sendMessage(sessionId, message)
  |
  v
agentManager.sendMessage(sessionId, message)   [agent-host-client.ts]
  |  (fire-and-forget: posts to control port, returns true immediately)
  |
  v
AgentHost utility process receives 'send-message' control request
  |
  v
AgentManagerService.sendMessage() in agent-manager-service.ts
  |  1. processManager.sendMessage(process, message) -> writes to stdin
  |  2. Creates a SYNTHETIC user AgentChatMessage:
  |     { id: randomUUID(), agentId: sessionId, role: 'user',
  |       content: [{ type: 'text', text: message }], timestamp: now }
  |  3. Calls handleChatMessage(internal, userMessage)
  |
  v
handleChatMessage() emits TWO things:
  1. router.emit(AGENT_DASHBOARD_EVENTS.MESSAGE.RECEIVED, message)
     -> IPC event to renderer
  2. emitEvent({ type: 'message.received', ... })
     -> agent-host event port to main process cache
  |
  v
Renderer receives event:agent-dashboard.messageReceived
  |
  v
useAgentDashboardEvents() hook: setQueryData appends to
  ['agent-dashboard', 'messages', message.agentId]
  |
  v
PrimarySessionPanel / TeamLeadPanel re-renders via useQuery on same key
  -> messagesToChatItems() converts to AgentChatItem[]
  -> AgentChatPanel renders the message
```

**Time from user press Enter to message appearing: ~50-200ms IPC round-trip**

### B. Assistant Widget / Assistant Page

```
User types in AssistantInputBar / WidgetInput
  |
  v
onSubmit(trimmed) -> useSendCommand().mutate()
  |
  v
onMutate callback:
  1. setLastCommand(input)           [module-level ref]
  2. setIsThinking(true)             [Zustand store]
  3. clearCurrentResponse()          [Zustand store]
  (NO user message added to responseHistory)
  |
  v
IPC invoke: ASSISTANT.SEND.COMMAND -> assistant-handlers.ts
  |
  v
AssistantService.sendCommand(input, context)
  1. sendEvent(THINKING, { isThinking: true })
  2. agentManager.sendMessage(sessionId, input)
  |
  v
[Same path as workspace: stdin write + synthetic user message emitted]
  |
  v
AssistantService event subscription catches 'message.received':
  - Extracts text from assistant message
  - Sends ASSISTANT_EVENTS.MESSAGE.RESPONSE to renderer
  |
  v
useAssistantEvents() hook catches MESSAGE.RESPONSE:
  1. setCurrentResponse(payload.content)
  2. addResponseEntry({ input: _lastCommand, response: payload.content, type })
     ^^ THIS is the ONLY place the user's message enters the UI
  |
  v
WidgetMessageArea / ResponseStream renders responseHistory
  (each entry has { input, response } — user message is coupled to response)
```

**User message does NOT appear until Claude responds.**

### C. Agent Dashboard (AgentChatPanel standalone)

```
AgentPanelExpanded passes agent.messages (AgentChatItem[]) to AgentChatPanel
  |
  v
Messages come from AgentSession.messages field
  (populated by buildChatItems in some places, or directly from query cache)
  |
  v
Same event-driven cache as workspace: useAgentDashboardEvents
appends to ['agent-dashboard', 'messages', agentId]
```

### D. Terminal (working reference)

```
User types in xterm.js terminal
  |
  v
term.onData(data) -> ipc(TERMINALS.SEND.INPUT, { sessionId, data })
  |  Input is ECHO'd by the PTY itself (shell echo)
  |
  v
Main process writes data to PTY stdin
PTY echoes input back to stdout
  |
  v
TERMINALS_EVENTS.TERMINAL.OUTPUT event fires
  |
  v
useIpcEvent listener: xtermRef.current.write(data)
  -> User sees their input instantly because PTY echo
```

---

## Root Cause Analysis

### Problem 1: User message does NOT appear immediately

**Root cause (Workspace sessions):** `PrimarySessionPanel.handleSend()` and `TeamLeadPanel.handleSend()` call `useWorkspaceSend().mutate()` which is a fire-and-forget IPC call. The mutation has **no `onMutate` callback** that optimistically inserts the user message into the React Query cache. The user message only appears when:

1. `agentManager.sendMessage()` runs in the agent-host utility process
2. It creates a synthetic `AgentChatMessage` with `role: 'user'`
3. Emits `AGENT_DASHBOARD_EVENTS.MESSAGE.RECEIVED` back to renderer
4. `useAgentDashboardEvents()` appends it to the query cache

This is a ~50-200ms round-trip through: renderer -> IPC -> main -> MessagePort -> agent-host -> MessagePort -> main -> IPC -> renderer.

**Root cause (Assistant):** The assistant flow is worse. `useSendCommand()` has an `onMutate` that sets `isThinking` and `clearCurrentResponse`, but it **never adds the user's input to `responseHistory`**. The user's input only enters the UI when `addResponseEntry()` is called inside `useAssistantEvents()` — which only fires when Claude's response arrives. The `ResponseEntry` type couples `{ input, response }` into a single object, so the user message literally cannot render without a response.

**Files involved:**
- `src/renderer/features/workspace/api/useWorkspace.ts` — `useWorkspaceSend()` (line 74-79, no onMutate)
- `src/renderer/features/workspace/components/PrimarySessionPanel.tsx` — `handleSend()` (line 69-74)
- `src/renderer/features/workspace/components/TeamLeadPanel.tsx` — `handleSend()` (line 63-68)
- `src/renderer/features/assistant/api/useAssistant.ts` — `useSendCommand()` (line 26-52, onMutate only sets thinking)
- `src/renderer/features/assistant/store.ts` — `ResponseEntry` type couples input+response (line 7-13)
- `src/renderer/features/assistant/hooks/useAssistantEvents.ts` — `addResponseEntry` only on response (line 31-41)
- `src/main/services/agent-manager/agent-manager-service.ts` — synthetic user message (line 456-463)

### Problem 2: No loading/thinking indicator while Claude processes

**Root cause (Workspace sessions):** `useSessionThinking(sessionId)` listens for `AGENT_DASHBOARD_EVENTS.SESSION.STATUS-CHANGED` and returns true when `newStatus === 'running'`. This event fires from `handleStreamEvent()` when the agent-manager-service sees `event.type === 'assistant'` or `event.type === 'stream_event'`. The thinking indicator **only appears after Claude starts producing output** — not when the user sends a message. There is no event emitted at the moment of send.

Both `PrimarySessionPanel` and `TeamLeadPanel` do render `<ThinkingIndicator>` when `isThinking` is true, but `isThinking` stays false during the critical wait between send and first stream event.

**Root cause (Assistant):** The assistant flow IS correct for thinking. `useSendCommand().onMutate` sets `isThinking(true)` immediately, and `WidgetMessageArea` / `ResponseStream` render `<ThinkingIndicator>` when `isThinking === true`. The thinking indicator works for the assistant. However, it shows **below the empty message area** rather than below the user's message (since the user message isn't shown yet).

**Files involved:**
- `src/renderer/features/workspace/hooks/useSessionThinking.ts` — only triggers on status-changed event
- `src/main/services/agent-manager/agent-manager-service.ts` — `updateSessionStatus` at line 196-200, only fires on stream events
- `src/renderer/features/assistant/api/useAssistant.ts` — `onMutate` correctly sets thinking (line 42-44)

### Problem 3: Claude response re-posts user's message

**Root cause (Assistant):** This is a direct consequence of the `ResponseEntry` design. Each `ResponseEntry` in `responseHistory` contains `{ input, response }`. When `addResponseEntry` is called on each assistant response, it grabs `_lastCommand` (a module-level mutable variable set in `setLastCommand()`). If Claude sends multiple response messages (e.g., a text message followed by another after tool execution), each response creates a new `ResponseEntry` with the same `_lastCommand` value. The user's input text appears once per Claude response chunk.

The `_lastCommand` variable is set once in `useSendCommand().onMutate` and never cleared. So subsequent assistant messages from the same prompt all pair with the same user input.

**Root cause (Workspace):** This should NOT happen in workspace sessions because user messages are separate `AgentChatMessage` objects with `role: 'user'` and unique IDs. The deduplication in `useAgentDashboardEvents()` (line 79: `existing.some(m => m.id === message.id)`) prevents duplicate insertion. If workspace sessions DO show duplicates, it would be because `agentManager.sendMessage()` is being called multiple times (e.g., the synthetic user message is emitted once per `sendMessage` call in the agent-manager, and separately once from the agent-host client cache in `message.received` handler). Both paths create separate message objects with different IDs, so dedup doesn't catch it.

Wait — re-examining: in the agent-host architecture, `sendMessage` in `agent-host-client.ts` is fire-and-forget (posts to control port). The actual `sendMessage` runs in the utility process's `AgentManagerService`. The utility process emits `message.received` on the event port. The `agent-host-client.ts` event handler at line 133 adds the message to `messageStore`. The same event is forwarded to all `eventHandlers`. The `event-wiring` module in the main process subscribes to these events and forwards them to the renderer via `router.emit`. So there is ONE path for user messages, not two. The synthetic user message from `agent-manager-service.ts:456-463` is emitted once.

**Files involved:**
- `src/renderer/features/assistant/hooks/useAssistantEvents.ts` — `_lastCommand` reuse (line 18-20, 32-38)
- `src/renderer/features/assistant/store.ts` — `ResponseEntry` coupling (line 7-13)

### Problem 4: Bug report says "no duplication on continued conversation"

This is consistent with the analysis. For workspace sessions, the deduplication check (`existing.some(m => m.id === message.id)`) prevents actual duplicates. For the assistant, the `_lastCommand` re-posting only happens when Claude sends multiple response chunks for a single query. In normal single-response conversations, each input maps to exactly one response entry.

---

## What the Terminal Does Differently

The terminal works because **xterm.js + PTY provide inherent echo**:

1. **Input echo is built into the PTY layer.** When xterm.js sends keystrokes via `term.onData()`, the PTY shell echoes them back through stdout. The renderer writes stdout to the terminal via `TERMINALS_EVENTS.TERMINAL.OUTPUT`. The user sees their input instantly because the PTY echoes it.

2. **No separate "user message" concept.** The terminal doesn't distinguish user input from output — it's a single continuous stream. There's no need for optimistic updates because the PTY provides real-time bidirectional I/O.

3. **Direct event streaming.** Terminal output arrives character-by-character through IPC events (`useIpcEvent`), not through query cache. This means zero latency between the PTY producing output and the UI rendering it.

The chat UX needs to implement the equivalent of "echo" — showing the user's message instantly in local state before any IPC round-trip.

---

## Recommended Fix Approach

### Fix 1: Optimistic User Messages for Workspace Sessions

Add `onMutate` to `useWorkspaceSend()` that immediately inserts a user message into the React Query cache:

```typescript
// In useWorkspace.ts
export function useWorkspaceSend() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ sessionId, message }: { sessionId: string; message: string }) =>
      ipc(WORKSPACE.SEND.MESSAGE, { sessionId, message }),
    
    onMutate: ({ sessionId, message }) => {
      // Optimistically add user message to cache
      const optimisticMessage: AgentChatMessage = {
        id: crypto.randomUUID(),
        agentId: sessionId,
        role: 'user',
        content: [{ type: 'text', text: message }],
        timestamp: new Date().toISOString(),
      };
      
      queryClient.setQueryData<AgentChatMessage[]>(
        ['agent-dashboard', 'messages', sessionId],
        (old) => [...(old ?? []), optimisticMessage],
      );
      
      return { optimisticId: optimisticMessage.id };
    },
  });
}
```

Then in `useAgentDashboardEvents()`, the dedup check will catch the real user message from the agent-host (it has a different ID, but same content). Two options:
- **Option A:** Skip dedup for user messages and accept the duplicate, then deduplicate by content+role+close-timestamp.
- **Option B (preferred):** Do not emit synthetic user messages from `agent-manager-service.ts` at all — let the renderer be the single source of truth for user messages. Remove lines 456-463 in `agent-manager-service.ts`.

**Risk with Option B:** The agent-host-client cache and the agent-dashboard `useAgentMessages` cache would diverge (agent-host has user messages, renderer doesn't get them from events). But since the renderer query cache is the rendering source of truth, this is fine — the agent-host cache is only used for main-process operations.

### Fix 2: Decouple User Messages from Responses in Assistant

Refactor `ResponseEntry` to support standalone user messages:

```typescript
// New types in assistant store
type ChatEntry = 
  | { kind: 'user'; id: string; input: string; timestamp: string }
  | { kind: 'response'; id: string; input: string; response: string; type: 'text' | 'error'; timestamp: string };

// In useSendCommand onMutate:
addUserEntry({ input: variables.input }); // appears instantly

// In useAssistantEvents MESSAGE.RESPONSE:
addResponseEntry({ response: payload.content, type: payload.type }); // no input field needed
```

Update `WidgetMessageArea` and `ResponseStream` to render `ChatEntry[]` as separate bubbles.

### Fix 3: Immediate Thinking State for Workspace Sessions

Add an `onMutate` to `useWorkspaceSend()` that sets a per-session thinking state:

```typescript
onMutate: ({ sessionId }) => {
  // Set thinking immediately in workspace store
  useWorkspaceStore.getState().setSessionThinking(sessionId, true);
},
```

Or simpler: in `PrimarySessionPanel` and `TeamLeadPanel`, derive thinking from `send.isPending || isThinking`:

```typescript
const showThinking = send.isPending || isThinking;
```

This uses the mutation's pending state to show thinking immediately on send, then the `useSessionThinking` hook takes over when the agent starts streaming.

### Fix 4: Clean Up `_lastCommand` Module Variable

Replace the mutable module-level `_lastCommand` with proper state flow. Store the pending input in the assistant Zustand store, and clear it after the response is received. This prevents the re-posting bug entirely.

---

## Files to Modify (by fix)

### Fix 1 (optimistic user messages — workspace)
- `src/renderer/features/workspace/api/useWorkspace.ts` — add onMutate to useWorkspaceSend
- `src/main/services/agent-manager/agent-manager-service.ts` — optionally remove synthetic user message emit (lines 456-463)
- `src/renderer/features/agent-dashboard/hooks/useAgentEvents.ts` — adjust dedup if keeping server-side user messages

### Fix 2 (decouple assistant messages)
- `src/renderer/features/assistant/store.ts` — refactor ResponseEntry to ChatEntry union
- `src/renderer/features/assistant/api/useAssistant.ts` — add user entry in onMutate
- `src/renderer/features/assistant/hooks/useAssistantEvents.ts` — remove _lastCommand, only add response entries
- `src/renderer/features/assistant/components/WidgetMessageArea.tsx` — render ChatEntry[]
- `src/renderer/features/assistant/components/ResponseStream.tsx` — render ChatEntry[]

### Fix 3 (immediate thinking — workspace)
- `src/renderer/features/workspace/components/PrimarySessionPanel.tsx` — combine send.isPending with isThinking
- `src/renderer/features/workspace/components/TeamLeadPanel.tsx` — same

### Fix 4 (clean up _lastCommand)
- `src/renderer/features/assistant/hooks/useAssistantEvents.ts` — remove _lastCommand variable
- `src/renderer/features/assistant/api/useAssistant.ts` — store pending input in Zustand
- `src/renderer/features/assistant/store.ts` — add pendingInput field

---

## Priority Order

1. **Fix 1** — Most impactful. Users see their message immediately in workspace (primary + team lead).
2. **Fix 3** — Quick win. One-line change to show thinking indicator on send.
3. **Fix 2** — Larger refactor but needed for assistant correctness.
4. **Fix 4** — Cleanup of mutable module state, prevents edge-case duplication.
