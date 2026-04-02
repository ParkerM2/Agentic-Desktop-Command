# claude-workflow Plugin Audit
**Date**: 2026-03-30
**Version audited**: 4.0.2
**Source**: Local cache at `~/.claude/plugins/cache/claude-workflow-marketplace/claude-workflow/4.0.2/`
**GitHub**: https://github.com/ParkerM2/create-claude-workflow

---

## 1. Plugin Structure Overview

```
claude-workflow/4.0.2/
├── agents/          # 3 agent definitions
│   ├── codebase-guardian.md
│   ├── qa-reviewer.md
│   └── team-leader.md
├── commands/        # 22 legacy command files (pre-skills era)
├── hooks/           # 14 hook scripts + hooks.json
│   ├── hooks.json
│   ├── config.js          # Shared config module (worktree-aware)
│   ├── init-gate.js       # TeamCreate/Agent gate
│   ├── workflow-enforcer.js # Main enforcement hub
│   ├── tracker.js         # JSONL event emitter + FSM
│   ├── tracking-emitter.js # Auto-tracking across all hook events
│   ├── compact-reinject.js # Context compaction recovery
│   ├── session-start.js   # Config context injection
│   ├── safety-guard.js    # Destructive + branch guard
│   ├── task-validator.js  # TaskCompleted uncommitted check
│   ├── teammate-quality.js # TeammateIdle quality enforcement
│   ├── proof-ledger.js    # Agent spawn tracking
│   ├── config-guard.js    # .claude file protection
│   └── ticket.js          # Jira ticket integration
├── prompts/implementing-features/  # 16 reference docs for agents
│   ├── AGENT-WORKFLOW-PHASES.md
│   ├── THIN-SPAWN-TEMPLATE.md
│   ├── EVENT-SCHEMA.md
│   └── ... (13 more)
├── skills/
│   ├── using-workflow/SKILL.md    # Bootstrap context skill
│   └── workflow-setup/SKILL.md   # First-time setup
└── marketplace/     # Plugin manifest
```

---

## 2. Skill / Command Inventory

### Primary Workflow Skills

| Skill | What It Does |
|-------|--------------|
| `/claude-workflow:new-plan` | Deep codebase analysis, decomposes feature into wave-ordered task files at `.claude/progress/<slug>/tasks/` |
| `/claude-workflow:agent-team` | Reads task files, spawns Team Leader agent who coordinates coding agents + QA in isolated worktrees |
| `/claude-workflow:resume` | Crash/interrupt recovery — scans progress files, detects interrupted phase, offers options |
| `/claude-workflow:status` | Shows completion %, task states, branch status, active blockers from events.jsonl |
| `/claude-workflow:track` | Appends JSONL event to events.jsonl; triggers FSM state transitions and markdown dashboard re-render |
| `/claude-workflow:deep-research` | Phased investigation with user checkpoints, iterative cross-referencing, multi-source validation |
| `/claude-workflow:setup-workflow` | First-time project setup: generates `.claude/workflow.json`, CLAUDE.md sections |
| `/claude-workflow:settings` | Guard permissions audit, agent audit, performance audit |

### Sprint / Atlassian Integration Skills

| Skill | What It Does |
|-------|--------------|
| `/claude-workflow:start-sprint` | Fetches Jira tickets, spawns research agents, assesses difficulty 1-5, generates plans |
| `/claude-workflow:sprint-tickets` | Full sprint state: tickets, status, assignments, velocity, health metrics |
| `/claude-workflow:start-day` | Morning briefing: end-of-day recap, priorities, smart ordering |
| `/claude-workflow:link-ticket` | Auto-syncs PR to Jira ticket via branch pattern detection |
| `/claude-workflow:connect-atlassian` | Guided Jira + Confluence setup via sooperset/mcp-atlassian |
| `/claude-workflow:find-blockers` | Detects stalled/blocked tickets with escalation paths |
| `/claude-workflow:critical-path` | Analyzes sprint dependency graph, identifies critical path |

### Code Quality and Ops Skills

