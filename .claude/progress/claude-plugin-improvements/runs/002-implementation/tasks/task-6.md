---
taskNumber: 6
taskName: Custom ADC Skills
taskSlug: custom-adc-skills
wave: 3
complexity: medium
blockedBy: task-4
agent: component-engineer
branch: claude-plugin-improvements/custom-adc-skills
---

## Task: Create 2 custom ADC-specific skills to replace generic ones

### Skill 1: `electron-ipc` (replaces generic patterns in agent prompts)

**Create**: `.claude/skills/electron-ipc/SKILL.md`

Content should cover ADC's specific IPC patterns:
- Domain-based IPC contract structure (`src/shared/ipc/<domain>/`)
- Zod schema → contract → handler → service flow
- `router.handle()` and `router.emit()` patterns
- How to add a new IPC channel (step by step with file paths)
- The `ipc()` helper in renderer
- React Query hook → IPC → service data flow

Read these for source material:
- `ai-docs/ARCHITECTURE.md` — IPC section
- `ai-docs/DATA-FLOW.md` — IPC flow diagrams
- `ai-docs/CODEBASE-GUARDIAN.md` — IPC contract rules
- `CLAUDE.md` — Critical Pattern: IPC Contract section
- `src/shared/ipc/` — actual code patterns

Keep under 3K tokens (~150 lines). Focus on patterns, not exhaustive docs.

### Skill 2: `adc-design-system` (replaces shadcn-ui skill)

**Create**: `.claude/skills/adc-design-system/SKILL.md`

Content should cover ADC's actual design system (not Next.js/shadcn defaults):
- CSS custom properties with Tailwind v4 `@theme` directive
- `color-mix()` pattern for transparency (NEVER hardcode rgba)
- Theme variables in `:root`, `.dark`, `[data-theme]` blocks
- `@ui` import path for 30 Radix primitives
- `cn()` utility usage
- How to add a new color theme
- How to add a new UI primitive

Read these for source material:
- `CLAUDE.md` — Design System section
- `src/renderer/styles/globals.css`
- `src/shared/constants/themes.ts`
- `src/renderer/shared/stores/theme-store.ts`
- `src/renderer/shared/components/ui/` — list of primitives

Keep under 3K tokens (~150 lines).

### Acceptance Criteria
- Both SKILL.md files exist and are under 150 lines each
- Content is ADC-specific (not generic React/Next.js patterns)
- Patterns match actual code in the repo (verified by reading source)
