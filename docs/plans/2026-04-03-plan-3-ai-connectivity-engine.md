# Research Doc: Plan 3 — AI Connectivity Engine

**Goal:** Replace the fire-and-forget Claude CLI subprocess in `assistant-service.ts` with Anthropic SDK tool_use calls, so that when the user types "create a roadmap for my project" the assistant actually creates a Milestone record in the database. Wire per-feature AI generation buttons (Generate Roadmap, Generate Ideas, Summarize Briefing, etc.) to produce structured output that pre-fills forms for user review.

---

## The Core Problem

**Current flow:**
```
user types → assistant.sendCommand IPC → spawn('claude --print') → text streams back → nothing created
```

**Target flow:**
```
user types → assistant.sendCommand IPC → Anthropic SDK messages.create({ tools: [...] }) →
  Claude returns tool_call → main process executes tool (= calls service) →
  tool_result sent back → Claude confirms → renderer invalidates React Query cache →
  new record appears in UI
```

There is already an `@anthropic-ai/sdk` wrapper at `src/main/services/claude/claude-client.ts` that does `sendMessage` and `streamMessage` via the SDK. The assistant-service ignores it entirely and uses `spawn('claude', ...)` instead. Plan 3 wires them together with tool_use support.

---

## Architecture

### Tool Definition Pattern

Each app capability becomes an Anthropic tool. Tools map 1:1 to IPC channels that already exist.

```typescript
// Example tool definition
{
  name: 'create_milestone',
  description: 'Create a new roadmap milestone with title, description, and target date',
  input_schema: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Milestone title' },
      description: { type: 'string', description: 'What this milestone represents' },
      targetDate: { type: 'string', description: 'ISO date string, e.g. 2026-06-01' },
      projectId: { type: 'string', description: 'Optional project ID to associate with' },
    },
    required: ['title', 'description', 'targetDate'],
  },
}
```

### Tool Execution Pattern

When Claude returns a `tool_use` block:
1. Main process identifies the tool name
2. Calls the corresponding service method directly (same path as IPC handlers use)
3. Returns the result as `tool_result` to Claude
4. Claude's final text response is streamed to renderer
5. Renderer receives `event:assistant.toolExecuted` event → invalidates relevant React Query cache

### Context Injection Pattern

When the user sends a message, the assistant service receives `projectPath` and now also `context`:
```typescript
sendCommand(input: string, projectPath: string, context?: AssistantContext)

interface AssistantContext {
  activeView: 'roadmap' | 'planner' | 'ideation' | 'notes' | 'fitness' | ...
  activeProjectId?: string
}
```

