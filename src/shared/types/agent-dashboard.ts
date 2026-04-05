/**
 * Agent Dashboard Types
 *
 * TypeScript types for the ADC v2 agent dashboard view.
 * Covers the three-layer architecture:
 *   Layer 1 — Agent Visibility (sessions, team config, JSONL events)
 *   Layer 2 — Workflow Tracking (task progress, phases, acceptance criteria)
 *   Layer 3 — Dashboard (panel view model, layout modes, correlation)
 *
 * Also includes component-facing types used by the renderer UI:
 *   Tool call discriminated union, chat item union, enriched session view model.
 */

// ── Layer 1: Agent Visibility ─────────────────────────────────

/** Session types matching the two-session model + auto-detected teammates */
export type AgentSessionType = 'project-owner' | 'team-lead' | 'teammate';

/** Agent lifecycle status (IPC-facing — matches Zod schema) */
export type AgentStatus = 'running' | 'idle' | 'needs-attention' | 'failed' | 'completed';

/**
 * Agent status for UI components.
 * Includes 'attention' as a UI-friendly alias for 'needs-attention'.
 */
export type AgentStatusUi = AgentStatus | 'attention';

/** Agent role within a team or standalone session */
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

/** Token usage counters for an agent session (IPC-facing) */
export interface AgentTokenUsage {
  input: number;
  output: number;
}

/** Token usage for UI rendering — includes cost estimate and explicit field names */
export interface AgentTokenUsageUi {
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
}

/** Core agent session — represents one running Claude instance */
export interface AgentSession {
  id: string;
  name: string;
  type: AgentSessionType;
  role?: AgentRole;
  status: AgentStatus;
  model: string;
  teamName?: string;
  taskId?: string;
  taskName?: string;
  branch?: string;
  projectId?: string;
  projectName?: string;
  tmuxPaneId?: string;
  sessionJsonlPath?: string;
  tokenUsage: AgentTokenUsage;
  /** UI-facing token usage with explicit field names */
  tokens?: AgentTokenUsageUi;
  /** Chat items for panel rendering (text messages + tool calls) */
  messages?: AgentChatItem[];
  /** Files modified during this session */
  filesChanged?: AgentFileChange[];
  /** Errors encountered during execution */
  errors?: AgentError[];
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

// ── Chat Message (IPC-facing — raw content blocks) ───────────

/** Role of a chat message participant */
export type ChatMessageRole = 'assistant' | 'user';

/** Parsed chat message from IPC (raw content blocks from NDJSON) */
export interface AgentChatMessage {
  id: string;
  agentId: string;
  role: ChatMessageRole;
  content: ContentBlock[];
  timestamp: string;
  isStreaming?: boolean;
}

// ── Tool Call Types (Component-Facing) ────────────────────────

/** Tool call type discriminator */
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

/** Discriminated union of all tool call data shapes */
export type ToolCallData =
  | ToolCallRead
  | ToolCallEdit
  | ToolCallWrite
  | ToolCallBash
  | ToolCallAgentSpawn;

/** Enriched tool call for UI rendering (wraps ToolCallData with metadata) */
export interface AgentToolCall {
  id: string;
  toolCall: ToolCallData;
  isError: boolean;
  timestamp: string;
}

// ── Text Message (Component-Facing) ──────────────────────────

/** A plain-text chat message for direct rendering */
export interface AgentTextMessage {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  timestamp: string;
  isStreaming?: boolean;
}

/** Compact tool activity line (shown in detailed view) */
export interface AgentActivityItem {
  id: string;
  toolName: string;
  summary: string;
  timestamp: string;
}

/**
 * Discriminated union for chat panel items.
 *
 * Components iterate over AgentChatItem[] and switch on `kind`
 * to render either a text bubble, a tool call card, or a compact activity line.
 */
export type AgentChatItem =
  | { kind: 'text'; message: AgentTextMessage }
  | { kind: 'tool'; toolCall: AgentToolCall }
  | { kind: 'activity'; activity: AgentActivityItem };

// ── Tool Call Display (IPC-Facing) ───────────────────────────

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

/** A file changed by an agent's work (IPC-facing — git status codes) */
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
  severity: 'error' | 'warning';
  message: string;
  source?: string;
  timestamp: string;
  context?: string;
  chatMessageId?: string;
}

/** Component-facing file change type with human-readable status */
export interface AgentFileChange {
  path: string;
  status: 'added' | 'modified' | 'deleted';
  additions: number;
  deletions: number;
}

/** Layout modes for the agent dashboard */
export type AgentLayoutMode = 'single' | 'two-column' | 'three-column' | 'grid' | 'multi-project';

/** Panel display state */
export type AgentPanelState = 'compact' | 'expanded' | 'popup';

/** Composite view model for a single agent panel */
export interface AgentPanelData {
  session: AgentSession;
  messages: AgentChatItem[];
  filesChanged: FileChange[];
  errors: AgentError[];
  taskProgress?: TaskProgress;
}

// ── Layer 3: QA Dashboard ────────────────────────────────────

/** QA session verdict */
export type QaVerdict = 'pass' | 'fail' | 'warnings' | 'running' | 'none';

/** Status of a single verification check */
export type QaVerificationStatus = 'pass' | 'fail' | 'pending';

/** Verification suite results for the 5 mandatory checks */
export interface QaVerificationSuite {
  lint: QaVerificationStatus;
  typecheck: QaVerificationStatus;
  test: QaVerificationStatus;
  build: QaVerificationStatus;
  docs: QaVerificationStatus;
}

/** A single QA issue found during a session */
export interface QaDashboardIssue {
  severity: 'critical' | 'major' | 'minor' | 'cosmetic';
  category: string;
  description: string;
  location?: string;
}

/** QA session data for dashboard rendering */
export interface QaDashboardSession {
  sessionId: string;
  taskId: string;
  verdict: QaVerdict;
  checksRun: number;
  checksPassed: number;
  issues: QaDashboardIssue[];
  verificationSuite: QaVerificationSuite;
  duration: number;
  startedAt: string;
  completedAt?: string;
}

// ── Dashboard State (Component-Facing) ───────────────────────

/** Filter criteria for the agent dashboard */
export interface AgentDashboardFilters {
  projectId?: string;
  status?: AgentStatusUi;
}

/** Top-level state for the dashboard page component */
export interface AgentDashboardState {
  layoutMode: AgentLayoutMode;
  expandedAgentId?: string;
  popupAgentId?: string;
  filters: AgentDashboardFilters;
}
