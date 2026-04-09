/**
 * Agent Dashboard IPC Contract
 *
 * Invoke and event channel definitions for the ADC v2 agent dashboard.
 *
 * Invoke channels handle request/response operations (spawn, query, command).
 * Event channels handle push notifications from main to renderer.
 */

import { z } from 'zod';

import { SuccessResponseSchema } from '../common/schemas';

import { AGENT_DASHBOARD, AGENT_DASHBOARD_EVENTS } from './channels';
import {
  AgentChatMessageSchema,
  AgentDashboardStatusSchema,
  AgentSessionSchema,
  AgentSessionTypeSchema,
  AgentTokenUsageSchema,
  FileChangeSchema,
  QaDashboardSessionSchema,
  StreamJsonEventSchema,
  TeamMemberSchema,
  WorkflowTaskSchema,
} from './schemas';

// ── Invoke Channels ───────────────────────────────────────────

export const agentDashboardInvoke = {
  /** Spawn a headless stream-json Project Owner session */
  [AGENT_DASHBOARD.SPAWN['PROJECT-OWNER']]: {
    input: z.object({
      projectPath: z.string(),
      prompt: z.string(),
      model: z.string().optional(),
      name: z.string().optional(),
    }),
    output: z.object({
      sessionId: z.string(),
      status: z.literal('spawned'),
    }),
  },

  /** Spawn a tmux-based Team Lead session with Agent Teams enabled */
  [AGENT_DASHBOARD.SPAWN['TEAM-LEAD']]: {
    input: z.object({
      projectPath: z.string(),
      teamName: z.string(),
      prompt: z.string(),
      model: z.string().optional(),
      name: z.string().optional(),
    }),
    output: z.object({
      sessionId: z.string(),
      tmuxSessionName: z.string().optional(),
      status: z.literal('spawned'),
    }),
  },

  /** List all active agent sessions across all types */
  [AGENT_DASHBOARD.LIST.SESSIONS]: {
    input: z.object({
      type: AgentSessionTypeSchema.optional(),
      teamName: z.string().optional(),
    }),
    output: z.array(AgentSessionSchema),
  },

  /** Get details for a single agent session */
  [AGENT_DASHBOARD.GET.SESSION]: {
    input: z.object({ sessionId: z.string() }),
    output: AgentSessionSchema.nullable(),
  },

  /** Send a message to an agent (stdin for PO, tmux send-keys for TL/teammates) */
  [AGENT_DASHBOARD.SEND.MESSAGE]: {
    input: z.object({
      sessionId: z.string(),
      message: z.string(),
    }),
    output: SuccessResponseSchema,
  },

  /** Stop an agent session gracefully */
  [AGENT_DASHBOARD.STOP.SESSION]: {
    input: z.object({ sessionId: z.string() }),
    output: SuccessResponseSchema,
  },

  /** Get files changed on an agent's working branch */
  [AGENT_DASHBOARD.GET['FILES-CHANGED']]: {
    input: z.object({
      sessionId: z.string(),
      branch: z.string().optional(),
    }),
    output: z.array(FileChangeSchema),
  },

  /** Get all workflow tasks for a feature slug */
  [AGENT_DASHBOARD.GET['TASKS-FOR-FEATURE']]: {
    input: z.object({ featureSlug: z.string() }),
    output: z.array(WorkflowTaskSchema),
  },

  /** Get a single workflow task by feature slug and task number */
  [AGENT_DASHBOARD.GET.TASK]: {
    input: z.object({ featureSlug: z.string(), taskNumber: z.number() }),
    output: WorkflowTaskSchema.nullable(),
  },

  /** Get the QA session for a specific task */
  [AGENT_DASHBOARD.GET['QA-SESSION']]: {
    input: z.object({ taskId: z.string() }),
    output: QaDashboardSessionSchema.nullable(),
  },

  /** List all QA sessions */
  [AGENT_DASHBOARD.LIST['QA-SESSIONS']]: {
    input: z.object({}),
    output: z.array(QaDashboardSessionSchema),
  },

  /** Get all agent sessions associated with a task slug */
  [AGENT_DASHBOARD.LIST['SESSIONS-FOR-TASK']]: {
    input: z.object({ slug: z.string() }),
    output: z.array(
      z.object({
        sessionId: z.string(),
        name: z.string(),
        role: z.string(),
        taskSlug: z.string(),
        taskNumber: z.number().nullable(),
        status: AgentDashboardStatusSchema,
        branch: z.string().nullable(),
        model: z.string(),
        tokenUsage: AgentTokenUsageSchema,
        startedAt: z.string(),
        lastActivityAt: z.string(),
        exitCode: z.number().nullable(),
        isTeamLead: z.boolean(),
      }),
    ),
  },

  /** Get paginated session log (JSONL entries) for a session */
  [AGENT_DASHBOARD.GET['SESSION-LOG']]: {
    input: z.object({
      sessionId: z.string(),
      offset: z.number().optional(),
      limit: z.number().optional(),
    }),
    output: z.array(z.record(z.string(), z.unknown())),
  },

  /** Get the git diff for a session's working branch */
  [AGENT_DASHBOARD.GET['GIT-DIFF']]: {
    input: z.object({ sessionId: z.string() }),
    output: z.object({ diff: z.string() }),
  },
} as const;

// ── Event Channels ────────────────────────────────────────────

export const agentDashboardEvents = {
  /** A new agent session was detected or spawned */
  [AGENT_DASHBOARD_EVENTS.SESSION.STARTED]: {
    payload: AgentSessionSchema,
  },

  /** An agent session has ended (completed, failed, or killed) */
  [AGENT_DASHBOARD_EVENTS.SESSION.ENDED]: {
    payload: z.object({
      sessionId: z.string(),
      status: AgentDashboardStatusSchema,
      exitCode: z.number().optional(),
    }),
  },

  /** A new chat message was received from an agent */
  [AGENT_DASHBOARD_EVENTS.MESSAGE.RECEIVED]: {
    payload: AgentChatMessageSchema,
  },

  /** An agent's status changed */
  [AGENT_DASHBOARD_EVENTS.SESSION['STATUS-CHANGED']]: {
    payload: z.object({
      sessionId: z.string(),
      previousStatus: AgentDashboardStatusSchema,
      newStatus: AgentDashboardStatusSchema,
    }),
  },

  /** A new teammate was detected via team config watcher */
  [AGENT_DASHBOARD_EVENTS.TEAMMATE.JOINED]: {
    payload: TeamMemberSchema,
  },

  /** A teammate left or was removed */
  [AGENT_DASHBOARD_EVENTS.TEAMMATE.LEFT]: {
    payload: z.object({
      agentId: z.string(),
      teamName: z.string(),
    }),
  },

  /** Token-level streaming delta for real-time UI updates */
  [AGENT_DASHBOARD_EVENTS.STREAM.EVENT]: {
    payload: z.object({
      sessionId: z.string(),
      event: StreamJsonEventSchema,
    }),
  },

  /** A workflow task was updated (phase change, criterion met, etc.) */
  [AGENT_DASHBOARD_EVENTS.TASK.UPDATED]: {
    payload: z.object({
      featureSlug: z.string(),
      task: WorkflowTaskSchema,
    }),
  },

  /** A QA session was updated (new verdict, check completed, etc.) */
  [AGENT_DASHBOARD_EVENTS.QA['SESSION-UPDATED']]: {
    payload: QaDashboardSessionSchema,
  },
} as const;