This context is injected into the system prompt so Claude knows what view the user is on.

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/main/services/assistant/tool-definitions.ts` | All Anthropic tool definitions as a typed array |
| `src/main/services/assistant/tool-executor.ts` | Maps tool name → service call, returns tool_result |
| `src/main/services/assistant/tool-registry.ts` | `registerTool(name, handler)` + lookup |

---

## Files to Modify

| File | Change |
|------|--------|
| `src/main/services/assistant/assistant-service.ts` | Replace `spawn('claude', ...)` with `claudeClient.streamMessageWithTools(...)` |
| `src/shared/ipc/agents/contract.ts` | Add `context?: AssistantContext` to `assistant.sendCommand` input |
| `src/shared/types/assistant.ts` (create if needed) | `AssistantContext` type, `AssistantToolEvent` type |
| `src/renderer/features/assistant/api/useAssistant.ts` | Pass `context` (active view + project) in `useSendCommand` mutation |
| `src/renderer/features/assistant/components/WidgetPanel.tsx` | Read `activeView` from layout store; pass as context |
| `src/renderer/features/assistant/hooks/useAssistantEvents.ts` | Handle new `event:assistant.toolExecuted` event → invalidate correct query keys |

---

## Tool Inventory

### Core CRUD Tools (must have for v1)

| Tool Name | Maps To | IPC Channel |
|-----------|---------|-------------|
| `create_note` | `NotesService.createNote` | `notes.create` |
| `create_idea` | `IdeasService.createIdea` | `ideas.create` |
| `create_milestone` | `MilestonesService.createMilestone` | `milestones.create` |
| `create_task` | `ProgressService.createTask` | `progress.create.task` |
| `update_daily_plan` | `PlannerService.updateDay` | `planner.updateDay` |
| `add_time_block` | `PlannerService.addTimeBlock` | `planner.addTimeBlock` |
| `log_workout` | `FitnessService.logWorkout` | `fitness.logWorkout` |

### Read/Query Tools (context for Claude)

| Tool Name | Maps To | Purpose |
|-----------|---------|---------|
| `get_today_plan` | `PlannerService.getDay` | Let Claude see today's goals before modifying |
| `list_milestones` | `MilestonesService.listMilestones` | Let Claude see existing roadmap |
| `list_ideas` | `IdeasService.listIdeas` | Let Claude see existing ideas before adding |
| `list_notes` | `NotesService.listNotes` | Let Claude find notes by search |
| `get_project_context` | `ProjectService.getProject` | Active project info |

---

## IPC Changes

### `assistant.sendCommand` input (current)
```typescript
z.object({
  input: z.string(),
  projectPath: z.string(),
})
```

### `assistant.sendCommand` input (target)
```typescript
z.object({
  input: z.string(),
  projectPath: z.string(),
  context: z.object({
    activeView: z.string().optional(),
    activeProjectId: z.string().optional(),
  }).optional(),
})
```

### New event: `event:assistant.toolExecuted`
```typescript
// Payload
{
  toolName: string;       // e.g. 'create_milestone'
  queryKeysToInvalidate: string[][];  // e.g. [['milestones', 'list']]
  result: unknown;        // The created/updated record
}
```

Renderer `useAssistantEvents.ts` listens for this event and calls `queryClient.invalidateQueries` for the listed keys.

---

## `assistant-service.ts` Rewrite (Key Logic)

The new `sendCommand` function:

```typescript
async sendCommand(input, projectPath, context?) {
  const id = generateId();
  const conversationId = getOrCreateConversation(id);

  sendEvent('event:assistant.thinking', { isThinking: true });

  const systemPrompt = buildSystemPrompt(context);
  const tools = toolRegistry.getAllDefinitions();

  // Stream with tools enabled
  const stream = anthropicClient.messages.stream({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: systemPrompt,
    tools,
    messages: conversationStore.buildMessages(conversationId, input),
  });

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      sendEvent('event:assistant.response', { content: event.delta.text, type: 'text' });
    }

    if (event.type === 'content_block_stop' && event.content_block.type === 'tool_use') {
      const toolBlock = event.content_block;
      // Execute the tool
      const result = await toolExecutor.execute(toolBlock.name, toolBlock.input);
      // Emit to renderer for cache invalidation
      sendEvent('event:assistant.toolExecuted', {
        toolName: toolBlock.name,
        queryKeysToInvalidate: toolExecutor.getQueryKeys(toolBlock.name),
        result,
      });
      // Continue the conversation with tool_result
      conversationStore.addToolResult(conversationId, toolBlock.id, result);
    }
  }

  sendEvent('event:assistant.thinking', { isThinking: false });
}
```

---

## Per-Feature AI Generation Buttons

Beyond the chat assistant, individual feature pages need "Generate with AI" buttons that pre-fill forms. These use a **dedicated generation IPC channel** (not the chat assistant) to keep concerns separate.

### New IPC Channel: `assistant.generate`

```typescript
'assistant.generate': {
  input: z.object({
    prompt: z.string(),          // Constructed by the UI, not the user
    schema: z.record(z.unknown()), // JSON Schema for the expected output
    context: z.record(z.unknown()).optional(),
  }),
  output: z.object({
    fields: z.record(z.unknown()),  // Parsed structured output
    raw: z.string(),                // Raw Claude response
  }),
}
```

This channel uses `claude.sendMessage` (non-streaming, structured output mode) to return a JSON object matching the `schema`. The renderer uses the returned `fields` to pre-fill a form.

### Generation Buttons Per Feature

| Feature | Button Label | Prompt Template | Fields Returned |
|---------|-------------|-----------------|-----------------|
| Roadmap | "Generate Roadmap" | "Create 3-5 milestones for a project called {projectName} focused on {description}" | `Array<{title, description, targetDate}>` |
| Ideation | "Generate Ideas" | "Generate 5 ideas for {prompt} in category {category}" | `Array<{title, description, tags}>` |
| Planner | "Plan My Day" | "Given my goals: {goals}, create a time-blocked schedule for today" | `Array<{startTime, endTime, label}>` |
| Notes | "Generate Note" | "Write a note about {topic} for {projectName}" | `{title, content}` |
| Briefing | "Summarize" | "Summarize the following for a morning briefing: {content}" | `{summary, keyPoints, actions}` |

**Files to create/modify for generation buttons:**
- `src/shared/ipc/claude/contract.ts` — add `assistant.generate` channel
- `src/main/ipc/handlers/assistant-handlers.ts` — add handler that calls `claude-client.sendMessage` with JSON mode
- `src/renderer/features/roadmap/components/RoadmapPage.tsx` — add Generate Roadmap button + preview modal
- `src/renderer/features/ideation/components/IdeationPage.tsx` — add Generate Ideas button + preview list
- `src/renderer/features/planner/components/PlannerPage.tsx` — add Plan My Day button
- `src/renderer/features/notes/components/NotesList.tsx` or `NotesPage.tsx` — add Generate Note button
- New shared hook: `src/renderer/shared/hooks/useAIGenerate.ts` — wraps `ipc('assistant.generate', ...)` mutation with loading/error state

---

## System Prompt Strategy

```typescript
function buildSystemPrompt(context?: AssistantContext): string {
  const base = `You are a personal developer assistant embedded in ADC (a developer OS desktop app).
You have access to tools that can create and update records in the app.
When the user asks you to create something, use the appropriate tool — do NOT just describe what you would do.
Always confirm what you created and show the key details.`;

  const viewContext = context?.activeView
    ? `\nCurrent view: ${context.activeView}. Prefer tools related to this view.`
    : '';

  const projectContext = context?.activeProjectId
    ? `\nActive project ID: ${context.activeProjectId}. Use this for projectId in tool calls.`
    : '';

  return base + viewContext + projectContext;
}
```

---

## Risk / Complexity

| Risk | Level | Notes |
|------|-------|-------|
| Anthropic API key not configured | Medium | Need graceful error in UI: "Claude API key not set — go to Settings" |
| Tool execution failure mid-stream | Medium | Need try/catch in tool executor; emit error event to renderer |
| Context window overflow from long tool result chains | Low | 4096 token limit is generous for CRUD tool results |
| Agentic loops (Claude keeps calling tools) | Low | Set `tool_choice: "auto"` with a 10-iteration guard |
| Rate limiting | Low | Already handled in `mapApiError` in claude-client |
| Breaking existing `spawn` behavior | Low | Swap is clean — assistant-service is self-contained |

---

## Out of Scope

- Multi-step agentic workflows (spawning Claude agents)
- Prompt chaining / conversation branching
- Streaming tool results to renderer (show progress while tool runs)
- Tool use in the `claude.*` conversation channels (those stay as plain messages)
- Writing files to disk via tools
- Running code via tools

---

## Dependencies

- Plan 1 should be complete (no conflict, but good hygiene)
- Plan 2 is independent (can run parallel to Plan 3)
- Requires Anthropic API key configured in settings (existing settings IPC handles this)
- `@anthropic-ai/sdk` already installed — verify version supports streaming with tools
