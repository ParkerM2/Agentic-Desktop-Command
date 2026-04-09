# Task UI Polish + Workflow Editor — Design Spec

> Approved 2026-04-07. Agent-team parallelizable. Two independent parts.

## Part 1: Task Expanded Row Polish

### 1a. Sticky Footer

Relocate the existing action bar from the top of `ProgressTaskDetailRow` to a sticky footer pinned to the bottom of the expanded row scroll container.

**Layout:**

```
┌─────────────────────────────────────────────────────┐
│ [Research] [Plan] [Execute]  ← tab buttons (top)    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Tab content (scrollable, overflow-y-auto)          │
│                                                     │
├─────────────────────────────────────────────────────┤
│ Docs: 2 | Plans: 1 | PR: N/A   [Research ▾] [Plan ▾]│
│                        [Execute ▾] [Run Workflow ▸]  │
│              [Link Ticket] [Link PR] [Archive]       │
└─────────────────────────────────────────────────────┘
```

**Specifics:**

- `sticky bottom-0` inside the expanded row container
- `bg-muted` with `border-t` — matches assistant QuickActionChips aesthetic
- **Left side:** Info counts derived from task fields (`hasResearch`, `hasPlan`, `teamTaskCount`), PR status badge (from `prStatus`/`prUrl`)
- **Right side:** Per-tab ActionDropdowns (Research/Plan/Execute) always visible regardless of active tab, Run Workflow, Archive
- Button size: `xs` or `sm` with icons
- Link Ticket and Link PR buttons remain

**Structural change:** `ProgressTaskDetailRow.tsx` restructures from `[action bar] [tabs] [content]` to `[tabs] [scrollable content] [sticky footer]`. ActionDropdown buttons currently inside each tab section move to the footer.

**File:** `src/renderer/features/tasks/components/detail/ProgressTaskDetailRow.tsx` (721 lines)

### 1b. Inline Table Row Actions

Add two narrow icon-button columns to the far right of `ProgressTaskGrid`:

| Column | Width | Icon | Action |
|--------|-------|------|--------|
| Run Workflow | 40px | `Play` | `runWorkflow(slug)` via `useProgressContext()` |
| Archive | 40px | `Archive` | `archiveTask(slug)` via `useProgressContext()` |

- `variant="ghost" size="icon-xs"`
- Reference existing `ActionsCell.tsx` for similar logic patterns
- Disabled states: Run disabled if action is active, Archive disabled if action is active

**File:** `src/renderer/features/tasks/components/grid/ProgressTaskGrid.tsx` (749 lines)

### 1c. ContentBlock Preview Styling

The `ContentBlock` component currently has two modes:

- **Preview:** Truncated to 200 chars, line-clamped to 3 lines, plain text
- **Full:** Expanded with styled markdown (syntax highlighting, tables)

**Problem:** Preview doesn't use styled markdown rendering — shows raw/unstyled text.

**Fix:**

1. Add support for a `<!-- summary -->...<!-- /summary -->` block convention
2. Preview parser extracts the summary block if present and renders it with full markdown styling (same components as the full view)
3. Summary block contains: a synopsis paragraph (max ~300 chars) + a key-facts table
4. If no summary block found, fall back to current truncation behavior (but now with markdown styling applied, just clamped)
5. "View full" button expands to the complete document

**Summary block format:**

```markdown
<!-- summary -->
## Summary
One-paragraph synopsis of findings/plan.

| Key | Value |
|-----|-------|
| Approach | Extend existing service |
| Risk | Low |
| Estimate | 2 tasks |

<!-- /summary -->
```

This ensures the preview always shows meaningful, well-formatted content instead of random opening lines.

---

## Part 2: Workflow Editor in Tools View

### 2a. Tools Page Restructure

Replace the current 5 placeholder cards in `ToolsPage.tsx` with a `PageHeader` compound component tabbed layout:

- **Claude Config tab** — renders the existing 5 tool cards (Skills, Commands, Agents, Plugins, Config) as-is, preserving them as a roadmap for future tool surfaces
- **ADC Workflow tab** — workflow editor (main deliverable)

Uses `PageHeader.Tabs`, `PageHeader.TabList`, `PageHeader.Tab`, `PageHeader.TabContent` per project patterns.

**File:** `src/renderer/features/tools/components/ToolsPage.tsx` (104 lines)

### 2b. Workflow Editor Form

Sidebar-list + detail-panel layout:

```
┌──────────────┬──────────────────────────────────────┐
│ Workflows    │ Workflow: Default Pipeline            │
│              │ Description: [textarea]               │
│ * Default    │                                       │
│   Fast Proto │ -- Brainstorming ───────────────────  │
│   Research   │ Strategy: [superpowers:brainstorming] │
│              │ Prompt: [textarea]                    │
│ [+ New]      │ [Generate]                            │
│              │                                       │
│              │ -- Planning ────────────────────────   │
│              │ Strategy: [claude-workflow:new-plan]   │
│              │ Prompt: [textarea]                    │
│              │ [Generate]                            │
│              │                                       │
│              │ -- Implementation ──────────────────   │
│              │ Strategy: [claude-workflow:agent-team] │
│              │ Prompt: [textarea]                    │
│              │ [Generate]                            │
│              │                                       │
│              │ [Save] [Duplicate] [Delete]           │
└──────────────┴──────────────────────────────────────┘
```

**Sidebar:** List of saved workflow templates. Active selection highlighted. `+ New` button at bottom.

**Detail panel:** Form with:

