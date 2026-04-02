# Final Recommendations: Claude Plugin & Tooling Improvements

> Synthesized 2026-03-30 from 4 research reports:
> Task 1 (gstack), Task 2 (plugin ecosystem), Task 3 (token optimization), Task 4 (claude-workflow audit)

---

## 1. Executive Summary — Top 5 Highest-Impact Actions

Ranked by **effort vs payoff** (cost savings + developer velocity + code quality):

| Rank | Action | Impact | Effort | Payoff |
|------|--------|--------|--------|--------|
| 1 | **Switch global default model from Opus → Sonnet** | HIGH | 5 min | ~64% cost reduction on routine work (~$50-100+/month) |
| 2 | **Move mcp-atlassian to on-demand loading** | HIGH | 15 min | ~5,400-10,800 tokens removed from every API call |
| 3 | **Install ccusage for token monitoring** | HIGH | 5 min | Enables data-driven optimization; free to run |
| 4 | **Extract V2 Refactor section from CLAUDE.md** | HIGH | 1 hr | ~1,000 tokens saved per API call; cleaner agent context |
| 5 | **Install gstack globally + use `/review` and `/investigate`** | HIGH | 20 min | Adds automated code review + systematic debugging — two major gaps in current ADC pipeline |

**Combined impact of all 5**: >70% cost reduction on routine work, structural code quality gates added, full token visibility established.

---

## 2. gstack Integration Plan

> Source: `research/gstack-analysis.md`

### Phase 1 — Install (15 minutes, immediate)

```bash
# Prerequisites: Bun v1.0+
curl -fsSL https://bun.sh/install | bash

# Clone gstack globally (do NOT vendor into ADC repo)
git clone --single-branch --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack

# Run setup with prefix to avoid collisions with ADC's own skills
cd ~/.claude/skills/gstack && ./setup --prefix gstack-
```

**Why global, not vendored?** The compiled Bun browser binary is ~58MB. ADC uses npm/Node.js; Bun dependency in the repo creates confusion. Global install keeps the binary off the repo entirely.

### Phase 2 — CLAUDE.md Registration (5 minutes)

Add ONLY these routing rules to `CLAUDE.md` (not the full gstack block — prevents bloat):

```markdown
## gstack Skills (global install)

Use these for quality gates. Do NOT use /gstack-ship (ADC has npm run verify).
Invoke explicitly only — proactive routing disabled.

- /gstack-review — pre-merge structural code review (staff engineer perspective)
- /gstack-investigate — systematic root-cause debugging (4-phase: investigate → analyze → hypothesize → implement)
- /gstack-learn — cross-session memory for project patterns and pitfalls
- /gstack-cso — OWASP + STRIDE security audit (use monthly or before major releases)
- /gstack-retro — weekly retrospective with per-session metrics
```

**Disable proactive routing**: Add to gstack config or simply never put `proactive: true` in skill invocation rules.

### Phase 3 — Selective Adoption by Skill (after 1 week of familiarity)

| Priority | Skill | When to Use | Next Step |
|----------|-------|-------------|-----------|
| **1** | `/gstack-review` | Before every PR merge from agent-team runs | Run on the next feature branch manually |
| **2** | `/gstack-investigate` | When a bug persists after one fix attempt | Use instead of ad-hoc debugging |
| **3** | `/gstack-learn` | End of each session with new codebase insight | Run `/gstack-learn review` weekly |
| **4** | `/gstack-retro` | End of each sprint | Run `/gstack-retro` Sunday evening |
| **5** | `/gstack-cso` | Before major releases or when adding new IPC channels | Run monthly |

### Phase 4 — Browser Testing (only if React renderer testing needed)

```bash
# Only if Electron renderer layer needs visual QA
/gstack-browse  # Persistent Chromium ~100ms/command
/gstack-qa      # Full test-fix-verify loop for web UI layers
```

