/**
 * Personal Domain — Unified IPC Contract
 *
 * Consolidates invoke and event channel definitions for all personal
 * sub-domains: notes, ideas, milestones, alerts, changelog,
 * planner, briefing, and fitness.
 */

import { z } from 'zod';

import { SuccessResponseSchema } from '../common/schemas';

import {
  ALERTS,
  ALERTS_EVENTS,
  BRIEFING,
  BRIEFING_EVENTS,
  CHANGELOG,
  FITNESS,
  FITNESS_EVENTS,
  IDEAS,
  IDEAS_EVENTS,
  MILESTONES,
  MILESTONES_EVENTS,
  NOTES,
  NOTES_EVENTS,
  PLANNER,
  PLANNER_EVENTS,
} from './channels';
import {
  AlertLinkedToSchema,
  AlertSchema,
  AlertTypeSchema,
  BodyMeasurementSchema,
  BriefingConfigSchema,
  ChangeCategorySchema,
  ChangelogEntrySchema,
  DailyBriefingSchema,
  DailyPlanSchema,
  ExerciseSchema,
  FitnessGoalSchema,
  FitnessGoalTypeSchema,
  FitnessStatsSchema,
  IdeaCategorySchema,
  IdeaSchema,
  IdeaStatusSchema,
  MeasurementSourceSchema,
  MilestoneSchema,
  MilestoneStatusSchema,
  NoteSchema,
  RecurringConfigSchema,
  ScheduledTaskSchema,
  SuggestionSchema,
  TimeBlockSchema,
  TimeBlockTypeSchema,
  WeeklyReviewSchema,
  WorkoutSchema,
  WorkoutTypeSchema,
} from './schemas';

// ─── Notes Invoke ─────────────────────────────────────────────

export const notesInvoke = {
  [NOTES.LIST.ALL]: {
    input: z.object({ projectId: z.string().optional(), tag: z.string().optional() }),
    output: z.array(NoteSchema),
  },
  [NOTES.CREATE.NOTE]: {
    input: z.object({
      title: z.string(),
      content: z.string(),
      tags: z.array(z.string()).optional(),
      projectId: z.string().optional(),
      taskId: z.string().optional(),
    }),
    output: NoteSchema,
  },
  [NOTES.UPDATE.NOTE]: {
    input: z.object({
      id: z.string(),
      title: z.string().optional(),
      content: z.string().optional(),
      tags: z.array(z.string()).optional(),
      pinned: z.boolean().optional(),
    }),
    output: NoteSchema,
  },
  [NOTES.DELETE.NOTE]: {
    input: z.object({ id: z.string() }),
    output: SuccessResponseSchema,
  },
  [NOTES.SEARCH.NOTES]: {
    input: z.object({ query: z.string() }),
    output: z.array(NoteSchema),
  },
} as const;

export const notesEvents = {
  [NOTES_EVENTS.NOTE.CHANGED]: {
    payload: z.object({ noteId: z.string() }),
  },
} as const;

// ─── Ideas Invoke ─────────────────────────────────────────────

