---
taskNumber: 7
taskName: AgentChatPanel + ToolCallCards + Layout System
taskSlug: agent-chat-panel
wave: 3
complexity: high
blockedBy: task-4
agent: component-engineer
files_create:
  - src/renderer/features/agent-dashboard/components/AgentChatPanel.tsx
  - src/renderer/features/agent-dashboard/components/AgentPanelCompact.tsx
  - src/renderer/features/agent-dashboard/components/AgentPanelExpanded.tsx
  - src/renderer/features/agent-dashboard/components/AgentPanelPopup.tsx
  - src/renderer/features/agent-dashboard/components/ToolCallCard.tsx
  - src/renderer/features/agent-dashboard/components/TextMessage.tsx
  - src/renderer/features/agent-dashboard/components/UserMessage.tsx
  - src/renderer/features/agent-dashboard/components/AgentStatusBar.tsx
  - src/renderer/features/agent-dashboard/components/AgentLayoutSingle.tsx
  - src/renderer/features/agent-dashboard/components/AgentLayoutGrid.tsx
  - src/renderer/features/agent-dashboard/components/AgentLayoutToolbar.tsx
  - src/renderer/features/agent-dashboard/components/AgentDashboardPage.tsx
  - src/renderer/features/agent-dashboard/index.ts
files_modify: []
---

## Task: Build the Agent Chat Panel, Tool Call Cards, and Layout System

### Context

This is Phase 4 from the research doc — the main UI surface for agent monitoring. Replaces the xterm.js terminal grid with a chat-style interface rendering structured NDJSON data.

Read `docs/features/agent-dashboard-view/plan.md` for the complete UI spec:
- Agent Panel States (compact, expanded, popup)
- Chat Message Components (text, Read/Edit/Bash cards, Agent Spawn card)
- Layout System (Single, 2-Column, 3-Column, Grid, Multi-Project)
- Main Session Panel, Team Lead Panel sections

### Component Requirements

#### AgentChatPanel — Core chat renderer
- Renders a scrollable list of AgentChatMessage items
- Auto-scrolls to latest message
- Handles streaming messages (partial text updates)
- Uses `react-markdown` + `remark-gfm` for markdown rendering
- Uses `react-syntax-highlighter` for code blocks in messages (install if needed: `npm install react-syntax-highlighter @types/react-syntax-highlighter`)

#### ToolCallCard — Visual card for each tool call
- **Read**: File icon + path + line range + collapsible content preview
- **Edit**: File icon + path + additions/deletions + inline mini-diff
- **Bash**: Command + collapsible output + exit code with duration
- **Write**: File icon + path + "new file" badge
- **Agent Spawn** (team-lead only): Agent name + task + model + status dot + "View Agent" link
- Collapsible by default, click to expand
- Error state: red border for failed tool calls

#### Panel States
- **Compact** (~120px fixed height): Status dot, name, model, task, last message preview, expand/popup buttons
- **Expanded** (in-place grow): Header + tabs (Chat, Tasks, Files Changed, Errors)
- **Popup** (modal): Full-screen overlay with all tabs + input box at bottom

#### Layout System
- **AgentLayoutSingle**: Main session 60% left, stacked agents 40% right
- **AgentLayoutGrid**: Equal-sized cells, auto-wrap by window width
- **AgentLayoutToolbar**: Layout mode selector, project filter, status filter

#### AgentDashboardPage — Top-level page component
- Renders toolbar + selected layout
- Manages which panel is expanded/popup
- Connects to agent data via hooks (from task-8)

### Design System — CRITICAL

- ALL colors via theme tokens: `bg-card`, `text-card-foreground`, `bg-primary`, etc.
- Status dots: use `color-mix(in srgb, var(--success) 100%, transparent)` for green, etc.
- NO hardcoded hex/rgb/rgba values
- Use `@ui` primitives: Card, ScrollArea, Tabs, Dialog (for popup), Button, Badge
- Use `cn()` for conditional classes
- Named function declarations for all components
- Self-closing tags for empty elements

### Acceptance Criteria

1. AgentChatPanel renders messages with markdown formatting
2. ToolCallCard renders all tool types (Read, Edit, Bash, Write)
3. Three panel states work: compact, expanded, popup
4. Layout toolbar switches between Single and Grid modes
5. Popup modal opens/closes with Escape key
6. All components use @ui primitives — no raw HTML buttons/inputs
7. All colors theme-aware — no hardcoded values
8. `npm run lint && npm run typecheck && npm run build` pass
9. Feature module structure: components/ + index.ts barrel