| Skill | What It Does |
|-------|--------------|
| `/claude-workflow:analyze-coverage` | Test coverage analysis with gap detection and trend tracking |
| `/claude-workflow:audit-dependencies` | CVE scanning, dependency health, auto-ticket for vulns |
| `/claude-workflow:assign-reviewers` | Smart review assignment with expertise mapping + load balancing |
| `/claude-workflow:generate-changelog` | User-facing changelog from merged PRs and commits |
| `/claude-workflow:incident-postmortem` | Blameless postmortem with root cause analysis |
| `/claude-workflow:alert-to-ticket` | Converts monitoring alerts to Jira tickets |
| `/claude-workflow:extract-context` | Captures ticket knowledge before it's lost |
| `/claude-workflow:retro-prep` | Gathers sprint metrics, prepares retrospective data |
| `/claude-workflow:start-pairing` | Structured pair programming with knowledge transfer tracking |

### Bootstrap Skills (auto-loaded via hooks)

| Skill | What It Does |
|-------|--------------|
| `using-workflow` | Injected at SessionStart — establishes workflow commands and config in context |
| `workflow-setup` | Invoked when no `.claude/workflow.json` exists |

---

## 3. Hook System Analysis

### Hook Registration (hooks.json)

```
SessionStart   -> session-start.js        (config/context injection on startup/resume/clear/compact)
SessionStart   -> compact-reinject.js     (full identity reinject, "compact" matcher only)
PreToolUse     -> safety-guard.js         (Bash: destructive + branch guard)
PreToolUse     -> workflow-enforcer.js    (Bash, Edit, Write, TaskStop, TeamDelete)
PreToolUse     -> config-guard.js         (Edit|Write: protect .claude config files)
PreToolUse     -> init-gate.js            (TeamCreate|Agent: identity gate — currently bypassed)
PostToolUse    -> tracking-emitter.js     (all tools: auto event emission)
PostToolUse    -> proof-ledger.js         (all tools: agent spawn tracking)
TeammateIdle   -> teammate-quality.js     (quality enforcement: lint/typecheck/test)
TeammateIdle   -> tracking-emitter.js     (idle state tracking)
TaskCompleted  -> task-validator.js       (uncommitted changes check)
TaskCompleted  -> tracking-emitter.js     (completion tracking)
Stop           -> tracking-emitter.js     (session stop tracking)
```

### Two-Layer Enforcement Architecture

**Layer 0 (Always Active)**: State file protection in `workflow-enforcer.js` always runs. Blocks direct writes to `events.jsonl`, `workflow-state.json`, `proof-ledger.jsonl`, `.workflow-active` via Edit, Write, or Bash. Fails closed — any error in this check blocks the operation.

**Layer 1 (Sentinel-Gated)**: All other enforcement activates only when `.claude/.workflow-active` exists. Zero overhead when no workflow is running.

The sentinel file (`.claude/.workflow-active`) contains: `{ feature, ticket, startedAt, sessionId, pid, mode }`.

---

## 4. Hook-by-Hook Analysis

### `init-gate.js` — Team Lead Identity Gate

**Purpose**: Should check that `agents/team-leader.md` was read before allowing `TeamCreate` or `Agent` tool calls.

**Bug — Dead Code Path**: The gate is permanently bypassed:

```javascript
// Fast-allow: team-leader.md already read in this session context
allow();
return;

// 1. Fast path: marker already exists and is fresh  <- UNREACHABLE
if (isMarkerValid()) { ... }
// 2. No marker yet — check atime                    <- UNREACHABLE
if (checkAtimeAndMark()) { ... }
// 3. Block                                          <- UNREACHABLE
deny('Read agents/team-leader.md before spawning agents...');
```

The `allow(); return;` at line 131 makes the entire gate non-functional. The ~80 lines of atime-based detection below it are dead code. The gate was likely permanently disabled to unblock workflows but was never cleaned up.

**Fix**: Either delete the dead code (init-gate becomes a pass-through and should be removed from hooks.json), or restore the gate behind `guards.initGate` in `.claude/workflow.json`.

---

### `workflow-enforcer.js` — Main Enforcement Hub

**Purpose**: Consolidated enforcer with 6 distinct checks across Bash, Edit, Write, TaskStop, TeamDelete.

**Strengths**:
- Clean sentinel-first fast path
- Each check is a focused function
- All Layer 1 gates fail-open; Layer 0 fails-closed (correct)
- Every `deny()` includes a `Recovery:` action preventing deadlocks

