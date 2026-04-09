/**
 * Tasks IPC Contract
 *
 * Invoke and event channel definitions for local tasks, Hub tasks,
 * and task-related events (status changes, progress, logs).
 */

import { z } from 'zod';

import { HUB_TASKS, HUB_TASKS_EVENTS, TASKS, TASKS_EVENTS } from './channels';
import {
  ExecutionProgressSchema,
  GithubIssueImportSchema,
  HubTaskPrioritySchema,
  HubTaskSchema,
  HubTaskStatusSchema,
  TaskDecompositionResultSchema,
  TaskDraftSchema,
  TaskSchema,
  TaskStatusSchema,
} from './schemas';

/** Invoke channels for local task operations */
export const tasksInvoke = {
  [TASKS.LIST.ALL]: {
    input: z.object({ projectId: z.string() }),
    output: z.array(TaskSchema),
  },
  [TASKS.GET.TASK]: {
    input: z.object({ projectId: z.string(), taskId: z.string() }),
    output: TaskSchema,
  },
  [TASKS.CREATE.TASK]: {
    input: TaskDraftSchema,
    output: TaskSchema,
  },
  [TASKS.UPDATE.TASK]: {
    input: z.object({ taskId: z.string(), updates: z.record(z.string(), z.unknown()) }),
    output: TaskSchema,
  },
  [TASKS.UPDATE.STATUS]: {
    input: z.object({ taskId: z.string(), status: TaskStatusSchema }),
    output: TaskSchema,
  },
  [TASKS.DELETE.TASK]: {
    input: z.object({ taskId: z.string(), projectId: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
  [TASKS.EXECUTE.TASK]: {
    input: z.object({ taskId: z.string(), projectId: z.string() }),
    output: z.object({ agentId: z.string() }),
  },
  [TASKS.LIST.EVERY]: {
    input: z.object({}),
    output: z.array(TaskSchema),
  },
  [TASKS.DECOMPOSE.TASK]: {
    input: z.object({ description: z.string().min(1) }),
    output: TaskDecompositionResultSchema,
  },
  [TASKS.IMPORT['GITHUB-ISSUES']]: {
    input: z.object({ url: z.string(), projectId: z.string() }),
    output: TaskSchema,
  },
  [TASKS.LIST_GITHUB.ISSUES]: {
    input: z.object({ owner: z.string(), repo: z.string() }),
    output: z.array(GithubIssueImportSchema),
  },
} as const;

/** Invoke channels for Hub task operations */
export const hubTasksInvoke = {
  [HUB_TASKS.LIST.ALL]: {
    input: z.object({
      projectId: z.string().optional(),
      workspaceId: z.string().optional(),
    }),
    output: z.object({ tasks: z.array(HubTaskSchema) }),
  },
  [HUB_TASKS.GET.TASK]: {
    input: z.object({ taskId: z.string() }),
    output: HubTaskSchema,
  },
  [HUB_TASKS.CREATE.TASK]: {
    input: z.object({
      projectId: z.string(),
      workspaceId: z.string().optional(),
      title: z.string(),
      description: z.string().optional(),
      priority: HubTaskPrioritySchema.optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    }),
    output: HubTaskSchema,
  },
  [HUB_TASKS.UPDATE.TASK]: {
    input: z.object({
      taskId: z.string(),
      title: z.string().optional(),
      description: z.string().optional(),
      status: HubTaskStatusSchema.optional(),
      priority: HubTaskPrioritySchema.optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    }),
    output: HubTaskSchema,
  },
  [HUB_TASKS.UPDATE.STATUS]: {
    input: z.object({
      taskId: z.string(),
      status: HubTaskStatusSchema,
    }),
    output: HubTaskSchema,
  },
  [HUB_TASKS.DELETE.TASK]: {
    input: z.object({ taskId: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
  [HUB_TASKS.EXECUTE.TASK]: {
    input: z.object({ taskId: z.string() }),
    output: z.object({ sessionId: z.string(), status: z.enum(['started', 'queued']) }),
  },
  [HUB_TASKS.CANCEL.TASK]: {
    input: z.object({
      taskId: z.string(),
      reason: z.string().optional(),
    }),
    output: z.object({
      success: z.boolean(),
      previousStatus: HubTaskStatusSchema,
    }),
  },
} as const;

/** Event channels for task-related events */
export const tasksEvents = {
  [TASKS_EVENTS.STATUS.CHANGED]: {
    payload: z.object({ taskId: z.string(), status: TaskStatusSchema, projectId: z.string() }),
  },
  [TASKS_EVENTS.PROGRESS.UPDATED]: {
    payload: z.object({ taskId: z.string(), progress: ExecutionProgressSchema }),
  },
  [TASKS_EVENTS.LOG.APPENDED]: {
    payload: z.object({ taskId: z.string(), log: z.string() }),
  },
  [TASKS_EVENTS.PLAN.UPDATED]: {
    payload: z.object({ taskId: z.string(), plan: z.unknown() }),
  },
} as const;

/** Hub task event channels */
export const hubTasksEvents = {
  [HUB_TASKS_EVENTS.TASK.CREATED]: {
    payload: z.object({ taskId: z.string(), projectId: z.string() }),
  },
  [HUB_TASKS_EVENTS.TASK.UPDATED]: {
    payload: z.object({ taskId: z.string(), projectId: z.string() }),
  },
  [HUB_TASKS_EVENTS.TASK.DELETED]: {
    payload: z.object({ taskId: z.string(), projectId: z.string() }),
  },
  [HUB_TASKS_EVENTS.PROGRESS.UPDATED]: {
    payload: z.object({ taskId: z.string(), progress: z.number(), phase: z.string() }),
  },
  [HUB_TASKS_EVENTS.TASK_RUN.COMPLETED]: {
    payload: z.object({
      taskId: z.string(),
      projectId: z.string(),
      result: z.enum(['success', 'failure']),
    }),
  },
} as const;
