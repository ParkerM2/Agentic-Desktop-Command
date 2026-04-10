/**
 * Personal IPC — Barrel Export
 *
 * Re-exports all personal domain channels, schemas, and contracts.
 * Import from here for any personal-domain IPC usage.
 */

// ── Channels (with backwards-compatible aliases) ──
export {
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
  PERSONAL,
  PERSONAL_EVENTS,
  PLANNER,
  PLANNER_EVENTS,
} from './channels';

// ── Schemas ──
export {
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
} from './schemas';

// ── Contracts ──
export {
  alertsEvents,
  alertsInvoke,
  briefingEvents,
  briefingInvoke,
  changelogInvoke,
  fitnessEvents,
  fitnessInvoke,
  ideasEvents,
  ideasInvoke,
  milestonesEvents,
  milestonesInvoke,
  notesEvents,
  notesInvoke,
  personalEvents,
  personalInvoke,
  plannerEvents,
  plannerInvoke,
} from './contract';
