/**
 * Fitness feature — public API
 */

// API hooks — queries
export {
  useDeleteGoal,
  useDeleteWorkout,
  useFitnessGoals,
  useFitnessStats,
  useMeasurements,
  useSetGoal,
  useWorkouts,
} from './api/useFitness';
// API hooks — mutations
export {
  useDeleteMeasurement,
  useLogMeasurement,
  useLogWorkout,
  useUpdateGoal,
  useUpdateGoalProgress,
  useUpdateMeasurement,
  useUpdateWorkout,
} from './api/useFitnessMutations';
export { fitnessKeys } from './api/queryKeys';

// Event hook
export { useFitnessEvents } from './hooks/useFitnessEvents';

// Store
export { useFitnessUI } from './store';

// Components
export { FitnessPage } from './components/FitnessPage';
