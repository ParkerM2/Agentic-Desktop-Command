# Plan: Low-Hanging Fruit Gap Closures

> Tracker Key: `low-hanging-fruit-gaps` | Status: **IMPLEMENTED** | Created: 2026-02-18

## Summary

Investigation of the 4 requested gaps reveals that **2 of 4 are already resolved** in the current codebase, and 1 more is partially resolved (3 of 5 barrels already complete). The gap analysis doc was stale on these items. Only **2 barrel files** need actual code changes, plus documentation updates.

## Investigation Results

| # | Gap | Claim | Current Status | Verdict |
|---|-----|-------|----------------|---------|
| 1 | Wire briefing to sidebar (G-14) | `/briefing` not in sidebar | `Sidebar.tsx:56` — `{ label: 'Briefing', icon: Newspaper, path: ROUTES.BRIEFING }` already in `topLevelItems` | **ALREADY RESOLVED** |
| 2a | Fitness barrel under-exports | "Only exports FitnessPage" | Barrel exports 10 API hooks, queryKeys, event hook, store, AND FitnessPage | **ALREADY RESOLVED** |
| 2b | Communications barrel under-exports | "useMcpTool not exported" | `useMcpToolCall`, `useMcpConnectionState`, `useMcpConnectedServers` are NOT in barrel | **NEEDS FIX** |
| 2c | Productivity barrel under-exports | "Store not exported" | `useProductivityStore` is NOT in barrel | **NEEDS FIX** |
| 2d | Ideation barrel under-exports | "useIdeaEvents not exported" | `useIdeaEvents` IS exported at `index.ts:9` | **ALREADY RESOLVED** |
| 2e | Roadmap barrel under-exports | "useMilestoneEvents not exported" | `useMilestoneEvents` IS exported at `index.ts:8` | **ALREADY RESOLVED** |
| 3 | Fix empty communications event hook (2h) | "Hook body is entirely empty" | `useCommunicationsEvents.ts` subscribes to `event:hub.connectionChanged` and updates Slack/Discord status | **ALREADY RESOLVED** |
| 4 | Hub connection indicator in sidebar (P5 #31) | "Not done" | `Sidebar.tsx:34,164` imports and renders `HubConnectionIndicator`. Component fully implemented with status dots, tooltips, click-to-settings. | **ALREADY RESOLVED** |

## Actual Work Needed

Only **2 barrel file edits** + documentation updates:

### Task 1: Export MCP hooks from communications barrel
- **Agent:** general-purpose
- **Files:**
  - **Modify:** `src/renderer/features/communications/index.ts` — Add exports for `useMcpToolCall`, `useMcpConnectionState`, `useMcpConnectedServers` from `./api/useMcpTool`, and the types `McpToolCallParams`, `McpToolResult`
- **Depends on:** none
- **Acceptance criteria:**
  - [ ] `useMcpToolCall`, `useMcpConnectionState`, `useMcpConnectedServers` exported from barrel
  - [ ] `McpToolCallParams`, `McpToolResult` types exported from barrel
  - [ ] No import errors introduced

### Task 2: Export store from productivity barrel
- **Agent:** general-purpose
- **Files:**
  - **Modify:** `src/renderer/features/productivity/index.ts` — Add export for `useProductivityStore` from `./store`
- **Depends on:** none
- **Acceptance criteria:**
  - [ ] `useProductivityStore` exported from barrel

### Task 3: Update gap analysis documentation
- **Agent:** general-purpose
- **Files:**
  - **Modify:** `ai-docs/user-interface-flow.md` — Mark G-14 (briefing sidebar), P5 #31 (hub indicator) as RESOLVED
  - **Modify:** `ai-docs/FEATURES-INDEX.md` — Update communications and productivity feature descriptions to note full barrel exports
  - **Modify:** `docs/plans/2026-02-18-codebase-gap-analysis.md` — Update Section 2h (communications hook NOT empty), Section 2i (only 2 barrels need fixing, not 5), Section 1d (briefing IS in sidebar), Section 6 P5 #31 (hub indicator IS done)
- **Depends on:** Tasks 1 + 2
- **Acceptance criteria:**
  - [ ] Gap analysis doc accurately reflects current state
  - [ ] `npm run check:docs` passes

## Wave Plan

**Wave 1** (parallel, no dependencies): Tasks 1 + 2 — barrel exports
**Wave 2** (sequential, depends on Wave 1): Task 3 — documentation

## Testing Strategy

```bash
npm run lint && npm run typecheck && npm run test && npm run build && npm run check:docs
```

No new tests needed — these are barrel export additions and doc updates only.

## Risks & Mitigations

- **Risk:** Barrel exports may introduce circular dependencies.
  **Mitigation:** Both files (`useMcpTool.ts`, `store.ts`) only import from external packages and relative paths — no circular risk.
- **Risk:** Gap analysis doc has more stale entries beyond these 4 items.
  **Mitigation:** Task 3 updates the specific sections we investigated; a comprehensive doc audit should be a separate effort.