**Note**: `/gstack-qa` tests the renderer (React) layer only. It does NOT test Electron main process, IPC, or native integrations. ADC's existing `npm run test:e2e` (Playwright + Electron) is more appropriate for full-stack E2E testing.

### Conflicts to Avoid

| Risk | Action |
|------|--------|
| `/gstack-ship` conflicts with ADC's `npm run verify` | Never use `/gstack-ship` — use `npm run verify` instead |
| `/gstack-autoplan` conflicts with ADC's `/new-plan` | Never use `/gstack-autoplan` — use claude-workflow pipeline |
| CLAUDE.md auto-modification | Decline any auto-modification prompt from gstack setup |
| Proactive routing overrides ADC skills | Keep `--prefix gstack-` so all skills are namespaced |

---

## 3. Plugin/Tool Shortlist — Must-Install

> Source: `research/plugin-ecosystem.md`

### Install Immediately (< 30 minutes total)

| Tool | Install Command | Why | Impact |
|------|----------------|-----|--------|
| **ccusage** | `npm install -g ccusage` | Best-in-class token monitoring. Reads JSONL directly, offline, fast. Gives daily/monthly/session/billing-window breakdowns. | Enables all cost optimization |
| **cc-safe-setup** | `npx cc-safe-setup` (run in ADC repo root) | Installs 6 essential safety hooks in 10 seconds. Prevents destructive commands, branch guards. | Defensive baseline |
| **gstack** | See Section 2 above | Adds `/review`, `/investigate`, `/learn`, `/cso`, `/retro` — 5 missing quality capabilities | Code quality + memory |

### Install Based on Need

| Tool | Install Command | Why | When |
|------|----------------|-----|------|
| **Trail of Bits Security Skills** | `git clone https://github.com/trailofbits/skills.git ~/.claude/skills/trailofbits-security` | CodeQL, Semgrep, variant analysis. Professional-grade security auditing. | Before any security-sensitive feature |
| **cozempic** | `/plugin marketplace add Ruya-AI/cozempic` | 13 context pruning strategies, Agent Team protection. Directly addresses context bloat. | If context runs out during long sessions |
| **Claude-Code-Usage-Monitor** | `uv tool install claude-monitor` | Real-time burn rate + ML predictions. Run alongside active agent-team sessions. | During active multi-agent sessions |
| **webapp-testing** (official) | `git clone https://github.com/anthropics/skills` | Playwright-based UI testing patterns from Anthropic. | When adding new React renderer features |

### ADC Skills Cleanup (20 minutes)

```bash
# Remove — not relevant to an Electron app for managing coding agents
rm -rf /Users/parker/Desktop/Agentic-Desktop-Command/.claude/skills/svg-logo-designer
rm -rf /Users/parker/Desktop/Agentic-Desktop-Command/.claude/skills/svg-precision
```

**Saves ~21,400 tokens when those skills are active.**

**Review/Replace** (lower urgency but worth doing):

| Skill | Problem | Recommended Action |
|-------|---------|-------------------|
| `shadcn-ui` (75KB, ~18,900 tokens) | References Next.js 16 and Atlas conventions — neither used in ADC | Create `adc-design-system` skill with ADC's actual Tailwind v4 + Radix patterns; remove shadcn-ui |
| `create-frontend-ui` (53KB, ~13,400 tokens) | Generic "avoid AI slop" guidance at high token cost | Trim to essential principles or replace with lighter `frontend-design` official skill |

**Create custom skills** (high ROI for ADC-specific work):

```bash
# Create these two ADC-specific skills (no external install needed, write SKILL.md files):
# .claude/skills/electron-ipc/SKILL.md — ADC's IPC contract patterns
# .claude/skills/adc-design-system/SKILL.md — Tailwind v4 + Radix + color-mix() patterns
```

### Skip

