/**
 * Personal feature — public API
 */

// Store
export { usePersonalStore } from './store';

// Components
export { PersonalPage } from './components/PersonalPage';

// Sub-feature re-exports
export { NotesPage, NoteEditor, NotesList, QuickNote, useNotesUI, useNotes, useCreateNote, useUpdateNote, useDeleteNote, useSearchNotes, useNoteEvents, noteKeys } from './notes/index';
export { AlertsPage, AlertNotification, useAlerts, useCreateAlert, useDismissAlert, useDeleteAlert, useAlertEvents, useAlertStore, alertKeys } from './alerts/index';
export { FitnessPage, useFitnessUI, useFitnessEvents, fitnessKeys, useDeleteGoal, useDeleteMeasurement, useDeleteWorkout, useFitnessGoals, useFitnessStats, useLogMeasurement, useLogWorkout, useMeasurements, useSetGoal, useUpdateGoalProgress, useUpdateMeasurement, useUpdateWorkout, useWorkouts } from './fitness/index';
export { PlannerPage, WeeklyReviewPage, usePlannerUI, usePlannerEvents, plannerKeys, useDay, useUpdateDay, useAddTimeBlock, useUpdateTimeBlock, useRemoveTimeBlock, useWeeklyReview, useGenerateWeeklyReview, useUpdateWeeklyReflection } from './planner/index';
export { BriefingPage, SuggestionCard, useDailyBriefing, useGenerateBriefing, useBriefingConfig, useUpdateBriefingConfig, useSuggestions, briefingKeys } from './briefing/index';
export { ChangelogPage, useChangelog, useAddChangelogEntry, useGenerateChangelog, changelogKeys } from './changelog/index';
