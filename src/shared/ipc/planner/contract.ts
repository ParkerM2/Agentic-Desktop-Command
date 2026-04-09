/**
 * Planner IPC Contract
 *
 * Invoke and event channel definitions for daily planning, time blocks,
 * and weekly reviews.
 */

import { z } from 'zod';

import { PLANNER, PLANNER_EVENTS } from './channels';
import {
  DailyPlanSchema,
  ScheduledTaskSchema,
  TimeBlockSchema,
  TimeBlockTypeSchema,
  WeeklyReviewSchema,
} from './schemas';

/** Invoke channels for planner operations */
export const plannerInvoke = {
  [PLANNER.GET.DAY]: {
    input: z.object({ date: z.string() }),
    output: DailyPlanSchema,
  },
  [PLANNER.UPDATE.DAY]: {
    input: z.object({
      date: z.string(),
      goals: z.array(z.string()).optional(),
      completedGoals: z.array(z.string()).optional(),
      scheduledTasks: z.array(ScheduledTaskSchema).optional(),
      reflection: z.string().optional(),
    }),
    output: DailyPlanSchema,
  },
  [PLANNER.ADD['TIME-BLOCK']]: {
    input: z.object({
      date: z.string(),
      timeBlock: z.object({
        startTime: z.string(),
        endTime: z.string(),
        label: z.string(),
        type: TimeBlockTypeSchema,
        color: z.string().optional(),
      }),
    }),
    output: TimeBlockSchema,
  },
  [PLANNER.MODIFY['TIME-BLOCK']]: {
    input: z.object({
      date: z.string(),
      blockId: z.string(),
      updates: z.object({
        startTime: z.string().optional(),
        endTime: z.string().optional(),
        label: z.string().optional(),
        type: TimeBlockTypeSchema.optional(),
        color: z.string().optional(),
      }),
    }),
    output: TimeBlockSchema,
  },
  [PLANNER.REMOVE['TIME-BLOCK']]: {
    input: z.object({ date: z.string(), blockId: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
  [PLANNER.GET.WEEK]: {
    input: z.object({ startDate: z.string() }),
    output: WeeklyReviewSchema,
  },
  [PLANNER.GENERATE['WEEKLY-REVIEW']]: {
    input: z.object({ startDate: z.string() }),
    output: WeeklyReviewSchema,
  },
  [PLANNER.UPDATE['WEEKLY-REFLECTION']]: {
    input: z.object({ startDate: z.string(), reflection: z.string() }),
    output: WeeklyReviewSchema,
  },
} as const;

/** Event channels for planner-related events */
export const plannerEvents = {
  [PLANNER_EVENTS.DAY.CHANGED]: {
    payload: z.object({ date: z.string() }),
  },
} as const;
