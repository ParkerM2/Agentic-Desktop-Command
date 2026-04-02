# gstack Deep Research Analysis

**Date:** 2026-03-30
**Source:** `/Users/parker/Desktop/ES3/gpMS_ConsoleFrontend/.claude/skills/gstack/`
**GitHub:** https://github.com/garrytan/gstack
**Version analyzed:** 0.14.1.0 (latest as of 2026-03-30)
**Community:** 59.5k GitHub stars, 7.8k forks

---

## 1. What Is gstack?

gstack is an open-source Claude Code skill pack created by Garry Tan (President & CEO of Y Combinator). It transforms Claude Code into a virtual engineering team with 31 slash commands spanning planning, design, QA, security, release, and retrospectives. Every skill is a Markdown file — pure prompt engineering, no framework lock-in, MIT licensed.

The core philosophy is **sprint-structured AI development**: Think → Plan → Build → Review → Test → Ship → Reflect. Each skill feeds artifacts into the next. `/office-hours` writes a design doc that `/plan-ceo-review` reads. `/plan-eng-review` writes a test plan that `/qa` picks up. Nothing falls through the cracks.

Garry's reported productivity: 600,000+ lines of production code in 60 days, 10,000-20,000 lines/day, part-time while running YC full-time.

---

## 2. Complete Skill Catalog (All 31 Skills)

### Sprint Phase: Think

| Skill | Specialist Role | What It Does | Key Artifacts |
|-------|----------------|--------------|---------------|
| `/office-hours` | YC Office Hours partner | Six forcing questions that reframe the product. Startup mode (VC-style interrogation) or Builder mode (enthusiastic collaboration). Challenges premises. Writes design doc to `~/.gstack/projects/`. | Design doc feeds plan-ceo-review, plan-eng-review |

### Sprint Phase: Plan

| Skill | Specialist Role | What It Does | Key Artifacts |
|-------|----------------|--------------|---------------|
| `/plan-ceo-review` | CEO / Founder (Brian Chesky mode) | Rethinks the problem: "what is the 10-star product hiding inside this request?" Four modes: Expansion, Selective Expansion, Hold Scope, Reduction. Interactive — one AskUserQuestion per decision. | Vision doc → `~/.gstack/projects/` |
| `/plan-eng-review` | Eng Manager | Locks architecture, data flow, state diagrams, failure modes, edge cases, test coverage. Forces hidden assumptions into the open via diagrams. Writes test plan artifact for `/qa`. | Test plan → `~/.gstack/projects/` |
| `/plan-design-review` | Senior Designer | Pre-implementation plan review. Rates 7 design dimensions 0-10 (info architecture, interaction states, user journey, AI slop risk, design system, responsive/a11y, unresolved decisions). Edits plan to fix gaps. | Updated plan doc |
| `/design-consultation` | Design Partner | Builds a complete design system from scratch. Researches competitors (real screenshots via `/browse`), proposes safe choices + deliberate creative risks. Generates interactive HTML preview. Writes `DESIGN.md` and updates `CLAUDE.md`. | `DESIGN.md` read by all design skills |
| `/autoplan` | Review Pipeline | One command, fully reviewed plan. Runs CEO → design → eng review automatically with encoded decision principles. Surfaces only taste decisions (close calls, scope choices) for user approval. | All three plan docs |

### Sprint Phase: Build

