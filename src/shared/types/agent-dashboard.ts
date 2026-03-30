/**
 * Agent Dashboard types — structured data from stream-json / session JSONL
 *
 * These types model the agent chat panel, tool call cards, panel states,
 * and layout system for the v2 headless agent architecture.
 */

// ─── Agent Status ──────────────────────────────────────────

export type AgentStatus = 'running' | 'idle' | 'attention' | 'failed' | 'completed';

export type AgentRole =
  | 'project-owner'
  | 'team-lead'
  | 'teammate'
  | 'component-engineer'
  | 'service-engineer'
  | 'hook-engineer'
  | 'store-engineer'
  | 'ipc-handler-engineer'
  | 'styling-engineer'
  | 'fitness-engineer';

// ─── Chat Message Types ────────────────────────────────────

export type ToolCallType = 'Read' | 'Edit' | 'Write' | 'Bash' | 'AgentSpawn';

export interface ToolCallRead {
  type: 'Read';
  filePath: string;
  lineRange?: string;
  content?: string;
}

export interface ToolCallEdit {
  type: 'Edit';
  filePath: string;
  additions: number;
  deletions: number;
  diffPreview?: string;
}

export interface ToolCallWrite {
  type: 'Write';
  filePath: string;
  isNew: boolean;
}

export interface ToolCallBash {
  type: 'Bash';
  command: string;
  output?: string;
  exitCode?: number;
  durationMs?: number;
}

export interface ToolCallAgentSpawn {
  type: 'AgentSpawn';
  agentName: string;
  task: string;
  model: string;
  status: AgentStatus;
  agentId: string;
}

export type ToolCallData =
  | ToolCallRead
  | ToolCallEdit
  | ToolCallWrite
  | ToolCallBash
  | ToolCallAgentSpawn;

export interface AgentToolCall {
  id: string;
  toolCall: ToolCallData;
  isError: boolean;
  timestamp: string;
}

export interface AgentTextMessage {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  timestamp: string;
  isStreaming?: boolean;
}

export type AgentChatMessage =
  | { kind: 'text'; message: AgentTextMessage }
  | { kind: 'tool'; toolCall: AgentToolCall };

// ─── Agent Session ─────────────────────────────────────────

export interface AgentTokenUsage {
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
}

export interface AgentSession {
  id: string;
  name: string;
  role: AgentRole;
  model: string;
  status: AgentStatus;
  taskId?: string;
  taskName?: string;
  branch?: string;
  projectId?: string;
  projectName?: string;
  startedAt: string;
  tokens: AgentTokenUsage;
  messages: AgentChatMessage[];
  filesChanged: AgentFileChange[];
  errors: AgentError[];
}

export interface AgentFileChange {
  path: string;
  status: 'added' | 'modified' | 'deleted';
  additions: number;
  deletions: number;
}

export interface AgentError {
  id: string;
  severity: 'error' | 'warning';
  message: string;
  source?: string;
  timestamp: string;
  chatMessageId?: string;
}

// ─── Panel State ───────────────────────────────────────────

export type AgentPanelState = 'compact' | 'expanded' | 'popup';

// ─── Layout Modes ──────────────────────────────────────────

export type AgentLayoutMode = 'single' | 'grid';

// ─── Dashboard State ───────────────────────────────────────

export interface AgentDashboardFilters {
  projectId?: string;
  status?: AgentStatus;
}

export interface AgentDashboardState {
  layoutMode: AgentLayoutMode;
  expandedAgentId?: string;
  popupAgentId?: string;
  filters: AgentDashboardFilters;
}
