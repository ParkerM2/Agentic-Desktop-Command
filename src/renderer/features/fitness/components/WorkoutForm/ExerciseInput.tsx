/**
 * ExerciseInput — Single exercise row with sets for WorkoutForm
 */

import { Trash2 } from 'lucide-react';

import type { ExerciseSet } from '@shared/types';

import { Button, Input } from '@ui';

import type { FormExercise } from './useWorkoutForm';

// ── Props ────────────────────────────────────────────────────

interface ExerciseInputProps {
  exercise: FormExercise;
  exerciseIndex: number;
  onNameChange: (name: string) => void;
  onRemove: () => void;
  onAddSet: () => void;
  onSetChange: (setIndex: number, field: keyof ExerciseSet, value: string) => void;
}

// ── Component ────────────────────────────────────────────────

export function ExerciseInput({
  exercise,
  exerciseIndex,
  onNameChange,
  onRemove,
  onAddSet,
  onSetChange,
}: ExerciseInputProps) {
  return (
    <div className="bg-muted/50 rounded-md p-3">
      <div className="mb-2 flex items-center gap-2">
        <Input
          aria-label={`Exercise ${String(exerciseIndex + 1)} name`}
          className="flex-1"
          placeholder="Exercise name"
          size="sm"
          type="text"
          value={exercise.name}
          onChange={(e) => onNameChange(e.target.value)}
        />
        <Button
          aria-label="Remove exercise"
          className="text-muted-foreground hover:text-destructive h-auto p-1"
          size="icon"
          type="button"
          variant="ghost"
          onClick={onRemove}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
      <div className="space-y-1">
        {exercise.sets.map((exerciseSet, setIndex) => (
          <div key={exercise._setKeys[setIndex]} className="flex items-center gap-2">
            <span className="text-muted-foreground w-8 text-xs">S{String(setIndex + 1)}</span>
            <Input
              aria-label={`Set ${String(setIndex + 1)} reps`}
              className="w-16"
              placeholder="Reps"
              size="sm"
              type="number"
              value={exerciseSet.reps ?? ''}
              onChange={(e) => onSetChange(setIndex, 'reps', e.target.value)}
            />
            <Input
              aria-label={`Set ${String(setIndex + 1)} weight`}
              className="w-20"
              placeholder="Weight"
              size="sm"
              type="number"
              value={exerciseSet.weight ?? ''}
              onChange={(e) => onSetChange(setIndex, 'weight', e.target.value)}
            />
            <span className="text-muted-foreground text-xs">lbs</span>
          </div>
        ))}
      </div>
      <Button
        className="text-primary mt-1 h-auto p-0 text-xs font-medium"
        size="sm"
        type="button"
        variant="ghost"
        onClick={onAddSet}
      >
        + Add Set
      </Button>
    </div>
  );
}
