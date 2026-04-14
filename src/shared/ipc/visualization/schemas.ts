/**
 * Visualization IPC Schemas
 *
 * Zod schemas for the visualization domain: codebase dependency graphs,
 * agent team tracking data, and session log pagination.
 */

import { z } from 'zod';

// ─── Codebase Graph Schemas ───────────────────────────────────────

/** A single file node in the codebase dependency graph */
export const CodebaseFileSchema = z.object({
  path: z.string().max(500),
  relativePath: z.string().max(500),
  fileName: z.string().max(500),
  ext: z.string().max(500),
  group: z.string().max(500),
  importCount: z.number(),
});

/** A directed edge between two file nodes */
export const CodebaseEdgeSchema = z.object({
  source: z.string().max(500),
  target: z.string().max(500),
});

/** Full codebase dependency graph for a project */
export const CodebaseGraphSchema = z.object({
  projectPath: z.string().max(500),
  framework: z.string().max(500),
  files: z.array(CodebaseFileSchema),
  edges: z.array(CodebaseEdgeSchema),
  groups: z.array(z.string().max(500)),
  buildTimeMs: z.number(),
});

// ─── Agent Teams Schemas ──────────────────────────────────────────

/** Status of a single agent task */
export const AgentStatusSchema = z.enum([
  'pending',
  'active',
  'idle',
  'completed',
  'error',
  'killed',
]);

/** A single tracking event emitted by an agent */
export const TrackingEventSchema = z.object({
  ts: z.string(),
  type: z.string(),
  agent: z.string().nullable(),
  sid: z.string(),
  data: z.record(z.string(), z.unknown()),
});

/** Metadata for a single agent task within a feature */
export const AgentTaskInfoSchema = z.object({
  agentName: z.string(),
  taskNumber: z.number().nullable(),
  taskName: z.string().nullable(),
  agentRole: z.string().nullable(),
  wave: z.number().nullable(),
  blockedBy: z.array(z.number()),
  status: AgentStatusSchema,
  lastEventTs: z.string().nullable(),
  lastSid: z.string().nullable(),
  fileScope: z.array(z.string().max(500)),
  eventCount: z.number(),
  isGuardian: z.boolean(),
});

/** Aggregated data for all agents working on a single feature */
export const FeatureAgentDataSchema = z.object({
  feature: z.string(),
  status: z.string(),
  branch: z.string().nullable(),
  agentCount: z.number(),
  tasks: z.array(AgentTaskInfoSchema),
  events: z.array(TrackingEventSchema).max(200),
});

/** Top-level agent teams data for a project */
export const AgentTeamsDataSchema = z.object({
  projectPath: z.string().max(500),
  features: z.array(FeatureAgentDataSchema),
  hasTrackingDir: z.boolean(),
});

// ─── Session Log Schemas ──────────────────────────────────────────

/** A single parsed line from a JSONL session log */
export const SessionLogLineSchema = z.object({
  index: z.number(),
  raw: z.string(),
  ts: z.string().optional(),
  type: z.string().optional(),
});

/**
 * A paginated page of session log lines.
 * cursor is a byte offset into the file; -1 means end of file.
 * sessionFile is null when no session file was found.
 */
export const SessionLogPageSchema = z.object({
  agentName: z.string(),
  feature: z.string(),
  lines: z.array(SessionLogLineSchema),
  total: z.number(),
  cursor: z.number(),
  sessionFile: z.string().nullable(),
});
