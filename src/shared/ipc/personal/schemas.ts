/**
 * Personal Domain — Merged Zod Schemas
 *
 * Consolidates all Zod validation schemas from the personal sub-domains:
 * notes, ideas, milestones, alerts, changelog, planner, briefing, fitness.
 */

import { z } from 'zod';

// ── Notes ───────────────────────────────────────────────────────

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

// ── Ideas ───────────────────────────────────────────────────────

export const IdeaStatusSchema = z.enum([
  'new',
  'exploring',
  'accepted',
  'rejected',
  'implemented',
]);
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

// ── Milestones ──────────────────────────────────────────────────

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

// ── Alerts ──────────────────────────────────────────────────────

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

// ── Changelog ───────────────────────────────────────────────────

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

// ── Planner ─────────────────────────────────────────────────────

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
  completedGoals: z.array(z.string()).optional(),
  scheduledTasks: z.array(ScheduledTaskSchema),
  timeBlocks: z.array(TimeBlockSchema),
  reflection: z.string().optional(),
});

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

// ── Briefing ─────────────────────────────────────────────────────

export const SuggestionTypeSchema = z.enum(['stale_project', 'parallel_tasks', 'blocked_task']);

export const SuggestionActionSchema = z.object({
  label: z.string(),
  targetId: z.string().optional(),
  targetType: z.enum(['project', 'task']).optional(),
});

export const SuggestionSchema = z.object({
  type: SuggestionTypeSchema,
  title: z.string(),
  description: z.string(),
  action: SuggestionActionSchema.optional(),
});

export const TaskSummarySchema = z.object({
  dueToday: z.number(),
  completedYesterday: z.number(),
  overdue: z.number(),
  inProgress: z.number(),
});

export const AgentActivitySummarySchema = z.object({
  runningCount: z.number(),
  completedToday: z.number(),
  errorCount: z.number(),
});

export const DailyBriefingSchema = z.object({
  id: z.string(),
  date: z.string(),
  summary: z.string(),
  taskSummary: TaskSummarySchema,
  agentActivity: AgentActivitySummarySchema,
  suggestions: z.array(SuggestionSchema),
  githubNotifications: z.number().optional(),
  generatedAt: z.string(),
});

export const BriefingConfigSchema = z.object({
  enabled: z.boolean(),
  scheduledTime: z.string(),
  includeGitHub: z.boolean(),
  includeAgentActivity: z.boolean(),
});

// ── Fitness ──────────────────────────────────────────────────────

export const WorkoutTypeSchema = z.enum(['strength', 'cardio', 'flexibility', 'sport']);
export const WeightUnitSchema = z.enum(['lbs', 'kg']);
export const MeasurementSourceSchema = z.enum(['manual']);
export const FitnessGoalTypeSchema = z.enum([
  'weight',
  'workout_frequency',
  'lift_target',
  'cardio_target',
]);

export const ExerciseSetSchema = z.object({
  reps: z.number().optional(),
  weight: z.number().optional(),
  unit: WeightUnitSchema.optional(),
  duration: z.number().optional(),
  distance: z.number().optional(),
});

export const ExerciseSchema = z.object({
  name: z.string(),
  sets: z.array(ExerciseSetSchema),
  muscleGroup: z.string().optional(),
});

export const WorkoutSchema = z.object({
  id: z.string(),
  date: z.string(),
  type: WorkoutTypeSchema,
  duration: z.number(),
  exercises: z.array(ExerciseSchema),
  notes: z.string().optional(),
  createdAt: z.string(),
});

export const BodyMeasurementSchema = z.object({
  id: z.string(),
  date: z.string(),
  weight: z.number().optional(),
  bodyFat: z.number().optional(),
  muscleMass: z.number().optional(),
  boneMass: z.number().optional(),
  waterPercentage: z.number().optional(),
  visceralFat: z.number().optional(),
  source: MeasurementSourceSchema,
  createdAt: z.string(),
});

export const FitnessGoalSchema = z.object({
  id: z.string(),
  type: FitnessGoalTypeSchema,
  target: z.number(),
  current: z.number(),
  unit: z.string(),
  deadline: z.string().optional(),
  createdAt: z.string(),
});

export const FitnessStatsSchema = z.object({
  totalWorkouts: z.number(),
  workoutsThisWeek: z.number(),
  totalVolume: z.number(),
  currentStreak: z.number(),
  longestStreak: z.number(),
  favoriteExercise: z.string().optional(),
  averageWorkoutDuration: z.number(),
});
