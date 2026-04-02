---
taskNumber: 3
taskName: Git Diff Viewer with @git-diff-view/react
taskSlug: diff-viewer
wave: 1
complexity: medium
blockedBy: none
agent: component-engineer
files_create:
  - src/renderer/features/diff-viewer/components/DiffViewer.tsx
  - src/renderer/features/diff-viewer/components/DiffFileList.tsx
  - src/renderer/features/diff-viewer/api/queryKeys.ts
  - src/renderer/features/diff-viewer/api/useDiff.ts
  - src/renderer/features/diff-viewer/store.ts
  - src/renderer/features/diff-viewer/index.ts
files_modify: []
---

## Task: Build Git Diff Viewer using @git-diff-view/react

### Context

Create a GitHub-style diff viewer for agent file changes. This is Phase 6 from the research doc (standalone). `@git-diff-view/react` is already installed in the project.

**Package**: `@git-diff-view/react` + `@git-diff-view/core` (already in dependencies)

Read `docs/features/agent-dashboard-view/plan.md` — Files Changed tab and Diff View sections.

### Requirements

1. **DiffViewer component** — renders GitHub-style diffs
   - Split view (side-by-side) and unified view toggle
   - Syntax highlighting for common languages (TypeScript, JavaScript, JSON, CSS, Markdown)
   - Line numbers
   - Expandable context lines
   - File header with path, additions/deletions count
   - Uses `@git-diff-view/react` DiffView component

2. **DiffFileList component** — list of changed files
   - Shows status icon: A (added), M (modified), D (deleted)
   - Shows file path with additions/deletions count
   - Click to select file and show its diff
   - Group by directory optionally

3. **useDiff hook** — React Query hook
   - Fetches diff data via existing git IPC channels (`git.diff` or similar)
   - Accepts branch/commit reference parameters
   - Returns parsed diff data compatible with @git-diff-view

4. **Store** — Zustand for UI state
   - `viewMode: 'split' | 'unified'`
   - `selectedFile: string | null`
   - `expandedContext: boolean`

### Design System

- Use `@ui` Card, ScrollArea, Tabs for containers
- Theme tokens for backgrounds: `bg-card`, `text-card-foreground`
- Diff addition lines: use `color-mix(in srgb, var(--success) 15%, transparent)`
- Diff deletion lines: use `color-mix(in srgb, var(--destructive) 15%, transparent)`
- NO hardcoded colors — all via CSS custom properties

### Acceptance Criteria

1. DiffViewer renders split and unified views correctly
2. Syntax highlighting works for TypeScript files
3. File list shows status icons and click-to-select works
4. `npm run lint && npm run typecheck && npm run build` pass
5. No hardcoded colors — all theme-aware
6. Feature module follows standard structure
