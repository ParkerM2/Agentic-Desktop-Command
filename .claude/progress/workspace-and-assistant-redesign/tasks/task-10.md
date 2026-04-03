---
taskNumber: 10
taskName: WidgetPanel Cleanup
taskSlug: widget-panel-cleanup
agentRole: frontend-developer
agentDefinition: null
wave: 3
blockedBy: []
blocks: [11]
estimatedTokens: 5000
complexity: medium
teamLeaderName: "team-lead"
teamName: workspace-and-assistant-redesign
workbranch: work/workspace-and-assistant-redesign/widget-panel-cleanup
worktreePath: C:/Users/Parke/Desktop/Claude-UI
status: pending
---

## Task 10: WidgetPanel Cleanup — Remove Quick Actions

### Context
The floating assistant widget should strip quick action chips, confirmation cards, and intent context enrichment. What remains: FAB toggle, input box, streamed markdown response, clear history button.
Full implementation details in `docs/superpowers/plans/2026-04-02-workspace-and-assistant-redesign.md` — Task 10.

### Files to Modify
- `src/renderer/features/assistant/components/WidgetPanel.tsx`

### What to Do
1. Read `docs/superpowers/plans/2026-04-02-workspace-and-assistant-redesign.md` Task 10
2. Read `src/renderer/features/assistant/components/WidgetPanel.tsx` in full
3. Identify and remove: `QUICK_ACTIONS` constant, quick action chip JSX block, confirmation/preview card JSX, `AssistantContext` enrichment (activeProjectId, currentPage, todayDate fields passed to the mutation)
4. Update the `sendCommand` mutation call: change context object to pass only `{ input, projectPath }` where `projectPath` comes from the active project store
5. Find how the active project path is accessible — read `src/renderer/shared/stores/index.ts` or `src/renderer/features/projects/hooks/` to find the right hook
6. Run `npm run lint && npm run typecheck`

### Acceptance Criteria
- [ ] No `QUICK_ACTIONS` constant or quick action chip buttons remain in the component
- [ ] No confirmation/preview card components remain
- [ ] `sendCommand` is called with `{ input, projectPath }` — no activeProjectId, currentPage, or todayDate
- [ ] The widget still renders: FAB toggle button, response area, clear history button, text input + send button
- [ ] `npm run typecheck` passes clean (note: IPC types may not yet match Task 11's schema cleanup — if there's a type error on the context shape, use `// @ts-expect-error -- pending IPC schema cleanup (Task 11)` as a temporary comment)
- [ ] `npm run lint` passes clean

### Rules
- Read `ai-docs/LINTING.md` before editing
- All remaining UI elements must use `@ui` design system primitives — no raw `<button>`
- Do NOT remove the response area or history display
