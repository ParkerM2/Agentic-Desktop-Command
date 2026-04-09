/**
 * Milestones IPC Contract
 *
 * Invoke channels for milestone CRUD and task management within milestones.
 */

import { z } from 'zod';

import { SuccessResponseSchema } from '../common/schemas';
import { MILESTONES, MILESTONES_EVENTS } from './milestones.channels';

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
  [MILESTONES.LIST.ALL]: {
    input: z.object({ projectId: z.string().optional() }),
    output: z.array(MilestoneSchema),
  },
  [MILESTONES.CREATE.MILESTONE]: {
    input: z.object({
      title: z.string(),
      description: z.string(),
      targetDate: z.string(),
      projectId: z.string().optional(),
    }),
    output: MilestoneSchema,
  },
  [MILESTONES.UPDATE.MILESTONE]: {
    input: z.object({
      id: z.string(),
      title: z.string().optional(),
      description: z.string().optional(),
      targetDate: z.string().optional(),
      status: MilestoneStatusSchema.optional(),
    }),
    output: MilestoneSchema,
  },
  [MILESTONES.DELETE.MILESTONE]: {
    input: z.object({ id: z.string() }),
    output: SuccessResponseSchema,
  },
  [MILESTONES.ADD.TASK]: {
    input: z.object({ milestoneId: z.string(), title: z.string() }),
    output: MilestoneSchema,
  },
  [MILESTONES.TOGGLE.TASK]: {
    input: z.object({ milestoneId: z.string(), taskId: z.string() }),
    output: MilestoneSchema,
  },
} as const;

export const milestonesEvents = {
  [MILESTONES_EVENTS.MILESTONE.CHANGED]: {
    payload: z.object({ milestoneId: z.string() }),
  },
} as const;
