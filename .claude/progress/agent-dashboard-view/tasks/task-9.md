---
taskNumber: 9
taskName: Agent Dashboard Zustand Store
taskSlug: agent-store
wave: 3
complexity: low
blockedBy: task-1
agent: store-engineer
files_create:
  - src/renderer/features/agent-dashboard/store.ts
files_modify: []
---

## Task: Build Zustand store for Agent Dashboard UI state

### Context

UI-only state for the agent dashboard. Server state (sessions, messages) lives in React Query. This store manages layout, selection, and panel display state.

Read:
- `ai-docs/PATTERNS.md` — Store patterns
- `src/renderer/shared/stores/layout-store.ts` — reference implementation

### Requirements

```typescript
interface AgentDashboardStore {
  // Layout
  layoutMode: AgentLayoutMode  // 'single' | 'two-column' | 'three-column' | 'grid' | 'multi-project'
  setLayoutMode: (mode: AgentLayoutMode) => void

  // Panel states
  panelStates: Map<string, AgentPanelState>  // sessionId → 'compact' | 'expanded' | 'popup'
  setPanelState: (sessionId: string, state: AgentPanelState) => void
  expandPanel: (sessionId: string) => void
  collapsePanel: (sessionId: string) => void
  openPopup: (sessionId: string) => void
  closePopup: () => void

  // Selection
  selectedSessionId: string | null
  setSelectedSession: (sessionId: string | null) => void
  popupSessionId: string | null  // which session is in popup mode

  // Filters
  statusFilter: AgentStatus | 'all'
  setStatusFilter: (filter: AgentStatus | 'all') => void
  projectFilter: string | null
  setProjectFilter: (projectId: string | null) => void

  // Active tab per panel
  activeTabs: Map<string, string>  // sessionId → active tab name
  setActiveTab: (sessionId: string, tab: string) => void
}
```

### Rules

- Use `zustand` with the standard pattern (no middleware needed for this store)
- Import types from `@shared/types/agent-dashboard`
- Use `Map` for per-session state (panelStates, activeTabs)
- Default layout: `'single'`
- Default panel state: `'compact'`
- Default status filter: `'all'`
- Only ONE popup can be open at a time (closePopup before openPopup)
- Max 100 lines per CODEBASE-GUARDIAN rules

### Acceptance Criteria

1. Store manages layout mode, panel states, selection, and filters
2. Only one popup open at a time
3. Default values are sensible
4. Types import correctly from shared types
5. Under 100 lines
6. `npm run lint && npm run typecheck && npm run build` pass
