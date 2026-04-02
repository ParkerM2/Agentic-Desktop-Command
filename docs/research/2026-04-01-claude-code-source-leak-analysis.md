# Claude Code Source Leak — Architecture Analysis

**Date:** 2026-04-01
**Source:** npm source map leak from @anthropic-ai/claude-code v2.1.88
**Scope:** 1,884 files, 512,664 lines of TypeScript
**Purpose:** ADC development reference — architectural patterns, known bugs to avoid

---

## How It Happened

Bun's bundler generates source maps by default. The Claude Code packaging step (v2.1.88) failed to strip the 59.8 MB `cli.js.map` file before publishing to npm. The `sourcesContent` field contained every original `.ts`/`.tsx` source file. Anthropic acknowledged it as a packaging error, not a security breach. No customer data exposed.

**Primary study repo:** [sanbuphy/claude-code-source-code](https://github.com/sanbuphy/claude-code-source-code) — 7.9k stars, includes multilingual analysis docs.

---

## Codebase Structure

```
src/
├── QueryEngine.ts         # Core agentic loop (~1,295 lines)
├── query.ts               # Low-level orchestration (~1,729 lines)
├── bridge/                # Claude Desktop / remote process integration
├── commands/              # ~80 slash commands (inc. /ultraplan, /dream)
├── components/            # React + Ink terminal UI (~50 files)
├── coordinator/           # Multi-worker distribution (feature-gated)
├── services/              # API, analytics, MCP, tools
├── tools/                 # 40+ built-in tool implementations
├── utils/
│   ├── autoCompact.ts
│   ├── bashSecurity.ts
│   └── permissions/filesystem.ts   # 62 KB permission engine
└── ink/                   # Custom terminal renderer (NOT npm:ink)
```

---

## Key Patterns Applicable to ADC

### 1. Multi-Agent Coordination

**Six execution contexts:**
```
InProcessTeammate  → AsyncLocalStorage, shared terminal
LocalAgentTask     → Async background, non-blocking
RemoteAgentTask    → Remote CCR (cloud execution)
LocalShellTask     → Child process
DreamTask          → Background memory consolidation
LocalWorkflowTask  → Background workflow scripts
```

**Mailbox pattern:** Each agent has an independent message queue with typed message structures: `shutdown_request`, `plan_approval_response`, permission bubbling. `SendMessage` tool is the runtime agent-to-agent channel.

**Memory leak lesson:** `TEAMMATE_MESSAGES_UI_CAP = 50` was added after observing 36.8 GB usage with 292 active agents. **ADC must bound per-agent message history in UI.**

**ADC application:** The six execution contexts map directly to ADC's agent panel model. Adopt the Mailbox pattern for `agent-dashboard-handlers.ts` typed message structures.

---

### 2. Streaming Architecture

**Async generator core loop:**
```
User message
  → build system prompt (6-layer injection)
  → API request (streaming)
  → yield tokens to UI via async generator
  → if tool_use block received:
      → permission check (6-layer pipeline)
      → execute tool
      → append tool_result to mutableMessages
      → continue loop
  → until LLM stops requesting tools
```

**`mutableMessages` array** is the single source of truth for all conversation state.

**StreamingToolExecutor:** Concurrency-safe tools run in parallel while the model continues generating. Results buffer and emit in request order despite out-of-order execution.

**ADC application:** `AbortController`-based interruption is the right model for ADC's "Stop agent" button. The async generator pattern feeds directly into `AgentChatPanel`'s streaming display.

---

### 3. Transport Bridge (Headless Agents)

**`DAEMON` + `UDS_INBOX` pattern:**
- Agent instances expose Unix Domain Socket endpoints
- Controller process connects to agents without a terminal attached
- `BRIDGE_MODE` enables remote control of a running instance from another process
- All entrypoints (CLI, SDK, Bridge) converge on the same `QueryEngine`

**ADC application:** Each spawned agent should expose a UDS endpoint. ADC's main process connects as controller. Cleaner than the current IPC handler polling approach — agents run fully headless, ADC provides the management plane.

---

### 4. Tool Call Pipeline

```
LLM tool_use block
  → Parse parameters (Zod v4)
  → PreToolUse hook (intercept/modify)
  → Permission check (6-layer)
  → Execute
  → PostToolUse hook (audit/notify)
  → Result to LLM
```

**Permission bubble model:** sub-agents → team leader → ADC UI for human approval.

**ADC application:** Hook `PostToolUse` to stream tool results into `ToolCallCard` components. The permission bubble model maps directly to ADC's agent hierarchy.

---

### 5. Context Management (Four-Tier Cascade)

| Tier | Mechanism | Trigger |
|------|-----------|---------|
| 1 | `autoCompact` | Context approaching limit |
| 2 | `apiMicrocompact` | API-native `context_management` |
| 3 | `reactiveCompact` | API context-too-large error |
| 4 | `snip` | Emergency: discard non-critical |

**ADC application:** Implement this cascade in `AgentManager` for long-running sessions. Show active tier in `AgentStatusBar`.

---

### 6. Memory Architecture (Four Types)

| Type | Content |
|------|---------|
| `User` | Identity and role |
| `Feedback` | Behavioral preferences |
| `Project` | Context and constraints |
| `Reference` | Resource locations |

Stored at `~/.claude/projects/<slug>/memory/` — `MEMORY.md` index always loaded, type-specific files deferred.

**ADC application:** This is the exact model ADC should use for persisting agent context across sessions. NOT flat JSON files.

---

### 7. Unreleased Feature Flags (Relevant to ADC Roadmap)

| Flag | Description | ADC Relevance |
|------|-------------|---------------|
| `KAIROS` | Persistent daemon: append-only logs, GitHub webhooks, background workers, nightly `/dream` memory distillation | High — ADC's "persistent agent" feature target |
| `DAEMON` | Headless daemon mode (no terminal) | High — needed for ADC headless agent execution |
| `UDS_INBOX` | Unix domain socket IPC between instances | High — transport layer for ADC ↔ agent communication |
| `COORDINATOR_MODE` | Multi-worker distribution across CPU cores | High — parallel agent teams |
| `PROACTIVE` | Agent-initiated interaction, monitors repo | Medium — future ADC autonomy |
| `WORKFLOW_SCRIPTS` | Programmable automation scripts | Medium — ADC workflow orchestration |

**KAIROS detail:** Orient → Collect → Consolidate → Prune. Supports "team memory paths" for shared knowledge across instances.

---

## Known Bugs to Avoid in ADC

| Bug | Claude Code Symptom | ADC Mitigation |
|-----|--------------------|--------------------|
| Orphaned tool calls (5.4%) | No correlation IDs between tool requests and responses | Use typed request/response with explicit correlation IDs |
| `Promise.race` without `.catch()` | One rejected tool kills all concurrent tools | Handle per-tool rejection independently |
| Streaming watchdog timing | Watchdog attaches after initial connection, missing early failures | Attach stream health monitoring before first byte |
| Flat-file session storage | 3.1 GB unmanaged `.claude.json` files, no file locking | SQLite for session persistence |
| Memory at scale | 7 processes = 5.3 GB RSS; 292 agents = 36.8 GB | Bound per-agent message history (cap at ~50 UI messages) |
| Busy-wait in team-lead polling | `while(true)` unsuitable for daemon | Event-driven polling (setTimeout/EventEmitter) |

---

## Component Mapping: Claude Code → ADC

| ADC Component | Claude Code Pattern to Apply |
|---------------|------------------------------|
| `AgentChatPanel` | Async generator streaming + `AbortController` + `StreamingToolExecutor` |
| `AgentStatusBar` | Cost tracking: token breakdowns, cache hit rates, code change stats |
| `agent-dashboard-handlers.ts` | Mailbox pattern with typed `shutdown_request`/`plan_approval_response` |
| Session persistence | Four-type memory taxonomy + `MEMORY.md` index + deferred-load files |
| Agent hierarchy | Permission bubble: sub-agent → team lead → ADC UI |
| Headless agents | `DAEMON` + `UDS_INBOX`: agent exposes UDS, ADC main process as controller |
| Tool call display | `PostToolUse` hook → `ToolCallCard` component |
| Context windowing | Four-tier compaction cascade in `AgentManager` |

---

## Sources

- [The Register: Anthropic accidentally exposes Claude Code source code](https://www.theregister.com/2026/03/31/anthropic_claude_code_source_code/)
- [DEV: Claude Code's source code leaked via npm source maps](https://dev.to/gabrielanhaia/claude-codes-entire-source-code-was-just-leaked-via-npm-source-maps-heres-whats-inside-cjo)
- [Alex Kim: fake tools, frustration regexes, undercover mode](https://alex000kim.com/posts/2026-03-31-claude-code-source-leak/)
- [redreamality: Deep dive architecture analysis](https://redreamality.com/blog/claude-code-source-leak-architecture-analysis/)
- [DEV: We Reverse-Engineered 12 Versions of Claude Code](https://dev.to/kolkov/we-reverse-engineered-12-versions-of-claude-code-then-it-leaked-its-own-source-code-pij)
- [DEV: 5 Hidden Features Found](https://dev.to/harrison_guo_e01b4c8793a0/claude-code-source-leaked-5-hidden-features-found-in-510k-lines-of-code-3mbn)
- [VentureBeat: Anthropic Leaks Claude Code](https://venturebeat.com/technology/claude-codes-source-code-appears-to-have-leaked-heres-what-we-know/)
- [GitHub: sanbuphy/claude-code-source-code](https://github.com/sanbuphy/claude-code-source-code)
- [GitHub: Kuberwastaken/claude-code (Rust reimplementation)](https://github.com/Kuberwastaken/claude-code)