export const ideasInvoke = {
  [IDEAS.LIST.ALL]: {
    input: z.object({
      projectId: z.string().optional(),
      status: IdeaStatusSchema.optional(),
      category: IdeaCategorySchema.optional(),
    }),
    output: z.array(IdeaSchema),
  },
  [IDEAS.CREATE.IDEA]: {
    input: z.object({
      title: z.string(),
      description: z.string(),
      category: IdeaCategorySchema,
      tags: z.array(z.string()).optional(),
      projectId: z.string().optional(),
    }),
    output: IdeaSchema,
  },
  [IDEAS.UPDATE.IDEA]: {
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
  [IDEAS.DELETE.IDEA]: {
    input: z.object({ id: z.string() }),
    output: SuccessResponseSchema,
  },
  [IDEAS.VOTE.IDEA]: {
    input: z.object({ id: z.string(), delta: z.number() }),
    output: IdeaSchema,
  },
} as const;

export const ideasEvents = {
  [IDEAS_EVENTS.IDEA.CHANGED]: {
    payload: z.object({ ideaId: z.string() }),
  },
} as const;

// ─── Milestones Invoke ────────────────────────────────────────

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

// ─── Alerts Invoke ────────────────────────────────────────────

export const alertsInvoke = {
  [ALERTS.LIST.ALL]: {
    input: z.object({ includeExpired: z.boolean().optional() }),
    output: z.array(AlertSchema),
  },
  [ALERTS.CREATE.ALERT]: {
    input: z.object({
      type: AlertTypeSchema,
      message: z.string(),
      triggerAt: z.string(),
      recurring: RecurringConfigSchema.optional(),
      linkedTo: AlertLinkedToSchema.optional(),
    }),
    output: AlertSchema,
  },
  [ALERTS.DISMISS.ALERT]: {
    input: z.object({ id: z.string() }),
    output: AlertSchema,
  },
  [ALERTS.DELETE.ALERT]: {
    input: z.object({ id: z.string() }),
    output: SuccessResponseSchema,
  },
} as const;

export const alertsEvents = {
  [ALERTS_EVENTS.ALERT.TRIGGERED]: {
    payload: z.object({ alertId: z.string(), message: z.string() }),
  },
  [ALERTS_EVENTS.ALERT.CHANGED]: {
    payload: z.object({ alertId: z.string() }),
  },
} as const;

// ─── Changelog Invoke ─────────────────────────────────────────

export const changelogInvoke = {
  [CHANGELOG.LIST.ENTRIES]: {
    input: z.object({}),
    output: z.array(ChangelogEntrySchema),
  },
  [CHANGELOG.ADD.ENTRY]: {
    input: z.object({
      version: z.string(),
      date: z.string(),
      categories: z.array(ChangeCategorySchema),
    }),
    output: ChangelogEntrySchema,
  },
  [CHANGELOG.GENERATE.ENTRY]: {
    input: z.object({
      repoPath: z.string(),
      version: z.string(),
      fromTag: z.string().optional(),
    }),
    output: ChangelogEntrySchema,
  },
} as const;

// ─── Planner Invoke ───────────────────────────────────────────

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

export const plannerEvents = {
  [PLANNER_EVENTS.DAY.CHANGED]: {
    payload: z.object({ date: z.string() }),
  },
} as const;

// ─── Briefing Invoke ──────────────────────────────────────────

export const briefingInvoke = {
  [BRIEFING.GET.DAILY]: {
    input: z.object({}),
    output: DailyBriefingSchema.nullable(),
  },
  [BRIEFING.GENERATE.DAILY]: {
    input: z.object({}),
    output: DailyBriefingSchema,
  },
  [BRIEFING.GET.CONFIG]: {
    input: z.object({}),
    output: BriefingConfigSchema,
  },
  [BRIEFING.UPDATE.CONFIG]: {
    input: z.object({
      enabled: z.boolean().optional(),
      scheduledTime: z.string().optional(),
      includeGitHub: z.boolean().optional(),
      includeAgentActivity: z.boolean().optional(),
    }),
    output: BriefingConfigSchema,
  },
  [BRIEFING.GET.SUGGESTIONS]: {
    input: z.object({}),
    output: z.array(SuggestionSchema),
  },
} as const;

export const briefingEvents = {
  [BRIEFING_EVENTS.BRIEFING.READY]: {
    payload: z.object({
      briefingId: z.string(),
      date: z.string(),
    }),
  },
} as const;

// ─── Fitness Invoke ───────────────────────────────────────────

export const fitnessInvoke = {
  [FITNESS.LOG.WORKOUT]: {
    input: z.object({
      date: z.string(),
      type: WorkoutTypeSchema,
      duration: z.number(),
      exercises: z.array(ExerciseSchema),
      notes: z.string().optional(),
    }),
    output: WorkoutSchema,
  },
  [FITNESS.LIST.WORKOUTS]: {
    input: z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      type: WorkoutTypeSchema.optional(),
    }),
    output: z.array(WorkoutSchema),
  },
  [FITNESS.LOG.MEASUREMENT]: {
    input: z.object({
      date: z.string(),
      weight: z.number().optional(),
      bodyFat: z.number().optional(),
      muscleMass: z.number().optional(),
      boneMass: z.number().optional(),
      waterPercentage: z.number().optional(),
      visceralFat: z.number().optional(),
      source: MeasurementSourceSchema,
    }),
    output: BodyMeasurementSchema,
  },
  [FITNESS.GET.MEASUREMENTS]: {
    input: z.object({ limit: z.number().optional() }),
    output: z.array(BodyMeasurementSchema),
  },
  [FITNESS.GET.STATS]: {
    input: z.object({}),
    output: FitnessStatsSchema,
  },
  [FITNESS.SET.GOAL]: {
    input: z.object({
      type: FitnessGoalTypeSchema,
      target: z.number(),
      unit: z.string(),
      deadline: z.string().optional(),
    }),
    output: FitnessGoalSchema,
  },
  [FITNESS.LIST.GOALS]: {
    input: z.object({}),
    output: z.array(FitnessGoalSchema),
  },
  [FITNESS.UPDATE['GOAL-PROGRESS']]: {
    input: z.object({ goalId: z.string(), current: z.number() }),
    output: FitnessGoalSchema,
  },
  [FITNESS.DELETE.WORKOUT]: {
    input: z.object({ id: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
  [FITNESS.DELETE.GOAL]: {
    input: z.object({ id: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
} as const;

export const fitnessEvents = {
  [FITNESS_EVENTS.WORKOUT.CHANGED]: {
    payload: z.object({ workoutId: z.string() }),
  },
  [FITNESS_EVENTS.MEASUREMENT.CHANGED]: {
    payload: z.object({ measurementId: z.string() }),
  },
  [FITNESS_EVENTS.GOAL.CHANGED]: {
    payload: z.object({ goalId: z.string() }),
  },
} as const;

// ─── Aggregated Personal Contract ────────────────────────────

export const personalInvoke = {
  ...notesInvoke,
  ...ideasInvoke,
  ...milestonesInvoke,
  ...alertsInvoke,
  ...changelogInvoke,
  ...plannerInvoke,
  ...briefingInvoke,
  ...fitnessInvoke,
} as const;

export const personalEvents = {
  ...notesEvents,
  ...ideasEvents,
  ...milestonesEvents,
  ...alertsEvents,
  ...plannerEvents,
  ...briefingEvents,
  ...fitnessEvents,
} as const;
