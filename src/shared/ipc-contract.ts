/**
 * IPC Contract — Single Source of Truth
 *
 * Every IPC channel is defined here once. Types flow to:
 * - Main process handlers (validated with Zod at the boundary)
 * - Preload bridge (typed invoke/on)
 * - Renderer hooks (fully typed React Query functions)
 *
 * Adding a new IPC operation = add one entry here. That's it.
 */

import { z } from 'zod';

// ─── Zod Schemas ───────────────────────────────────────────────

const TaskStatusSchema = z.enum([
  'backlog',
  'queue',
  'in_progress',
  'ai_review',
  'human_review',
  'done',
  'pr_created',
  'error',
]);

const SubtaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  status: z.enum(['pending', 'in_progress', 'completed', 'failed']),
  files: z.array(z.string()),
});

const ExecutionPhaseSchema = z.enum([
  'idle',
  'planning',
  'coding',
  'testing',
  'reviewing',
  'complete',
  'error',
]);

const ExecutionProgressSchema = z.object({
  phase: ExecutionPhaseSchema,
  phaseProgress: z.number(),
  overallProgress: z.number(),
  currentSubtask: z.string().optional(),
  message: z.string().optional(),
  startedAt: z.string().optional(),
  sequenceNumber: z.number().optional(),
  completedPhases: z.array(ExecutionPhaseSchema).optional(),
});

const TaskSchema = z.object({
  id: z.string(),
  specId: z.string().optional(),
  title: z.string(),
  description: z.string(),
  status: TaskStatusSchema,
  subtasks: z.array(SubtaskSchema),
  executionProgress: ExecutionProgressSchema.optional(),
  reviewReason: z.enum(['completed', 'errors', 'qa_rejected', 'plan_review']).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  logs: z.array(z.string()).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const TaskDraftSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  projectId: z.string(),
  complexity: z.enum(['simple', 'standard', 'complex']).optional(),
});

const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  path: z.string(),
  autoBuildPath: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const TerminalSessionSchema = z.object({
  id: z.string(),
  name: z.string(),
  cwd: z.string(),
  projectPath: z.string().optional(),
  isActive: z.boolean(),
  createdAt: z.string(),
});

const AppSettingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']),
  colorTheme: z.string(),
  language: z.string(),
  uiScale: z.number(),
  onboardingCompleted: z.boolean(),
  fontFamily: z.string().optional(),
  fontSize: z.number().optional(),
});

const AgentSessionSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  projectId: z.string(),
  status: z.enum(['idle', 'running', 'paused', 'error', 'completed']),
  worktreePath: z.string().optional(),
  terminalId: z.string().optional(),
  startedAt: z.string(),
  completedAt: z.string().optional(),
});

// ─── IPC Contract Definition ──────────────────────────────────

/**
 * Every invoke-style IPC channel (renderer → main → response)
 */
