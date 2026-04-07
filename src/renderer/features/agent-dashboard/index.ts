/**
 * Agent Dashboard feature — public API
 *
 * Provides chat-style agent monitoring UI with structured NDJSON rendering,
 * tool call cards, panel states (compact/expanded/popup), and layout system.
 */

export { useAgentDashboardEvents } from './hooks/useAgentEvents';
export { useSessionsForTask, useSessionLog, useGitDiff } from './api/useAgentSessions';
export { agentDashboardKeys } from './api/queryKeys';
export { ActivityLine } from './components/ActivityLine';
export { AgentChatPanel } from './components/AgentChatPanel';
export { AgentDashboardPage } from './components/AgentDashboardPage';
export { AgentLayoutGrid } from './components/AgentLayoutGrid';
export { AgentLayoutSingle } from './components/AgentLayoutSingle';
export { AgentLayoutToolbar } from './components/AgentLayoutToolbar';
export { AgentPanelCompact } from './components/AgentPanelCompact';
export { AgentPanelExpanded } from './components/AgentPanelExpanded';
export { AgentPanelPopup } from './components/AgentPanelPopup';
export { AgentStatusBar } from './components/AgentStatusBar';
export { QaPanel } from './components/QaPanel';
export { TasksTab } from './components/TasksTab';
export { TextMessage } from './components/TextMessage';
export { ToolCallCard } from './components/ToolCallCard';
export { UserMessage } from './components/UserMessage';
export { buildChatItems } from './lib/buildChatItems';
export { RunningWorkflowsPanel } from './components/RunningWorkflowsPanel';
export { TemplateEditorPanel } from './components/TemplateEditorPanel';
export { TemplateListPanel } from './components/TemplateListPanel';
