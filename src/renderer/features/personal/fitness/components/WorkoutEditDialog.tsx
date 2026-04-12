/**
 * WorkoutEditDialog — Edit an existing workout's date, type, duration, exercises, notes
 */

import { useState } from 'react';

import { Plus, Trash2 } from 'lucide-react';

import type { Exercise, ExerciseSet, Workout, WorkoutType } from '@shared/types';

import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@ui';

import { useUpdateWorkout } from '../api/useFitness';

// ── Helpers ─────────────────────────────────────────────────

let nextKey = 0;
function uid(): string {
  nextKey += 1;
  return `ek-${String(nextKey)}`;
}

interface FormExercise extends Exercise {
  _key: string;
  _setKeys: string[];
}

function toFormExercises(exercises: Exercise[]): FormExercise[] {
  return exercises.map((e) => ({
    ...e,
    _key: uid(),
    _setKeys: e.sets.map(() => uid()),
  }));
}

// ── Constants ────────────────────────────────────────────────

const WORKOUT_TYPES: Array<{ value: WorkoutType; label: string }> = [
  { value: 'strength', label: 'Strength' },
  { value: 'cardio', label: 'Cardio' },
  { value: 'flexibility', label: 'Flexibility' },
  { value: 'sport', label: 'Sport' },
];

// ── Component ────────────────────────────────────────────────

interface WorkoutEditDialogProps {
  workout: Workout;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WorkoutEditDialog({ workout, open, onOpenChange }: WorkoutEditDialogProps) {
  const updateWorkout = useUpdateWorkout();

  const [date, setDate] = useState(workout.date);
  const [type, setType] = useState<WorkoutType>(workout.type);
  const [duration, setDuration] = useState(String(workout.duration));
  const [notes, setNotes] = useState(workout.notes ?? '');
  const [exercises, setExercises] = useState<FormExercise[]>(() =>
    toFormExercises(workout.exercises),
  );

  function handleAddExercise() {
    setExercises([
      ...exercises,
      { name: '', sets: [{}], _key: uid(), _setKeys: [uid()] },
    ]);
  }

  function handleRemoveExercise(index: number) {
    setExercises(exercises.filter((_, i) => i !== index));
  }

  function handleExerciseNameChange(index: number, name: string) {
    const updated = [...exercises];
    updated[index] = { ...updated[index], name };
    setExercises(updated);
  }

  function handleAddSet(exerciseIndex: number) {
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
  ) {
    const updated = [...exercises];
    const sets = [...updated[exerciseIndex].sets];
    const numericValue = value === '' ? undefined : Number(value);
    sets[setIndex] = { ...sets[setIndex], [field]: numericValue };
    updated[exerciseIndex] = { ...updated[exerciseIndex], sets };
    setExercises(updated);
  }

  function handleSave() {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Workout</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Date + Type */}
          <div className="flex gap-3">
            <div className="flex-1">
              <Label
                className="text-muted-foreground mb-1 block text-xs font-medium"
                htmlFor="edit-workout-date"
              >
                Date
              </Label>
              <Input
                id="edit-workout-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <Label
                className="text-muted-foreground mb-1 block text-xs font-medium"
                htmlFor="edit-workout-type"
              >
                Type
              </Label>
              <Select value={type} onValueChange={(v) => setType(v as WorkoutType)}>
                <SelectTrigger id="edit-workout-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WORKOUT_TYPES.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Duration */}
          <div>
            <Label
              className="text-muted-foreground mb-1 block text-xs font-medium"
              htmlFor="edit-workout-duration"
            >
              Duration (minutes)
            </Label>
            <Input
              id="edit-workout-duration"
              min="1"
              placeholder="45"
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </div>

          {/* Exercises */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-muted-foreground text-xs font-medium">Exercises</span>
              <Button
                className="text-primary h-auto p-0 text-xs font-medium"
                size="sm"
                type="button"
                variant="ghost"
                onClick={handleAddExercise}
              >
                <Plus className="h-3 w-3" />
                Add Exercise
              </Button>
            </div>
            <div className="space-y-3">
              {exercises.map((exercise, exerciseIndex) => (
                <EditExerciseInput
                  key={exercise._key}
                  exercise={exercise}
                  exerciseIndex={exerciseIndex}
                  onAddSet={() => handleAddSet(exerciseIndex)}
                  onNameChange={(name) => handleExerciseNameChange(exerciseIndex, name)}
                  onRemove={() => handleRemoveExercise(exerciseIndex)}
                  onSetChange={(setIndex, field, value) =>
                    handleSetChange(exerciseIndex, setIndex, field, value)
                  }
                />
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label
              className="text-muted-foreground mb-1 block text-xs font-medium"
              htmlFor="edit-workout-notes"
            >
              Notes
            </Label>
            <Textarea
              className="h-16"
              id="edit-workout-notes"
              placeholder="Optional notes..."
              resize="none"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            disabled={Number(duration) <= 0 || updateWorkout.isPending}
            type="button"
            onClick={handleSave}
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── EditExerciseInput ─────────────────────────────────────────

interface EditExerciseInputProps {
  exercise: FormExercise;
  exerciseIndex: number;
  onNameChange: (name: string) => void;
  onRemove: () => void;
  onAddSet: () => void;
  onSetChange: (setIndex: number, field: keyof ExerciseSet, value: string) => void;
}

function EditExerciseInput({
  exercise,
  exerciseIndex,
  onNameChange,
  onRemove,
  onAddSet,
  onSetChange,
}: EditExerciseInputProps) {
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