**Bug — `checkAppCodeWriteGate` control flow**:

```javascript
if (isExemptPath(filePath)) {
  allow();   // calls process.exit(0) internally
  return;    // unreachable dead code
}
```

`allow()` calls `process.exit(0)`, making the `return` unreachable. Minor code smell but confusing.

**Pain point (observed in this session)**: `checkAppCodeWriteGate` blocked writes during research on the `feature/` branch. The exempt path list covers `docs/`, `research/`, `.claude/docs/` but misses `ai-docs/` and project-specific documentation directories. Users doing legitimate docs work mid-workflow on feature branches get erroneously blocked.

**Fake Event Gate fragility**: The `checkFakeEventGate` detection regex:
```javascript
if (!/\btrack\b.*\bqa\.passed\b/i.test(command)) return;
```
This regex-matches the bash command string and could be fooled by indirect command patterns. More robust: parse the actual command structure.

---

### `tracker.js` — JSONL Event Emitter + FSM

**Purpose**: Core event system. Emits structured JSONL, drives FSM state transitions, renders markdown dashboards.

**Architecture strengths**:
- CQRS design: `rebuildState()` replays all events to reconstruct state from scratch
- Atomic writes via `.tmp` + `fs.renameSync`
- Lock protocol for concurrent markdown rendering
- Automatic FSM transitions driven by event types

**Phase transitions (FSM)**:
```
(none)     -> plan      on session.start
plan       -> setup     on plan.created
setup      -> wave      on checkpoint "setup-complete"
wave       -> wave      on checkpoint "wave-N-complete"
wave       -> guardian  on checkpoint "all-waves-complete"
guardian   -> done      on session.end
```

**Issue — Missing render triggers**:
```javascript
const RENDER_TRIGGERS = new Set([
  'task.completed', 'qa.passed', 'qa.failed', 'branch.merged',
  'session.start', 'session.end', 'checkpoint', 'blocker.reported', 'plan.created'
]);
```
`task.started`, `agent.spawned`, and `agent.completed` are absent. The `current.md` dashboard does not update when agents begin work, making it look stale during active wave execution.

**Issue — Lock stale timeout too long**: 60 seconds prevents concurrent renders from proceeding when a render process hangs. Recommend 10-15 seconds.

---

### `compact-reinject.js` — Context Compaction Recovery

**Purpose**: After context compaction, reinjects team leader identity, current workflow phase, active agent list, task summaries, and phase-specific action instructions.

**This is the plugin's most powerful feature.** It solves the hard problem of multi-agent coordination surviving context compaction. Phase-specific guidance (different instructions for `wave` vs `setup` vs `guardian` vs `done`) prevents the Team Leader from reverting to bad behavior after losing context.

**Bug — Fragile leader detection**:
```javascript
for (const member of teamConfig.members) {
  if (member.agentType === 'team-leader' || member.name === teamConfig.leader) {
    teamLeaderName = member.name;
  } else {
    activeAgents.push(member.name);
  }
}
// Fallback: first member is the leader
if (teamLeaderName === 'unknown' && teamConfig.members.length > 0) {
  teamLeaderName = teamConfig.members[0].name;
}
```
If the team config doesn't have `agentType: 'team-leader'` and no `teamConfig.leader` field, it falls back to the first member. If agents sort alphabetically before the leader, the wrong agent gets identified as leader.

**Fix**: Store the leader name in the sentinel file at workflow start. The sentinel already has `feature`, `ticket`, `pid`, `mode` — adding `leaderName` would make reinject authoritative rather than heuristic.

---

### `session-start.js` — Config Context Injection

**Purpose**: Injects `<workflow-config>` block with all paths and branching settings, plus `using-workflow/SKILL.md` content, at every session start.

**Strength**: Makes claude-workflow "self-aware" — Claude always knows where workflow.json is, what branch prefixes are configured, and where progress files live.

**Issue — Unconditional SKILL.md injection**: Full `using-workflow/SKILL.md` content injected on every session start, even for non-workflow sessions. A lazy approach (only inject when a workflow command was recently used) would conserve tokens.

---

### `safety-guard.js` — Destructive + Branch Guard

