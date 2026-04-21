/**
 * WorkoutLog — Recent workouts list
 */

import { EmptyState, SearchInput } from '@ui';

import { useWorkoutLog } from './useWorkoutLog';
import { WorkoutItem } from './WorkoutItem';

// ── Component ────────────────────────────────────────────────

export function WorkoutLog() {
  const { displayWorkouts, searchQuery, setSearchQuery, deleteWorkout } = useWorkoutLog();

  return (
    <div className="flex flex-col gap-3">
      <SearchInput
        placeholder="Search workouts by type or notes..."
        showClear={searchQuery.length > 0}
        size="sm"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onClear={() => setSearchQuery('')}
      />
      {displayWorkouts.length === 0 ? (
        <EmptyState
          size="sm"
          title=""
          description={
            searchQuery.length > 0 ? 'No workouts match your search' : 'No workouts logged yet'
          }
        />
      ) : (
        <div className="divide-border divide-y">
          {displayWorkouts.slice(0, 20).map((workout) => (
            <WorkoutItem
              key={workout.id}
              workout={workout}
              onDelete={() => deleteWorkout.mutate(workout.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
