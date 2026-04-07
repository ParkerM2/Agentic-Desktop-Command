---
taskNumber: 4
taskName: "ToolsConfigPlaceholder + Cleanup"
taskSlug: "tools-placeholder"
agentRole: "component-engineer"
wave: 2
blockedBy: [1]
blocks: []
estimatedTokens: 11000
complexity: "LOW"
status: "pending"
---

# Task #4: ToolsConfigPlaceholder + Cleanup

## Description
Replace the current ToolsPage (which renders Roadmap/Ideation/Insights/Changelog/GitHub as tabs) with a placeholder page for the future Claude Config suite. Simple empty state with icon, title, description of what's coming. Clean up the store to remove old tab types.

## Acceptance Criteria
- [ ] ToolsPage renders a clean placeholder with Wrench icon
- [ ] Title: "Tools" with description: "Manage Claude skills, commands, agents, and plugins"
- [ ] Body shows coming-soon cards or list: Skills, Commands, Agents, Plugins, Config
- [ ] No longer imports RoadmapPage, IdeationPage, InsightsPage, ChangelogPage, GitHubPage
- [ ] Store simplified — remove old ToolsTab type and tab state if not needed
- [ ] Barrel export still works: `export { ToolsPage } from './components/ToolsPage'`
- [ ] `npm run typecheck` and `npm run lint` pass
- [ ] `npm run build` passes (final verification)

## Files to Modify
- `src/renderer/features/tools/components/ToolsPage.tsx` — Replace with placeholder
- `src/renderer/features/tools/store.ts` — Clean up old tab types
- `src/renderer/features/tools/index.ts` — Keep barrel, ensure exports

## Files to Read for Context
- `src/renderer/features/tools/components/ToolsPage.tsx` — Current implementation to replace
- `src/renderer/shared/components/ui/empty-state.tsx` — EmptyState primitive if it exists
- `src/renderer/features/tools/store.ts` — Current store to simplify

## Implementation Notes
- Use PageLayout + PageHeader + PageContent from @ui
- For the placeholder content, use Card primitives to show 5 "coming soon" items: Skills, Commands, Agents, Plugins, Config — each with a small icon and one-line description
- Icons: Sparkles (Skills), Terminal (Commands), Bot (Agents), Puzzle (Plugins), Settings (Config) from lucide-react
- Keep the store file but simplify it — future Tools Config implementation will add real state
- This task should also run `npm run build` as the final check since it's the last task