**Purpose**: Blocks several destructive git operations and enforces branch commit restrictions.

**Blocked operations**: git push with --force flag, git reset --hard, rm -rf, git clean -fd, git branch -D.

**Gap**: `git push --force-with-lease` is not blocked. It's safer than `--force` but still destructive in some scenarios — at minimum a warning would be appropriate.

**Good design**: Both destructive and branch guards combined in one process, cutting hook latency for every Bash call.

---

### `task-validator.js` — Task Completion Validator

**Purpose**: On `TaskCompleted`, rejects (exit 2) if working tree has uncommitted changes.

**Strength**: Prevents "task done without committing" — a common failure mode in multi-agent workflows.

**Gap**: Only checks `git status --porcelain`. Doesn't verify the commit includes the task's expected files from the task file's `filesScope` section. An agent could commit an empty file and pass validation.

---

## 5. Pain Points Identified in This Session

1. **`init-gate.js` dead code** — confusing to read, gate does nothing
2. **`workflow-enforcer.js` blocked research writes** — `checkAppCodeWriteGate` blocked writes to `ai-docs/` and `.md` files during active workflow research on a feature branch. Should be exempt.
3. **Sentinel persists after crash** — if a session crashes without emitting `session.end`, the sentinel stays. Next session the enforcer immediately blocks all writes. The 24h + dead PID staleness check exists but is too slow — a crashed process's PID is gone immediately, so a 24h wait is unnecessary.
4. **No structured external interface** — `/status` shows a text dump; there is no queryable API for external tools (dashboard apps, IDE plugins) to consume workflow state programmatically.

---

## 6. Cross-Plugin Interoperability Analysis

### The Current Platform Model

From the official Claude Code plugin docs (`code.claude.com/docs/en/plugins`):
- Plugin skills are namespaced: `/plugin-name:skill-name`
- Subagents receive skills via `skills:` frontmatter — full SKILL.md content injected into agent context at startup
- **No inter-plugin call API** — plugin A cannot programmatically invoke a skill from plugin B
- **Shared state must go through filesystem** — the only cross-plugin interface is files on disk

### What claude-workflow Currently Exposes

claude-workflow exposes no external interface. Its JSONL schema (`EVENT-SCHEMA.md`) is well-documented but:
1. Buried in `prompts/implementing-features/` — not discoverable as an external spec
2. Not versioned in a machine-readable way (no `schema/events-v1.json` file at plugin root)
3. No `capabilities.json` manifest for dependency detection
4. No way for other plugins to check if claude-workflow is installed

### gstack Interoperability

gstack and claude-workflow have complementary strengths:
- gstack: `/office-hours` design doc -> `/plan-eng-review` test plan -> `/qa` browser testing -> `/review` code audit
- claude-workflow: task decomposition -> multi-agent parallel execution -> QA gate -> crash recovery

**Natural handoff**: gstack's design doc (from `/office-hours`) could feed into claude-workflow's `/new-plan`. Currently not possible because `/new-plan` doesn't accept an `--input-doc` argument.

**Proposed convention**: If `DESIGN.md` exists in repo root (gstack writes it), `/new-plan` reads it automatically as context for task decomposition. No new API needed — just a convention.

**Cross-plugin skill composition**: claude-workflow's `qa-reviewer.md` agent could list gstack's review skill:
```yaml
---
name: qa-reviewer
skills:
  - gstack:review    # cross-plugin composition
---
```
The platform supports this (injecting SKILL.md content into agent context), but requires gstack to expose its review logic as a named `skills/` directory, not just a `commands/` file.

### Skill Invocation from Within Agents

Agents can invoke another plugin's slash command: `/gstack:review` or `/claude-workflow:track`. This works if both plugins are installed. There is no native fallback for missing plugins.

**Missing infrastructure**:
1. No way to check plugin presence from within a skill
2. No dependency declaration in plugin manifests
3. No graceful degradation when a dependency plugin is absent

---

## 7. Plug-and-Play Skill Design Recommendations

### Recommendation 1: Migrate Commands to Skills

claude-workflow has 22 files in `commands/` and only 2 in `skills/`. The `commands/` format is the older API. Skills are the modern format and support composition via `skills:` frontmatter in agent definitions.