- Heavy MCP servers with 10+ tools (each adds 200-500 tokens/message permanently)
- SkillKit marketplace (400K unvetted skills, security risk)
- `claude-code-mcp` (recursive context explosion)
- `loki-mode`, `oh-my-claudecode` (massive overhead, overkill)

---

## 4. Token Optimization Checklist — Ranked by Savings

> Source: `research/token-optimization.md`

### HIGH Impact — Do These First

- [ ] **1. Switch global default to Sonnet** — Edit `~/.claude/settings.json`:
  ```json
  { "model": "sonnet", "effortLevel": "medium" }
  ```
  Use `claude --model opus` explicitly for architecture decisions, complex debugging, team-leader orchestration.
  **Savings: 64% on routine tasks (~$50-100+/month)**

- [ ] **2. Move mcp-atlassian to on-demand** — Create `~/.claude/mcp-configs/atlassian.json` with current env values. Remove `mcp-atlassian` from global `settings.json`. Load with `claude --mcp-config ~/.claude/mcp-configs/atlassian.json` when doing sprint/Jira work.
  **Savings: ~5,400-10,800 tokens removed from every API call**

- [ ] **3. Extract V2 Refactor section from CLAUDE.md** — Move lines 10-151 (the ADC v2 Refactor section, ~140 lines) to `ai-docs/V2-REFACTOR.md`. Replace with 3-line pointer:
  ```markdown
  > V2 Refactor active (P0). See ai-docs/V2-REFACTOR.md. DO NOT build on terminal-service/xterm.js/node-pty.
  > New services: AgentManager, TmuxBridge, TeamWatcher, SessionJSONLReader. Slug: agent-dashboard-view.
  > Feature branch: feature/agent-dashboard-view.
  ```
  **Savings: ~1,000 tokens per API call, ~$15-45/month**

- [ ] **4. Use `--bare` flag for worktree agents** — Update `scripts/generate-worktree-claude.mjs` to spawn agents with:
  ```bash
  claude --bare --model sonnet --print \
    --system-prompt-file .worktrees/<task>/CLAUDE.md \
    --add-dir .worktrees/<task>
  ```
  The `--bare` flag eliminates hook execution, LSP init, plugin sync, auto-memory, and CLAUDE.md auto-discovery from worker agents — they get context explicitly via `--system-prompt-file`.
  **Savings: ~10,000-20,000 tokens per agent spawn**

- [ ] **5. Implement per-agent model routing** — In `scripts/generate-worktree-claude.mjs`, add model selection by role:
  ```javascript
  const modelByRole = {
    'team-leader': 'opus',
    'architect': 'opus',
    'component-engineer': 'sonnet',
    'service-engineer': 'sonnet',
    'test-engineer': 'sonnet',
    'qa-reviewer': 'sonnet',
    'styling-engineer': 'sonnet',
    // all other workers default to sonnet
  };
  ```
  **Savings: 64% on worker agent costs**

### MEDIUM Impact

- [ ] **6. Full CLAUDE.md condensation** — Apply the complete extraction plan targeting 150-180 lines (from 566):
  - Condense Verification Requirements (remove "Violations" list, keep command list)
  - Replace ESLint Rules detail with `> See ai-docs/LINTING.md`
  - Replace Import Order + React patterns with `> See ai-docs/PATTERNS.md`
  - Extract Design System section to `ai-docs/DESIGN-SYSTEM.md`
  - Replace Plan Tracking Protocol with pointer to `ai-docs/PLAN-TRACKING.md`
  **Savings: ~2,500 tokens per turn, ~$20/month blended**

- [ ] **7. Set MAX_THINKING_TOKENS per role** — Add to agent spawn config:
  - Workers: `MAX_THINKING_TOKENS=4096`
  - Team leaders: `MAX_THINKING_TOKENS=16384`
  - Interactive sessions: uncapped (let effort level control)
  **Savings: 20-40% on thinking tokens**

