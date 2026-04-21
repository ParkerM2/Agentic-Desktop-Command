import { useState } from 'react';

import { useDebounce } from '@renderer/shared/hooks/useDebounce';

import { useDeleteWorkout, useWorkouts } from '../../api/useFitness';

export function useWorkoutLog() {
  const { data: workouts } = useWorkouts();
  const deleteWorkout = useDeleteWorkout();
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebounce(searchQuery);

  const allWorkouts = workouts ?? [];

  const displayWorkouts = debouncedQuery.trim().length > 0
    ? allWorkouts.filter((w) => {
        const q = debouncedQuery.toLowerCase();
        return w.type.toLowerCase().includes(q) || (w.notes ?? '').toLowerCase().includes(q);
      })
    : allWorkouts;

  return {
    displayWorkouts,
    searchQuery,
    setSearchQuery,
    deleteWorkout,
  };
}
