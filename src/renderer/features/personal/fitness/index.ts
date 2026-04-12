/**
 * Fitness feature — public API
 */

// API hooks
export {
  useDeleteGoal,
  useDeleteWorkout,
  useFitnessGoals,
  useFitnessStats,
  useLogMeasurement,
  useLogWorkout,
  useMeasurements,
  useSetGoal,
  useUpdateGoalProgress,
  useUpdateWorkout,
  useWorkouts,
} from './api/useFitness';
export { fitnessKeys } from './api/queryKeys';

// Event hook
export { useFitnessEvents } from './hooks/useFitnessEvents';

// Store
export { useFitnessUI } from './store';

// Components
export { FitnessPage } from './components/FitnessPage';