*(gstack does not provide build skills — that is Claude Code's native code-writing capability. gstack flanks the build phase with planning before and review after.)*

### Sprint Phase: Review

| Skill | Specialist Role | What It Does | Dependencies |
|-------|----------------|--------------|-------------|
| `/review` | Staff Engineer | Pre-landing PR review. Analyzes diff vs base branch for SQL safety, LLM trust boundary violations, conditional side effects, structural issues. Auto-fixes obvious ones. Flags completeness gaps. Smart routing: infra bug fixes skip CEO review, backend changes skip design review. | Git diff |
| `/investigate` | Debugger | Four-phase systematic debugging: investigate → analyze → hypothesize → implement. Iron Law: no fixes without root cause. Auto-freezes to the module being debugged. Stops after 3 failed fixes. | Source files |
| `/design-review` | Designer Who Codes | 80-item visual audit on the live site, then fix loop. Each fix is one atomic commit (`style(design): FINDING-NNN`). Before/after screenshots. Hard cap at 30 fixes. Self-regulates: CSS-only changes free pass, JSX/TSX changes count against risk budget. | Live site URL |
| `/design-shotgun` | Design Explorer | Generate multiple AI design variants (using `$D` design binary with GPT Image API), open comparison board in browser, iterate until direction approved. Taste memory biases toward preferences across sessions. | Design binary (GPT Image API) |
| `/codex` | Second Opinion (OpenAI) | Three modes: code review with pass/fail gate, adversarial challenge (tries to break code), open consultation with session continuity. When both `/review` (Claude) and `/codex` (OpenAI) have run: cross-model analysis showing overlapping vs unique findings. | OpenAI Codex CLI |

### Sprint Phase: Test

| Skill | Specialist Role | What It Does | Dependencies |
|-------|----------------|--------------|-------------|
| `/qa` | QA Lead | Systematically tests a web app. Three tiers: Quick (critical/high only), Standard (+medium), Exhaustive (+cosmetic). Find bugs → fix with atomic commits → re-verify → generate regression tests. Produces before/after health scores. | Browse daemon, test plan from plan-eng-review |
| `/qa-only` | QA Reporter | Same methodology as `/qa` but report-only. Never modifies code. Produces structured report with health score, screenshots, repro steps. | Browse daemon |
| `/cso` | Chief Security Officer | Two modes: daily (8/10 confidence gate, zero-noise) and comprehensive (monthly deep scan, 2/10 bar). Infrastructure-first: secrets archaeology, dependency supply chain, CI/CD pipeline, LLM/AI security, skill supply chain. Then OWASP Top 10 + STRIDE threat modeling. Each finding includes concrete exploit scenario. 17 false-positive exclusions. | Source files |
| `/benchmark` | Performance Engineer | Establishes baselines for page load times, Core Web Vitals, resource sizes. Compares before/after on every PR. Tracks trends over time. | Browse daemon |

### Sprint Phase: Ship

| Skill | Specialist Role | What It Does | Dependencies |
|-------|----------------|--------------|-------------|
| `/ship` | Release Engineer | Sync main → run tests → review diff → bump VERSION → update CHANGELOG → commit → push → open PR. Bootstraps test frameworks from scratch if none exist. Coverage audit on every run. Auto-invokes `/document-release`. | Git, CI |
| `/land-and-deploy` | Release Engineer | Merge the PR → wait for CI and deploy → verify production health. One command from "approved" to "verified in production." | Setup-deploy config, CI/CD |
| `/document-release` | Technical Writer | Post-ship: reads every doc file, cross-references the diff, updates everything that drifted. README, ARCHITECTURE, CONTRIBUTING, CLAUDE.md, TODOS. Auto-invoked by `/ship`. | Source diff |
| `/setup-deploy` | Deploy Configurator | One-time setup for `/land-and-deploy`. Detects platform (Vercel, Render, Fly, etc.), production URL, deploy commands. Written to project config. | Deployment platform |
| `/canary` | SRE | Post-deploy monitoring loop via browse daemon. Watches for console errors, performance regressions, page failures. | Browse daemon, production URL |

### Sprint Phase: Reflect

| Skill | Specialist Role | What It Does | Dependencies |
|-------|----------------|--------------|-------------|
| `/retro` | Eng Manager | Weekly engineering retrospective. Per-person commit breakdowns with praise and growth areas. Shipping streaks, test health trends. `/retro global` runs across ALL projects and AI tools (Claude Code, Codex, Gemini). History tracked for trend analysis. | Git log |
| `/learn` | Memory | Manages cross-session project learnings. Review, search, prune, export patterns, pitfalls, and preferences. Suggested when user wonders "didn't we fix this before?" | `~/.gstack/projects/` |

### Browser Tools

| Skill | What It Does | Tech |
|-------|-------------|------|
| `/browse` | Persistent headless Chromium daemon. Sub-second commands (~100ms after first call). ARIA-tree ref system (`@e1`, `@e2`). READ/WRITE/META command categories. Ring-buffer logging. Auto-restart on version change. | Playwright + Bun compiled binary (~58MB) |
| `/connect-chrome` | Launches your real Chrome as headed window controlled by gstack. Chrome extension with side panel shows live activity feed + chat sidebar for natural language instructions. "Co-presence" mode. | Playwright + Chrome extension |
| `/setup-browser-cookies` | Import cookies from real browser (Chrome, Arc, Brave, Edge) into headless session. macOS Keychain access with user approval. Cookies decrypted in-memory, never written to disk. | Bun SQLite, macOS Keychain |

### Safety / Power Tools

| Skill | What It Does |
|-------|-------------|
| `/careful` | Warns before destructive commands: rm -rf, DROP TABLE, force-push, git reset --hard. Common build cleanups whitelisted. Activated by saying "be careful." |
| `/freeze` | Locks file edits to one directory. Blocks Edit/Write outside boundary. Auto-applied by `/investigate`. |
| `/guard` | `/careful` + `/freeze` combined. Maximum safety for prod work. |
| `/unfreeze` | Remove `/freeze` boundary. |
| `/gstack-upgrade` | Self-updater. Detects global vs vendored install, syncs both, shows what changed. |

### Design Binary (`$D`)

A separate compiled binary (~58MB) using the GPT Image API for generating and comparing design mockups. Used internally by `/design-shotgun`, `/design-html`, `/design-consultation`. Requires a separate OpenAI API key.

---

## 3. Architecture Deep Dive: Persistent Browser Daemon

### How It Works

```
Claude Code → $B <command> → gstack CLI binary → POST /command localhost:PORT
                                                         ↓
                                               Bun.serve() HTTP server
                                                         ↓
                                               Playwright → Chromium (headless)
```

**Key design decisions:**
- **Long-lived daemon:** First call ~3s startup, subsequent calls ~100-200ms. Auto-shuts after 30 minutes idle.
- **Random port (10,000-60,000):** Zero config for 10+ parallel Conductor workspaces — no port conflicts.
- **Bearer token auth:** UUID per session, written to `.gstack/browse.json` (mode 0o600).
- **State file:** `{ pid, port, token, startedAt, binaryVersion }` — CLI reads this to find server.
- **Version auto-restart:** If binary version != running server version, CLI kills old server and starts new one. Eliminates stale-binary bugs entirely.
- **ARIA ref system:** `$B snapshot -i` walks ARIA tree, assigns `@e1`, `@e2` refs → Playwright Locators. No DOM mutation, so no CSP issues, no React/Vue hydration conflicts, no shadow DOM problems. Refs cleared on navigation; staleness detection via `count()` check before use.
- **Crash recovery:** Server exits immediately on Chromium disconnect. CLI auto-restarts on next command.
- **Logging:** Three ring buffers (50,000 entries each, O(1) push) for console, network, and dialog events. Async flush to disk every 1 second. HTTP handling never blocked by disk I/O.

### Why Bun (Not Node.js)
1. Compiled single binary (~58MB) — no node_modules at runtime
2. Native SQLite — no gyp, no native addon compilation (used for cookie decryption)
3. Native TypeScript — no compilation step in development
4. Built-in HTTP server (Bun.serve) — no framework overhead

### Security Model
- Localhost-only binding (not 0.0.0.0)
- Bearer token per session
- Cookie decryption in-memory only, never written to disk
- macOS Keychain access requires explicit user approval dialog
- Shell injection prevention: browser registry hardcoded, no user-input in path construction
- `/cookie-picker` UI and `/health` endpoint are token-exempt (localhost-only, non-executing)

---

## 4. The "Boil the Lake" Philosophy

Three core principles injected via `{{PREAMBLE}}` into every skill at build time:

**1. Boil the Lake:** AI-assisted coding makes completeness near-zero cost. A "lake" is achievable (100% tests, full implementation, all edge cases). An "ocean" is not (multi-quarter migration). Always boil lakes.

| Task | Human team | AI-assisted | Compression |
|------|-----------|-------------|-------------|
| Boilerplate | 2 days | 15 min | ~100x |
| Tests | 1 day | 15 min | ~50x |
| Feature | 1 week | 30 min | ~30x |
| Bug fix + test | 4 hours | 15 min | ~20x |
| Architecture | 2 days | 4 hours | ~5x |
| Research | 1 day | 3 hours | ~3x |

**2. Search Before Building:** Three layers of knowledge: tried-and-true (Layer 1), new-and-popular (Layer 2), first-principles (Layer 3). Prize Layer 3 — the "eureka moment" where conventional wisdom is provably wrong is the most valuable outcome. Search results are inputs to thinking, not answers.

**3. User Sovereignty:** AI recommends; users decide. Two models agreeing is signal, not mandate. The generation-verification loop is never skipped. Even when Claude and Codex both agree on a change — present the recommendation, explain why, state what context may be missing, and ask. Never act.

---

## 5. Sprint Workflow Mapping: gstack vs ADC Pipeline

### gstack Sprint Cycle
```
/office-hours → /plan-ceo-review → /plan-eng-review → [build] → /review → /qa → /ship → /retro
```

### ADC Pipeline
```
/plan-feature → /implement-feature (parallel agent teams in worktrees) → QA runner → merge
```

### Comparison Table

| Phase | gstack | ADC claude-workflow | Overlap | gstack Adds |
|-------|--------|---------------------|---------|-------------|
| **Product thinking** | `/office-hours` (forces questions, reframes) | None | None | Strategic product challenge before coding |
| **Scope review** | `/plan-ceo-review` (10-star product) | None | None | Ambition/reduction framing |
| **Technical planning** | `/plan-eng-review` (diagrams, state machines, test plan) | `/new-plan` (task decomposition) | Similar but different focus | ASCII diagrams, failure modes, test matrices |
| **Design planning** | `/plan-design-review` (interaction states, AI slop) | None | None | Pre-code design quality gate |
| **Automated planning** | `/autoplan` (CEO+design+eng in one command) | None | None | Single-command full review pipeline |
| **Implementation** | Claude Code native (serial) | `/agent-team` (parallel worktrees) | Both use Claude | ADC has parallel agents; gstack is serial depth |
| **Code review** | `/review` (SQL safety, trust boundaries) | None | None | Production bug detection layer |
| **Debugging** | `/investigate` (root cause, 4-phase, auto-freeze) | None | None | Systematic investigation protocol |
| **QA testing** | `/qa` (real browser, fix+verify+regression test) | QA runner (AI agent, no browser) | Both test code | gstack uses real Playwright browser |
| **Security audit** | `/cso` (OWASP+STRIDE, infra-first) | None | None | Full security audit capability |
| **Performance** | `/benchmark` (Core Web Vitals, before/after) | None | None | Perf regression detection |
| **Shipping** | `/ship` (test+bump version+coverage audit+PR) | Branch + PR workflow | Partial overlap | Test bootstrap, coverage audit, doc updates |
| **Post-deploy** | `/land-and-deploy`, `/canary` | Merge via merge-service | Similar | Production health verification |
| **Documentation** | `/document-release` (auto-updates all docs) | `npm run check:docs` | Partial | Proactive update vs. check-only |
| **Retrospectives** | `/retro` (per-person, trends, global) | None | None | Cross-session learning |
| **Memory** | `/learn` (project-specific patterns, cross-session) | CLAUDE.md + agent docs | Different approach | Queryable pattern library |
| **Multi-AI review** | `/codex` (OpenAI second opinion) | None | None | Cross-model validation |
| **Browser testing** | `/browse`, `/connect-chrome` | None | None | Real browser automation |
| **Design pipeline** | 4 design skills | None | None | Complete visual design pipeline |
| **Safety guardrails** | `/careful`, `/freeze`, `/guard` | Hook-based safety | Partial | Interactive safety warnings |

### Key Insight: They Are Complementary, Not Competing

ADC's `/agent-team` strength is **parallel execution** — spawning multiple specialized agents in worktrees working simultaneously on different tasks. gstack's strength is **serial depth** — one specialist at a time with deep, opinionated methodology.

ADC has no strategic product layer, no real browser QA, no security audit, no design pipeline, no retrospectives, no cross-model review.

gstack has no parallel execution, no worktree management, no agent coordination.

---

## 6. Top 10 Skills Ranked by ADC Relevance

### Tier 1: Immediate High Value

**1. `/qa` — Real Browser QA (Priority: CRITICAL)**
ADC is an Electron app with a complex UI: agent panels, layout modes, drag-and-drop, IPC-driven state changes. Real browser testing via Playwright catches visual bugs and interaction failures that AI text analysis cannot. The Electron renderer runs Chromium — Playwright can connect directly to it during `npm run dev`.
ADC fit: Test all agent chat panels, layout mode switching (Single/2-Column/3-Column/Grid/Multi-Project), keyboard shortcuts, terminal fallback panels.

**2. `/review` — Staff Engineer Pre-Landing Review (Priority: HIGH)**
ADC has strict ESLint zero-tolerance, complex IPC contracts, TypeScript strict mode, and architectural patterns that must not drift. `/review` specifically checks SQL safety, LLM trust boundary violations, conditional side effects — exactly the categories where multi-agent PR work introduces subtle bugs. Smart routing skips infra changes for CEO review.
ADC fit: Run before every agent-generated PR merge, especially after parallel agent-team work.

**3. `/cso` — Security Audit (Priority: HIGH)**
ADC spawns Claude processes with stream-json, watches `~/.claude/teams/` for agent configs, handles IPC between main/renderer. These are high-value attack surfaces. The `/cso` LLM/AI security audit category was built for exactly this use case — ADC IS AI infrastructure.
ADC fit: Monthly comprehensive scan. The "skill supply chain" scanning is directly relevant since ADC uses claude-workflow and will use gstack.

**4. `/retro` — Engineering Retrospective (Priority: HIGH)**
ADC is a multi-session project with multiple agent contributors. `/retro global` runs across all Claude Code sessions and AI tools. Per-person breakdowns identify which agents/sessions are slipping quality. Trend tracking catches test health degradation before it becomes a crisis.
ADC fit: Weekly. The global mode spans ADC + all other projects.

### Tier 2: Strong Value

**5. `/learn` — Cross-Session Memory (Priority: MEDIUM-HIGH)**
ADC has complex architectural rules (DO NOT use terminal-service, DO NOT add PTY integrations) and known pitfalls. `/learn` maintains a queryable pattern library across sessions. When an agent asks "didn't we fix this before?", `/learn` surfaces the answer. Supplements CLAUDE.md for operational knowledge too ephemeral for docs.
ADC fit: Capture v2 refactor DO-NOT rules, IPC contract patterns, agent bootstrap gotchas.

**6. `/investigate` — Systematic Debugging (Priority: MEDIUM-HIGH)**
When ADC's coordination breaks (tmux bridges, session JSONL watchers, IPC handler chains), the Iron Law matters: no fixes without root cause. `/investigate` auto-freezes to the broken module, traces data flow, stops after 3 failed fixes. Prevents thrashing on complex distributed bugs.
ADC fit: Critical for debugging AgentManager, TmuxBridge, SessionJSONLReader where failure modes are non-obvious.

**7. `/plan-eng-review` — Engineering Plan Review (Priority: MEDIUM)**
ADC has complex data flows (3-layer architecture, two-session model, JSONL event streams). `/plan-eng-review` forces these into diagrams — sequence diagrams, state machines, data-flow diagrams, test matrices. The plan-to-QA artifact chain (test plan auto-picked up by `/qa`) is valuable for large features.
ADC fit: Run on Phase 1 (AgentManager) and Phase 2 (TmuxBridge) before implementation begins.

**8. `/document-release` — Auto Doc Updates (Priority: MEDIUM)**
ADC has a strict Documentation Update Mapping requirement — every code change must update ai-docs/, .claude/agents/, tracker.json. `/document-release` reads every doc, cross-references the diff, and updates what drifted. Automates the most friction-causing part of ADC's workflow. Currently ADC uses `npm run check:docs` which only checks; `/document-release` actually fixes.
ADC fit: After each feature branch merge to keep agent docs current and prevent stale agent output.

**9. `/ship` — PR Creation with Test + Coverage (Priority: MEDIUM)**
ADC's verification requirement (all 6 commands must pass) aligns well with `/ship`'s test-run-then-PR workflow. It bootstraps test frameworks and audits coverage — useful as new services get added in the v2 refactor.
Note: `/land-and-deploy` and `/canary` are not applicable (desktop app, not web deployment).

### Tier 3: Valuable But Context-Dependent

**10. `/codex` — Multi-AI Second Opinion (Priority: MEDIUM)**
Cross-model validation is especially valuable for architectural decisions and security-sensitive code. The adversarial challenge mode actively tries to break new code — good for IPC handler validation. When both Claude (`/review`) and Codex agree on a concern, confidence is higher.
Requirement: OpenAI Codex CLI installed separately.

### Not Recommended for ADC

- `/office-hours`, `/plan-ceo-review`: ADC has existing product direction and roadmap
- `/design-shotgun`, `/design-html`: Require GPT Image API (OpenAI); ADC has existing Tailwind v4 design system
- `/canary`, `/land-and-deploy`, `/setup-deploy`: Web deployment assumed; ADC is a desktop app
- `/benchmark`: Core Web Vitals are web metrics; less applicable to Electron (bundle size audit still useful)

---

## 7. Integration Path: Installing gstack for ADC

### Current State
gstack is already installed at `/Users/parker/Desktop/ES3/gpMS_ConsoleFrontend/.claude/skills/gstack/`. It has NOT been installed in ADC (`/Users/parker/Desktop/Agentic-Desktop-Command`).

### Option A: User-Global Install (Recommended Starting Point)
Install once, available in all projects immediately:
```bash
# If not yet installed globally:
git clone --single-branch --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack
cd ~/.claude/skills/gstack && ./setup

# If already installed globally (as on this machine via gpMS), just upgrade:
cd ~/.claude/skills/gstack && ./setup
```

### Option B: Vendor Into ADC Repo (Recommended for Agent Worktrees)
Copy into the project so all agent worktrees get it automatically. Since ADC worktrees share the full repo content, vendored skills are available to all agents without extra configuration.
```bash
cp -Rf ~/.claude/skills/gstack /Users/parker/Desktop/Agentic-Desktop-Command/.claude/skills/gstack
rm -rf /Users/parker/Desktop/Agentic-Desktop-Command/.claude/skills/gstack/.git
cd /Users/parker/Desktop/Agentic-Desktop-Command/.claude/skills/gstack && ./setup
```
Note: Do NOT commit `browse/dist/` and `design/dist/` — these are platform-specific compiled binaries (~58MB each). Add them to `.gitignore` if not already there.

### Requirements
- **Claude Code** — already installed
- **Git** — already installed
- **Bun v1.0+** — check: `bun --version`. Install via: https://bun.sh
- **Node.js** — Windows only, not needed on macOS
- **OpenAI Codex CLI** — only for `/codex` skill. Optional.

### Post-Install: CLAUDE.md Addition for ADC
Add a `## gstack` section to ADC's `CLAUDE.md`:
```markdown
## gstack
Use /browse from gstack for all web browsing. Never use mcp__claude-in-chrome__* tools.
Available skills: /office-hours, /plan-ceo-review, /plan-eng-review, /plan-design-review,
/design-consultation, /design-shotgun, /design-html, /review, /ship, /land-and-deploy,
/canary, /benchmark, /browse, /connect-chrome, /qa, /qa-only, /design-review,
/setup-browser-cookies, /setup-deploy, /retro, /investigate, /document-release, /codex,
/cso, /autoplan, /careful, /freeze, /guard, /unfreeze, /gstack-upgrade, /learn.
If gstack skills are not working: cd .claude/skills/gstack && ./setup
```

### Verify Installation
In Claude Code, type `/qa` — if the skill loads, installation is successful.

### Telemetry
Opt-in only. Disable permanently: `gstack-config set telemetry off`

---

## 8. Community Sentiment

### GitHub Reception
- **59.5k stars, 7.8k forks** — exceptionally high adoption for a Claude Code plugin
- Described as "spreading so fast" by multiple publications (Junia.ai, SitePoint, MindStudio)
- Product Hunt listing with active community discussion

### Hacker News Discussion (item #47355173)
**Praise:**
- "Dramatically improved code quality and speed"
- Role decomposition praised as genuinely novel — not just different prompts but a workflow philosophy
- `/qa` specifically called out as the "massive unlock" for parallel work

**Criticisms:**
- **Copy-paste model buckles at scale:** Different repos needing divergent review processes create maintenance burden when gstack is vendored per-project
- **Telemetry concern:** Some users questioned if YC gets signal on what people are building. (Opt-in, schema is public in `supabase/migrations/`, one-command disable: `gstack-config set telemetry off`)
- **Agent loop risk:** Real incident — agent stuck 70 minutes "repeatedly injecting a staging URL into a production config." Recommended K9 Audit as safety layer alongside gstack.

### Framework Landscape Comparison
- **gstack:** Structure-focused, sprint workflow, opinionated methodology. Most widely adopted.
- **Superpowers:** Capability enhancement, plugin-style external service integrations.
- **Hermes Agent:** Autonomous orchestration, persistent memory, multi-agent coordination.

### Community Best Practices
1. Use `/guard` when doing production work — prevents the "70-minute loop" class of incidents
2. `/qa`'s three tiers (Quick/Standard/Exhaustive) let you calibrate cost vs. coverage
3. `/retro global` across multiple Claude Code sessions is uniquely valuable for pattern detection
4. The proactive skill suggestion system can be disabled with "stop suggesting" if intrusive
5. K9 Audit as a complementary auditing layer for additional safety constraints on long-running agents

---

## 9. Technical Details Relevant to ADC Integration

### SKILL.md Template System
gstack generates SKILL.md from `.tmpl` templates at build time using Bun. Placeholders (`{{PREAMBLE}}`, `{{QA_METHODOLOGY}}`, `{{REVIEW_DASHBOARD}}`) are filled from source code metadata. Every skill starts with the same preamble injecting the builder ethos, session tracking, and AskUserQuestion format. This is structurally analogous to ADC's generated CLAUDE.md worktree bootstrapping — both projects use build-time context injection.

### Platform-Agnostic Design
Skills never hardcode framework-specific commands. They read `CLAUDE.md` for project config (test commands, deploy commands), ask if missing, and persist the answer. This means gstack works correctly with ADC's specific commands (`npm run verify`, `npm run lint`, etc.) without modification.

### Parallel Sprints via Conductor
Garry runs 10-15 parallel gstack sprints simultaneously using Conductor (conductor.build). Each in its own isolated workspace. The sprint structure is what makes parallelism manageable — each agent knows its phase boundary. This is directly complementary to ADC's agent-team approach using git worktrees.

### Review Readiness Dashboard
After each plan review, a dashboard tracks gate status:
```
+====================================================================+
|                    REVIEW READINESS DASHBOARD                       |
+====================================================================+
| Review          | Runs | Last Run            | Status    | Required |
|-----------------|------|---------------------|-----------|----------|
| Eng Review      |  1   | 2026-03-16 15:00    | CLEAR     | YES      |
| CEO Review      |  1   | 2026-03-16 14:30    | CLEAR     | no       |
| Design Review   |  0   | —                   | —         | no       |
+====================================================================+
```
Eng Review is the only required gate. This could integrate with ADC's tracker.json workflow — a clear Eng Review before `/agent-team` execution.

### Preamble Injection
Every skill runs a bash block before its own logic:
1. Checks for gstack updates
2. Counts active sessions (files modified in last 2 hours) — if 3+, enters "ELI16 mode" (extra context re-grounding per question)
3. Loads contributor mode if enabled
4. Establishes consistent AskUserQuestion format (context + question + RECOMMENDATION + lettered options)
5. Injects "Search Before Building" philosophy

---

## 10. Gaps and Limitations

1. **Web-centric QA assumptions:** `/qa` and `/benchmark` assume a URL-accessible app. Electron requires pointing the browse daemon at `http://localhost:<dev-port>` during `npm run dev`. Needs testing to confirm Playwright connects correctly to Electron's renderer. The `vite` dev server in ADC runs at a localhost port — this should work but requires verification.

2. **Design binary requires GPT Image API:** `/design-shotgun`, `/design-html` use OpenAI's image API (not Claude). Extra API key and cost. Not needed for the high-value skills (qa, review, cso, retro, investigate).

3. **No deployment skills for desktop apps:** `/land-and-deploy`, `/canary`, `/setup-deploy` assume a web deployment pipeline. Skip these for ADC.

4. **Vendored binary size:** `browse/dist/browse` and `design/dist/design` are ~58MB each, Mach-O arm64 only (macOS Apple Silicon). They must be excluded from git (`git rm --cached` if accidentally committed). The `./setup` script builds from source for every platform.

5. **Bun required:** ADC agents must have Bun installed on the machine running them. Check: `bun --version`.

6. **No Jira/project management integration:** ADC uses tracker.json. gstack's `/retro` reads git log only. No sprint-planning equivalent in gstack (that exists in claude-workflow as `/start-sprint`).

7. **Copy-paste model for worktrees:** Each worktree agent that needs gstack must be able to find the skills directory. Vendoring into `.claude/skills/gstack/` (Option B) resolves this since worktrees share the full repo.

---

## 11. Quick Reference: ADC Integration Priority

| Skill | ADC Priority | Blocker | Notes |
|-------|-------------|---------|-------|
| `/qa` | CRITICAL | Confirm Playwright connects to Electron renderer | Real browser testing of agent UI panels |
| `/review` | HIGH | None | Run on all agent-generated PRs |
| `/cso` | HIGH | None | Monthly; LLM/AI security category directly relevant |
| `/retro` | HIGH | None | Weekly; global mode spans all projects |
| `/learn` | MEDIUM-HIGH | None | Capture v2 refactor rules and gotchas |
| `/investigate` | MEDIUM-HIGH | None | For AgentManager/TmuxBridge debugging |
| `/plan-eng-review` | MEDIUM | None | Before Phase 1-2 implementation |
| `/document-release` | MEDIUM | None | After each feature merge |
| `/ship` | MEDIUM | None | Replace manual PR creation flow |
| `/codex` | MEDIUM | Requires Codex CLI | Security-critical IPC handler changes |
| `/careful` / `/guard` | LOW | None | Use during production work |
| `/design-review` | LOW | None | Optional for AgentChatPanel UI visual audit |
| `/design-consultation` | SKIP | Tailwind v4 system exists | |
| `/land-and-deploy` | SKIP | Not a web deployment | |
| `/canary` | SKIP | Not a web deployment | |
| `/benchmark` | SKIP | Web metrics not applicable | |
