/**
 * Milestones IPC Contract
 *
 * Invoke channels for milestone CRUD and task management within milestones.
 */

import { z } from 'zod';

import { SuccessResponseSchema } from '../common/schemas';

export const MilestoneStatusSchema = z.enum(['planned', 'in-progress', 'completed']);

export const MilestoneTaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  completed: z.boolean(),
});

export const MilestoneSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  targetDate: z.string(),
  status: MilestoneStatusSchema,
  tasks: z.array(MilestoneTaskSchema),
  projectId: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const milestonesInvoke = {
  'milestones.list': {
    input: z.object({ projectId: z.string().optional() }),
    output: z.array(MilestoneSchema),
  },
  'milestones.create': {
    input: z.object({
      title: z.string(),
      description: z.string(),
      targetDate: z.string(),
      projectId: z.string().optional(),
    }),
    output: MilestoneSchema,
  },
  'milestones.update': {
    input: z.object({
      id: z.string(),
      title: z.string().optional(),
      description: z.string().optional(),
      targetDate: z.string().optional(),
      status: MilestoneStatusSchema.optional(),
    }),
    output: MilestoneSchema,
  },
  'milestones.delete': {
    input: z.object({ id: z.string() }),
    output: SuccessResponseSchema,
  },
  'milestones.addTask': {
    input: z.object({ milestoneId: z.string(), title: z.string() }),
    output: MilestoneSchema,
  },
  'milestones.toggleTask': {
    input: z.object({ milestoneId: z.string(), taskId: z.string() }),
    output: MilestoneSchema,
  },
} as const;

export const milestonesEvents = {
  'event:milestone.changed': {
    payload: z.object({ milestoneId: z.string() }),
  },
} as const;
