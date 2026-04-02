---
taskNumber: 5
taskName: TmuxBridge + TeamWatcher + SessionJSONLReader
taskSlug: tmux-team-jsonl
wave: 2
complexity: high
blockedBy: task-1
agent: service-engineer
files_create:
  - src/main/services/tmux-bridge/tmux-bridge-service.ts
  - src/main/services/tmux-bridge/tmux-commands.ts
  - src/main/services/tmux-bridge/index.ts
  - src/main/services/team-watcher/team-watcher-service.ts
  - src/main/services/team-watcher/index.ts
  - src/main/services/session-jsonl/session-jsonl-reader.ts
  - src/main/services/session-jsonl/jsonl-parser.ts
  - src/main/services/session-jsonl/index.ts
files_modify:
  - src/main/bootstrap/service-registry.ts
---

## Task: Build TmuxBridge, TeamWatcher, and SessionJSONLReader services

### Context

These three services provide Phase 2-3 from the research doc:
- **TmuxBridge**: Manage tmux sessions for team-lead and interactive agents
- **TeamWatcher**: Watch `~/.claude/teams/*/config.json` for teammate join/leave
- **SessionJSONLReader**: Tail-follow session JSONL files for agent output

Read `docs/research/2026-03-30-headless-agent-architecture.md` — Output Capture Methods 2-3, Team Config Watching section.

### Requirements

#### TmuxBridge Service
```typescript
interface TmuxBridgeService {
  createSession(name: string, env?: Record<string, string>): TmuxSession
  sendKeys(sessionName: string, keys: string): void
  capturePane(paneId: string): string
  listSessions(): TmuxSession[]
  killSession(sessionName: string): void
  isAvailable(): boolean  // check if tmux is installed
}
```
- `tmux-commands.ts`: Wrapper functions for tmux CLI commands using `child_process.execSync`/`exec`
- Handle tmux not being installed gracefully (isAvailable check)
- For team-lead spawn: `tmux new-session -d -s <name> -e CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`

#### TeamWatcher Service
```typescript
interface TeamWatcherService {
  startWatching(teamName: string): void
  stopWatching(teamName: string): void
  getTeamMembers(teamName: string): TeamMember[]
  onTeammateJoined(handler: (member: TeamMember) => void): () => void
  onTeammateLeft(handler: (memberId: string) => void): () => void
}
```
- Watch `~/.claude/teams/<teamName>/config.json` using `fs.watch`
- Debounce fs.watch events (300ms) to handle rapid config rewrites
- Diff against known members set to detect joins/leaves
- Start watching each new teammate's session JSONL automatically

#### SessionJSONLReader Service
```typescript
interface SessionJSONLReaderService {
  startReading(sessionId: string, jsonlPath: string): void
  stopReading(sessionId: string): void
  onEvent(handler: (sessionId: string, event: StreamJsonEvent) => void): () => void
}
```
- `jsonl-parser.ts`: Tail-follow a JSONL file, parse each new line
- Track file offset (lastOffset) to only read new lines on change
- Use `fs.watch` for file change detection
- Parse each line as JSON with error handling for incomplete writes
- Same event types as stream-json: system, assistant, stream_event, result

### Critical Notes

- Import types from `@shared/types/agent-dashboard`
- Session JSONL path: `~/.claude/projects/<cwd>/<sessionId>.jsonl`
- Team config path: `~/.claude/teams/<teamName>/config.json`
- Follow factory pattern per CODEBASE-GUARDIAN.md
- Register all three in service-registry.ts
- These services are Layer 1 (Agent Visibility) — independent of workflow tracking

### Acceptance Criteria

1. TmuxBridge can create/kill tmux sessions and send keys
2. TmuxBridge gracefully handles tmux not installed
3. TeamWatcher detects new teammates within 500ms of config change
4. SessionJSONLReader tails JSONL files and emits parsed events
5. All three registered in service-registry.ts
6. `npm run lint && npm run typecheck && npm run build` pass
7. No floating promises, no `any` types
