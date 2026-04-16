import { z } from 'zod';

export const ScopeRefSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('project'), projectId: z.string().min(1) }),
  z.object({
    kind: z.literal('worktree'),
    projectId: z.string().min(1),
    worktreePath: z.string().min(1),
  }),
]);
export type ScopeRef = z.infer<typeof ScopeRefSchema>;

export const RunnerStatusSchema = z.enum([
  'idle',
  'starting',
  'running',
  'ready',
  'failed',
  'stopping',
  'stopped',
]);
export type RunnerStatus = z.infer<typeof RunnerStatusSchema>;

export const RunnerProfileSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  name: z.string().min(1),
  command: z.string().min(1),
  cwdRelative: z.string().default('.'),
  env: z.record(z.string(), z.string()).default({}),
  healthCheckUrl: z.url().optional(),
  healthCheckTimeoutMs: z.number().int().positive().default(30_000),
  autoRestart: z.boolean().default(false),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type RunnerProfile = z.infer<typeof RunnerProfileSchema>;

export const RunnerInstanceSchema = z.object({
  id: z.string(),
  profileId: z.string(),
  scope: ScopeRefSchema,
  status: RunnerStatusSchema,
  pid: z.number().int().optional(),
  resolvedCwd: z.string(),
  resolvedCommand: z.string(),
  exitCode: z.number().int().nullable().optional(),
  startedAt: z.string().optional(),
  readyAt: z.string().optional(),
  stoppedAt: z.string().optional(),
  lastError: z.string().optional(),
});
export type RunnerInstance = z.infer<typeof RunnerInstanceSchema>;

export const RunnerStatusEventSchema = z.object({
  instanceId: z.string(),
  status: RunnerStatusSchema,
  exitCode: z.number().int().nullable().optional(),
  lastError: z.string().optional(),
});
export type RunnerStatusEvent = z.infer<typeof RunnerStatusEventSchema>;

export const RunnerOutputEventSchema = z.object({
  instanceId: z.string(),
  stream: z.enum(['stdout', 'stderr']),
  chunk: z.string(),
});
export type RunnerOutputEvent = z.infer<typeof RunnerOutputEventSchema>;

export const RunnerHealthEventSchema = z.object({
  instanceId: z.string(),
  healthy: z.boolean(),
  statusCode: z.number().int().optional(),
  responseTimeMs: z.number().int().optional(),
});
export type RunnerHealthEvent = z.infer<typeof RunnerHealthEventSchema>;
