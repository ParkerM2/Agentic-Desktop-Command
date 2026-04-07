/**
 * WorkflowEngine Types
 *
 * Core types for the workflow state machine: state enum,
 * transition map, run configuration, engine records, and typed events.
 */

import type { AgentOrchestrator } from '../agent-orchestrator/types';
import type { GitService } from '../git/git-service';
import type { WorkflowTemplateService } from '../workflow-templates/workflow-template-service';

// ─── State Enum ──────────────────────────────────────────────

export enum WorkflowState {
  IDLE = 'IDLE',
  PREFLIGHT = 'PREFLIGHT',
  PLAN = 'PLAN',
  SETUP = 'SETUP',
  SPAWNING = 'SPAWNING',
  QA_GATE = 'QA_GATE',
  GUARDIAN = 'GUARDIAN',
  FINALIZING = 'FINALIZING',
  DONE = 'DONE',
  ERROR = 'ERROR',
}

// ─── Valid Transitions ────────────────────────────────────────

/**
 * Exhaustive map of allowed state transitions.
 * Each state may only advance to the states listed here.
 * ERROR is reachable from any state.
 */
export const VALID_TRANSITIONS = new Map<WorkflowState, WorkflowState[]>([
  [WorkflowState.IDLE, [WorkflowState.PREFLIGHT]],
  [WorkflowState.PREFLIGHT, [WorkflowState.PLAN, WorkflowState.ERROR]],
  [WorkflowState.PLAN, [WorkflowState.SETUP, WorkflowState.ERROR]],
  [WorkflowState.SETUP, [WorkflowState.SPAWNING, WorkflowState.ERROR]],
  [WorkflowState.SPAWNING, [WorkflowState.QA_GATE, WorkflowState.ERROR]],
  [WorkflowState.QA_GATE, [WorkflowState.GUARDIAN, WorkflowState.SPAWNING, WorkflowState.ERROR]],
  [WorkflowState.GUARDIAN, [WorkflowState.FINALIZING, WorkflowState.ERROR]],
  [WorkflowState.FINALIZING, [WorkflowState.DONE, WorkflowState.ERROR]],
  [WorkflowState.DONE, []],
  [WorkflowState.ERROR, []],
]);

// ─── Run Configuration ─────────────────────────────────────────

export interface WorkflowRunConfig {
  /** Feature name / ticket slug (e.g. "workflow-engine") */
  featureName: string;
  /** Absolute path to the project root */
  projectPath: string;
  /** Template ID to apply (null = bare engine, uses defaults) */
  templateId: string | null;
  /** Use git worktrees for agent isolation (true) or branches only (false) */
  useWorktrees: boolean;
  /** Branch name prefix for agent work branches */
  branchPrefix: string;
  /** Max QA rounds before hard failure */
  maxQaRounds: number;
  /** Run QA guardian before finalizing */
  useGuardian: boolean;
  /** Push branch and create PR in FINALIZING */
  createPr: boolean;
  /** Overrides merged on top of template config */
  overrides: Record<string, unknown>;
}

// ─── Engine Record ─────────────────────────────────────────────

export interface WorkflowEngineRecord {
  /** Unique run identifier — scoped per start() call */
  runId: string;
  /** Human-readable feature slug */
  featureName: string;
  /** Current state machine state */
  state: WorkflowState;
  /** Run configuration snapshot (immutable after start) */
  config: WorkflowRunConfig;
  /** ISO timestamp when engine was started */
  startedAt: string;
  /** ISO timestamp of last state transition */
  updatedAt: string;
  /** Error message if state === ERROR */
  errorMessage: string | null;
  /** Current QA round (increments on QA_GATE re-entry) */
  qaRound: number;
  /** Path to the serialized state file for crash recovery */
  stateFilePath: string;
}

// ─── Wave Plan ─────────────────────────────────────────────────

export interface TaskEntry {
  taskNumber: number;
  taskName: string;
  taskSlug: string;
  wave: number;
  blockedBy: number[];
  blocks: number[];
  filePath: string;
}

export interface WavePlan {
  featureName: string;
  waves: TaskEntry[][];
  currentWave: number;
  totalTasks: number;
}

// ─── Engine Events ─────────────────────────────────────────────

export interface WorkflowStateChangedEvent {
  runId: string;
  featureName: string;
  previousState: WorkflowState;
  newState: WorkflowState;
  timestamp: string;
  errorMessage: string | null;
}

export interface WorkflowCompletedEvent {
  runId: string;
  featureName: string;
  timestamp: string;
}

export interface WorkflowErrorEvent {
  runId: string;
  featureName: string;
  state: WorkflowState;
  errorMessage: string;
  timestamp: string;
}

// ─── Service Dependencies ──────────────────────────────────────

export interface WorkflowEngineDeps {
  agentOrchestrator: AgentOrchestrator;
  gitService: GitService;
  templateService: WorkflowTemplateService;
  progressBaseDir: string;
  onStateChanged: (event: WorkflowStateChangedEvent) => void;
  onCompleted: (event: WorkflowCompletedEvent) => void;
  onError: (event: WorkflowErrorEvent) => void;
}

// ─── Service Interface ─────────────────────────────────────────

export interface WorkflowEngineService {
  /**
   * Apply a template to a feature: resolve the three-layer merge, write a
   * snapshot to disk, then start the engine from that snapshot.
   * Returns the runId for the new engine instance.
   */
  applyTemplate: (
    templateId: string,
    featureName: string,
    projectPath: string,
    overrides: Record<string, unknown>,
  ) => string;
  /** Start a new workflow run, returns the runId */
  start: (config: WorkflowRunConfig) => string;
  /** Stop a running engine by runId */
  stop: (runId: string) => { success: boolean; message: string };
  /** Get a single engine record by runId */
  get: (runId: string) => WorkflowEngineRecord | undefined;
  /** List all engine records (active and completed) */
  list: () => WorkflowEngineRecord[];
}
