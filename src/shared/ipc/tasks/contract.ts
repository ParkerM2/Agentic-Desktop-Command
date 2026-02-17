/**
 * Tasks IPC Contract
 *
 * Invoke and event channel definitions for local tasks, Hub tasks,
 * and task-related events (status changes, progress, logs).
 */

import { z } from 'zod';

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
  'tasks.listAll': {
    input: z.object({}),
    output: z.array(TaskSchema),
  },
  'tasks.decompose': {
    input: z.object({ description: z.string().min(1) }),
    output: TaskDecompositionResultSchema,
  },
  'tasks.importFromGithub': {
    input: z.object({ url: z.string(), projectId: z.string() }),
    output: TaskSchema,
  },
  'tasks.listGithubIssues': {
    input: z.object({ owner: z.string(), repo: z.string() }),
    output: z.array(GithubIssueImportSchema),
  },
} as const;

/** Invoke channels for Hub task operations */
export const hubTasksInvoke = {
  'hub.tasks.list': {
    input: z.object({
      projectId: z.string().optional(),
      workspaceId: z.string().optional(),
    }),
    output: z.object({ tasks: z.array(HubTaskSchema) }),
  },
  'hub.tasks.get': {
    input: z.object({ taskId: z.string() }),
    output: HubTaskSchema,
  },
  'hub.tasks.create': {
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
  'hub.tasks.update': {
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
  'hub.tasks.updateStatus': {
    input: z.object({
      taskId: z.string(),
      status: HubTaskStatusSchema,
    }),
    output: HubTaskSchema,
  },
  'hub.tasks.delete': {
    input: z.object({ taskId: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
  'hub.tasks.execute': {
    input: z.object({ taskId: z.string() }),
    output: z.object({ sessionId: z.string(), status: z.enum(['started', 'queued']) }),
  },
  'hub.tasks.cancel': {
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
} as const;

/** Hub task event channels */
export const hubTasksEvents = {
  'event:hub.tasks.created': {
    payload: z.object({ taskId: z.string(), projectId: z.string() }),
  },
  'event:hub.tasks.updated': {
    payload: z.object({ taskId: z.string(), projectId: z.string() }),
  },
  'event:hub.tasks.deleted': {
    payload: z.object({ taskId: z.string(), projectId: z.string() }),
  },
  'event:hub.tasks.progress': {
    payload: z.object({ taskId: z.string(), progress: z.number(), phase: z.string() }),
  },
  'event:hub.tasks.completed': {
    payload: z.object({
      taskId: z.string(),
      projectId: z.string(),
      result: z.enum(['success', 'failure']),
    }),
  },
} as const;