- [ ] **8. Compact team leader sessions between waves** — After each wave completes in `/agent-team`, trigger:
  ```
  /compact Focus on [feature-slug] coordination. Retain: task statuses, active agent list, wave N results, pending merges. Discard: implementation details of completed tasks.
  ```
  **Prevents context bloat in long orchestration sessions**

- [ ] **9. Install and configure ccusage** (already listed in Section 3) — Establish baseline before further optimization:
  ```bash
  npm install -g ccusage
  ccusage daily --breakdown   # Daily cost by model
  ccusage blocks              # 5-hour billing window awareness
  ```

- [ ] **10. Audit agent definition files for redundancy** — 28 agent files, 6,521 total lines. Cross-reference with `ai-docs/`. Target: 20% reduction by replacing inlined examples with `> See ai-docs/PATTERNS.md section X` pointers. Start with the top 5 consumers: `component-engineer.md` (367 lines), `test-engineer.md` (352 lines).

### LOW Impact (still worth doing)

- [ ] **11. Remove SVG skills** (see Section 3) — immediate 21,400 token savings when those skills are active
- [ ] **12. Use `--effort low` for simple tasks** — formatting, simple edits, documentation: `claude --effort low`. Saves 10-20% on thinking tokens for trivial tasks.
- [ ] **13. Add `/cost` checkpoints to workflow events** — Log cost at `session.start` and `session.end` in JSONL events for per-feature cost visibility.
- [ ] **14. Use `/compact` with focus instructions** between task phases — not just between waves:
  ```
  /compact I'm moving from implementation to test writing. Retain: service API signatures, file paths, acceptance criteria. Discard: implementation discussion.
  ```

---

## 5. claude-workflow Improvement Roadmap

> Source: `research/claude-workflow-audit.md`

### Critical Bugs — Fix Now (< 1 hour total)

These are bugs in the installed plugin (`~/.claude/plugins/cache/claude-workflow-marketplace/claude-workflow/4.0.2/`):

#### BUG-1: init-gate.js is permanently disabled (CRITICAL)
**File**: `hooks/init-gate.js`, lines 130-131
**Problem**: `allow(); return;` at line 130 exits unconditionally before any gating logic. No enforcement runs — any agent can spawn without reading team-leader.md.
**Fix**:
```bash
# Edit the file to remove lines 130-131:
# REMOVE: allow();
# REMOVE: return;
# The gating logic at lines 133-146 will then execute correctly.
```
**Impact if unfixed**: Team leader identity injection is never enforced. Agents may act without proper orchestration context.

#### BUG-2: config-guard.js uses wrong deny format (MEDIUM)
**File**: `hooks/config-guard.js`, lines 46-49
**Problem**: Uses `{ decision: 'block', reason: ... }` instead of the standard `hookSpecificOutput` envelope. The runtime likely ignores this output, meaning `.claude/` config files are not actually protected.
**Fix**: Change to standard format:
```javascript
process.stdout.write(JSON.stringify({
  hookSpecificOutput: {
    hookEventName: 'PreToolUse',
    permissionDecision: 'deny',
    permissionDecisionReason: `Config guard: Modifying "${filePath}" is blocked during workflow execution.`
  }
}));
```

### Quick Wins (1-2 hours each)

| # | Item | File to Edit | Change |
|---|------|-------------|--------|
| QW-3 | **Allow `git branch -D` for work branches** | `hooks/safety-guard.js` | Add exemption: allow `git branch -D` when branch matches `workPrefix/*` pattern and sentinel is active |
| QW-4 | **Add custom checks to workflow.json** | `hooks/teammate-quality.js` + `.claude/workflow.json` schema | Add `checks: [{name, command}]` array to workflow config; `detectChecks()` reads it first before auto-detection |
| QW-5 | **Document skill composition pattern** | New `prompts/SKILL-COMPOSITION.md` | Document how skills chain (e.g., `/new-plan` → `/agent-team`) as a first-class composition mechanism |

