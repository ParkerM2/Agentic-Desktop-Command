/**
 * WorkflowEngine IPC Schemas
 *
 * Zod schemas for workflow engine run configuration, engine status,
 * and typed UI events.
 */

import { z } from 'zod';

// ─── State Enum Schema ────────────────────────────────────────

export const WorkflowStateSchema = z.enum([
  'IDLE',
  'PREFLIGHT',
  'PLAN',
  'SETUP',
  'SPAWNING',
  'QA_GATE',
  'GUARDIAN',
  'FINALIZING',
  'DONE',
  'ERROR',
]);

// ─── Run Config Schema ─────────────────────────────────────────

export const WorkflowRunConfigSchema = z.object({
  featureName: z.string().min(1),
  projectPath: z.string().min(1),
  templateId: z.string().nullable(),
  useWorktrees: z.boolean().default(true),
  branchPrefix: z.string().default('work'),
  maxQaRounds: z.number().int().min(1).max(10).default(2),
  useGuardian: z.boolean().default(true),
  createPr: z.boolean().default(false),
  overrides: z.record(z.string(), z.unknown()).default({}),
});

// ─── Engine Record Schema ──────────────────────────────────────

export const WorkflowEngineRecordSchema = z.object({
  runId: z.string(),
  featureName: z.string(),
  state: WorkflowStateSchema,
  config: WorkflowRunConfigSchema,
  startedAt: z.string(),
  updatedAt: z.string(),
  errorMessage: z.string().nullable(),
  qaRound: z.number().int().min(0),
  stateFilePath: z.string(),
});

// ─── Apply Input Schema ───────────────────────────────────────

/**
 * Input for the workflow-engine.apply channel.
 * Drives the three-layer merge: template defaults → overrides → runtime.
 */
export const WorkflowApplyInputSchema = z.object({
  /** ID of the WorkflowTemplate to apply */
  templateId: z.string().min(1),
  /** Feature name / ticket slug (e.g. "my-feature") */
  featureName: z.string().min(1),
  /** Absolute path to the project root */
  projectPath: z.string().min(1),
  /**
   * User overrides merged on top of template config.
   * Keys correspond to WorkflowRunConfig fields (excluding featureName/projectPath/templateId).
   */
  overrides: z.record(z.string(), z.unknown()).default({}),
});

// ─── Event Schemas ─────────────────────────────────────────────

export const WorkflowStateChangedEventSchema = z.object({
  runId: z.string(),
  featureName: z.string(),
  previousState: WorkflowStateSchema,
  newState: WorkflowStateSchema,
  timestamp: z.string(),
  errorMessage: z.string().nullable(),
});

export const WorkflowCompletedEventSchema = z.object({
  runId: z.string(),
  featureName: z.string(),
  timestamp: z.string(),
});

export const WorkflowErrorEventSchema = z.object({
  runId: z.string(),
  featureName: z.string(),
  state: WorkflowStateSchema,
  errorMessage: z.string(),
  timestamp: z.string(),
});