- Name + description fields at top
- 3 phase sections (Brainstorming, Planning, Implementation), each with:
  - **Strategy dropdown** — populated from plugin artifact scan (see 2c)
  - **Prompt textarea** — editable, supports `{slug}` interpolation
  - **Generate button** — sends prompt to assistant via `useSendCommand()` + `openWidget()`, same pattern as `RoadmapPage.tsx`
- Save / Duplicate / Delete buttons at bottom

**Generate flow:**

1. User clicks Generate on a phase
2. Prompt textarea content + phase context sent to assistant
3. Assistant chat opens, user interacts until satisfied
4. Assistant calls `workflow-templates.writeArtifact` IPC to write the finalized file
5. New artifact appears in the strategy dropdown on next scan

### 2c. WorkflowTemplateService Extension

Extend the existing `WorkflowTemplateService` and schema to support the phase-based model.

**Schema addition** — add `phases` array to `WorkflowTemplate`:

```typescript
phases: [
  {
    name: 'brainstorming',
    strategy: string,       // skill/command reference (e.g. 'superpowers:brainstorming') or 'skip' | 'custom'
    prompt: string,         // user-editable prompt template, supports {slug}
    summarySpec: {
      maxChars: number,     // default 300
      tableFields: string[] // e.g. ['Approach', 'Risk', 'Estimate']
    }
  },
  { name: 'planning', ... },
  { name: 'implementation', ... }
]
```

**Storage:** Electron `userData` via existing service. `isBuiltin` flag distinguishes ADC defaults from user-created.

**New IPC channels** (added to `workflow-templates` domain):

| Channel | Input | Output | Purpose |
|---------|-------|--------|---------|
| `workflow-templates.scanArtifacts` | `{ projectPath: string }` | `{ name: string, type: 'skill' \| 'command' \| 'agent', path: string }[]` | Scans `.claude/skills/`, `.claude/commands/`, `.claude/agents/` for active project |
| `workflow-templates.writeArtifact` | `{ projectPath: string, type: string, name: string, content: string }` | `{ path: string }` | Writes a generated artifact to the correct `.claude/` location — called by assistant |

Existing channels (`workflow-templates.list`, `.get`, `.create`, `.update`, `.delete`) continue to work unchanged.

### 2d. Task Store Integration

When a workflow runs on a task, log the template reference and current phase in progress task frontmatter:

```yaml
---
title: Auth Refactor
status: executing
workflow: default-pipeline
workflowPhase: planning
---
```

**Type additions to `ProgressTask`:**

- `workflow?: string` — slug/id of the workflow template used
- `workflowPhase?: string` — current active phase name

**Service changes:**

- `ProgressService.runWorkflow(slug, templateId?)` sets these fields when starting
- Updated on each phase transition via existing `event:progress.workflowStep`
- Readable via existing `progress.getTask` / `event:progress.taskUpdated` channels — no new events needed

### 2e. Summary Block Convention

The workflow system appends to every phase prompt before sending:

> "Include a `<!-- summary -->` section at the top of your output with: a synopsis paragraph (max {maxChars} characters) and a key-facts table with columns: {tableFields.join(', ')}. Wrap it in `<!-- summary -->` / `<!-- /summary -->` HTML comment markers."

Driven by the `summarySpec` in each phase's config. This is what Part 1's ContentBlock preview parser consumes.

---

## Backlog

- **Custom workflow phases** — allow adding/removing/reordering phases beyond the fixed 3. Requires task table and progress pipeline updates. Tracked separately.

---

## Agent Task Decomposition (Parallel)

These tasks are independent and can run in parallel waves:

**Wave 1 (no dependencies):**

| Task | Part | Scope |
|------|------|-------|
| Sticky footer + ContentBlock preview | Part 1 | `ProgressTaskDetailRow.tsx`, `ContentBlock` subcomponent |
| Inline row action columns | Part 1 | `ProgressTaskGrid.tsx` |
| Tools page tab restructure | Part 2 | `ToolsPage.tsx` |
| WorkflowTemplate schema + scanArtifacts IPC | Part 2 | `workflow-templates` contract, service, handlers |

**Wave 2 (depends on Wave 1):**

| Task | Part | Depends On |
|------|------|------------|
| Workflow editor form UI | Part 2 | Tools page tabs + schema extension |
| Task store workflow fields | Part 2 | Schema extension |
| Summary block prompt injection | Part 2 | Schema extension + ContentBlock preview |

---

## Key Files

| File | Changes |
|------|---------|
| `src/renderer/features/tasks/components/detail/ProgressTaskDetailRow.tsx` | Restructure to sticky footer, move actions |
| `src/renderer/features/tasks/components/grid/ProgressTaskGrid.tsx` | Add 2 inline action columns |
| `src/renderer/features/tools/components/ToolsPage.tsx` | Replace cards with PageHeader tabs |
| `src/shared/ipc/workflow-templates/schemas.ts` | Add `phases`, `summarySpec` to template schema |
| `src/shared/ipc/workflow-templates/contract.ts` | Add `scanArtifacts`, `writeArtifact` channels |
| `src/main/services/workflow-templates/workflow-template-service.ts` | Implement scan + write + phase support |
| `src/main/ipc/handlers/workflow-template-handlers.ts` | Register new handlers |
| `src/shared/types/progress.ts` | Add `workflow`, `workflowPhase` fields |
| `src/main/services/progress/progress-service.ts` | Set workflow fields on run |
| New: `src/renderer/features/tools/components/WorkflowEditor.tsx` | Editor form component |
| New: `src/renderer/features/tools/components/WorkflowSidebar.tsx` | Template list sidebar |
| New: `src/renderer/features/tools/components/PhaseSection.tsx` | Reusable phase form section |
