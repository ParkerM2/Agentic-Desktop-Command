---
taskNumber: 2
taskName: "PlanningPage Feature Module"
taskSlug: "planning-page"
agentRole: "component-engineer"
wave: 2
blockedBy: [1]
blocks: []
estimatedTokens: 12000
complexity: "LOW"
status: "pending"
---

# Task #2: PlanningPage Feature Module

## Description
Create a new `planning` feature module with a tabbed page wrapping Roadmap, Ideation, and Insights. Follow the exact same pattern as the existing ToolsPage which wraps features as tabs using PageHeader compound component.

## Acceptance Criteria
- [ ] `src/renderer/features/planning/` directory created with standard feature structure
- [ ] PlanningPage renders with PageHeader, title "Planning", description "Roadmap, ideas, and project analytics"
- [ ] Three tabs: Roadmap (Map icon), Ideation (Lightbulb icon), Insights (BarChart3 icon)
- [ ] Each tab renders the existing feature page component from its barrel export
- [ ] Active tab persisted via Zustand store
- [ ] Uses `@ui` primitives only (PageLayout, PageHeader, PageContent)
- [ ] Barrel export: `export { PlanningPage } from './components/PlanningPage'`
- [ ] `npm run typecheck` and `npm run lint` pass

## Files to Create
- `src/renderer/features/planning/index.ts` — Barrel export
- `src/renderer/features/planning/components/PlanningPage.tsx` — Tabbed wrapper
- `src/renderer/features/planning/store.ts` — Zustand store for activeTab

## Files to Read for Context
- `src/renderer/features/tools/components/ToolsPage.tsx` — COPY THIS PATTERN EXACTLY
- `src/renderer/features/tools/store.ts` — Store pattern reference
- `src/renderer/features/tools/index.ts` — Barrel pattern reference

## Implementation Notes
- The ToolsPage at `src/renderer/features/tools/components/ToolsPage.tsx` is the reference implementation. Read it and follow its exact structure.
- Import existing pages: `import { RoadmapPage } from '@features/roadmap'`, `import { IdeationPage } from '@features/ideation'`, `import { InsightsPage } from '@features/insights'`
- Tab type: `type PlanningTab = 'roadmap' | 'ideation' | 'insights'`
- Store: `create<{ activeTab: PlanningTab; setActiveTab: (tab: PlanningTab) => void }>`
- Default tab: 'roadmap'