### Medium Changes (half-day to full-day each)

| # | Item | Files | Impact |
|---|------|-------|--------|
| MC-1 | **Consolidate dual tracking systems** | `hooks/tracker.js` + `hooks/tracking.js` + `hooks/tracking-emitter.js` | Merge into single event directory + schema. Currently `tracking-emitter.js` writes to `.claude/tracking/` while `/track` writes to `.claude/progress/`. **Prerequisite for shared event bus.** |
| MC-2 | **Combine safety-guard + workflow-enforcer** | `hooks/safety-guard.js` + `hooks/workflow-enforcer.js` + `hooks/hooks.json` | Single hook for Bash PreToolUse. Halves per-Bash latency (currently ~400-1000ms per Bash command from two sequential Node.js processes). |
| MC-3 | **Pluggable agent definitions** | `.claude/workflow.json` schema + `hooks/config.js` | Allow `workflow.json` to override agent .md paths: `"agents": { "qa-reviewer": "my-plugin/agents/custom-qa.md" }`. Enables specialized agents from other plugins. |

### Larger Changes (multi-day)

| # | Item | Effort | Value |
|---|------|--------|-------|
| LC-1 | **Self-learning system** — capture user corrections, build per-project rule memory (from pro-workflow pattern) | 2-3 days | Agents improve over time; reduces repeated mistakes |
| LC-2 | **Cost tracking integration** — monitor token usage across spawned agents, report per-task and per-feature | 1-2 days | Direct visibility into agent cost; pairs with ccusage |
| LC-3 | **Shared event bus** — global `.claude/events/global.jsonl` for cross-plugin observability | 1-2 days | ADC desktop app can observe all plugin events; requires MC-1 first |
| LC-4 | **ADC integration layer** — structured JSON output from hooks/tracker for ADC v2 dashboard to consume | 3-5 days | ProgressWatcher can read workflow events natively; requires LC-3 + ADC Phase 7 |

### Dependency Order for Roadmap

```
BUG-1, BUG-2 → Fix immediately (independent)
QW-3, QW-4, QW-5 → Independent, do next
MC-2 → Independent (performance win)
MC-1 → Do before LC-3
MC-3 → Do before LC-4 pipeline work
LC-1 → Independent (can be a separate plugin)
LC-2 → Independent (wrap proof-ledger)
LC-3 → After MC-1
LC-4 → After LC-3 + ADC v2 Phase 7
```

---

## 6. Cross-Cutting Themes

Patterns that appear independently across all 4 research areas:

### Theme 1: Missing Observability

All 4 reports flagged the same gap: **no visibility into cost, context, or agent behavior**.

- **Token optimization** (T3): No cost monitoring in place; Opus is the default for everything.
- **Plugin ecosystem** (T2): `ccusage` is the community-recognized fix; statusline hooks provide passive visibility.
- **claude-workflow** (T4): No cost tracking across spawned agents; `/status` shows task state but not token burn.
- **gstack** (T1): `/retro` provides session metrics; telemetry JSONL is lightweight but exists.

**Unified fix**: Install `ccusage` (T2/T3 recommendation), add `/cost` checkpoints to workflow JSONL events (T3), and add cost tracking to `LC-2` (T4).

### Theme 2: Context Window Bloat

All 4 reports identified excessive always-on context.

- **CLAUDE.md** (T3): 566 lines, ~5K tokens, loaded every turn. Target: 150-180 lines.
- **MCP overhead** (T2/T3): Atlassian MCP adds ~5,400-10,800 tokens per API call globally.
- **Skills vs MCPs** (T2): Skills cost ~100 tokens when inactive; MCPs cost hundreds of tokens on every message regardless of use.
- **Agent system overhead** (T3): Each agent starts with 15K-25K tokens of overhead before doing any work.

