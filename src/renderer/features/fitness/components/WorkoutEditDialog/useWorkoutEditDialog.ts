import { useState } from 'react';

import type { Exercise, ExerciseSet, Workout, WorkoutType } from '@shared/types';

import { useUpdateWorkout } from '../../api/useFitness';

export interface FormExercise extends Exercise {
  _key: string;
  _setKeys: string[];
}

let nextKey = 0;
function uid(): string {
  nextKey += 1;
  return `ek-${String(nextKey)}`;
}

export function toFormExercises(exercises: Exercise[]): FormExercise[] {
  return exercises.map((e) => ({
    ...e,
    _key: uid(),
    _setKeys: e.sets.map(() => uid()),
  }));
}

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
  const [exercises, setExercises] = useState<FormExercise[]>(() =>
    toFormExercises(workout.exercises),
  );

  function handleAddExercise(): void {
    setExercises([...exercises, { name: '', sets: [{}], _key: uid(), _setKeys: [uid()] }]);
  }

  function handleRemoveExercise(index: number): void {
    setExercises(exercises.filter((_, i) => i !== index));
  }

  function handleExerciseNameChange(index: number, name: string): void {
    const updated = [...exercises];
    updated[index] = { ...updated[index], name };
    setExercises(updated);
  }

  function handleAddSet(exerciseIndex: number): void {
    const updated = [...exercises];
    updated[exerciseIndex] = {
      ...updated[exerciseIndex],
      sets: [...updated[exerciseIndex].sets, {}],
      _setKeys: [...updated[exerciseIndex]._setKeys, uid()],
    };
    setExercises(updated);
  }

  function handleSetChange(
    exerciseIndex: number,
    setIndex: number,
    field: keyof ExerciseSet,
    value: string,
  ): void {
    const updated = [...exercises];
    const sets = [...updated[exerciseIndex].sets];
    const numericValue = value === '' ? undefined : Number(value);
    sets[setIndex] = { ...sets[setIndex], [field]: numericValue };
    updated[exerciseIndex] = { ...updated[exerciseIndex], sets };
    setExercises(updated);
  }

  function handleSave(): void {
    const durationNum = Number(duration);
    if (durationNum <= 0) return;

    const validExercises = exercises.filter((e) => e.name.trim().length > 0);

    updateWorkout.mutate(
      {
        id: workout.id,
        date,
        type,
        duration: durationNum,
        exercises: validExercises,
        notes: notes.trim().length > 0 ? notes.trim() : undefined,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      },
    );
  }

  const isSaveDisabled = Number(duration) <= 0 || updateWorkout.isPending;

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
