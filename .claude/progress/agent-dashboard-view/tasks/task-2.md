---
taskNumber: 2
taskName: File Explorer with react-arborist
taskSlug: file-explorer
wave: 1
complexity: medium
blockedBy: none
agent: component-engineer
files_create:
  - src/renderer/features/file-explorer/components/FileExplorer.tsx
  - src/renderer/features/file-explorer/components/FileNode.tsx
  - src/renderer/features/file-explorer/api/queryKeys.ts
  - src/renderer/features/file-explorer/api/useFileTree.ts
  - src/renderer/features/file-explorer/hooks/useFileTreeEvents.ts
  - src/renderer/features/file-explorer/store.ts
  - src/renderer/features/file-explorer/index.ts
files_modify: []
---

## Task: Build File Explorer component using react-arborist

### Context

Replace the current file tree implementation with `react-arborist` — a virtualized tree component with drag-drop and inline rename support. This is Phase 5 from the research doc (standalone, no dependencies on other agent dashboard work).

**Package**: `react-arborist` (3.6K stars, 302K/wk downloads)
**Install**: `npm install react-arborist` (if not already installed)

Read `docs/features/agent-dashboard-view/plan.md` — Sidebar Integration section for the expected layout.

### Requirements

1. **FileExplorer component** — renders a virtualized file tree using `react-arborist`'s `<Tree>` component
   - Shows project files from the current project root
   - Supports expand/collapse with keyboard navigation (ArrowUp/Down/Left/Right)
   - Shows file type icons (folder, file, with extension-based icons)
   - Click on file should emit an event (via IPC or callback) to open in editor/viewer
   - Live updates when files change (use existing file-watcher IPC events if available)

2. **FileNode component** — custom node renderer for the tree
   - Folder icon (open/closed state)
   - File icon (based on extension: .ts, .tsx, .json, .md, .css, etc.)
   - File name with truncation for long names
   - Modified indicator (dot or highlight) for git-changed files
   - Uses `@ui` primitives where applicable

3. **useFileTree hook** — React Query hook that fetches file tree data via IPC
   - Invalidates on file-watcher events
   - Returns `{ nodes, isLoading, error }`

4. **Store** — Zustand store for UI state
   - `expandedNodes: Set<string>` — which nodes are expanded
   - `selectedNode: string | null` — currently selected file
   - `searchQuery: string` — filter/search within tree

### Design System

- Use `@ui` primitives (ScrollArea for the tree container)
- Use Tailwind classes with theme tokens: `bg-sidebar`, `text-sidebar-foreground`, `border-sidebar-border`
- Use `cn()` for conditional classes
- Named function declarations for components

### Acceptance Criteria

1. FileExplorer renders a virtualized file tree with react-arborist
2. Supports keyboard navigation (arrow keys, Enter to toggle)
3. File type icons render correctly
4. Expand/collapse state persists during session
5. `npm run lint && npm run typecheck && npm run build` pass
6. Feature module follows standard structure (api/, components/, hooks/, store.ts, index.ts)
7. All exports via barrel `index.ts`
