/**
 * useExerciseForm — shared exercise array manipulation for workout forms.
 *
 * Extracts the add/remove exercise, add set, change set, and name change
 * handlers duplicated in WorkoutForm and WorkoutEditDialog.
 */

import { useState } from 'react';

import type { Exercise, ExerciseSet } from '@shared/types';

export interface FormExercise extends Exercise {
  _key: string;
  _setKeys: string[];
}

let nextId = 0;
export function uid(): string {
  nextId += 1;
  return `ex-${String(nextId)}`;
}

export function toFormExercises(exercises: Exercise[]): FormExercise[] {
  return exercises.map((e) => ({
    ...e,
    _key: uid(),
    _setKeys: e.sets.map(() => uid()),
  }));
}

export function useExerciseForm(initial: FormExercise[] = []) {
  const [exercises, setExercises] = useState<FormExercise[]>(initial);

  function handleAddExercise(): void {
    setExercises((prev) => [...prev, { name: '', sets: [{}], _key: uid(), _setKeys: [uid()] }]);
  }

  function handleRemoveExercise(index: number): void {
    setExercises((prev) => prev.filter((_, i) => i !== index));
  }

  function handleExerciseNameChange(index: number, name: string): void {
    setExercises((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], name };
      return updated;
    });
  }

  function handleAddSet(exerciseIndex: number): void {
    setExercises((prev) => {
      const updated = [...prev];
      updated[exerciseIndex] = {
        ...updated[exerciseIndex],
        sets: [...updated[exerciseIndex].sets, {}],
        _setKeys: [...updated[exerciseIndex]._setKeys, uid()],
      };
      return updated;
    });
  }

  function handleSetChange(
    exerciseIndex: number,
    setIndex: number,
    field: keyof ExerciseSet,
    value: string,
  ): void {
    setExercises((prev) => {
      const updated = [...prev];
      const sets = [...updated[exerciseIndex].sets];
      const numericValue = value === '' ? undefined : Number(value);
      sets[setIndex] = { ...sets[setIndex], [field]: numericValue };
      updated[exerciseIndex] = { ...updated[exerciseIndex], sets };
      return updated;
    });
  }

  return {
    exercises,
    setExercises,
    handleAddExercise,
    handleRemoveExercise,
    handleExerciseNameChange,
    handleAddSet,
    handleSetChange,
  };
}
