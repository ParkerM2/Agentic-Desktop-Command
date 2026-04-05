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

| Type | Description | Component |
|------|-------------|-----------|
| `dataFlow` | Import dependency between groups | `DataFlowEdge` |
| `agentScope` | Agent task → file group scope link | `AgentScopeEdge` |

---

## Layout

- **Algorithm**: Dagre (top-to-bottom directed graph layout)
- **Group-level**: Only group nodes are shown initially for performance
- **File counts**: Displayed as badges on group nodes
- **Agent offset**: Agent layer is positioned to the right of codebase layer

---

## State Management

Zustand store (`useVisualizationStore`) manages:
- `showCodebaseLayer` / `showAgentLayer` — layer visibility toggles
- `selectedFeature` — which feature's agents to display
- `selectedNodeId` / `isDetailPanelOpen` — detail panel state
- `expandedGroups` — which file groups are expanded

---

## Key Files

| File | Purpose |
|------|---------|
| `components/VisualizationPage.tsx` | Page wrapper with ReactFlowProvider |
| `components/canvas/VisualizationCanvas.tsx` | ReactFlow canvas, graph assembly, layout |
| `components/nodes/` | 5 custom node components |
| `components/edges/` | 2 custom edge components |
| `components/panels/NodeDetailPanel.tsx` | Slide-in detail panel |
| `components/toolbar/LayerToggleToolbar.tsx` | Layer toggle buttons |
| `lib/graph-builders.ts` | IPC data → React Flow nodes/edges + dagre layout |
| `api/visualization-api.ts` | TanStack Query hooks for IPC |
| `store.ts` | Zustand UI state |

---

## Dependencies

- `@xyflow/react` ^12.10.2 — React Flow graph library
- `@dagrejs/dagre` ^1.0.4 — Directed graph layout algorithm
