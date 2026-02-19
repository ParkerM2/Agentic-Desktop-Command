# Feature: Audit P4 Implementation — Large Scope Missing Features

**Status**: COMPLETE
**Team**: audit-p4-features
**Base Branch**: feature/audit-p3-features
**Feature Branch**: feature/audit-p4-features
**Design Doc**: docs/plans/2026-02-13-full-codebase-audit.md
**Started**: 2026-02-13
**Last Updated**: 2026-02-14
**Updated By**: team-lead

---

## Scope

Implementing audit items P4 (Large Scope Missing Features) from the full codebase audit.

### P4 — Missing Features (7 items)

| # | Feature | Scope | Complexity |
|---|---------|-------|------------|
| 24 | Persistent Claude session (Anthropic Messages API) | LARGE | Requires SDK integration, conversation persistence |
| 25 | Notification watchers (Slack/GitHub polling) | MEDIUM | Background polling, event aggregation |
| 26 | Voice interface (Whisper STT + TTS) | LARGE | Audio capture, local ML, permissions |
| 27 | Screen capture + computer control | LARGE | desktopCapturer, robotjs, Vision API |
| 28 | Smart task creation (LLM decomposition) | MEDIUM | LLM calls, GitHub import, UI |
| 29 | Email integration | MEDIUM | SMTP, composer UI, MCP server |
| 30 | Proactive suggestions / daily briefing | LARGE | Heuristics, scheduled jobs, LLM analysis |

---

## Implementation Strategy

Given the large scope of P4 items, we'll prioritize by:
1. **Foundation items first** — #24 (Persistent Claude) enables #28 and #30
2. **Medium scope items** — #25, #28, #29 are more tractable
3. **Large scope items** — #26, #27 require significant infrastructure

### Recommended Order

**Wave 1** (Foundation):
- #24: Persistent Claude session — Anthropic SDK, conversation state

**Wave 2** (Medium scope, can parallelize):
- #25: Notification watchers
- #28: Smart task creation (depends on #24 for LLM calls)
- #29: Email integration

**Wave 3** (Large scope):
- #26: Voice interface
- #27: Screen capture + control
- #30: Proactive suggestions (depends on #24)

---

## Task Details

### Task #24: Persistent Claude Session [COMPLETE]
- **Scope**: P4.24
- **Dependencies**: None
- **Files to Create**:
  - `src/main/services/claude/claude-client.ts` — Anthropic SDK wrapper
  - `src/main/services/claude/conversation-store.ts` — Conversation persistence
  - `src/main/services/claude/standing-instructions.ts` — Per-user preferences
- **Files to Modify**:
  - `src/main/services/assistant/assistant-service.ts` — Use Claude client instead of CLI
  - `src/shared/ipc-contract.ts` — Add claude.* channels
  - `package.json` — Add @anthropic-ai/sdk dependency
- **Key Decisions**:
  - Use Anthropic TypeScript SDK vs raw HTTP
  - Conversation storage: SQLite vs JSON files
  - Context window management (truncation strategy)

