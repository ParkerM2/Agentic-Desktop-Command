/**
 * Planner IPC Contract
 *
 * Invoke and event channel definitions for daily planning, time blocks,
 * and weekly reviews.
 */

import { z } from 'zod';

import {
  DailyPlanSchema,
  ScheduledTaskSchema,
  TimeBlockSchema,
  TimeBlockTypeSchema,
  WeeklyReviewSchema,
} from './schemas';

/** Invoke channels for planner operations */
export const plannerInvoke = {
  'planner.getDay': {
    input: z.object({ date: z.string() }),
    output: DailyPlanSchema,
  },
  'planner.updateDay': {
    input: z.object({
      date: z.string(),
      goals: z.array(z.string()).optional(),
      scheduledTasks: z.array(ScheduledTaskSchema).optional(),
      reflection: z.string().optional(),
    }),
    output: DailyPlanSchema,
  },
  'planner.addTimeBlock': {
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
  'planner.updateTimeBlock': {
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
  'planner.removeTimeBlock': {
    input: z.object({ date: z.string(), blockId: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
  'planner.getWeek': {
    input: z.object({ startDate: z.string() }),
    output: WeeklyReviewSchema,
  },
  'planner.generateWeeklyReview': {
    input: z.object({ startDate: z.string() }),
    output: WeeklyReviewSchema,
  },
  'planner.updateWeeklyReflection': {
    input: z.object({ startDate: z.string(), reflection: z.string() }),
    output: WeeklyReviewSchema,
  },
} as const;

/** Event channels for planner-related events */
export const plannerEvents = {
  'event:planner.dayChanged': {
    payload: z.object({ date: z.string() }),
  },
} as const;
