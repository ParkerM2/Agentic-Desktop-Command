/**
 * Personal Domain — Unified TypeScript Types
 *
 * Inferred types from the personal/ Zod schemas. Covers all
 * personal sub-domains: notes, ideas, milestones, alerts,
 * changelog, planner, briefing, and fitness.
 */

import type {
  AgentActivitySummarySchema,
  AlertLinkedToSchema,
  AlertSchema,
  AlertTypeSchema,
  BodyMeasurementSchema,
  BriefingConfigSchema,
  ChangeCategorySchema,
  ChangelogEntrySchema,
  ChangeTypeSchema,
  DailyBriefingSchema,
  DailyPlanSchema,
  ExerciseSchema,
  ExerciseSetSchema,
  FitnessGoalSchema,
  FitnessGoalTypeSchema,
  FitnessStatsSchema,
  IdeaCategorySchema,
  IdeaSchema,
  IdeaStatusSchema,
  MeasurementSourceSchema,
  MilestoneSchema,
  MilestoneStatusSchema,
  MilestoneTaskSchema,
  NoteSchema,
  RecurringConfigSchema,
  ScheduledTaskSchema,
  SuggestionActionSchema,
  SuggestionSchema,
  SuggestionTypeSchema,
  TaskSummarySchema,
  TimeBlockSchema,
  TimeBlockTypeSchema,
  WeeklyReviewSchema,
  WeeklyReviewSummarySchema,
  WeightUnitSchema,
  WorkoutSchema,
  WorkoutTypeSchema,
} from '../ipc/personal/schemas';
import type { z } from 'zod';

// ── Notes ───────────────────────────────────────────────────────

export type Note = z.infer<typeof NoteSchema>;

// ── Ideas ───────────────────────────────────────────────────────

export type IdeaStatus = z.infer<typeof IdeaStatusSchema>;
export type IdeaCategory = z.infer<typeof IdeaCategorySchema>;
export type Idea = z.infer<typeof IdeaSchema>;

// ── Milestones ──────────────────────────────────────────────────

export type MilestoneStatus = z.infer<typeof MilestoneStatusSchema>;
export type MilestoneTask = z.infer<typeof MilestoneTaskSchema>;
export type Milestone = z.infer<typeof MilestoneSchema>;

// ── Alerts ──────────────────────────────────────────────────────

export type AlertType = z.infer<typeof AlertTypeSchema>;
export type RecurringConfig = z.infer<typeof RecurringConfigSchema>;
export type AlertLinkedTo = z.infer<typeof AlertLinkedToSchema>;
export type Alert = z.infer<typeof AlertSchema>;

// ── Changelog ───────────────────────────────────────────────────

export type ChangeType = z.infer<typeof ChangeTypeSchema>;
export type ChangeCategory = z.infer<typeof ChangeCategorySchema>;
export type ChangelogEntry = z.infer<typeof ChangelogEntrySchema>;

// ── Planner ─────────────────────────────────────────────────────

export type TimeBlockType = z.infer<typeof TimeBlockTypeSchema>;
export type TimeBlock = z.infer<typeof TimeBlockSchema>;
export type ScheduledTask = z.infer<typeof ScheduledTaskSchema>;
export type DailyPlan = z.infer<typeof DailyPlanSchema>;
export type WeeklyReviewSummary = z.infer<typeof WeeklyReviewSummarySchema>;
export type WeeklyReview = z.infer<typeof WeeklyReviewSchema>;

// ── Briefing ─────────────────────────────────────────────────────

export type SuggestionType = z.infer<typeof SuggestionTypeSchema>;
export type SuggestionAction = z.infer<typeof SuggestionActionSchema>;
export type Suggestion = z.infer<typeof SuggestionSchema>;
export type TaskSummary = z.infer<typeof TaskSummarySchema>;
export type AgentActivitySummary = z.infer<typeof AgentActivitySummarySchema>;
export type DailyBriefing = z.infer<typeof DailyBriefingSchema>;
export type BriefingConfig = z.infer<typeof BriefingConfigSchema>;

// ── Fitness ──────────────────────────────────────────────────────

export type WorkoutType = z.infer<typeof WorkoutTypeSchema>;
export type WeightUnit = z.infer<typeof WeightUnitSchema>;
export type MeasurementSource = z.infer<typeof MeasurementSourceSchema>;
export type FitnessGoalType = z.infer<typeof FitnessGoalTypeSchema>;
export type ExerciseSet = z.infer<typeof ExerciseSetSchema>;
export type Exercise = z.infer<typeof ExerciseSchema>;
export type Workout = z.infer<typeof WorkoutSchema>;
export type BodyMeasurement = z.infer<typeof BodyMeasurementSchema>;
export type FitnessGoal = z.infer<typeof FitnessGoalSchema>;
export type FitnessStats = z.infer<typeof FitnessStatsSchema>;
