# Documentation Sync Pass

> Tracker Key: `docs-sync` | Status: **DRAFT** | Priority: **P0** | Created: 2026-02-26

---

## Problem

The `ai-docs/` directory has fallen behind the actual codebase. An audit found **47 discrepancies** across service counts, feature listings, handler documentation, IPC domains, and patterns.

## Scope

### FEATURES-INDEX.md — Stale Counts & Missing Entries

| Item | Documented | Actual | Delta |
|------|-----------|--------|-------|
| Renderer Features | 29 | 31 | +2 missing (communications, workflow-pipeline) |
| Main Services | 33 | 35 | +2 missing |
| IPC Domains | 27 | 30 | +3 missing (docker, agents, +1) |
| Handler Files | 42 | ~48 | +6 missing (dashboard, docker, error, hotkey, mcp, tracker, window) |

**Missing services from table:** app, calendar, docker, health, ideas, insights, screen, terminal, time-parser, tracker, workflow (11 total)

**Missing features from table:** communications, health, workflow-pipeline (3 undocumented + 8 with minimal docs)

### PATTERNS.md — Stale Sidebar Guidance

- "Adding a New Feature" section still says "add nav item to Sidebar.tsx"
- Should reference `shared-nav.ts` + the 16-layout system
- No mention of `LayoutWrapper.tsx` or `LAYOUT_MAP`

### ARCHITECTURE.md — Stale Counts & References

- Lists 32 services (actual: 35)
- Agent system references `AgentService` but primary is `agent-orchestrator`
- Terminal service path incorrect

### Agent Definitions (`.claude/agents/*.md`)

- Need audit against actual codebase for stale references
- New features (communications, health, workflow-pipeline) not reflected
- Sidebar layout changes need propagation to all UI-facing agents

## Tasks

1. **Update FEATURES-INDEX.md** — Add all missing services, features, handlers, IPC domains; fix counts
2. **Update PATTERNS.md** — Fix "Adding a Feature" section for new sidebar system; update primitive counts
3. **Update ARCHITECTURE.md** — Fix service count, agent system references, terminal path
4. **Audit agent definitions** — Check all `.claude/agents/*.md` files for stale references
5. **Update DATA-FLOW.md** — Add any missing data flows for new services
6. **Verify with `npm run check:docs`** — Ensure doc check passes

## Verification

- `npm run check:docs` passes
- All service/feature/handler counts in docs match reality
- No references to files that don't exist
- PATTERNS.md sidebar guidance matches current implementation
- Agent definitions reference current file paths and patterns

## Estimated Effort

~2 days with parallel agents (can split by doc file)
