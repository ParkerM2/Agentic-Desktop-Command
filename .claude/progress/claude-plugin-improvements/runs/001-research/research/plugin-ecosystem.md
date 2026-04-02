# Claude Code Plugin & Skill Ecosystem Survey

> Research completed 2026-03-30 | Agent: research | Task: plugin-ecosystem-research

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Community Registries Overview](#community-registries-overview)
3. [Tiered Recommendations](#tiered-recommendations)
4. [Token Monitoring Tools Comparison](#token-monitoring-tools-comparison)
5. [Skills vs MCPs Context Cost Analysis](#skills-vs-mcps-context-cost-analysis)
6. [Auto-Injected Context Warning](#auto-injected-context-warning)
7. [Current ADC Skills Audit](#current-adc-skills-audit)
8. [Top Skills by Category](#top-skills-by-category)
9. [Install Commands Reference](#install-commands-reference)

---

## Executive Summary

The Claude Code ecosystem has matured significantly. Three major "awesome" repositories track 400+ tools combined, plus the official Anthropic marketplace has 101 plugins (33 Anthropic-built + 68 partner). The landscape breaks into: **skills** (lightweight, on-demand, ~100 token scan cost), **plugins** (persistent, heavier), **hooks** (lifecycle scripts, zero token cost), **MCPs** (always-loaded tool listings, high context cost), and **companion apps** (external tools).

**Key findings:**
- Skills are dramatically more context-efficient than MCPs (~100 tokens metadata scan vs 200-500 tokens per MCP tool, loaded on every message)
- The user's concern about MCP context window bloat is well-founded and widely shared: a 5-server setup with 58 tools can consume ~55K tokens before a conversation starts; Jira MCP alone uses ~17K tokens
- Claude Code's context window is now 1M tokens (Opus 4.6 + Sonnet 4.6) with no price increase, which changes the calculus somewhat, but MCP overhead still competes with actual working context
- `ccusage` is the clear winner for token monitoring (11,500+ stars, tiny bundle, offline, comprehensive)
- **Auto-injected skills from claude.ai are a hidden cost**: 69 skills (43 from claude.ai + 26 Cowork plugins) silently added ~5,970 tokens per session with no opt-out as of early 2026. Monitor with `/context`.
- Several ADC skills are valuable (TanStack stack, frontend-developer); two are low-value for this project (SVG skills); `shadcn-ui` references Next.js 16 + Atlas conventions that don't match ADC
- The biggest productivity gains come from: usage monitoring, safety hooks, session memory, and code quality skills

---

## Community Registries Overview

### 1. awesome-claude-code-toolkit (rohitg00)
- **URL**: https://github.com/rohitg00/awesome-claude-code-toolkit
- **Scale**: 135 agents, 35 curated skills (+400K via SkillKit), 42 commands, 176+ plugins, 20 hooks, 15 rules, 7 templates, 13 MCP configs, 26 companion apps
- **Stars**: 978 | **Updated**: March 2026 | **License**: Apache 2.0
- **Install**: `/plugin marketplace add rohitg00/awesome-claude-code-toolkit` or `git clone https://github.com/rohitg00/awesome-claude-code-toolkit.git ~/.claude/plugins/claude-code-toolkit`
- **Top plugins by stars**: `everything-claude-code` (78,600+), `wshobson/agents` (31,300+), `vibe-kanban` (23,200+), `opcode` (21,000+), `claude-mem` (35,900+), `pro-workflow` (1,400+), `ccpm` (7,600+)
- **Assessment**: Largest single repo. Many plugins are in-repo stubs (single markdown files). Quality varies wildly. The curated external links are the real value. `SkillKit` (400K skills) is explicitly a security risk — arbitrary code execution from unvetted sources.

### 2. awesome-claude-code (hesreallyhim)
- **URL**: https://github.com/hesreallyhim/awesome-claude-code
- **Scale**: ~150 selectively curated entries across skills, workflows, tooling, hooks, slash-commands, CLAUDE.md files, and alternative clients
- **Assessment**: Higher quality bar than the toolkit repo. Each entry has editorial commentary. Best source for discovering well-engineered tools. Key subcategories: Usage Monitors (5 tools), Orchestrators (8+ tools), IDE Integrations, Config Managers, Status Lines (5 tools). **Standout entries**: Trail of Bits Security Skills, claudekit, SuperClaude, Claude Squad, ccusage, Claude-Code-Usage-Monitor, Bouncer, ccflare/better-ccflare.

### 3. awesome-claude-skills (travisvn)
- **URL**: https://github.com/travisvn/awesome-claude-skills
- **Scale**: 144+ skills (official Anthropic + community), 10.2K stars
- **Assessment**: Most focused on skills specifically. Best source for skill architecture details. Good breakdown of official Anthropic skills (document handling, design, development, communication) vs community skills. Documents the progressive disclosure model clearly.

### 4. claudemarketplaces.com
- **URL**: https://claudemarketplaces.com/
- **Scale**: 2,300+ agent skills, 770+ MCP servers, 95+ plugin marketplaces
- **Assessment**: Curates by install count + GitHub stars + community votes. Only "actively used" extensions listed. Good discovery surface but listing-level data only — click through to individual repos for quality assessment.

### 5. Official Anthropic Marketplace
- **Scale**: 101 plugins (33 Anthropic-built + 68 partner)
- **Notable Anthropic plugins**: code-review, security-guidance, test-writer-fixer, frontend-design, webapp-testing (Playwright), connect-apps (500+ SaaS), docx/pdf/pptx/xlsx document skills
- **Notable partner plugins**: GitHub, Playwright, Figma, Vercel, Linear, TypeScript LSP, Rust LSP

---

## Tiered Recommendations

### MUST-HAVE (Install immediately)

| Tool | Type | Why | Stars |
|------|------|-----|-------|
| **ccusage** | CLI tool | Best-in-class token/cost monitoring. Offline, fast, daily/monthly/session/billing-window reports. Cache token breakdown. JSON export. | 11,500+ |
| **obra/superpowers** | Skill collection | Battle-tested TDD, debugging, collaboration skills. `/brainstorm`, `/write-plan`, `/execute-plan`. Core competency library with 20+ skills. | High |
| **cc-safe-setup** | Hook installer | One command (`npx cc-safe-setup`) installs 6 essential safety hooks in 10 seconds. Prevents destructive commands, branch guards, syntax checking. | N/A |
| **claude-code-hooks** (yurukusa) | Hooks | 15 production-tested hooks from 160+ hours autonomous operation. Destructive command blocker, syntax check, context monitor. Bash, zero deps. | N/A |
| **cozempic** | Plugin | Context/token pruning — 13 pruning strategies, Agent Team protection, session guard. Zero false positives (atomic writes). Directly addresses context bloat. | N/A |
| **Trail of Bits Security Skills** | Skills | Professional security auditing: CodeQL, Semgrep, variant analysis, vulnerability detection. From a top security firm. | N/A |

### NICE-TO-HAVE (Install based on need)

| Tool | Type | Why | Stars |
|------|------|-----|-------|
| **Claude-Code-Usage-Monitor** | CLI tool | Real-time terminal monitoring with ML predictions (P90), burn rate, cost analytics. Visual complement to ccusage. | N/A |
| **ccflare / better-ccflare** | Web dashboard | Beautiful web UI for usage analytics, request-level tracking. Best for teams / visual dashboards. | N/A |
| **claude-devtools** | Desktop app | Session observability: turn-based context data, compaction visualization, subagent trees, notification triggers. | N/A |
| **claude-mem** | Plugin | Auto-captures session context, AI-compressed, injects relevant context into future sessions. SQLite + full-text search. | 35,900+ |
| **reporecall** | Plugin | Local codebase memory. Tree-sitter AST indexing (22 languages), hybrid search, ~5ms context injection. | N/A |
| **agnix** | Linter | Validates CLAUDE.md, AGENTS.md, SKILL.md, hooks, MCP configs. IDE plugins included. | N/A |
| **skills-janitor** | Plugin | Audit, deduplicate, check, fix, and track usage of skills. 9 slash commands, zero deps. | N/A |
| **Bouncer** | Plugin | Independent quality gate using Gemini to audit Claude Code output. Stop hook + audit skills. | N/A |
| **claude-scaffold** | CLI | `npx claude-scaffold init` deploys CLAUDE.md, hooks, and 18 domain skills to any repo. Cross-repo sync. | N/A |
| **Dippy** | Hook | Auto-approve safe bash commands via AST parsing, prompt for destructive ops. Reduces permission fatigue. | N/A |
| **Context Engineering Kit** (NeoLabHQ) | Skills | Advanced context engineering with minimal token footprint. | N/A |
| **everything-claude-code** | Collection | Comprehensive skills, instincts, memory, security. Agent harness performance optimization. | 78,600+ |
| **ccstatusline** / **claude-powerline** | Statusline | Token usage, git branch, model info in terminal status bar. Real-time cost visibility. Configured as hook. | N/A |
| **McPick** | CLI | Toggle MCP servers on/off before starting sessions. Prevents loading unused server tool listings. | N/A |
| **webapp-testing** (official) | Skill | Official Anthropic Playwright testing skill. Highly relevant for ADC E2E tests. | N/A |
| **TDD Guard** (nizos) | Hook | Blocks file changes violating TDD principles. | N/A |

### SKIP (Not worth the overhead)

| Tool | Why Skip |
|------|----------|
| **Most in-repo plugins from awesome-claude-code-toolkit** | Many are single-file stubs without real implementation. Quality varies wildly. |
| **Heavy MCP servers** (10+ tools each) | Each tool listing: ~200-500 tokens in EVERY message. A 20-tool server adds 4K-10K tokens constant overhead. |
| **claude-code-mcp** (steipete) | Runs Claude Code as MCP server inside another agent. Recursive context cost explosion. |
| **SkillKit marketplace** (400K skills) | Quantity over quality. Unvetted. Security risk from arbitrary code execution. |
| **loki-mode** | 37 AI agents across 6 swarms. Massive overhead, overkill for most projects. |
| **oh-my-claudecode** | 19 agents, 28 skills. Heavy footprint. Good ideas but too much for the context budget. |
| **lightcms** | 41 MCP tools. Context window destroyer (~8K-20K tokens/message). |
| **preflight** | 24-tool MCP server. Token cost enormous before first message. |
| **@ccusage/mcp** | MCP server that monitors MCP overhead. Ironic. Use CLI version instead. |
| **Sales plugins** (generic) | Inaccurate competitive intelligence in testing. |
| **Productivity plugins** (generic) | Redundant if you use Notion, Linear, or existing PM tools. |

---

## Token Monitoring Tools Comparison

### Built-in Claude Code Commands

| Command | What It Shows | Limitations |
|---------|---------------|-------------|
| `/cost` | Session cost estimate, model breakdown, total tokens | No historical data, resets each session. Not relevant for Max/Pro subscribers (subscription-included usage) |
| `/context` | Current context window breakdown by category (tool listings, files, conversation, etc.) | Snapshot only, no tracking over time. **Best for identifying context bloat sources** |
| `/stats` | Session statistics (messages, tool calls, duration) | No cost data, no historical trends |
| `/clear` | Clears conversation context | Frees token budget; use between unrelated tasks |
| `/compact` | Summarizes context, keeping key information | Recommended at 70% capacity |

### External Tools

| Tool | Install | Output | Features | Accuracy | Overhead | Best For |
|------|---------|--------|----------|----------|----------|----------|
| **ccusage** | `npx ccusage@latest` | Terminal tables | Daily, monthly, session, 5hr billing windows, model breakdown, JSON export, project filtering, compact mode, cache token tracking, offline mode | High (reads JSONL directly, no API calls) | Ultra-small bundle | Daily cost tracking, billing window awareness, script integration |
| **Claude-Code-Usage-Monitor** | `uv tool install claude-monitor` | Rich terminal UI | Real-time monitoring, ML predictions (P90), burn rate, progress bars, multi-plan support (Pro/Max5/Max20/Custom), cost analytics, Sentry integration | High (ML-enhanced, auto-detects plan) | Python process, ~50MB | Live monitoring during sessions, burn rate alerts, limit prediction |
| **tokscale** | `npx tokscale@latest` | Interactive TUI | **Multi-platform** (16+ agents: Claude Code, Cursor, Gemini, Codex, AmpCode, Kimi, etc.), Rust core (10x faster), 9 color themes, 4 views, contribution graph, global leaderboard, JSON export | High | Small (npx, native binaries) | Multi-platform tracking, competitive leaderboard, visual graphs |
| **ccflare / better-ccflare** | `git clone + bun install` | Web dashboard | Request-level analytics, load balancing across accounts, latency tracking, rate limit detection, interactive TUI, REST API | Very high (proxy-level) | Proxy server (Bun), SQLite | Teams, API proxy users, detailed request logging |
| **onWatch** | Go binary | Web dashboard (Material Design 3) | 7 providers, background daemon (<50MB RAM), zero telemetry | Good | Background daemon | Multi-provider tracking |
| **ccstatusline** / **claude-powerline** | Config in settings.json | Terminal statusline | Real-time token/cost display in Claude Code status bar | Varies | Negligible (hook-based) | Passive always-visible monitoring |
| **Claude Token Monitor** | VS Code extension | VS Code panel | In-editor token usage display | Varies | VS Code extension | IDE-integrated monitoring |

### Recommendation

1. **Primary**: `npx ccusage@latest` — run daily/weekly for cost reports and billing window analysis
2. **Secondary**: `claude-monitor` (Claude-Code-Usage-Monitor) — run alongside active sessions for real-time burn rate and limit prediction
3. **Passive**: Configure ccstatusline or ccusage's `statusline` subcommand for always-visible token tracking in status bar
4. **Multi-platform**: `npx tokscale@latest` if you use multiple AI coding agents (Cursor, Gemini, etc.) and want unified tracking
5. **Skip**: ccflare unless you need multi-account load balancing or team-level analytics

---

## Skills vs MCPs Context Cost Analysis

### How Skills Load (Progressive Disclosure)

```
Step 1: Metadata scan     ~100 tokens per skill (name + description from SKILL.md frontmatter)
Step 2: Full activation   1,000-5,000 tokens (full SKILL.md instructions, only when relevant)
Step 3: Resources         Variable (bundled reference files load only as needed)
Step 4: Scripts           Zero tokens (script code never enters context; only output does)
```

**Total cost when NOT active**: ~100 tokens per installed skill (metadata only)
**Total cost when active**: 1,000-5,000 tokens (one-time load per conversation)

### How MCPs Load (Always-On by Default)

```
Every message: Each MCP tool listing is included in the system prompt
Per tool:      ~100-500 tokens (description, parameter schema, examples)
Per server:    tools × per-tool-cost
```

**Note**: Claude Code can defer MCP tool loading (lazy-loading) when tool count would exceed 10% of context. When enabled, only tool names enter context until first use. But this is not universal and depends on server configuration.

**Example MCP overhead per message:**

| MCP Server | Tools | Estimated Tokens/Message |
|------------|-------|------------------------|
| Figma (current in ADC) | 17 tools | ~1,700-8,500 |
| Jira MCP (sooperset) | ~35 tools | ~17,000 (measured) |
| lightcms | 41 tools | ~8,200-20,500 |
| preflight | 24 tools | ~4,800-12,000 |
| filesystem MCP | ~10 tools | ~1,000-5,000 |
| mcp-omnisearch (before optimization) | 20 tools | 14,214 (measured) |
| mcp-omnisearch (after optimization) | 8 tools | 5,663 (measured) — 60% reduction |

**Real-world 5-server setup**: 58 tools ≈ 55,000 tokens before conversation starts. Add Jira → ~72,000+ tokens overhead per message.

### Cost Comparison Over a 50-Message Conversation

| Approach | One Skill (5K tokens) | One MCP (10 tools, ~3K/msg) |
|----------|----------------------|----------------------------|
| Metadata overhead | 100 tokens × 50 msgs = 5,000 | N/A |
| Active load | 5,000 (once) | N/A |
| Per-message overhead | 0 (after load) | 3,000 × 50 = 150,000 |
| **Total** | **~10,000 tokens** | **~150,000 tokens** |

**Skills are ~15× more context-efficient than MCPs for equivalent functionality.**

### 1M Context Window Caveat

Claude Code with Opus 4.6 and Sonnet 4.6 now has a 1M token context window at no additional per-token cost. This changes the urgency: 55K tokens of MCP overhead is 5.5% of 1M rather than 27.5% of 200K. However:
- MCP overhead still degrades actual working context quality (more noise per message)
- Cost for API users scales with tokens even if per-token rate is the same
- Context compression activates more frequently with bloated contexts
- The quality of reasoning degrades with noise, regardless of window size

### Best Practices for Minimizing MCP Footprint

1. **Prefer skills over MCPs** when functionality can be delivered as instructions + scripts
2. **Limit MCP tool count**: If a server has 20+ tools, check whether you actually use more than 5
3. **Use MCP only for live data access**: Database queries, API calls, real-time file watching — things skills cannot do
4. **Disable unused MCP servers**: Every connected MCP server adds tokens to EVERY message
5. **Use McPick**: CLI tool to toggle MCP servers on/off before starting sessions
6. **Optimize server descriptions**: Consolidating 20 verbose tools → 8 concise tools can save 8,500 tokens/message (measured example above)
7. **Audit regularly**: Use `skills-janitor` to find unused skills; review MCP configs with `/context` quarterly

### Current ADC MCP Assessment

ADC currently has the **Figma MCP** configured (17 tools, ~1,700-8,500 tokens per message). This is appropriate for design-heavy Electron app work but should be disabled when not actively doing Figma-to-code tasks. Use McPick or Claude Code's server toggle to deactivate when working on non-UI tasks.

---

## Auto-Injected Context Warning

A significant and poorly-documented issue: **claude.ai skills and Cowork plugins are silently injected into Claude Code context** with no opt-out (reported in anthropics/claude-code#39686, March 2026).

### Token Breakdown

| Source | Count | Tokens |
|--------|-------|--------|
| claude.ai Skills (43 skills) | 43 | ~3,950 |
| Cowork Plugins (26 skills) | 26 | ~2,020 |
| **Total auto-injected** | **69** | **~5,970** |

**Example injected content:**
```
anthropic-skills:loom           205 tokens
anthropic-skills:xlsx           241 tokens
anthropic-skills:docx           202 tokens
engineering:debug               69 tokens
engineering:system-design       69 tokens
productivity:memory-management  74 tokens
```

### Impact

- Consumes ~37% of the 16,000-token skill budget
- ~3% of the 200K context window (or <1% of the new 1M window)
- No opt-out mechanism as of March 2026

### Mitigation

1. Run `/context` at the start of each session to see actual breakdown
2. Set up ccstatusline to monitor baseline token cost
3. Monitor the GitHub issue for opt-out support
4. Minimize other sources of overhead to compensate (remove irrelevant skills, limit MCPs)

---

## Current ADC Skills Audit

### Installed Skills (10 total at `/Users/parker/Desktop/Agentic-Desktop-Command/.claude/skills/`)

| Skill | File Size | Est. Tokens | Relevance to ADC v2 | Verdict |
|-------|-----------|-------------|----------------------|---------|
| **tanstack-router** | 17.5KB | ~4,400 | **CRITICAL** — ADC uses TanStack Router 1.95 | KEEP |
| **tanstack-query** | 21.7KB | ~5,400 | **CRITICAL** — ADC uses React Query 5.62 | KEEP |
| **tanstack-table** | 15.5KB | ~3,900 | **HIGH** — Used for data display in ADC | KEEP |
| **tanstack-virtual** | 11KB | ~2,800 | **HIGH** — ADC plans react-arborist (virtualization); this covers underlying patterns | KEEP |
| **tanstack-form** | 10.2KB | ~2,500 | **MEDIUM** — ADC uses Zod 4, forms are less central to the app | KEEP (low cost) |
| **frontend-developer** | 7.4KB | ~1,900 | **HIGH** — Lightweight, useful React 19 / Next.js guidance | KEEP |
| **shadcn-ui** | 75.5KB | ~18,900 | **LOW-MEDIUM** — References "Next.js 16" and "Atlas-specific conventions". ADC uses **Radix UI + Tailwind v4 directly**, not shadcn. Highest-cost skill in the set. | REPLACE — Create ADC-specific `adc-design-system` skill instead |
| **create-frontend-ui** | 53.6KB | ~13,400 | **LOW-MEDIUM** — Generic "avoid AI slop" design philosophy. Large token cost relative to value. Not ADC-specific. | TRIM or REPLACE — Extract the 10 core principles into a ~2KB skill |
| **svg-logo-designer** | 22.2KB | ~5,600 | **NONE** — ADC is not a logo design tool | REMOVE |
| **svg-precision** | 9.7KB | ~2,400 | **NONE** — ADC has no SVG generation features | REMOVE |

### Recommendations

**Remove immediately (save ~8,000 tokens when active):**
```bash
rm -rf /Users/parker/Desktop/Agentic-Desktop-Command/.claude/skills/svg-logo-designer
rm -rf /Users/parker/Desktop/Agentic-Desktop-Command/.claude/skills/svg-precision
```

**Replace with ADC-specific alternatives:**
- `shadcn-ui` (75KB) → Custom `adc-design-system` skill documenting ADC's actual Tailwind v4 + Radix UI patterns, CSS custom properties, color-mix() usage, theme architecture. Would be ~5-8KB.
- `create-frontend-ui` (53KB) → Trim to the 10 essential anti-slop principles. ~2-3KB.

**Keep (essential to ADC v2 stack):**
- All 5 TanStack skills — directly match ADC's tech stack
- `frontend-developer` — lightweight, useful React 19 guidance

**Consider Adding:**
- Custom `adc-electron-ipc` skill — documents ADC's IPC contract patterns, domain folder structure, handler registration
- Custom `adc-agent-architecture` skill — v2 headless agent patterns, stream-json, JSONL parsing for new agents working on ADC
- `webapp-testing` (official Anthropic skill) — Playwright patterns, highly relevant for ADC E2E tests

### Token Budget Impact

| Scenario | Current | After Cleanup | After Full Optimization |
|----------|---------|---------------|------------------------|
| All skills metadata scan | ~1,000 tokens | ~800 tokens | ~700 tokens |
| All skills fully loaded | ~61,200 tokens | ~37,400 tokens | ~22,000 tokens |
| Realistic (3-4 active) | ~25,000 tokens | ~15,000 tokens | ~10,000 tokens |

---

## Top Skills by Category

### Code Quality / Review

| Skill/Tool | Source | Install | Notes |
|------------|--------|---------|-------|
| **Trail of Bits Security Skills** | https://github.com/trailofbits/skills | `git clone https://github.com/trailofbits/skills.git ~/.claude/skills/trailofbits-security` | CodeQL, Semgrep, variant analysis. Professional-grade. |
| **code-review** (official) | Anthropic marketplace | `/plugin marketplace add anthropics/code-review` | 4 parallel review agents, 80+ confidence threshold scoring. |
| **Bouncer** | https://github.com/buildingopen/bouncer | Plugin install | Independent quality gate using Gemini to audit Claude Code output. Stop hook + audit skills. |

### Testing / QA

| Skill/Tool | Source | Install | Notes |
|------------|--------|---------|-------|
| **webapp-testing** | Anthropic official | `/plugin marketplace add anthropics/webapp-testing` | Playwright-based UI testing. Highly relevant for ADC. |
| **test-writer-fixer** | Anthropic official | `/plugin marketplace add anthropics/test-writer-fixer` | Auto-writes and fixes unit tests. Jest, Vitest, Pytest support. |
| **TDD Guard** | https://github.com/nizos/tdd-guard | Hook | Blocks file changes violating TDD principles. |

### Token Optimization / Monitoring

| Skill/Tool | Source | Install | Notes |
|------------|--------|---------|-------|
| **ccusage** | https://github.com/ryoppippi/ccusage | `npx ccusage@latest` | Best overall. See comparison table above. |
| **claude-monitor** | https://github.com/Maciek-roboblog/Claude-Code-Usage-Monitor | `uv tool install claude-monitor` | Real-time ML predictions. |
| **tokscale** | https://github.com/junhoyeo/tokscale | `npx tokscale@latest` | Multi-platform (16+ agents), Rust core, TUI + contribution graph. |
| **cozempic** | https://github.com/Ruya-AI/cozempic | `/plugin marketplace add Ruya-AI/cozempic` | 13 pruning strategies, context compression. |
| **McPick** | https://github.com/nicholasgasior/mcpick | `npx mcpick` | Toggle MCP servers on/off before sessions. |

### Project Management / Planning

| Skill/Tool | Source | Install | Notes |
|------------|--------|---------|-------|
| **obra/superpowers** | https://github.com/obra/superpowers | `/plugin marketplace add obra/superpowers-marketplace` | `/brainstorm`, `/write-plan`, `/execute-plan`. Core lifecycle skills. |
| **fractal** | https://github.com/rmolines/fractal | Plugin | Recursive decomposition, works riskiest piece first. |
| **ccpm** | https://github.com/automazeio/ccpm | Plugin | GitHub Issues + git worktrees for parallel agent execution. 7,600+ stars. |

### Documentation

| Skill/Tool | Source | Install | Notes |
|------------|--------|---------|-------|
| **docx/pdf/pptx/xlsx** | Anthropic official | Official skill install | Document manipulation. |
| **doc-forge** | awesome-claude-code-toolkit | In-repo plugin | Documentation generation, API docs, README maintenance. |
| **Codebase to Course** | hesreallyhim/awesome-claude-code | Clone | Transforms codebases into interactive HTML courses. |

### Security / Safety

| Skill/Tool | Source | Install | Notes |
|------------|--------|---------|-------|
| **Trail of Bits Security Skills** | https://github.com/trailofbits/skills | Clone | Professional security auditing. Must-have for ADC. |
| **cc-safe-setup** | https://github.com/yurukusa/cc-safe-setup | `npx cc-safe-setup` | 6 essential safety hooks in 10 seconds. |
| **security-guidance** | Anthropic official | `/plugin marketplace add anthropics/security-guidance` | Official OWASP Top 10:2025 guidance, ASVS 5.0, 20+ languages. |
| **Prism Scanner** | https://github.com/aidongise-cell/prism-scanner | `pip install prism-scanner` | Skill/plugin/MCP security scanner, 39+ rules, A-F grading. |
| **parry** | https://github.com/vaporif/parry | Hook | Prompt injection scanner for tool inputs/outputs. |

### Design / UI

| Skill/Tool | Source | Install | Notes |
|------------|--------|---------|-------|
| **frontend-design** (official) | Anthropic official | Official skill | Anti-"AI slop" design guidance. Lighter than `create-frontend-ui`. |
| **Custom `adc-design-system`** | Create locally | n/a | Recommended: replace shadcn-ui with ADC-specific Tailwind v4 + Radix patterns. |

### Deployment / Shipping

| Skill/Tool | Source | Install | Notes |
|------------|--------|---------|-------|
| **deploy-pilot** | awesome-claude-code-toolkit | In-repo plugin | Dockerfile generation, CI/CD, IaC. |
| **Shipyard** | composio.dev | See README | IaC validation (Terraform, Ansible, Docker, K8s), security auditing. |

---

## Install Commands Reference

### Must-Have Tools

```bash
# ccusage — token monitoring (run anytime, no install needed)
npx ccusage@latest
npx ccusage@latest daily --breakdown
npx ccusage@latest monthly
npx ccusage@latest session
npx ccusage@latest blocks  # 5-hour billing windows

# cc-safe-setup — safety hooks (run once per project)
npx cc-safe-setup

# obra/superpowers — core skills
/plugin marketplace add obra/superpowers-marketplace

# cozempic — context pruning
/plugin marketplace add Ruya-AI/cozempic

# Trail of Bits security skills
git clone https://github.com/trailofbits/skills.git ~/.claude/skills/trailofbits-security
```

### Nice-to-Have Tools

```bash
# Claude-Code-Usage-Monitor (real-time monitoring)
uv tool install claude-monitor
# or: pip install claude-monitor
claude-monitor  # or: cmonitor, ccmonitor

# tokscale (multi-platform tracking + TUI)
npx tokscale@latest
npx tokscale@latest --light  # table-only mode

# better-ccflare (web dashboard for teams)
git clone https://github.com/tombii/better-ccflare.git
cd better-ccflare && bun install && bun run ccflare

# webapp-testing (official Playwright skill)
/plugin marketplace add anthropics/webapp-testing

# test-writer-fixer (official test generation)
/plugin marketplace add anthropics/test-writer-fixer

# security-guidance (official OWASP skill)
/plugin marketplace add anthropics/security-guidance

# agnix (agent file linter)
# See: https://github.com/agent-sh/agnix

# skills-janitor (skill audit/cleanup)
# See: https://github.com/khendzel/skills-janitor

# claude-scaffold (project bootstrapping)
npx claude-scaffold init
```

### ADC Skills Cleanup

```bash
# Remove zero-value skills (saves ~8K tokens when loaded)
rm -rf /Users/parker/Desktop/Agentic-Desktop-Command/.claude/skills/svg-logo-designer
rm -rf /Users/parker/Desktop/Agentic-Desktop-Command/.claude/skills/svg-precision

# After creating replacements, consider removing:
# .claude/skills/shadcn-ui (75KB, Next.js 16 / Atlas conventions — not ADC)
# .claude/skills/create-frontend-ui (53KB, generic — replace with trimmed version)
```

### Monitoring Workflow

```bash
# Start of day — check yesterday's usage
npx ccusage@latest daily

# Before heavy agent work — check billing window
npx ccusage@latest blocks

# During sessions — check context breakdown
/context

# Real-time monitoring during long sessions
claude-monitor  # in separate terminal

# Monthly review
npx ccusage@latest monthly --breakdown
```

---

## Sources

- https://github.com/rohitg00/awesome-claude-code-toolkit (README, March 2026)
- https://github.com/hesreallyhim/awesome-claude-code (README, March 2026)
- https://github.com/travisvn/awesome-claude-skills (README, Feb 2026)
- https://github.com/ryoppippi/ccusage (README + ccusage.com)
- https://github.com/Maciek-roboblog/Claude-Code-Usage-Monitor (README)
- https://github.com/junhoyeo/tokscale (README)
- https://github.com/snipeship/ccflare (README)
- https://github.com/tombii/better-ccflare
- https://github.com/trailofbits/skills
- https://github.com/obra/superpowers
- https://github.com/Ruya-AI/cozempic
- https://github.com/yurukusa/cc-safe-setup
- https://github.com/yurukusa/claude-code-hooks
- https://github.com/khendzel/skills-janitor
- https://github.com/buildingopen/bouncer
- https://github.com/agent-sh/agnix
- https://github.com/matt1398/claude-devtools
- https://github.com/anthropics/skills (official Anthropic skills repo)
- https://github.com/anthropics/claude-code/issues/39686 (auto-injected skills token cost issue)
- https://claudemarketplaces.com/ (marketplace directory)
- https://composio.dev/content/top-claude-code-plugins (top 10 review)
- https://buildtolaunch.substack.com/p/best-claude-code-plugins-tested-review (tested review)
- https://scottspence.com/posts/optimising-mcp-server-context-usage-in-claude-code (MCP optimization)
- https://dev.to/jimquote/claude-skills-vs-mcp-complete-guide-to-token-efficient-ai-agent-architecture-4mkf (skills vs MCP analysis)
- https://dev.to/kuldeep_paul/best-ways-to-monitor-claude-code-token-usage-and-costs-in-2026-5j3 (monitoring guide)
- https://claudefa.st/blog/guide/mechanics/1m-context-ga (1M context window announcement)
