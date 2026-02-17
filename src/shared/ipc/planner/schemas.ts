/**
 * Planner IPC Schemas
 *
 * Zod schemas for daily planning, time blocks, weekly reviews,
 * notes, alerts, milestones, and ideas.
 */

import { z } from 'zod';

// ── Notes Schemas ───────────────────────────────────────────────

export const NoteSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  tags: z.array(z.string()),
  projectId: z.string().optional(),
  taskId: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  pinned: z.boolean(),
});

// ── Time Block / Daily Plan Schemas ─────────────────────────────

export const TimeBlockTypeSchema = z.enum(['focus', 'meeting', 'break', 'other']);

export const TimeBlockSchema = z.object({
  id: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  label: z.string(),
  type: TimeBlockTypeSchema,
  color: z.string().optional(),
});

export const ScheduledTaskSchema = z.object({
  taskId: z.string(),
  scheduledTime: z.string().optional(),
  estimatedDuration: z.number().optional(),
  completed: z.boolean(),
});

export const DailyPlanSchema = z.object({
  date: z.string(),
  goals: z.array(z.string()),
  scheduledTasks: z.array(ScheduledTaskSchema),
  timeBlocks: z.array(TimeBlockSchema),
  reflection: z.string().optional(),
});

// ── Weekly Review Schemas ───────────────────────────────────────

export const WeeklyReviewSummarySchema = z.object({
  totalGoalsSet: z.number(),
  totalGoalsCompleted: z.number(),
  totalTimeBlocks: z.number(),
  totalHoursPlanned: z.number(),
  categoryBreakdown: z.record(z.string(), z.number()),
});

export const WeeklyReviewSchema = z.object({
  weekStartDate: z.string(),
  weekEndDate: z.string(),
  days: z.array(DailyPlanSchema),
  summary: WeeklyReviewSummarySchema,
  reflection: z.string().optional(),
});

// ── Alert Schemas ───────────────────────────────────────────────

export const AlertTypeSchema = z.enum(['reminder', 'deadline', 'notification', 'recurring']);

export const RecurringConfigSchema = z.object({
  frequency: z.enum(['daily', 'weekly', 'monthly']),
  time: z.string(),
  daysOfWeek: z.array(z.number()).optional(),
});

export const AlertLinkedToSchema = z.object({
  type: z.enum(['task', 'event', 'note']),
  id: z.string(),
});

export const AlertSchema = z.object({
  id: z.string(),
  type: AlertTypeSchema,
  message: z.string(),
  triggerAt: z.string(),
  recurring: RecurringConfigSchema.optional(),
  linkedTo: AlertLinkedToSchema.optional(),
  dismissed: z.boolean(),
  createdAt: z.string(),
});

// ── Milestone Schemas ───────────────────────────────────────────

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

// ── Idea Schemas ────────────────────────────────────────────────

export const IdeaStatusSchema = z.enum(['new', 'exploring', 'accepted', 'rejected', 'implemented']);
export const IdeaCategorySchema = z.enum(['feature', 'improvement', 'bug', 'performance']);

export const IdeaSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  status: IdeaStatusSchema,
  category: IdeaCategorySchema,
  tags: z.array(z.string()),
  projectId: z.string().optional(),
  votes: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// ── Changelog Schemas ───────────────────────────────────────────

export const ChangeTypeSchema = z.enum([
  'added',
  'changed',
  'fixed',
  'removed',
  'security',
  'deprecated',
]);

export const ChangeCategorySchema = z.object({
  type: ChangeTypeSchema,
  items: z.array(z.string()),
});

export const ChangelogEntrySchema = z.object({
  version: z.string(),
  date: z.string(),
  categories: z.array(ChangeCategorySchema),
});

// ── Insight Schemas ─────────────────────────────────────────────

export const InsightMetricsSchema = z.object({
  totalTasks: z.number(),
  completedTasks: z.number(),
  completionRate: z.number(),
  agentRunCount: z.number(),
  agentSuccessRate: z.number(),
  activeAgents: z.number(),
});

export const InsightTimeSeriesSchema = z.object({
  date: z.string(),
  tasksCompleted: z.number(),
  agentRuns: z.number(),
});

export const TaskDistributionSchema = z.object({
  status: z.string(),
  count: z.number(),
  percentage: z.number(),
});

export const ProjectInsightsSchema = z.object({
  projectId: z.string(),
  projectName: z.string(),
  taskCount: z.number(),
  completedCount: z.number(),
  completionRate: z.number(),
});
