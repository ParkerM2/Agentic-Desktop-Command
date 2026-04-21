import { useState } from 'react';

import type { Workout, WorkoutType } from '@shared/types';

import { useUpdateWorkout } from '../../api/useFitness';
import { useEditDialog } from '../../hooks/useEditDialog';
import { toFormExercises, useExerciseForm } from '../../hooks/useExerciseForm';

export type { FormExercise } from '../../hooks/useExerciseForm';
export { toFormExercises };

interface UseWorkoutEditDialogOptions {
  workout: Workout;
  onOpenChange: (open: boolean) => void;
}

export function useWorkoutEditDialog({ workout, onOpenChange }: UseWorkoutEditDialogOptions) {
  const updateWorkout = useUpdateWorkout();

  const [date, setDate] = useState(workout.date);
  const [type, setType] = useState<WorkoutType>(workout.type);
  const [duration, setDuration] = useState(String(workout.duration));
  const [notes, setNotes] = useState(workout.notes ?? '');

  const {
    exercises,
    handleAddExercise,
    handleRemoveExercise,
    handleExerciseNameChange,
    handleAddSet,
    handleSetChange,
  } = useExerciseForm(toFormExercises(workout.exercises));

  const { isSaveDisabled, handleSave } = useEditDialog({
    mutation: updateWorkout,
    buildInput: () => {
      const durationNum = Number(duration);
      if (durationNum <= 0) return null;

      const validExercises = exercises.filter((e) => e.name.trim().length > 0);
      return {
        id: workout.id,
        date,
        type,
        duration: durationNum,
        exercises: validExercises,
        notes: notes.trim().length > 0 ? notes.trim() : undefined,
      };
    },
    onClose: () => onOpenChange(false),
  });

  return {
    date,
    setDate,
    type,
    setType,
    duration,
    setDuration,
    notes,
    setNotes,
    exercises,
    isSaveDisabled,
    handleAddExercise,
    handleRemoveExercise,
    handleExerciseNameChange,
    handleAddSet,
    handleSetChange,
    handleSave,
  };
}
