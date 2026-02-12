import { z } from 'zod';

// ─── Task Domain ────────────────────────────────────────────────

export const TaskStatusSchema = z.enum([
  'pending',
  'queued',
  'in_progress',
  'review',
  'done',
  'error',
  'cancelled',
  'staged',
  'archived',
]);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export const TaskPrioritySchema = z.enum(['low', 'medium', 'high', 'critical']);
export type TaskPriority = z.infer<typeof TaskPrioritySchema>;

export const TaskSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  title: z.string(),
  description: z.string().optional(),
  status: TaskStatusSchema,
  priority: TaskPrioritySchema.optional(),
  specName: z.string().optional(),
  branch: z.string().optional(),
  worktreePath: z.string().optional(),
  assignedAgent: z.string().optional(),
  logs: z.array(z.string()).optional(),
  error: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
});
export type Task = z.infer<typeof TaskSchema>;

export const TaskDraftSchema = z.object({
  projectId: z.string(),
  title: z.string().min(1),
  description: z.string().optional(),
  priority: TaskPrioritySchema.optional(),
});
export type TaskDraft = z.infer<typeof TaskDraftSchema>;

// ─── Project Domain ─────────────────────────────────────────────

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  path: z.string(),
  gitBranch: z.string().optional(),
  createdAt: z.string(),
  settings: z.record(z.unknown()).optional(),
});
export type Project = z.infer<typeof ProjectSchema>;

// ─── Terminal Domain ────────────────────────────────────────────

export const TerminalSessionSchema = z.object({
  id: z.string(),
  projectId: z.string().optional(),
  title: z.string(),
  cwd: z.string(),
  isActive: z.boolean(),
  worktreeConfig: z
    .object({
      specName: z.string(),
      worktreePath: z.string(),
    })
    .optional(),
  displayOrder: z.number().optional(),
  createdAt: z.string(),
});
export type TerminalSession = z.infer<typeof TerminalSessionSchema>;

// ─── Agent Domain ───────────────────────────────────────────────

export const AgentStatusSchema = z.enum([
  'idle',
  'running',
  'waiting',
  'error',
]);
export type AgentStatus = z.infer<typeof AgentStatusSchema>;

export const AgentSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  status: AgentStatusSchema,
  terminalId: z.string().optional(),
  claudeSessionId: z.string().optional(),
  startedAt: z.string().optional(),
});
export type Agent = z.infer<typeof AgentSchema>;

// ─── Settings Domain ────────────────────────────────────────────

export const AppSettingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  language: z.string().default('en'),
  maxConcurrentAgents: z.number().default(3),
  autoSave: z.boolean().default(true),
  telemetryEnabled: z.boolean().default(false),
  claudeCodePath: z.string().optional(),
  defaultBranch: z.string().default('main'),
});
export type AppSettings = z.infer<typeof AppSettingsSchema>;

// ─── Common Schemas ─────────────────────────────────────────────

export const PaginatedSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    total: z.number(),
  });