**Unified fix**: The CLAUDE.md condensation (T3) + MCP on-demand loading (T3) + `--bare` flag for agents (T3) together can cut per-agent context overhead by 50-60%.

### Theme 3: Missing Quality Gates

Both gstack (T1) and the claude-workflow audit (T4) identified gaps in automated quality enforcement.

- **No automated pre-merge code review** — gstack's `/review` fills this gap.
- **No systematic debugging protocol** — gstack's `/investigate` fills this.
- **init-gate.js is disabled** (T4, BUG-1) — the agent spawn gate is effectively non-functional.
- **config-guard.js is broken** (T4, BUG-2) — config file protection not enforced.

**Unified fix**: Fix the two bugs in claude-workflow (5 minutes total) + add gstack `/review` to pre-merge workflow.

### Theme 4: Model Selection is the Biggest Lever

Consistently across T2 and T3: everything else is marginal compared to model selection.

- Global `"model": "opus"` means every session — including simple edits, documentation, formatting — burns Opus tokens.
- Workers doing component implementation don't need Opus reasoning depth.
- The 5x price difference (Opus vs Sonnet) dwarfs all other optimizations combined.

**Unified fix**: Change global default to Sonnet (5 minutes). Use `--model opus` for team leaders, architects, and complex debugging only.

### Theme 5: Skill Composition is Underused

Both gstack (T1) and claude-workflow (T4) have composable skill pipelines that aren't formally documented or connected.

- gstack's `Think → Plan → Build → Review → Test → Ship → Reflect` maps partially onto ADC's `/new-plan → /agent-team → QA → merge`.
- claude-workflow has no `/gstack-review` step between agent-team completion and merge.
- gstack's `/learn` cross-session memory has no equivalent in claude-workflow.

**Unified fix**: Add a post-agent-team `/gstack-review` step to the workflow (QW-5 from T4). Document the skill composition pattern.

---

## 7. Risk Register

| Risk | Source | Severity | Likelihood | Mitigation |
|------|--------|----------|-----------|------------|
| **gstack proactive routing conflicts with ADC skills** | T1 | High | Medium | Use `--prefix gstack-` on install; never enable proactive routing |
| **gstack modifies CLAUDE.md without permission** | T1 | High | Low | Decline all auto-modification prompts during setup |
| **gstack skill files (1000-2000 lines each) burn context** | T1 | Medium | High | Invoke selectively; avoid `/gstack-autoplan` (chains 3 reviews) |
| **mcp-atlassian on-demand breaks Jira sprint workflow** | T3 | Medium | Low | Create the config file first; test before removing from global settings |
| **`--bare` flag in agents suppresses legitimate hooks** | T3 | Medium | Medium | Verify which hooks are essential for workers; explicitly re-add if needed |
| **init-gate.js fix causes workflow regressions** | T4 | Medium | Low | The fix (removing 2 lines) restores intended behavior; test with a dry-run workflow |
| **config-guard.js format fix blocks legitimate edits** | T4 | Low | Low | The fix restores intended protection; if over-blocking, exempt specific paths |
| **CLAUDE.md condensation loses information agents need** | T3 | High | Low | Extract to ai-docs (not delete); agents can read on demand via file paths |
| **gstack is 20 days old — API changes may break installs** | T1 | Medium | Medium | Pin to specific commit: `git clone --depth 1 --branch v0.14.1.0` |
| **Per-agent model routing (Sonnet workers) reduces output quality** | T3 | Medium | Low | Monitor first PR from Sonnet agents; escalate to Opus if quality drops |
| **Dual tracking systems (T4) cause lost events** | T4 | Medium | High | Fix BUG-1/BUG-2 first; then do MC-1 tracking consolidation |

---

## 8. Quick Wins — Doable in < 30 Minutes

These actions require no research, no planning, and deliver immediate benefit:

### 1. Change global model to Sonnet (5 minutes)

```bash
# Edit ~/.claude/settings.json
# Change: "model": "opus"
# To:     "model": "sonnet"
```

