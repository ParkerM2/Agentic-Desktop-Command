/**
 * Agent Dashboard IPC Schemas
 *
 * Zod schemas for the ADC v2 agent dashboard view.
 * These schemas mirror the TypeScript interfaces in
 * src/shared/types/agent-dashboard.ts and are used for
 * runtime validation across the IPC boundary.
 */

import { z } from 'zod';

// ── Enums / Unions ────────────────────────────────────────────

export const AgentSessionTypeSchema = z.enum(['project-owner', 'team-lead', 'teammate']);

export const AgentDashboardStatusSchema = z.enum([
  'running',
  'idle',
  'needs-attention',
  'failed',
  'completed',
]);

export const StreamJsonEventTypeSchema = z.enum([
  'system',
  'assistant',
  'stream_event',
  'result',
]);

export const ChatMessageRoleSchema = z.enum(['assistant', 'user']);

export const PhaseStatusSchema = z.enum(['completed', 'in-progress', 'pending']);

export const FileChangeStatusSchema = z.enum(['A', 'M', 'D']);

export const AgentErrorTypeSchema = z.enum(['bash', 'tool', 'qa', 'warning']);

export const AgentLayoutModeSchema = z.enum([
  'single',
  'two-column',
  'three-column',
  'grid',
  'multi-project',
]);

export const AgentPanelStateSchema = z.enum(['compact', 'expanded', 'popup']);

// ── Content Blocks ────────────────────────────────────────────

export const TextBlockSchema = z.object({
  type: z.literal('text'),
  text: z.string(),
});

export const ToolUseBlockSchema = z.object({
  type: z.literal('tool_use'),
  id: z.string(),
  name: z.string(),
  input: z.record(z.string(), z.unknown()),
});

export const ToolResultBlockSchema = z.object({
  type: z.literal('tool_result'),
  tool_use_id: z.string(),
  content: z.string(),
  is_error: z.boolean().optional(),
});

export const ContentBlockSchema = z.discriminatedUnion('type', [
  TextBlockSchema,
  ToolUseBlockSchema,
  ToolResultBlockSchema,
]);

// ── Agent Session ─────────────────────────────────────────────

export const AgentTokenUsageSchema = z.object({
  input: z.number(),
  output: z.number(),
});

export const AgentSessionSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: AgentSessionTypeSchema,
  status: AgentDashboardStatusSchema,
  model: z.string(),
  teamName: z.string().optional(),
  taskId: z.string().optional(),
  branch: z.string().optional(),
  tmuxPaneId: z.string().optional(),
  sessionJsonlPath: z.string().optional(),
  tokenUsage: AgentTokenUsageSchema,
  startedAt: z.string(),
  lastActivityAt: z.string(),
});

// ── Stream JSON Event ─────────────────────────────────────────

export const StreamJsonEventSchema = z.object({
  type: StreamJsonEventTypeSchema,
  system: z
    .object({
      session_id: z.string().optional(),
      tools: z.array(z.string()).optional(),
      model: z.string().optional(),
    })
    .optional(),
  message: z
    .object({
      content: z.array(ContentBlockSchema),
    })
    .optional(),
  event_type: z.string().optional(),
  delta: z.record(z.string(), z.unknown()).optional(),
  result: z.string().optional(),
  usage: z
    .object({
      input_tokens: z.number(),
      output_tokens: z.number(),
    })
    .optional(),
  cost: z.number().optional(),
});

// ── Chat Message ──────────────────────────────────────────────

export const AgentChatMessageSchema = z.object({
  id: z.string(),
  agentId: z.string(),
  role: ChatMessageRoleSchema,
  content: z.array(ContentBlockSchema),
  timestamp: z.string(),
  isStreaming: z.boolean().optional(),
});

// ── Tool Call Display ─────────────────────────────────────────

export const ToolCallDisplaySchema = z.object({
  id: z.string(),
  name: z.string(),
  input: z.record(z.string(), z.unknown()),
  output: z.string().optional(),
  exitCode: z.number().optional(),
  duration: z.number().optional(),
  isError: z.boolean().optional(),
  isCollapsed: z.boolean().optional(),
});

// ── Team Config ───────────────────────────────────────────────

export const TeamMemberSchema = z.object({
  agentId: z.string(),
  name: z.string(),
  sessionId: z.string(),
  tmuxPaneId: z.string().optional(),
  cwd: z.string(),
  status: AgentDashboardStatusSchema,
});

export const TeamConfigSchema = z.object({
  teamName: z.string(),
  members: z.array(TeamMemberSchema),
});

// ── Task Progress ─────────────────────────────────────────────

export const TaskPhaseSchema = z.object({
  name: z.string(),
  status: PhaseStatusSchema,
  duration: z.number().optional(),
});

export const TaskCriterionSchema = z.object({
  text: z.string(),
  met: z.boolean(),
});

export const TaskProgressSchema = z.object({
  taskNumber: z.number(),
  taskName: z.string(),
  phases: z.array(TaskPhaseSchema),
  acceptanceCriteria: z.array(TaskCriterionSchema),
});

// ── File Change / Error ───────────────────────────────────────

export const FileChangeSchema = z.object({
  path: z.string(),
  status: FileChangeStatusSchema,
  additions: z.number(),
  deletions: z.number(),
});

export const AgentErrorSchema = z.object({
  id: z.string(),
  type: AgentErrorTypeSchema,
  message: z.string(),
  timestamp: z.string(),
  context: z.string().optional(),
});

// ── Panel Data ────────────────────────────────────────────────

export const AgentPanelDataSchema = z.object({
  session: AgentSessionSchema,
  messages: z.array(AgentChatMessageSchema),
  filesChanged: z.array(FileChangeSchema),
  errors: z.array(AgentErrorSchema),
  taskProgress: TaskProgressSchema.optional(),
});

// ── Workflow Task (alias for TaskProgress — used by ProgressWatcherV2) ──

export const WorkflowTaskSchema = z.object({
  taskNumber: z.number(),
  taskName: z.string(),
  phases: z.array(TaskPhaseSchema),
  acceptanceCriteria: z.array(TaskCriterionSchema),
});

// ── QA Dashboard ─────────────────────────────────────────────

export const QaVerificationStatusSchema = z.enum(['pass', 'fail', 'pending']);

export const QaVerdictSchema = z.enum(['pass', 'fail', 'warnings', 'running', 'none']);

export const QaIssueSeveritySchema = z.enum(['critical', 'major', 'minor', 'cosmetic']);

export const QaVerificationSuiteSchema = z.object({
  lint: QaVerificationStatusSchema,
  typecheck: QaVerificationStatusSchema,
  test: QaVerificationStatusSchema,
  build: QaVerificationStatusSchema,
  docs: QaVerificationStatusSchema,
});

export const QaIssueSchema = z.object({
  severity: QaIssueSeveritySchema,
  category: z.string(),
  description: z.string(),
  location: z.string().optional(),
});

export const QaDashboardSessionSchema = z.object({
  sessionId: z.string(),
  taskId: z.string(),
  verdict: QaVerdictSchema,
  checksRun: z.number(),
  checksPassed: z.number(),
  issues: z.array(QaIssueSchema),
  verificationSuite: QaVerificationSuiteSchema,
  duration: z.number(),
  startedAt: z.string(),
  completedAt: z.string().optional(),
});
