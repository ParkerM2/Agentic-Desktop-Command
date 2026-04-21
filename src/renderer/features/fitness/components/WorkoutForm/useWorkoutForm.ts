import { useState } from 'react';

import type { WorkoutType } from '@shared/types';

import { useToday } from '@renderer/shared/hooks/useToday';

import { useLogWorkout } from '../../api/useFitness';
import { useExerciseForm } from '../../hooks/useExerciseForm';
import { useFitnessUI } from '../../store';

export type { FormExercise } from '../../hooks/useExerciseForm';

export function useWorkoutForm() {
  const logWorkout = useLogWorkout();
  const { setShowWorkoutForm } = useFitnessUI();
  const today = useToday();

  const [date, setDate] = useState(today);
  const [type, setType] = useState<WorkoutType>('strength');
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');

  const {
    exercises,
    handleAddExercise,
    handleRemoveExercise,
    handleExerciseNameChange,
    handleAddSet,
    handleSetChange,
  } = useExerciseForm();

  function handleSubmit(): void {
    const durationNum = Number(duration);
    if (durationNum <= 0) return;

    const validExercises = exercises.filter((e) => e.name.trim().length > 0);

    logWorkout.mutate(
      {
        date,
        type,
        duration: durationNum,
        exercises: validExercises,
        notes: notes.trim().length > 0 ? notes.trim() : undefined,
      },
      {
        onSuccess: () => {
          setShowWorkoutForm(false);
        },
      },
    );
  }

  const isSubmitDisabled = Number(duration) <= 0;

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
    isSubmitDisabled,
    setShowWorkoutForm,
    handleAddExercise,
    handleRemoveExercise,
    handleExerciseNameChange,
    handleAddSet,
    handleSetChange,
    handleSubmit,
  };
}