**Recommended migration**:
```
skills/
├── new-plan/SKILL.md          <- migrate from commands/new-plan.md
├── agent-team/SKILL.md        <- migrate from commands/agent-team.md
├── track/SKILL.md
├── status/SKILL.md
└── resume/SKILL.md
```
This enables other plugins to include `claude-workflow:new-plan` in their agent's `skills:` list.

### Recommendation 2: Publish Event Schema Externally

Create `schema/events-v1.json` at the plugin root — a JSON Schema document for the JSONL event format. This enables:
- Other plugins to validate events they emit to the shared log
- External tools (like ADC) to parse the schema for display
- Type generation for TypeScript consumers

### Recommendation 3: Capabilities Manifest

Create `capabilities.json` at plugin root:
```json
{
  "provides": ["progress-tracking", "agent-orchestration", "qa-gates", "jira-integration"],
  "ipc": {
    "events-schema": "schema/events-v1.json",
    "progress-dir": ".claude/progress",
    "sentinel-file": ".claude/.workflow-active"
  },
  "requires": []
}
```

### Recommendation 4: Namespace Event Types

When emitting to a shared log that other plugins might also write to, namespace event types to prevent collisions:
```jsonc
// Current (collision risk with other plugins)
{ "type": "task.completed" }

// Better (namespaced)
{ "type": "claude-workflow:task.completed" }
```

### Recommendation 5: Accept External Input in `/new-plan`

Add `--input-doc <path>` argument to `/new-plan`:
```
/claude-workflow:new-plan --feature auth-system --input-doc DESIGN.md
```
This enables gstack's `/office-hours` output to feed directly into claude-workflow's task decomposition.

---

## 8. Comparison: claude-workflow vs gstack vs Others

| Dimension | claude-workflow 4.0.2 | gstack (garrytan) | Notes |
|-----------|----------------------|-------------------|-------|
| **Paradigm** | Task-decomposed multi-agent execution | Sprint ceremony phases (Think->Plan->Build->Review->Test->Ship) | Different granularity |
| **Agent coordination** | Hub-and-spoke: Team Leader + workers + QA | Independent parallel sessions via Conductor (10-15 concurrent) | claude-workflow: integrated; gstack: external tool |
| **State management** | JSONL event log + FSM + sentinel file | Markdown artifacts in `~/.gstack/projects/` | claude-workflow richer; gstack simpler |
| **Crash recovery** | Full via `compact-reinject.js` + CQRS rebuild | None identified | claude-workflow strongly ahead |
| **QA gates** | Code review agents, 3-round max, merge blocked without pass | Real Playwright browser + OpenAI cross-model review | gstack has functional testing; claude-workflow has enforcement |
| **Worktree isolation** | Yes — native git worktrees per task | No — relies on Conductor (external tool) | claude-workflow simpler to set up |
| **Hook enforcement** | 13 hooks, automatic quality gates | Safety skills (opt-in: /careful, /freeze, /guard) | claude-workflow more automatic |
| **Skill composition** | 2 named skills; rest are commands | Commands only, artifact-based chaining | Both limited; neither uses `skills:` composition fully |
| **Jira/Atlassian** | Full integration (10+ skills) | None | claude-workflow strongly ahead |
| **Browser testing** | None | Real Chromium via Playwright in /qa | gstack ahead |
| **Cross-model QA** | None | /codex — OpenAI second opinion | gstack ahead |
| **Documentation** | Excellent — 16 reference docs | Minimal README + skills.md | claude-workflow ahead |
| **Community traction** | Not public data | 39,000+ stars in 11 days (March 2026) | gstack has greater community reach |

### What claude-workflow Should Adopt from gstack

1. **Artifact persistence as cross-skill interface**: gstack's DESIGN.md, test plan, and approval JSON files give downstream skills something concrete to read. claude-workflow's progress events are runtime-only. A persistent "feature brief" document per feature would improve cross-session continuity.

2. **Real browser testing integration**: QA agents in claude-workflow do code review but not functional testing. A `/claude-workflow:qa-browser` skill using Playwright would close this gap for web projects.

3. **Cross-model validation**: gstack's `/codex` provides an OpenAI second opinion. claude-workflow could optionally spawn a haiku agent for cross-model check on high-stakes features.

