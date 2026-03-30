/**
 * Agent Dashboard Types
 *
 * TypeScript types for the ADC v2 agent dashboard view.
 * Covers the three-layer architecture:
 *   Layer 1 — Agent Visibility (sessions, team config, JSONL events)
 *   Layer 2 — Workflow Tracking (task progress, phases, acceptance criteria)
 *   Layer 3 — Dashboard (panel view model, layout modes, correlation)
 */

// ── Layer 1: Agent Visibility ─────────────────────────────────

/** Session types matching the two-session model + auto-detected teammates */
export type AgentSessionType = 'project-owner' | 'team-lead' | 'teammate';

/** Agent lifecycle status */
export type AgentStatus = 'running' | 'idle' | 'needs-attention' | 'failed' | 'completed';

/** Token usage counters for an agent session */
export interface AgentTokenUsage {
  input: number;
  output: number;
}

/** Core agent session — represents one running Claude instance */
export interface AgentSession {
  id: string;
  name: string;
  type: AgentSessionType;
  status: AgentStatus;
  model: string;
  teamName?: string;
  taskId?: string;
  branch?: string;
  tmuxPaneId?: string;
  sessionJsonlPath?: string;
  tokenUsage: AgentTokenUsage;
  startedAt: string;
  lastActivityAt: string;
}

// ── NDJSON Event Types (stream-json / session JSONL) ──────────

/** Event types emitted by Claude stream-json output */
export type StreamJsonEventType = 'system' | 'assistant' | 'stream_event' | 'result';

/** A single content block within an assistant message */
export type ContentBlock = TextBlock | ToolUseBlock | ToolResultBlock;

/** Plain text content block */
export interface TextBlock {
  type: 'text';
  text: string;
}

/** Tool invocation content block */
export interface ToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

/** Tool execution result content block */
export interface ToolResultBlock {
  type: 'tool_result';
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

/** Top-level NDJSON event from stream-json stdout or session JSONL */
export interface StreamJsonEvent {
  type: StreamJsonEventType;
  /** Present when type === 'system' */
  system?: {
    session_id?: string;
    tools?: string[];
    model?: string;
  };
  /** Present when type === 'assistant' */
  message?: {
    content: ContentBlock[];
  };
  /** Present when type === 'stream_event' */
  event_type?: string;
  delta?: Record<string, unknown>;
  /** Present when type === 'result' */
  result?: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
  cost?: number;
}

// ── Chat Message (renderer-facing) ────────────────────────────

/** Role of a chat message participant */
export type ChatMessageRole = 'assistant' | 'user';

/** Parsed chat message ready for rendering */
export interface AgentChatMessage {
  id: string;
  agentId: string;
  role: ChatMessageRole;
  content: ContentBlock[];
  timestamp: string;
  isStreaming?: boolean;
}

// ── Tool Call Display ─────────────────────────────────────────

/** Enriched tool call data for UI rendering */
export interface ToolCallDisplay {
  id: string;
  name: string;
  input: Record<string, unknown>;
  output?: string;
  exitCode?: number;
  duration?: number;
  isError?: boolean;
  isCollapsed?: boolean;
}

// ── Team Config (Layer 1) ─────────────────────────────────────

/** A single teammate entry from team config.json */
export interface TeamMember {
  agentId: string;
  name: string;
  sessionId: string;
  tmuxPaneId?: string;
  cwd: string;
  status: AgentStatus;
}

/** Team configuration from team config.json */
export interface TeamConfig {
  teamName: string;
  members: TeamMember[];
}

// ── Tmux Types ────────────────────────────────────────────────

/** A tmux session managed by the TmuxBridge */
export interface TmuxSession {
  name: string;
  id: string;
  created: string;
  attached: boolean;
  windows: number;
}

// ── Layer 2: Workflow Tracking ────────────────────────────────

/** Status of a task phase */
export type PhaseStatus = 'completed' | 'in-progress' | 'pending';

/** A single phase within task progress */
export interface TaskPhase {
  name: string;
  status: PhaseStatus;
  duration?: number;
}

/** A single acceptance criterion */
export interface TaskCriterion {
  text: string;
  met: boolean;
}

/** Task progress from workflow tracking task files */
export interface TaskProgress {
  taskNumber: number;
  taskName: string;
  phases: TaskPhase[];
  acceptanceCriteria: TaskCriterion[];
}

// ── Layer 3: Dashboard View Model ─────────────────────────────

/** File change status from git diff */
export type FileChangeStatus = 'A' | 'M' | 'D';

/** A file changed by an agent's work */
export interface FileChange {
  path: string;
  status: FileChangeStatus;
  additions: number;
  deletions: number;
}

/** Error type categories */
export type AgentErrorType = 'bash' | 'tool' | 'qa' | 'warning';

/** An error encountered during agent execution */
export interface AgentError {
  id: string;
  type: AgentErrorType;
  message: string;
  timestamp: string;
  context?: string;
}

/** Layout modes for the agent dashboard */
export type AgentLayoutMode = 'single' | 'two-column' | 'three-column' | 'grid' | 'multi-project';

/** Panel display state */
export type AgentPanelState = 'compact' | 'expanded' | 'popup';

/** Composite view model for a single agent panel */
export interface AgentPanelData {
  session: AgentSession;
  messages: AgentChatMessage[];
  filesChanged: FileChange[];
  errors: AgentError[];
  taskProgress?: TaskProgress;
}