export const ipcInvokeContract = {
  // ── Projects ──
  'projects.list': {
    input: z.object({}),
    output: z.array(ProjectSchema),
  },
  'projects.add': {
    input: z.object({ path: z.string() }),
    output: ProjectSchema,
  },
  'projects.remove': {
    input: z.object({ projectId: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
  'projects.initialize': {
    input: z.object({ projectId: z.string() }),
    output: z.object({ success: z.boolean(), error: z.string().optional() }),
  },
  'projects.selectDirectory': {
    input: z.object({}),
    output: z.object({ path: z.string().nullable() }),
  },

  // ── Tasks ──
  'tasks.list': {
    input: z.object({ projectId: z.string() }),
    output: z.array(TaskSchema),
  },
  'tasks.get': {
    input: z.object({ projectId: z.string(), taskId: z.string() }),
    output: TaskSchema,
  },
  'tasks.create': {
    input: TaskDraftSchema,
    output: TaskSchema,
  },
  'tasks.update': {
    input: z.object({ taskId: z.string(), updates: z.record(z.string(), z.unknown()) }),
    output: TaskSchema,
  },
  'tasks.updateStatus': {
    input: z.object({ taskId: z.string(), status: TaskStatusSchema }),
    output: TaskSchema,
  },
  'tasks.delete': {
    input: z.object({ taskId: z.string(), projectId: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
  'tasks.execute': {
    input: z.object({ taskId: z.string(), projectId: z.string() }),
    output: z.object({ agentId: z.string() }),
  },

  // ── Terminals ──
  'terminals.list': {
    input: z.object({ projectPath: z.string().optional() }),
    output: z.array(TerminalSessionSchema),
  },
  'terminals.create': {
    input: z.object({ cwd: z.string(), projectPath: z.string().optional() }),
    output: TerminalSessionSchema,
  },
  'terminals.close': {
    input: z.object({ sessionId: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
  'terminals.sendInput': {
    input: z.object({ sessionId: z.string(), data: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
  'terminals.resize': {
    input: z.object({ sessionId: z.string(), cols: z.number(), rows: z.number() }),
    output: z.object({ success: z.boolean() }),
  },
  'terminals.invokeClaudeCli': {
    input: z.object({ sessionId: z.string(), cwd: z.string() }),
    output: z.object({ success: z.boolean() }),
  },

  // ── Agents ──
  'agents.list': {
    input: z.object({ projectId: z.string() }),
    output: z.array(AgentSessionSchema),
  },
  'agents.stop': {
    input: z.object({ agentId: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
  'agents.pause': {
    input: z.object({ agentId: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
  'agents.resume': {
    input: z.object({ agentId: z.string() }),
    output: z.object({ success: z.boolean() }),
  },

  // ── Settings ──
  'settings.get': {
    input: z.object({}),
    output: AppSettingsSchema,
  },
  'settings.update': {
    input: z.record(z.string(), z.unknown()),
    output: AppSettingsSchema,
  },
  'settings.getProfiles': {
    input: z.object({}),
    output: z.array(z.object({ id: z.string(), name: z.string(), isDefault: z.boolean() })),
  },

  // ── App ──
  'app.getVersion': {
    input: z.object({}),
    output: z.object({ version: z.string() }),
  },
} as const;

/**
 * Every event-style IPC channel (main → renderer, no response)
 */
export const ipcEventContract = {
  // ── Task Events ──
  'event:task.statusChanged': {
    payload: z.object({ taskId: z.string(), status: TaskStatusSchema, projectId: z.string() }),
  },
  'event:task.progressUpdated': {
    payload: z.object({ taskId: z.string(), progress: ExecutionProgressSchema }),
  },
  'event:task.logAppended': {
    payload: z.object({ taskId: z.string(), log: z.string() }),
  },
  'event:task.planUpdated': {
    payload: z.object({ taskId: z.string(), plan: z.unknown() }),
  },

  // ── Terminal Events ──
  'event:terminal.output': {
    payload: z.object({ sessionId: z.string(), data: z.string() }),
  },
  'event:terminal.closed': {
    payload: z.object({ sessionId: z.string() }),
  },
  'event:terminal.titleChanged': {
    payload: z.object({ sessionId: z.string(), title: z.string() }),
  },

  // ── Agent Events ──
  'event:agent.statusChanged': {
    payload: z.object({ agentId: z.string(), status: z.string(), taskId: z.string() }),
  },
  'event:agent.log': {
    payload: z.object({ agentId: z.string(), message: z.string() }),
  },

  // ── Project Events ──
  'event:project.updated': {
    payload: z.object({ projectId: z.string() }),
  },

  // ── App Events ──
  'event:app.updateAvailable': {
    payload: z.object({ version: z.string() }),
  },
  'event:app.updateDownloaded': {
    payload: z.object({ version: z.string() }),
  },

  // ── Rate Limit Events ──
  'event:rateLimit.detected': {
    payload: z.object({
      taskId: z.string().optional(),
      provider: z.string(),
      retryAfter: z.number().optional(),
    }),
  },
} as const;

// ─── Type Utilities ───────────────────────────────────────────

/** All invoke channel names */
export type InvokeChannel = keyof typeof ipcInvokeContract;

/** All event channel names */
export type EventChannel = keyof typeof ipcEventContract;

/** Input type for an invoke channel */
export type InvokeInput<T extends InvokeChannel> = z.infer<(typeof ipcInvokeContract)[T]['input']>;

/** Output type for an invoke channel */
export type InvokeOutput<T extends InvokeChannel> = z.infer<
  (typeof ipcInvokeContract)[T]['output']
>;

/** Payload type for an event channel */
export type EventPayload<T extends EventChannel> = z.infer<(typeof ipcEventContract)[T]['payload']>;

// Re-export schemas for use in handlers
export {
  TaskSchema,
  TaskDraftSchema,
  TaskStatusSchema,
  ProjectSchema,
  TerminalSessionSchema,
  AppSettingsSchema,
  AgentSessionSchema,
  ExecutionProgressSchema,
  SubtaskSchema,
};
