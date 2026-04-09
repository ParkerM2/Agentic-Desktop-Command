import { z } from 'zod';

// ── Command Query ───────────────────────────────────────────

export const commandFilterSchema = z.object({
  domain: z.string().optional(),
  verb: z.string().optional(),
  sourceType: z.string().optional(),
  projectId: z.string().optional(),
  since: z.string().optional(),
  limit: z.number().optional(),
});

export const commandRecordSchema = z.object({
  id: z.string(),
  channel: z.string(),
  domain: z.string(),
  verb: z.string(),
  noun: z.string().nullable(),
  isMutation: z.boolean(),
  sourceType: z.string(),
  sourceId: z.string().nullable(),
  sourceName: z.string().nullable(),
  input: z.unknown(),
  output: z.unknown(),
  status: z.string(),
  error: z.string().nullable(),
  durationMs: z.number().nullable(),
  projectId: z.string().nullable(),
  createdAt: z.string(),
});

// ── Event Query ─────────────────────────────────────────────

export const eventFilterSchema = z.object({
  channel: z.string().optional(),
  sessionId: z.string().optional(),
  since: z.string().optional(),
  limit: z.number().optional(),
});

export const eventRecordSchema = z.object({
  id: z.string(),
  channel: z.string(),
  payload: z.unknown(),
  sourceCommandId: z.string().nullable(),
  sessionId: z.string().nullable(),
  projectId: z.string().nullable(),
  createdAt: z.string(),
});

// ── Session ─────────────────────────────────────────────────

export const sessionFilterSchema = z.object({
  status: z.string().optional(),
  type: z.string().optional(),
  projectId: z.string().optional(),
  taskSlug: z.string().optional(),
  parentId: z.string().optional(),
});

export const sessionRecordSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  phase: z.string().nullable(),
  status: z.string(),
  projectId: z.string().nullable(),
  taskSlug: z.string().nullable(),
  model: z.string().nullable(),
  pid: z.number().nullable(),
  worktreePath: z.string().nullable(),
  spawnConfig: z.unknown(),
  tokenUsage: z.unknown(),
  toolUsage: z.unknown(),
  parentId: z.string().nullable(),
  teamName: z.string().nullable(),
  wave: z.number().nullable(),
  taskIndex: z.number().nullable(),
  startedAt: z.string(),
  endedAt: z.string().nullable(),
  exitCode: z.number().nullable(),
  error: z.string().nullable(),
});

export const sessionSpawnInputSchema = z.object({
  name: z.string(),
  type: z.enum(['project-owner', 'team-lead', 'assistant', 'qa', 'research', 'planner']),
  phase: z.enum(['research', 'planning', 'executing', 'qa']).optional(),
  projectId: z.string().optional(),
  projectPath: z.string().optional(),
  taskSlug: z.string().optional(),
  prompt: z.string(),
  model: z.string().optional(),
  parentId: z.string().optional(),
  teamName: z.string().optional(),
  wave: z.number().optional(),
  taskIndex: z.number().optional(),
  worktreePath: z.string().optional(),
});

export const sessionIdInputSchema = z.object({
  sessionId: z.string(),
});

export const successOutputSchema = z.object({
  success: z.boolean(),
});

// ── Registry ────────────────────────────────────────────────

export const registryEntrySchema = z.object({
  channel: z.string(),
  domain: z.string(),
  verb: z.string(),
  noun: z.string().nullable(),
  isMutation: z.boolean(),
});