### What gstack Should Adopt from claude-workflow

1. **JSONL crash recovery**: gstack has no resume mechanism. claude-workflow's JSONL + FSM approach is production-grade and should be the industry pattern.

2. **Hook-based enforcement**: gstack's safety is opt-in via slash commands. Automatic merge gates and task completion validators prevent entire classes of mistakes without requiring the user to remember to run them.

3. **Worktree isolation**: True task isolation via git worktrees is more reliable than parallel sessions sharing one directory.

---

## 9. Prioritized Improvement Roadmap

### Wave 1 — Quick Wins (less than 1 day each)

| # | Item | Effort | Impact |
|---|------|--------|--------|
| 1 | Remove dead code from `init-gate.js` or re-enable via `guards.initGate` | 30 min | High — code clarity, no silent no-ops |
| 2 | Add `task.started` + `agent.spawned` to `RENDER_TRIGGERS` in tracker.js | 15 min | Medium — dashboard freshness during wave execution |
| 3 | Extend `isExemptPath` to cover `ai-docs/` and nested `.md` files | 30 min | High — unblocks docs work during workflow |
| 4 | Fix `compact-reinject.js` leader detection — store leader name in sentinel | 1 hr | High — workflow reliability after compaction |
| 5 | Reduce `tracker.js` render lock timeout from 60s to 10s | 5 min | Low — reliability |
| 6 | Clean up unreachable `return` after `allow()` in `checkAppCodeWriteGate` | 15 min | Low — code smell |

### Wave 2 — Interoperability (1-2 days each)

| # | Item | Effort | Impact |
|---|------|--------|--------|
| 1 | Migrate core commands to `skills/` directories | 2 days | High — enables cross-plugin composition |
| 2 | Publish `schema/events-v1.json` at plugin root | 2 hrs | Medium — external consumers |
| 3 | Add `capabilities.json` plugin manifest | 1 hr | Medium — dependency detection by other plugins |
| 4 | Add `--input-doc` argument to `/new-plan` | 4 hrs | Medium — gstack design doc handoff |
| 5 | Store leader name in sentinel file at workflow start | 1 hr | High — fixes compact-reinject leader detection definitively |

### Wave 3 — Feature Enhancements (1-3 days each)

| # | Item | Effort | Impact |
|---|------|--------|--------|
| 1 | `task-validator.js` — cross-reference committed files against task file scope | 1 day | High — catches agents who commit wrong files |
| 2 | Configurable `exemptPaths` array in `workflow.json` | 4 hrs | Medium — team customization |
| 3 | `guards.initGate` config toggle — restore init-gate as optional enforcement | 4 hrs | Medium — flexibility |
| 4 | Faster sentinel staleness: detect dead PIDs without 24h wait | 4 hrs | Medium — crash recovery UX |
| 5 | Persistent "feature brief" artifact (beyond runtime progress events) | 2 days | Medium — cross-session continuity |
| 6 | Optional cross-model QA (haiku second opinion on code review) | 2 days | Medium — quality improvement |

---

## 10. Summary

claude-workflow 4.0.2 is the most sophisticated multi-agent coordination plugin available for Claude Code. Its standout strengths are:
- Sentinel-gated hook system with zero overhead when inactive
- CQRS JSONL event log + FSM state machine for crash recovery
- Rich documentation (16 reference files for spawned agents to read)
- Full Jira/Atlassian integration — unmatched by any competitor

Its primary weaknesses are:
- `init-gate.js` is entirely non-functional (dead code path at line 131)
- `workflow-enforcer.js` exempt path list is too narrow, blocking legitimate docs work during active workflows
- Core skills live in `commands/` not `skills/`, preventing cross-plugin composition
- No external interface for other plugins to consume its state machine (no capabilities.json, no published schema)

The highest-impact improvement area is **interoperability**: migrating commands to skills, publishing the event schema externally, and adding a capabilities manifest. These changes would make claude-workflow composable with gstack and other plugins — enabling combined workflows like gstack's `/office-hours` feeding directly into claude-workflow's `/new-plan`.

The most urgent correctness fixes are: the dead code in `init-gate.js`, the `isExemptPath` expansion in `workflow-enforcer.js`, and storing the leader name in the sentinel file.
