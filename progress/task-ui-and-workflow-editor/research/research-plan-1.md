# Task UI Polish + Workflow Editor — Research Plan

## Part 1: Task Expanded Row — Sticky Footer + Inline Actions

### Sticky Footer

Each expanded task row needs a sticky footer pinned to the bottom of the scroll container. Design reference: copy the assistant widget's quick-button row under its input field.

**Visual spec:**
- Darker background (`bg-muted` or similar) with a matching top border
- Uses text + icon buttons at `xs` or `sm` size
- Stays visible while scrolling the tab content above it

**Footer content — always visible regardless of active tab:**

| Element | Details |
|---------|---------|
| Info counts | `Information Docs: 2`, `Plans Created: 1` (derived from directory contents) |
| PR status | `Pull Request: N/A` or live badge with status (draft/open/merged/closed) |
| Link Ticket button | Opens Jira link dialog or shows linked ticket |
| Link PR button | Opens PR link dialog or shows linked PR |
| Run Workflow button | Triggers full pipeline (same as current top-bar button) |
| Archive button | Archives the task |
| All tab action buttons | Research/Plan/Execute dropdown buttons always accessible |

### Table Row Inline Actions

The main task grid table row (not expanded) should have two small icon-button columns on the far right:

| Column | Icon | Action |
|--------|------|--------|
| Run Workflow | Play icon | Triggers `runWorkflow(slug)` |
| Archive | Archive/Trash icon | Triggers `archiveTask(slug)` |

These should be narrow columns (~40px each) with icon-only buttons.

### Side Note — Future: Per-Project GitHub + Jira Tracking

A future task will add a per-project GitHub and Jira tracking service to the store system. This service will:
- Request updates at smart intervals (or use polling/feed)
- Provide in-app live updates and notifications for PR status, ticket transitions, etc.
- Replace the current manual "Link Ticket" / "Link PR" approach with auto-detected associations

This is out of scope for this task but informs the footer design — PR/ticket badges should be designed to accept live data when available.

---

## Part 2: Tools View — Workflow Editor

### Overview

Make the existing "Tools" feature view interactive with two tabs:

1. **Claude Config** — View/edit Claude Code configuration
2. **ADC Workflow** — Full workflow editor (the main deliverable)

### ADC Workflow Tab — Workflow Editor

A sectioned form for viewing, editing, and saving complete workflows. Each workflow defines the full pipeline:

```
Brainstorming → Planning → Implementation
```

#### Implementation Strategy Options (per workflow)

Each phase in the workflow has configurable execution strategy:

| Strategy | Description |
|----------|-------------|
| Sequential (1 session) | Single Claude terminal session executes step-by-step |
| 1 session + subagents | Primary session spawns subagents for parallelism |
| Team Lead handoff | Sends to in-app team-lead session using the agent harness with Claude Agent Teams, worktree isolation, QA agents |

#### Per-Phase Prompt + Generate

Each phase (brainstorming, planning, implementation) in the workflow form should have:

1. **Prompt field** — editable text area with the prompt/instructions for that phase
2. **Generate button** — sends the prompt to the assistant session using:
   - The correct Anthropic plugin for creating skills
   - Web search for the most recent information about the specific type of skill/command/functionality referenced in the prompt
3. **Result integration** — once the skill/command is created via generate, it auto-fills the options dropdown as the selected action for that step

#### Workflow Form Structure

```
Workflow: [Name]
Description: [...]

── Brainstorming Phase ──────────────────────
Strategy: [dropdown: skip | manual | /brainstorming skill | custom]
Prompt: [textarea - editable]
[Generate] button → sends to assistant → creates/selects skill

── Planning Phase ───────────────────────────
Strategy: [dropdown: skip | /new-plan | /deep-research + /new-plan | custom]
Prompt: [textarea - editable]
[Generate] button → sends to assistant → creates/selects skill

── Implementation Phase ─────────────────────
Strategy: [dropdown: sequential | subagents | team-lead | /agent-team | custom]
Prompt: [textarea - editable]
[Generate] button → sends to assistant → creates/selects skill

[Save Workflow] [Delete] [Duplicate]
```

#### Saved Workflows

Workflows are saved to disk (likely `progress/workflows/` or a dedicated config location). The task pipeline's "Run Workflow" dropdown should eventually list saved workflows as options.

---

## Research Questions

1. What does the assistant widget's quick-button row look like? (component path, styling, layout)
2. What @ui primitives are available for tabs in the Tools view?
3. How does the assistant session handle receiving prompts programmatically?
4. What plugin APIs exist for skill creation?
5. How should workflow configs be persisted (JSON? YAML frontmatter? Zustand store with disk sync?)
6. What existing Tools view components need to be modified vs created from scratch?
