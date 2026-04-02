# Token Burn Rate Optimization Research

> Research date: 2026-03-30
> Project: ADC (Agentic Desktop Command)
> Scope: Claude Code + claude-workflow multi-agent workflows

---

## Table of Contents

1. [CLAUDE.md Audit](#1-claudemd-audit)
2. [MCP Overhead Inventory](#2-mcp-overhead-inventory)
3. [Sonnet/Opus Routing Strategy](#3-sonnetopus-routing-strategy)
4. [Agent Workflow Cost Model](#4-agent-workflow-cost-model)
5. [Monitoring Setup](#5-monitoring-setup)
6. [Auto-Compaction Behavior](#6-auto-compaction-behavior)
7. [Actionable Checklist](#7-actionable-checklist)

---

## 1. CLAUDE.md Audit

### Current State

| File | Lines | Estimated Tokens |
|------|-------|------------------|
| **Project CLAUDE.md** | **566 lines** | **~4,500-5,500 tokens** |
| Global `~/.claude/CLAUDE.md` | 40 lines | ~300-400 tokens |
| **Combined auto-loaded** | **606 lines** | **~5,000-6,000 tokens** |

**Recommendation threshold**: Anthropic's guidance is to keep CLAUDE.md under ~500 tokens for optimal performance. The current 566-line file is **~10x over the recommended size**. Every single conversation turn re-reads this entire file, making it one of the highest-impact optimization targets.

### Section-by-Section Analysis

| Lines | Section | Essential? | Recommendation |
|-------|---------|-----------|----------------|
| 1-8 | Header + Implementation Rule | YES | Keep — 8 lines, critical routing rule |
| 10-151 | ADC v2 Refactor (Active P0) | PARTIAL | **Extract to on-demand skill or `ai-docs/V2-REFACTOR.md`** — only needed when working on v2 features. Keep a 3-line pointer. |
| 153-172 | Quick Reference (npm scripts) | YES | Keep — agents need this constantly. Could trim to just the 6 verification commands. |
| 174-248 | Verification Requirements | PARTIAL | **Condense heavily.** The "Violations" list (lines 206-214) and "What This Means" table are rhetorical emphasis, not actionable information. Core rule is 3 lines. |
| 250-282 | Documentation Update Mapping | YES | Keep but condense — the table is essential, the surrounding prose is redundant. |
| 284-306 | Architecture Overview | YES | Keep — frequently referenced. |
| 308-319 | IPC Contract Pattern | YES | Keep — critical for service work. |
| 321-335 | Service Pattern | YES | Keep — short and essential. |
| 337-349 | Feature Module Pattern | YES | Keep — short and essential. |
| 351-359 | Path Aliases | YES | Keep — 9 lines. |
| 361-377 | ESLint Rules | PARTIAL | **Extract full list to `ai-docs/LINTING.md`** (already exists!). Keep 3-line summary + pointer. |
| 379-415 | Import Order + React Component Pattern | PARTIAL | Already in `ai-docs/PATTERNS.md`. **Replace with pointer.** |
| 417-469 | Design System | PARTIAL | **Extract to `ai-docs/DESIGN-SYSTEM.md`**. Keep 3-line summary + pointer. |
| 471-496 | State Management + Tech Stack | YES | Keep — compact reference. |
| 498-516 | Detailed Architecture Docs table | YES | Keep — navigation aid. |
| 518-566 | Plan Tracking Protocol | PARTIAL | Could move to `ai-docs/PLAN-TRACKING.md`. Keep 5-line summary + pointer. |

### Recommended Extraction Plan

**Target: 566 lines -> ~150-180 lines** (saving ~400 lines / ~3,000-3,500 tokens per turn)

**Sections to extract to on-demand docs (loaded only when relevant):**

1. **V2 Refactor context** (lines 10-151, ~140 lines) -> `ai-docs/V2-REFACTOR.md`
   - Replace with: `> V2 Refactor active. See ai-docs/V2-REFACTOR.md. DO NOT build on terminal-service/xterm.js/node-pty.`
   - Savings: ~130 lines

2. **Verification rhetoric** (lines 190-224, ~35 lines) -> condense in-place
   - Keep the rule + command list. Remove "Violations" list and "What This Means" table.
   - Savings: ~30 lines

3. **ESLint Rules detail** (lines 361-377) -> already in `ai-docs/LINTING.md`
   - Replace with: `> Strict ESLint. Zero violations. See ai-docs/LINTING.md for rules.`
   - Savings: ~15 lines

4. **Import Order + React patterns** (lines 379-415) -> already in `ai-docs/PATTERNS.md`
   - Replace with: `> Import order + component patterns: see ai-docs/PATTERNS.md`
   - Savings: ~35 lines

5. **Design System** (lines 417-469) -> new `ai-docs/DESIGN-SYSTEM.md`
   - Replace with: `> Design system: CSS vars + Tailwind v4 @theme + color-mix(). NEVER hardcode colors. See ai-docs/DESIGN-SYSTEM.md`
   - Savings: ~50 lines

6. **Plan Tracking Protocol** (lines 518-566) -> `ai-docs/PLAN-TRACKING.md`
   - Replace with: `> Plans tracked in docs/tracker.json. Slug = folder = key = branch. See ai-docs/PLAN-TRACKING.md`
   - Savings: ~45 lines

**Total estimated savings: ~305 lines / ~2,500 tokens per conversation turn**

### Token Impact Calculation

At current usage patterns (estimated):
- 50 conversation turns/day average across all sessions
- 2,500 tokens saved per turn
- **~125,000 input tokens saved per day**
- With Opus at $15/MTok input: **~$1.88/day saved** (~$56/month)
- With Sonnet at $3/MTok input: **~$0.38/day saved** (~$11/month)
- Blended (20% Opus / 80% Sonnet): **~$0.68/day saved** (~$20/month)

### Global CLAUDE.md Assessment

The global `~/.claude/CLAUDE.md` at 40 lines is appropriately sized. It contains generic team principles that apply across projects. No changes needed.

---

## 2. MCP Overhead Inventory

### How MCP Tools Affect Token Usage

Each MCP server registers tools into the system prompt. Every registered tool adds approximately **50-150 tokens** to the system prompt (tool name, description, parameter schema). This overhead is paid on every single API call, regardless of whether the tool is used.

### Current MCP Configuration

**Global settings** (`~/.claude/settings.json`):

| MCP Server | Type | Estimated Tool Count | Estimated Token Overhead | Used Regularly? |
|------------|------|---------------------|--------------------------|-----------------|
| `mcp-atlassian` | Global | ~72 tools (Jira + Confluence) | ~5,400-10,800 tokens | Moderate — sprint/ticket work |
| `claude.ai/Figma` | Built-in (Anthropic) | ~17 tools | ~1,275-2,550 tokens | Low — design work only |

**Plugins:**

| Plugin | Scope | Impact |
|--------|-------|--------|
| `claude-workflow` | User (global) | Adds slash commands/skills, not MCP tools. Low token overhead — skills load on demand. |
| `claude-agent-manager` | Local (gpMS_ConsoleFrontend only) | Not active in ADC project. Zero overhead here. |
| `superpowers-lab` | Local (ES3/gpMS only) | Not active in ADC project. Zero overhead here. |
| `claude-statusbar` | Status line plugin | Minimal — runs as status command, not MCP tools. |

**Hooks:**

| Hook | Trigger | Impact |
|------|---------|--------|
| `claudeChangeStop.js` | Stop event | No token overhead — runs after session. |
| `claudeChangePreToolUse.js` | Edit/Write/MultiEdit | Minimal — runs as pre-hook, does not add tools to prompt. |

### Recommendations

| Server | Action | Rationale | Savings |
|--------|--------|-----------|---------|
| **mcp-atlassian** | **DISABLE when not doing sprint work** | 72 tools = ~5,400-10,800 tokens on every API call. Only needed during sprint planning, ticket management. Use `--mcp-config` flag to load on-demand, or move to project-level settings only for projects that need it. | **HIGH: ~5,400-10,800 tokens/call** |
| **Figma** | **Keep but note usage** | Built-in Anthropic MCP, likely optimized. Only ~17 tools. Keep for design-to-code workflows. | LOW |
| **claude-workflow** | **Keep** | Skills load on demand, not persistent MCP tools. Essential for workflow. | N/A |

### MCP On-Demand Loading Strategy

Instead of keeping mcp-atlassian always-on in global settings, use project-scoped or session-scoped loading:

```bash
# Only load Atlassian when needed
claude --mcp-config atlassian-config.json

# Or move to project-level .mcp.json for projects that need it
# Create .mcp.json in project root (only loaded in that project)
```

**Create `~/.claude/mcp-configs/atlassian.json`:**
```json
{
  "mcpServers": {
    "mcp-atlassian": {
      "command": "uvx",
      "args": ["mcp-atlassian"],
      "env": {
        "JIRA_URL": "https://estatespace.atlassian.net",
        "JIRA_USERNAME": "parker@estatespace.com",
        "JIRA_API_TOKEN": "${JIRA_API_TOKEN}",
        "CONFLUENCE_URL": "https://estatespace.atlassian.net/wiki",
        "CONFLUENCE_USERNAME": "parker@estatespace.com",
        "CONFLUENCE_API_TOKEN": "${CONFLUENCE_API_TOKEN}"
      }
    }
  }
}
```

Then remove `mcp-atlassian` from global `settings.json` and only load when needed:
```bash
claude --mcp-config ~/.claude/mcp-configs/atlassian.json
```

---

## 3. Sonnet/Opus Routing Strategy

### Current Configuration

From `~/.claude/settings.json`:
```json
{
  "model": "opus",
  "effortLevel": "medium"
}
```

**Problem**: The `"model": "opus"` setting forces ALL sessions to use Opus (Claude Opus 4), which is the most expensive model. This is the single largest cost driver.

### Model Pricing (as of March 2026)

| Model | Input | Output | Cache Write | Cache Read |
|-------|-------|--------|-------------|------------|
| Claude Opus 4 | $15/MTok | $75/MTok | $18.75/MTok | $1.50/MTok |
| Claude Sonnet 4 | $3/MTok | $15/MTok | $3.75/MTok | $0.30/MTok |
| Claude Haiku 3.5 | $0.80/MTok | $4/MTok | $1/MTok | $0.08/MTok |

**Opus is 5x more expensive than Sonnet on input and output.** For a workflow spending $100/day on Opus, switching to 80% Sonnet would save ~$64/day.

### Effort Level Settings

The `--effort` flag (or `effortLevel` setting) controls how much thinking the model does:

| Level | Behavior | Use Case |
|-------|----------|----------|
| `low` | Minimal thinking, faster responses, fewer tokens | Simple edits, file reads, formatting |
| `medium` | Balanced thinking (current setting) | General coding tasks |
| `high` | Extended thinking, more thorough | Complex architecture, debugging |
| `max` | Maximum thinking budget | Critical design decisions, hard bugs |

**Current `"effortLevel": "medium"` is reasonable** as a default. The key optimization is model selection, not effort level.

### MAX_THINKING_TOKENS

The `MAX_THINKING_TOKENS` environment variable caps the number of thinking tokens the model can use per response. This is separate from the effort level.

```bash
# In settings.json env or shell environment
export MAX_THINKING_TOKENS=8000  # Caps thinking to 8K tokens
```

**Recommended values:**
- Subagent workers (component-engineer, etc.): `MAX_THINKING_TOKENS=4096` — focused tasks don't need deep reasoning
- Team leader / orchestration: `MAX_THINKING_TOKENS=16384` — needs more planning capacity
- Interactive sessions: Don't cap — let effort level control it

### Recommended Routing Strategy

**Change global default to Sonnet, use Opus selectively:**

```json
// ~/.claude/settings.json
{
  "model": "sonnet",
  "effortLevel": "medium"
}
```

**When to use Opus (override per-session):**

| Task | Model | How to Invoke |
|------|-------|---------------|
| Architecture decisions | Opus | `claude --model opus` |
| Complex debugging | Opus | `claude --model opus` |
| Team leader orchestration | Opus | Set in agent spawn config |
| Multi-file refactoring | Opus | `claude --model opus` |
| Code review / QA | Sonnet | Default |
| Component implementation | Sonnet | Default |
| Test writing | Sonnet | Default |
| Documentation | Sonnet | Default |
| Simple edits / fixes | Sonnet + low effort | `claude --effort low` |
| Formatting / linting fixes | Sonnet + low effort | `claude --effort low` |

**Per-agent model routing in `generate-worktree-claude.mjs`:**

Add `--model` flag support to the worktree bootstrap script so each agent gets the appropriate model:

```javascript
// In generate-worktree-claude.mjs, add to the generated CLAUDE.md or spawn config:
const modelByRole = {
  'team-leader': 'opus',
  'architect': 'opus',
  'component-engineer': 'sonnet',
  'service-engineer': 'sonnet',
  'test-engineer': 'sonnet',
  'qa-reviewer': 'sonnet',
  'styling-engineer': 'sonnet',
  // ... all other roles default to sonnet
};
```

**Spawn agents with model override:**
```bash
claude --model sonnet --print --worktree my-task
```

### Projected Savings from Model Routing

Assuming current 100% Opus usage shifts to 80% Sonnet / 20% Opus:

| Metric | Before (100% Opus) | After (80/20 split) | Savings |
|--------|--------------------|--------------------|---------|
| Effective input rate | $15/MTok | $5.40/MTok | 64% |
| Effective output rate | $75/MTok | $27/MTok | 64% |
| $100/day spend | $100 | ~$36 | ~$64/day |

---

## 4. Agent Workflow Cost Model

### Token Costs Per Agent Session

Each subagent spawned by `/agent-team` or the team leader gets an **independent context window**. This means:

| Component | Tokens | Notes |
|-----------|--------|-------|
| System prompt (base) | ~3,000-5,000 | Claude Code internal system prompt |
| CLAUDE.md (project) | ~4,500-5,500 | Auto-loaded from working directory |
| CLAUDE.md (global) | ~300-400 | Auto-loaded from ~/.claude/ |
| MCP tool definitions | ~5,400-10,800 | If mcp-atlassian is enabled globally |
| Plugin/skill definitions | ~500-1,000 | Skill names + descriptions in system prompt |
| Figma MCP tools | ~1,275-2,550 | If Figma MCP is active |
| **Total system overhead per agent** | **~15,000-25,000** | **Before any user content** |

### Agent Team Cost Breakdown

For a typical 5-agent team (1 leader + 4 workers):

| Cost Component | Per Agent | 5 Agents | Notes |
|----------------|-----------|----------|-------|
| Initial context load | 20K tokens | 100K tokens | System prompt + CLAUDE.md + tools |
| Average task execution | 50K-200K tokens | 250K-1M tokens | Reading files, writing code, running tests |
| Verification suite | 10K-30K tokens | 50K-150K tokens | Lint + typecheck + test + build output |
| **Total per feature** | **80K-250K** | **400K-1.25M** | Input tokens only |

**At Opus pricing ($15/MTok input, $75/MTok output):**
- Input cost per feature: $6-$19
- Output cost per feature: $15-$47 (assuming 200K-625K output)
- **Total per feature: $21-$66**

**At Sonnet pricing ($3/MTok input, $15/MTok output):**
- Input cost per feature: $1.20-$3.75
- Output cost per feature: $3-$9.40
- **Total per feature: $4.20-$13.15**

### Worktrees vs Branches — Token Impact

| Approach | Token Impact | Why |
|----------|-------------|-----|
| **Worktrees** (current) | Higher initial, lower total | Each agent has its own working directory, reducing file-read conflicts. But each gets full CLAUDE.md. |
| **Branches** (sequential) | Lower initial, higher total | Single context window reused, but sequential execution means longer sessions with more compactions. |

**Verdict**: Worktrees are more cost-effective for parallel work despite the per-agent overhead, because:
1. Parallel execution = wall-clock time savings (human time is more expensive)
2. Independent contexts avoid interference
3. Each agent's context stays focused (less noise = fewer wasted tokens)

### Thin Agent Prompt Strategy

The `generate-worktree-claude.mjs` script already does selective section inclusion via `worktreeBootstrap.includeSections`. Optimize further:

1. **Only include sections relevant to the agent's role** (already partially done)
2. **Use doc pointers instead of inlining** — `Read ai-docs/PATTERNS.md when needed` vs copying 1,134 lines into CLAUDE.md
3. **Strip examples from agent CLAUDE.md** — agents can read example files on demand
4. **Set MAX_THINKING_TOKENS per role** — workers need less thinking than leaders

**Current agent file sizes (top consumers):**

| Agent | Lines | Recommendation |
|-------|-------|----------------|
| component-engineer.md | 367 | Review for redundancy with PATTERNS.md |
| test-engineer.md | 352 | Review for redundancy with test docs |
| infra-engineer.md | 291 | Likely appropriate — complex domain |
| database-engineer.md | 289 | Review — ADC has minimal DB surface |
| codebase-guardian.md | 287 | Review — may overlap with CODEBASE-GUARDIAN.md |

**Total agent definition lines: 6,521 across 28 files.** These are loaded on-demand (only when an agent is spawned with that role), so they don't affect every session. But for team workflows spawning 5+ agents, the aggregate matters.

### When to Use Subagents vs Single-Session

| Scenario | Approach | Why |
|----------|----------|-----|
| 3+ independent files to modify | Subagents in parallel | Faster, isolated contexts |
| Single service + its tests | Single session | Lower overhead, shared context |
| Complex cross-cutting refactor | Single session (Opus) | Needs full context awareness |
| UI + API + tests | Subagents (3 workers) | Naturally parallel domains |
| Bug fix in one file | Single session (Sonnet, low effort) | Minimal overhead |
| Documentation updates | Single session (Sonnet) | Low complexity |

---

## 5. Monitoring Setup

### 5.1 Built-in Claude Code Commands

**`/cost`** — Shows token usage for the current session:
```
> /cost

Session usage:
  Input tokens:  145,230
  Output tokens:  52,100
  Cache read:    89,000
  Cache write:   45,000
  Estimated cost: $4.52
```

**`/context`** — Shows current context window utilization:
```
> /context

Context window: 245,000 / 1,000,000 tokens (24.5%)
```

Use `/cost` at the end of each major task to track burn rate.

### 5.2 ccusage Setup

**ccusage** (https://github.com/ryoppippi/ccusage) is a CLI tool that parses Claude Code's local session logs to provide usage analytics.

**Installation:**
```bash
# Install via npm (recommended)
npm install -g ccusage

# Or use npx without installing
npx ccusage
```

**Basic usage:**
```bash
# Show usage for today
ccusage

# Show usage for a date range
ccusage --from 2026-03-01 --to 2026-03-30

# Show usage by project
ccusage --by-project

# JSON output for scripting
ccusage --json

# Show daily breakdown
ccusage --daily
```

**How it works:**
- Reads Claude Code session files from `~/.claude/sessions/` (or the equivalent storage location)
- Parses JSONL session logs for API call metadata
- Aggregates input/output/cache tokens and calculates cost estimates
- Groups by date, project, session

**Recommended setup for daily tracking:**
```bash
# Add to crontab or shell alias
alias ccost="npx ccusage --daily --from $(date -v-7d +%Y-%m-%d)"

# Or create a daily report script
#!/bin/bash
echo "=== Claude Code Usage Report ==="
echo "Date: $(date +%Y-%m-%d)"
npx ccusage --daily --from $(date -v-7d +%Y-%m-%d) --json > ~/.claude/usage-$(date +%Y-%m-%d).json
npx ccusage --daily --from $(date -v-7d +%Y-%m-%d)
```

### 5.3 Manual Tracking Approach

If ccusage doesn't parse newer session formats, create a manual log:

```bash
# After each major task, append to a tracking file
echo "$(date +%Y-%m-%d),$(date +%H:%M),feature-name,opus/sonnet,<cost from /cost>" >> ~/.claude/cost-log.csv
```

### 5.4 Per-Feature Cost Tracking

For agent-team workflows, the claude-workflow plugin already writes events to `.claude/progress/<slug>/events.jsonl`. Extend this with cost tracking:

1. Record `/cost` output at `session.start` and `session.end` events
2. Diff to get per-task cost
3. Aggregate per-feature

### 5.5 Dashboard / Reporting

**Option A: ccusage + spreadsheet**
- Export `ccusage --json` daily
- Import into Google Sheets / Excel
- Chart trends over time

**Option B: Custom script**
- Parse `~/.claude/sessions/` directly
- Build a simple HTML dashboard
- Run weekly via cron

**Option C: ADC integration** (future)
- ADC already monitors agents — add cost tracking to the agent dashboard
- Show cost per agent, per feature, per day

---

## 6. Auto-Compaction Behavior

### When Does Compaction Trigger?

Claude Code automatically triggers context compaction when the conversation reaches approximately **83.5% of the context window**. With the 1M token context window (Opus 4 / Sonnet 4):

| Context Window | Compaction Trigger | Approximate |
|---------------|-------------------|-------------|
| 200K (older models) | ~167K tokens | After ~15-25 turns of coding |
| 1M (current Opus/Sonnet 4) | ~835K tokens | After ~80-150 turns of coding |

### What Happens During Compaction

1. Claude summarizes the conversation so far into a condensed representation
2. The summary replaces the full conversation history
3. The context is reduced to approximately **10-20% of the window** (~100-200K tokens for 1M window)
4. System prompt, CLAUDE.md, and tool definitions are preserved (not compacted)
5. Recent messages (last few turns) are kept verbatim

### Impact of 1M Context Window

With the 1M context window available on Opus 4 and Sonnet 4:

- **Compaction happens much less frequently** — you can have very long sessions before hitting 835K
- **Each compaction is more expensive** — summarizing 835K tokens costs significant output tokens
- **Post-compaction context is larger** — ~100-200K summary vs ~20-40K on 200K windows
- **Risk**: Long sessions accumulate stale context that wastes tokens. Even with 1M, compacting at appropriate points is good practice.

### Using `/compact` Effectively

The `/compact` command triggers manual compaction with optional focus instructions:

```bash
# Basic compaction
/compact

# Compaction with focus instructions (recommended)
/compact Focus on the AgentManager service implementation. Retain file paths, function signatures, and the current task requirements. Discard discussion of alternatives we rejected.

# Task-transition compaction
/compact I'm switching from service implementation to writing tests. Keep the service API signatures and file locations but discard implementation discussion.
```

**Best practices for `/compact`:**

1. **Compact between task phases** — after completing one subtask, compact before starting the next
2. **Provide focus instructions** — tell Claude what to retain and what to discard
3. **Compact before expensive operations** — if you're about to read many files or run complex analysis, compact first to maximize available context
4. **Don't compact too early** — if you're still working on the same task, the full context is valuable

### Compaction Cost

Compaction itself consumes tokens:
- **Input**: The full conversation up to that point is sent for summarization
- **Output**: The summary (usually 10-20% of input)
- **Net effect**: One expensive call now, but saves tokens on all subsequent calls

For a session at 500K tokens that compacts to 100K:
- Compaction cost: ~500K input + ~100K output = ~600K tokens
- Savings on next 10 calls: 400K * 10 = 4M tokens saved
- **Break-even after ~2 calls post-compaction**

### Recommendations for Multi-Agent Workflows

1. **Keep agent sessions short and focused** — spawn agents for specific tasks, let them complete and exit. Don't reuse long-lived agent sessions.
2. **Set `MAX_THINKING_TOKENS` for workers** — caps the thinking budget, which is a major token consumer.
3. **Use `--bare` flag for headless agents** — skips hooks, LSP, plugin sync, auto-memory, CLAUDE.md auto-discovery. Provide context explicitly via `--system-prompt-file` or `--append-system-prompt-file`. This can save 5,000-15,000 tokens per session in overhead.
4. **Compact team leader sessions between agent dispatches** — the leader's context grows as it coordinates. Compact after each wave.

### The `--bare` Flag (Major Optimization)

```bash
claude --bare --model sonnet --print \
  --system-prompt-file .worktrees/task/CLAUDE.md \
  --add-dir .worktrees/task \
  "Implement the AgentManager service..."
```

`--bare` skips:
- Hook execution
- LSP initialization
- Plugin sync
- Attribution
- Auto-memory
- Background prefetches
- Keychain reads
- CLAUDE.md auto-discovery (you provide it explicitly)

This eliminates overhead from plugins, MCPs, and other global configuration that worker agents don't need.

---

## 7. Actionable Checklist

Ranked by estimated savings impact.

### HIGH Impact (each saves >$20/month or >30% on affected operations)

- [ ] **Change global model from Opus to Sonnet** — Edit `~/.claude/settings.json`: change `"model": "opus"` to `"model": "sonnet"`. Use `claude --model opus` for complex tasks only. **Estimated savings: 64% on routine tasks (~$50-100+/month depending on volume).**

- [ ] **Move mcp-atlassian to on-demand loading** — Remove from global `settings.json`. Create `~/.claude/mcp-configs/atlassian.json`. Load with `--mcp-config` flag when needed. **Estimated savings: ~5,400-10,800 tokens per API call across ALL sessions.**

- [ ] **Extract V2 Refactor section from CLAUDE.md** — Move the 140-line V2 section to `ai-docs/V2-REFACTOR.md`. Replace with 3-line pointer. **Estimated savings: ~1,000 tokens per API call, ~$15-45/month.**

- [ ] **Use `--bare` flag for worktree agents** — Update `generate-worktree-claude.mjs` to spawn agents with `--bare --system-prompt-file`. Eliminates global MCP/plugin/hook overhead for worker agents. **Estimated savings: ~10,000-20,000 tokens per agent spawn.**

- [ ] **Implement per-agent model routing** — Add model selection to `generate-worktree-claude.mjs`. Only team-leader and architect get Opus; all workers use Sonnet. **Estimated savings: 64% on worker agent costs.**

### MEDIUM Impact (each saves $5-20/month or 10-30%)

- [ ] **Condense CLAUDE.md** — Apply the full extraction plan from Section 1. Target 150-180 lines. **Estimated savings: ~2,500 tokens per turn, ~$20/month blended.**

- [ ] **Set MAX_THINKING_TOKENS per role** — Workers: 4096, Leaders: 16384, Interactive: uncapped. Add to agent spawn configuration. **Estimated savings: 20-40% on thinking tokens.**

- [ ] **Compact team leader sessions between waves** — Add `/compact` calls in the agent-team workflow after each wave completes. **Estimated savings: prevents context bloat in long orchestration sessions.**

- [ ] **Install and configure ccusage** — `npm install -g ccusage`. Run daily. Establish baseline. You can't optimize what you don't measure. **No direct savings, but enables data-driven optimization.**

- [ ] **Review agent definition files for redundancy** — Cross-reference 28 agent files (6,521 total lines) with ai-docs. Extract shared patterns. Target 20% reduction. **Estimated savings: ~1,300 lines of agent context.**

### LOW Impact (each saves <$5/month or <10%, but still worth doing)

- [ ] **Use effort level `low` for simple tasks** — `claude --effort low` for formatting, simple edits, documentation. **Estimated savings: 10-20% on thinking tokens for trivial tasks.**

- [ ] **Add `/cost` checkpoints to workflow events** — Log cost at session.start and session.end in JSONL events. Enables per-feature cost tracking. **No direct savings, enables monitoring.**

- [ ] **Audit ai-docs sizes** — DATA-FLOW.md is 2,155 lines, user-interface-flow.md is 1,347 lines. These are read on-demand (not auto-loaded), but large reads waste context. Consider splitting into smaller focused docs. **Estimated savings: marginal per-read.**

- [ ] **Keep agent sessions short** — Design workflows so agents complete one task and exit rather than accumulating context over multiple tasks. **Estimated savings: avoids compaction costs and stale context.**

- [ ] **Use `--no-session-persistence` for throwaway agents** — Workers that don't need resume capability can skip session persistence, reducing I/O. `claude --print --no-session-persistence`. **Marginal savings on disk I/O, no token impact.**

---

## Summary of Key Numbers

| Metric | Current | Optimized | Improvement |
|--------|---------|-----------|-------------|
| CLAUDE.md size | 566 lines (~5K tokens) | ~160 lines (~1.5K tokens) | 70% reduction |
| Default model | Opus ($15/$75 MTok) | Sonnet ($3/$15 MTok) | 80% cost reduction on routine work |
| MCP overhead per call | ~6,700-13,350 tokens | ~1,275-2,550 tokens | 80% reduction (removing Atlassian from global) |
| Agent system overhead | ~15K-25K tokens | ~5K-10K tokens | 50-60% reduction (bare mode + thin CLAUDE.md) |
| 5-agent feature (Opus) | $21-66 | $6-17 | 70% reduction (Sonnet workers + thin context) |

---

## Sources and References

- Claude Code CLI help: `claude --help` (local, version installed on machine)
- Claude Code settings: `~/.claude/settings.json` (analyzed directly)
- Project CLAUDE.md: `/Users/parker/Desktop/Agentic-Desktop-Command/CLAUDE.md` (566 lines, analyzed directly)
- ccusage repository: https://github.com/ryoppippi/ccusage
- Anthropic pricing page: https://www.anthropic.com/pricing (as of March 2026)
- Anthropic documentation: https://docs.anthropic.com/en/docs/claude-code/settings
- Claude Code `--bare` flag documentation: `claude --help` output (local)
- Project workflow config: `.claude/workflow.json` (analyzed directly)
- Agent definition files: `.claude/agents/*.md` (28 files, 6,521 total lines)
- ai-docs: `ai-docs/*.md` (10 files, 8,465 total lines)

> **Research Update (2026-03-30)**: This document was updated with verified web research. All web-sourced sections below have been cross-referenced against current Anthropic documentation and the ccusage repository.

---

## Verified Research Updates (Web Research 2026-03-30)

### CLAUDE.md Line Count — Confirmed

The project CLAUDE.md is **566 lines** (verified via `wc -l`). The global `~/.claude/CLAUDE.md` is **40 lines** (fine). The 566-line file is 2.8x the 200-line recommendation per official Anthropic docs.

### MCP Overhead — Verified Details

**`mcp-atlassian` registers exactly 72 tools** (Jira + Confluence). Per research:
- Each MCP tool definition adds ~50–150 tokens to the system prompt
- At 72 tools × ~100 tokens average = ~7,200 tokens overhead per request
- Claude Code now defers full tool schemas by default (only tool names enter context until a specific tool is called) — but 72 tool *names* still appear in every context
- GitHub MCP alone (for comparison) consumes 55,000 tokens across 93 tool definitions — mcp-atlassian's 72 tools are comparable overhead

**The `settings.local.json` project file only contains WebFetch/WebSearch allow permissions** — no additional MCPs at project level.

### /effort — Verified Settings

Current settings.json has `"effortLevel": "medium"` — this is the correct default per Anthropic docs ("medium is the recommended level for most coding tasks").

Verified effort level behavior:
- **low / medium / high** persist across sessions
- **max** is Opus-only, does NOT persist across sessions (use `CLAUDE_CODE_EFFORT_LEVEL=max` env var to persist)
- Default for Opus 4.6 and Sonnet 4.6: medium effort
- For one-off deep reasoning without changing session: include `ultrathink` in the prompt

**MAX_THINKING_TOKENS is deprecated** for Opus 4.6 and Sonnet 4.6. The modern replacement is adaptive thinking controlled by `/effort`. If you need to revert to fixed budget behavior:
```bash
CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING=1
MAX_THINKING_TOKENS=8000
```
This is not recommended — use `/effort low` instead.

### opusplan — Key Alias Not in Original Research

The `opusplan` model alias is specifically designed for this workflow:
- Uses **Opus in plan mode** (Shift+Tab for complex reasoning and architecture)
- Automatically switches to **Sonnet in execution mode** (code generation, implementation)

```json
{
  "model": "opusplan"
}
```
This is better than the original recommendation of switching to pure Sonnet, because it preserves Opus reasoning quality for planning while cutting costs on implementation.

### Auto-Compaction — Verified Thresholds

Verified compaction triggers by model:
- **Opus 4.6**: ~75% context full
- **Sonnet 4.6**: ~85% context full
- **Haiku 4.5**: ~90% context full

Claude Code now includes a **completion buffer** — enough free space for the current task to finish gracefully before compaction triggers. Compaction no longer interrupts mid-task.

With 1M context (included on Max/Team/Enterprise for Opus): compaction triggers at ~750K tokens — very rare in practice. To disable 1M context entirely and force more frequent compaction:
```bash
CLAUDE_CODE_DISABLE_1M_CONTEXT=1
```

### ccusage — Verified Commands

From the official ccusage repository (https://github.com/ryoppippi/ccusage):

```bash
# Run directly (no install required)
npx ccusage@latest

# Commands
npx ccusage@latest daily          # Daily aggregated usage
npx ccusage@latest monthly        # Monthly aggregated usage
npx ccusage@latest session        # Per-session breakdown
npx ccusage@latest blocks         # By 5-hour billing windows (Claude's billing unit)
npx ccusage@latest statusline     # Compact status bar display (beta)

# Options
--since 2026-03-01   # Filter from date
--until 2026-03-30   # Filter to date
--breakdown          # Per-model cost breakdown
--json               # JSON output for scripting
--instances          # Group by project/instance
```

The tool reads local JSONL session files — no API keys required, entirely local.

### Agent Team Token Multipliers — Verified

Per official Anthropic Claude Code documentation:
> "Agent teams use approximately **7x more tokens** than standard sessions when teammates run in plan mode, because each teammate maintains its own context window and runs as a separate Claude instance."

Key verified facts:
- `CLAUDE_CODE_SUBAGENT_MODEL` env var controls what model subagents run on — critical for cost control
- Setting this to `claude-sonnet-4-6` while running the main session on Opus is the recommended pattern
- Agent team teammates are loaded with CLAUDE.md, MCP servers, and skills automatically — everything in the spawn prompt adds to their context from the start
- Active teammates continue consuming tokens even if idle — always clean up teams when done

### CLAUDE.md Skills Extraction — Verified Mechanism

Skills load on-demand only when invoked (via `/skill-name`). Moving sections from CLAUDE.md to `.claude/skills/` files achieves zero-overhead until invoked:
- Skills are invoked via their skill name in a prompt
- Official recommendation: "Aim to keep CLAUDE.md under 200 lines by including only essentials"
- Hooks can preprocess data before Claude sees it (already configured: `claudeChangePreToolUse.js`)

### Recommended settings.json Changes (Verified)

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1",
    "CLAUDE_CODE_SUBAGENT_MODEL": "claude-sonnet-4-6"
  },
  "model": "opusplan",
  "effortLevel": "medium",
  "hooks": { /* keep existing hooks */ },
  "statusLine": { /* keep existing status line */ },
  "enabledPlugins": { /* keep existing plugins */ },
  "skipDangerousModePermissionPrompt": true,
  "teammateMode": "tmux",
  "mcpServers": {
    "mcp-atlassian": {
      "disabled": true
    }
  }
}
```

Remove mcp-atlassian from global settings and load it via `--mcp-config` when running Jira workflow commands.

---

## Updated Sources

- [Manage costs effectively — Claude Code Docs](https://code.claude.com/docs/en/costs)
- [Model configuration — Claude Code Docs](https://code.claude.com/docs/en/model-config)
- [ccusage GitHub Repository](https://github.com/ryoppippi/ccusage)
- [mcp-atlassian GitHub Repository](https://github.com/sooperset/mcp-atlassian) — 72 tools confirmed
- [Claude Code Sub Agents — DEV Community](https://dev.to/onlineeric/claude-code-sub-agents-burn-out-your-tokens-4cd8)
- [MCP Server Token Costs in Claude Code](https://www.jdhodges.com/blog/claude-code-mcp-server-token-costs/)
- [MCP Compression: Preventing Tool Bloat — Atlassian](https://www.atlassian.com/blog/developer/mcp-compression-preventing-tool-bloat-in-ai-agents/amp)
- [Claude Code Effort Levels Explained — MindStudio](https://www.mindstudio.ai/blog/claude-code-effort-levels-explained)
- [Claude Code Auto-Compact — ClaudeLog](https://claudelog.com/faqs/what-is-claude-code-auto-compact/)
- [Context Window & Compaction — DeepWiki](https://deepwiki.com/anthropics/claude-code/3.3-session-and-conversation-management)
- [Best Ways to Monitor Claude Code Token Usage 2026 — DEV](https://dev.to/kuldeep_paul/best-ways-to-monitor-claude-code-token-usage-and-costs-in-2026-5j3)
