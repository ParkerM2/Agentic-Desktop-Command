import { useState } from 'react';

import type { Exercise, ExerciseSet, WorkoutType } from '@shared/types';

import { useLogWorkout } from '../../api/useFitness';
import { useFitnessUI } from '../../store';

export interface FormExercise extends Exercise {
  _key: string;
  _setKeys: string[];
}

let nextId = 0;
function uid(): string {
  nextId += 1;
  return `ex-${String(nextId)}`;
}

export function useWorkoutForm() {
  const logWorkout = useLogWorkout();
  const { setShowWorkoutForm } = useFitnessUI();

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<WorkoutType>('strength');
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [exercises, setExercises] = useState<FormExercise[]>([]);

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