### Task #25: Notification Watchers [COMPLETE]
- **Scope**: P4.25
- **Dependencies**: None (can run in parallel with #24)
- **Files to Create**:
  - `src/main/services/notifications/notification-watcher.ts`
  - `src/main/services/notifications/slack-watcher.ts`
  - `src/main/services/notifications/github-watcher.ts`
- **Files to Modify**:
  - `src/main/services/index.ts` — Register watchers
  - `src/shared/ipc-contract.ts` — Add notification channels/events
- **Key Decisions**:
  - Polling interval (30s? 60s? configurable?)
  - Which events to watch (mentions, PRs, issues?)
  - Notification aggregation strategy

### Task #26: Voice Interface [COMPLETE]
- **Scope**: P4.26
- **Dependencies**: #24 (uses Claude for responses)
- **Files to Create**:
  - `src/main/services/voice/voice-service.ts`
  - `src/main/services/voice/speech-to-text.ts` — Whisper integration
  - `src/main/services/voice/text-to-speech.ts`
  - `src/renderer/features/voice/` — Voice UI components
- **Key Decisions**:
  - Local Whisper (whisper.cpp) vs Web Speech API
  - TTS engine (native vs cloud)
  - Wake word implementation

### Task #27: Screen Capture + Control [COMPLETE]
- **Scope**: P4.27
- **Dependencies**: #24 (uses Claude Vision API)
- **Files to Create**:
  - `src/main/services/screen/screen-capture-service.ts`
  - `src/main/services/screen/computer-control-service.ts`
  - `src/renderer/features/screen/` — Screenshot viewer, control UI
- **Key Decisions**:
  - Permission handling (macOS screen recording)
  - robotjs vs nut.js for automation
  - Security boundaries for computer control

### Task #28: Smart Task Creation [COMPLETE]
- **Scope**: P4.28
- **Dependencies**: #24 (uses Claude for decomposition)
- **Files to Create**:
  - `src/main/services/tasks/task-decomposer.ts`
  - `src/main/services/tasks/github-importer.ts`
- **Files to Modify**:
  - `src/renderer/features/tasks/components/TaskCreator.tsx` — Smart mode toggle
  - `src/shared/ipc-contract.ts` — Add tasks.decompose, tasks.importFromGithub

### Task #29: Email Integration [COMPLETE]
- **Scope**: P4.29
- **Dependencies**: None
- **Files to Create**:
  - `src/main/services/email/email-service.ts`
  - `src/main/services/email/smtp-client.ts`
  - `src/renderer/features/email/` — Composer, inbox viewer
  - `mcp-servers/email/` — MCP server for email tools
- **Key Decisions**:
  - SMTP vs Gmail API vs both
  - Read access (IMAP) or send-only?
  - OAuth for Gmail or app passwords?

### Task #30: Proactive Suggestions / Daily Briefing [COMPLETE]
- **Scope**: P4.30
- **Dependencies**: #24 (uses Claude for analysis)
- **Files to Create**:
  - `src/main/services/briefing/briefing-service.ts`
  - `src/main/services/briefing/suggestion-engine.ts`
  - `src/renderer/features/briefing/` — Briefing UI
- **Files to Modify**:
  - `src/main/services/scheduler/scheduler.ts` — Schedule morning briefing

---

## Agent Registry

| Agent Name | Role | Worktree Branch | Task ID | Status | Notes |
|------------|------|-----------------|---------|--------|-------|
| claude-sdk-eng | Service Engineer | audit/claude-sdk | #24 | COMPLETE | Wave 1, merged |
| watcher-eng | Service Engineer | audit/notification-watchers | #25 | COMPLETE | Wave 1, merged |
| email-eng | Service Engineer | audit/email-integration | #29 | COMPLETE | Wave 1, merged |
| smart-task-eng | Service Engineer | audit/smart-tasks | #28 | COMPLETE | Wave 2, merged |
| voice-eng | Feature Engineer | audit/voice-interface | #26 | COMPLETE | Wave 3, merged |
| screen-eng | Feature Engineer | audit/screen-capture | #27 | COMPLETE | Wave 3, merged |
| briefing-eng | Feature Engineer | audit/daily-briefing | #30 | COMPLETE | Wave 3, merged |

---

## Blockers

| Blocker | Affected Task | Status | Resolution |
|---------|---------------|--------|------------|
| Anthropic API key required | #24, #28, #30 | OPEN | User must configure ANTHROPIC_API_KEY |

---

## Integration Checklist

- [x] All P4 tasks COMPLETE with QA PASS
- [x] `npm run lint` passes
- [x] `npx tsc --noEmit` passes
- [x] `npm run build` passes
- [x] Documentation updated
- [x] Progress file status set to COMPLETE
