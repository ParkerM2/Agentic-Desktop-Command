/**
 * Planner IPC Contract
 *
 * Invoke and event channel definitions for daily planning, time blocks,
 * weekly reviews, notes, alerts, milestones, ideas, changelog, and insights.
 */

import { z } from 'zod';

import {
  AlertSchema,
  AlertTypeSchema,
  AlertLinkedToSchema,
  ChangeCategorySchema,
  ChangelogEntrySchema,
  DailyPlanSchema,
  IdeaCategorySchema,
  IdeaSchema,
  IdeaStatusSchema,
  InsightMetricsSchema,
  InsightTimeSeriesSchema,
  MilestoneSchema,
  MilestoneStatusSchema,
  NoteSchema,
  ProjectInsightsSchema,
  RecurringConfigSchema,
  ScheduledTaskSchema,
  TaskDistributionSchema,
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

/** Invoke channels for alert operations */
export const alertsInvoke = {
  'alerts.list': {
    input: z.object({ includeExpired: z.boolean().optional() }),
    output: z.array(AlertSchema),
  },
  'alerts.create': {
    input: z.object({
      type: AlertTypeSchema,
      message: z.string(),
      triggerAt: z.string(),
      recurring: RecurringConfigSchema.optional(),
      linkedTo: AlertLinkedToSchema.optional(),
    }),
    output: AlertSchema,
  },
  'alerts.dismiss': {
    input: z.object({ id: z.string() }),
    output: AlertSchema,
  },
  'alerts.delete': {
    input: z.object({ id: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
} as const;

/** Invoke channels for notes operations */
export const notesInvoke = {
  'notes.list': {
    input: z.object({ projectId: z.string().optional(), tag: z.string().optional() }),
    output: z.array(NoteSchema),
  },
  'notes.create': {
    input: z.object({
      title: z.string(),
      content: z.string(),
      tags: z.array(z.string()).optional(),
      projectId: z.string().optional(),
      taskId: z.string().optional(),
    }),
    output: NoteSchema,
  },
  'notes.update': {
    input: z.object({
      id: z.string(),
      title: z.string().optional(),
      content: z.string().optional(),
      tags: z.array(z.string()).optional(),
      pinned: z.boolean().optional(),
    }),
    output: NoteSchema,
  },
  'notes.delete': {
    input: z.object({ id: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
  'notes.search': {
    input: z.object({ query: z.string() }),
    output: z.array(NoteSchema),
  },
} as const;

/** Invoke channels for milestone operations */
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
    output: z.object({ success: z.boolean() }),
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

/** Invoke channels for idea operations */
export const ideasInvoke = {
  'ideas.list': {
    input: z.object({
      projectId: z.string().optional(),
      status: IdeaStatusSchema.optional(),
      category: IdeaCategorySchema.optional(),
    }),
    output: z.array(IdeaSchema),
  },
  'ideas.create': {
    input: z.object({
      title: z.string(),
      description: z.string(),
      category: IdeaCategorySchema,
      tags: z.array(z.string()).optional(),
      projectId: z.string().optional(),
    }),
    output: IdeaSchema,
  },
  'ideas.update': {
    input: z.object({
      id: z.string(),
      title: z.string().optional(),
      description: z.string().optional(),
      status: IdeaStatusSchema.optional(),
      category: IdeaCategorySchema.optional(),
      tags: z.array(z.string()).optional(),
    }),
    output: IdeaSchema,
  },
  'ideas.delete': {
    input: z.object({ id: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
  'ideas.vote': {
    input: z.object({ id: z.string(), delta: z.number() }),
    output: IdeaSchema,
  },
} as const;

/** Invoke channels for changelog operations */
export const changelogInvoke = {
  'changelog.list': {
    input: z.object({}),
    output: z.array(ChangelogEntrySchema),
  },
  'changelog.addEntry': {
    input: z.object({
      version: z.string(),
      date: z.string(),
      categories: z.array(ChangeCategorySchema),
    }),
    output: ChangelogEntrySchema,
  },
  'changelog.generate': {
    input: z.object({
      repoPath: z.string(),
      version: z.string(),
      fromTag: z.string().optional(),
    }),
    output: ChangelogEntrySchema,
  },
} as const;

/** Invoke channels for insight operations */
export const insightsInvoke = {
  'insights.getMetrics': {
    input: z.object({ projectId: z.string().optional() }),
    output: InsightMetricsSchema,
  },
  'insights.getTimeSeries': {
    input: z.object({ projectId: z.string().optional(), days: z.number().optional() }),
    output: z.array(InsightTimeSeriesSchema),
  },
  'insights.getTaskDistribution': {
    input: z.object({ projectId: z.string().optional() }),
    output: z.array(TaskDistributionSchema),
  },
  'insights.getProjectBreakdown': {
    input: z.object({}),
    output: z.array(ProjectInsightsSchema),
  },
} as const;

/** Event channels for planner-related events */
export const plannerEvents = {
  'event:planner.dayChanged': {
    payload: z.object({ date: z.string() }),
  },
  'event:note.changed': {
    payload: z.object({ noteId: z.string() }),
  },
  'event:alert.triggered': {
    payload: z.object({ alertId: z.string(), message: z.string() }),
  },
  'event:alert.changed': {
    payload: z.object({ alertId: z.string() }),
  },
  'event:milestone.changed': {
    payload: z.object({ milestoneId: z.string() }),
  },
  'event:idea.changed': {
    payload: z.object({ ideaId: z.string() }),
  },
} as const;