**Impact**: ~64% cost reduction on all sessions until you explicitly use `--model opus`.

### 2. Install ccusage (3 minutes)

```bash
npm install -g ccusage
ccusage daily --breakdown
ccusage blocks
```

**Impact**: Immediate visibility into what you're actually spending. Run this first to establish a baseline before any other changes.

### 3. Fix init-gate.js dead code (5 minutes)

```bash
# Open: ~/.claude/plugins/cache/claude-workflow-marketplace/claude-workflow/4.0.2/hooks/init-gate.js
# Remove lines 130-131:
#   allow();
#   return;
```

**Impact**: Restores agent spawn gating. Takes 2 minutes to find the file, 1 minute to make the edit.

### 4. Fix config-guard.js output format (10 minutes)

```bash
# Open: ~/.claude/plugins/cache/claude-workflow-marketplace/claude-workflow/4.0.2/hooks/config-guard.js
# Find lines 46-49, replace { decision: 'block', reason: ... }
# With the standard hookSpecificOutput envelope (see Section 5 above)
```

**Impact**: Config files in `.claude/` are actually protected during workflow execution.

### 5. Remove SVG skills (2 minutes)

```bash
rm -rf /Users/parker/Desktop/Agentic-Desktop-Command/.claude/skills/svg-logo-designer
rm -rf /Users/parker/Desktop/Agentic-Desktop-Command/.claude/skills/svg-precision
```

**Impact**: ~21,400 tokens saved when those skills would have been active. Zero downside — ADC has no SVG generation features.

### 6. Install gstack globally (15 minutes)

```bash
curl -fsSL https://bun.sh/install | bash
git clone --single-branch --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack
cd ~/.claude/skills/gstack && ./setup --prefix gstack-
```

**Impact**: Adds `/gstack-review` and `/gstack-investigate` — the two most immediately useful skills for ADC's current development workflow.

### 7. Move mcp-atlassian to on-demand (10 minutes)

```bash
# Create config file
mkdir -p ~/.claude/mcp-configs
# Copy current mcp-atlassian config from ~/.claude/settings.json into ~/.claude/mcp-configs/atlassian.json

# Then remove mcp-atlassian from ~/.claude/settings.json
```

**Impact**: ~5,400-10,800 tokens removed from every API call in every session that doesn't need Jira.

---

## Implementation Order Summary

```
Day 1 (< 1 hour total):
  ✓ Run ccusage to establish baseline
  ✓ Change model to sonnet in settings.json
  ✓ Fix init-gate.js (5 min)
  ✓ Fix config-guard.js (10 min)
  ✓ Remove SVG skills (2 min)
  ✓ Move mcp-atlassian to on-demand (10 min)

Day 1-2 (1-2 hours):
  ✓ Install gstack globally with --prefix
  ✓ Add gstack routing rules to CLAUDE.md (minimal — only the 5 high-value skills)
  ✓ Extract V2 Refactor section to ai-docs/V2-REFACTOR.md

Week 1 (spread across sessions):
  ✓ Full CLAUDE.md condensation (target 150-180 lines)
  ✓ Per-agent model routing in generate-worktree-claude.mjs
  ✓ --bare flag for worktree agent spawning

Week 2-4:
  ✓ MC-1: Consolidate dual tracking systems
  ✓ MC-2: Combine safety-guard + workflow-enforcer hooks
  ✓ Add custom checks to workflow.json (QW-4)

Month 2+:
  ✓ LC-1: Self-learning system
  ✓ LC-2: Cost tracking integration
  ✓ LC-3: Shared event bus
  ✓ LC-4: ADC integration layer (blocked on ADC v2 Phase 7)
```

---

*Report compiled by synthesis agent. All recommendations traceable to source research reports. No contradictions between findings — areas of overlap are explicitly noted in Section 6 (Cross-Cutting Themes).*
