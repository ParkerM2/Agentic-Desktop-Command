/**
 * Visualization Service Types
 *
 * TypeScript interfaces for the Visualization service.
 * These match the shape of the Zod schemas defined in
 * src/shared/ipc/visualization/contract.ts.
 */

// ─── Codebase Graph ──────────────────────────────────────────

/** A single source file found in the scanned project. */
export interface CodebaseFile {
  /** Absolute path to the file. */
  path: string;
  /** Path relative to the project root. */
  relativePath: string;
  /** Basename (e.g. "task-service.ts"). */
  fileName: string;
  /** File extension including dot (e.g. ".ts"). */
  ext: string;
  /** Detected group (e.g. "features/tasks", "main/services/project"). */
  group: string;
  /** Number of other files in the project that import this file. */
  importCount: number;
}

/** A directed import relationship between two files. */
export interface CodebaseEdge {
  /** Absolute path of the importing file. */
  source: string;
  /** Absolute path of the imported file. */
  target: string;
}

/** Full codebase dependency graph for a project. */
export interface CodebaseGraph {
  /** Absolute path to the project root. */
  projectPath: string;
  /** Detected framework (e.g. "electron", "nextjs", "vite-spa", "node-server", "unknown"). */
  framework: string;
  /** All source files discovered in the project. */
  files: CodebaseFile[];
  /** All resolved import edges between files. */
  edges: CodebaseEdge[];
  /** Unique group names in discovery order. */
  groups: string[];
  /** Time taken to build the graph, in milliseconds. */
  buildTimeMs: number;
}

// ─── Path Config ─────────────────────────────────────────────

/** Resolved tsconfig paths used for alias resolution. */
export interface PathConfig {
  /** Map from alias prefix (e.g. "@shared") to array of resolved base paths. */
  paths: Record<string, string[]>;
  /** Base URL from tsconfig, if any. */
  baseUrl: string | null;
}

// ─── Agent Teams ─────────────────────────────────────────────

/** Live status of an agent derived from tracking events. */
export type AgentStatus = 'pending' | 'active' | 'idle' | 'completed' | 'error';

/** A single event from a tracking JSONL file. */
export interface TrackingEvent {
  /** ISO timestamp. */
  ts: string;
  /** Event type (e.g. "agent_start", "tool_call"). */
  type: string;
  /** Agent name, or null for team-level events. */
  agent: string | null;
  /** Session ID associated with the event. */
  sid: string;
  /** Arbitrary event payload. */
  data: Record<string, unknown>;
}

/** Information about a single agent task within a feature. */
export interface AgentTaskInfo {
  /** Agent name from the manifest (e.g. "coder-task-1"). */
  agentName: string;
  /** Task number from the task file frontmatter, or null. */
  taskNumber: number | null;
  /** Task name from the task file frontmatter, or null. */
  taskName: string | null;
  /** Agent role from the task file frontmatter, or null. */
  agentRole: string | null;
  /** Wave number from the task file frontmatter, or null. */
  wave: number | null;
  /** Task numbers that must complete before this task can start. */
  blockedBy: number[];
  /** Derived live status of this agent. */
  status: AgentStatus;
  /** ISO timestamp of the last event, or null. */
  lastEventTs: string | null;
  /** Last known session ID prefix for log lookup, or null. */
  lastSid: string | null;
  /** Task slug used as the stable join key between session records and agent nodes, or null. */
  taskSlug: string | null;
  /** Files this agent is scoped to touch (from task .md ## Files sections). */
  fileScope: string[];
  /** Total number of events recorded for this agent. */
  eventCount: number;
  /** Whether this agent is a guardian/QA agent. */
  isGuardian: boolean;
}

/** All agent team data for a single feature. */
export interface FeatureAgentData {
  /** Feature slug. */
  feature: string;
  /** Feature status from tracking index. */
  status: string;
  /** Branch associated with this feature, or null. */
  branch: string | null;
  /** Total number of agent tasks in this feature. */
  agentCount: number;
  /** All agent task records. */
  tasks: AgentTaskInfo[];
  /** Most recent 200 events from events.jsonl. */
  events: TrackingEvent[];
}

/** Agent teams data for the entire project. */
export interface AgentTeamsData {
  /** Absolute path to the project root. */
  projectPath: string;
  /** All features found in tracking/index.json. */
  features: FeatureAgentData[];
  /** Whether a tracking/ directory exists in the project. */
  hasTrackingDir: boolean;
}

// ─── Session Log ─────────────────────────────────────────────

/** A single line from a Claude session JSONL file. */
export interface SessionLogLine {
  /** Zero-based line index within the file. */
  index: number;
  /** Raw JSON string from the JSONL file. */
  raw: string;
  /** Timestamp, if present in the parsed line. */
  ts?: string;
  /** Event type (e.g. "assistant", "user", "tool_use"). */
  type?: string;
}

/** A paginated page of session log lines. */
export interface SessionLogPage {
  /** Agent name this log belongs to. */
  agentName: string;
  /** Feature slug this agent worked on. */
  feature: string;
  /** The log lines in this page. */
  lines: SessionLogLine[];
  /** Total number of lines in the file. */
  total: number;
  /** Next cursor (byte offset) for the following page, or -1 if at end. */
  cursor: number;
  /** Absolute path of the matched session file, or null. */
  sessionFile: string | null;
}
