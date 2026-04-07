# Visual Map — Codebase Structure & Agent Activity Graph

> Interactive graph visualization of project structure and agent activity using React Flow.

---

## Overview

The Visual Map feature provides a directed acyclic graph (DAG) visualization that combines two layers:

1. **Codebase Layer** — Shows project file groups and their import dependencies
2. **Agent Layer** — Shows active/completed agent tasks and their file scope connections

Users can toggle layers independently, select features to focus on, and click nodes to inspect details.

---

## Route

- **Path**: `/projects/$projectId/visualization`
- **Nav Label**: "Visual Map" (under Pipeline in sidebar)
- **Breadcrumb**: "Visual Map"

---

## Architecture

```
Renderer                          Main Process
────────                          ────────────
VisualizationPage                 VisualizationService
  └─ ReactFlowProvider              ├─ buildCodebaseGraph()
       ├─ VisualizationCanvas        │   └─ import-parser.ts
       │   ├─ useCodebaseGraph() ──→ │       (collectSourceFiles,
       │   ├─ useAgentTeams()   ──→  │        extractImportSpecifiers,
       │   ├─ buildCodebaseRFNodes() │        resolveSpecifier)
       │   ├─ buildAgentRFNodes()    ├─ buildAgentTeamsData()
       │   └─ dagre layout           │   └─ reads tracking/ dir
       ├─ LayerToggleToolbar         └─ buildSessionLog()
       └─ NodeDetailPanel                └─ reads JSONL logs
```

---

## IPC Channels

| Channel | Input | Output |
|---------|-------|--------|
| `visualization.getCodebaseGraph` | `{ projectId }` | `CodebaseGraph` (files, edges, groups) |
| `visualization.getAgentTeams` | `{ projectId }` | `AgentTeamsData` (features, tasks, status) |
| `visualization.getSessionLog` | `{ projectId, feature, agentName, cursor? }` | `SessionLogPage` (lines, cursor) |

---

## Node Types

| Type | Description | Component |
|------|-------------|-----------|
| `fileGroup` | Directory/module group with file count | `FileGroupNode` |
| `file` | Individual source file (used in detail panel) | `FileNode` |
| `featureGroup` | Agent feature group (branch, status) | `FeatureGroupNode` |
| `agentTask` | Individual agent task with status | `AgentTaskNode` |
| `guardian` | QA/guardian agent task | `GuardianNode` |

## Edge Types

| Type | Description | Rendering |
|------|-------------|-----------|
| `smoothstep` | Import dependency between groups | Built-in React Flow edge with `MarkerType.ArrowClosed` |
| `default` (bezier) | Agent task to file group scope link | Built-in React Flow edge with `animated: true` for live agents |

Edge labels (import weight counts) are toggled via `showEdgeLabels` in the store and rendered using the built-in `label` edge prop.

---

## React Flow Built-in Features Used

| Feature | Purpose |
|---------|---------|
| `useNodesState` / `useEdgesState` | Interactive drag persistence — node positions survive re-renders |
| `<Controls />` | Built-in zoom in/out, fit view, and lock toggle panel |
| `<NodeToolbar>` | Contextual toolbar on node selection (Details, Expand/Collapse) |
| `<NodeResizer>` | Drag-to-resize parent/group nodes |
| `MarkerType.ArrowClosed` / `MarkerType.Arrow` | Arrow markers on edges for directionality |
| `parentId` + `extent: 'parent'` | Native sub-flow grouping — children constrained inside parents |
| `animated` edge prop | Built-in dash animation for live agent scope edges |

---

## Layout

- **Algorithm**: Dagre (top-to-bottom or left-to-right directed graph layout)
- **Sub-flow grouping**: Architecture layers (Main, Features, Shared, Renderer, Preload) are parent nodes; file groups are children with `parentId` and `extent: 'parent'`
- **Agent grouping**: Feature group is parent; agent task nodes are children inside it
- **Parent sizing**: Computed from bounding box of children plus padding
- **File counts**: Displayed as badges on group nodes
- **Agent offset**: Agent layer is positioned to the right of codebase layer

---

## State Management

Zustand store (`useVisualizationStore`) manages:
- `showCodebaseLayer` / `showAgentLayer` — layer visibility toggles
- `selectedFeature` — which feature's agents to display
- `selectedNodeId` / `detailPanelOpen` — detail panel state
- `expandedGroups` — which file groups are expanded
- `layoutDirection` — TB or LR dagre layout
- `searchFilter` — node label filter (dims non-matching nodes)
- `showEdgeLabels` — toggle edge weight labels

---

## Key Files

| File | Purpose |
|------|---------|
| `components/VisualizationPage.tsx` | Page wrapper with ReactFlowProvider |
| `components/canvas/VisualizationCanvas.tsx` | ReactFlow canvas, graph assembly, layout |
| `components/nodes/` | 5 custom node components |
| `components/edges/` | Legacy custom edge components (unused — built-in types used instead) |
| `components/panels/NodeDetailPanel.tsx` | Slide-in detail panel |
| `components/toolbar/LayerToggleToolbar.tsx` | Layer toggles, feature selector, layout, search, edge labels, refresh |
| `lib/graph-builders.ts` | IPC data → React Flow nodes/edges + dagre layout |
| `api/visualization-api.ts` | TanStack Query hooks for IPC |
| `store.ts` | Zustand UI state |

---

## Dependencies

- `@xyflow/react` ^12.10.2 — React Flow graph library
- `@dagrejs/dagre` ^1.0.4 — Directed graph layout algorithm
