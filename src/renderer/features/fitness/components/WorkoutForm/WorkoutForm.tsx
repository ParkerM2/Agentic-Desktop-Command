/**
 * WorkoutForm — Log a new workout
 */

import { Plus, Send, X } from 'lucide-react';

import type { WorkoutType } from '@shared/types';

import {
  Button,
  Heading,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@ui';

import { ExerciseInput } from './ExerciseInput';
import { useWorkoutForm } from './useWorkoutForm';

// ── Constants ────────────────────────────────────────────────

const WORKOUT_TYPES: Array<{ value: WorkoutType; label: string }> = [
  { value: 'strength', label: 'Strength' },
  { value: 'cardio', label: 'Cardio' },
  { value: 'flexibility', label: 'Flexibility' },
  { value: 'sport', label: 'Sport' },
];

// ── Component ────────────────────────────────────────────────

export function WorkoutForm() {
  const {
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
  } = useWorkoutForm();

  return (
    <div className="bg-card border-border rounded-lg border">
      {/* Header */}
      <div className="border-border flex items-center justify-between border-b px-4 py-3">
        <Heading as="h3" className="text-sm">Log Workout</Heading>
        <Button
          aria-label="Close form"
          size="icon"
          type="button"
          variant="ghost"
          onClick={() => setShowWorkoutForm(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-4 p-4">
        {/* Date + Type */}
        <div className="flex gap-3">
          <div className="flex-1">
            <Label
              className="text-muted-foreground mb-1 block text-xs font-medium"
              htmlFor="workout-date"
            >
              Date
            </Label>
            <Input
              id="workout-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <Label
              className="text-muted-foreground mb-1 block text-xs font-medium"
              htmlFor="workout-type"
            >
              Type
            </Label>
            <Select value={type} onValueChange={(v) => setType(v as WorkoutType)}>
              <SelectTrigger id="workout-type">
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
            htmlFor="workout-duration"
          >
            Duration (minutes)
          </Label>
          <Input
            id="workout-duration"
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
              <ExerciseInput
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
            htmlFor="workout-notes"
          >
            Notes
          </Label>
          <Textarea
            className="h-16"
            id="workout-notes"
            placeholder="Optional notes..."
            resize="none"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* Submit */}
        <Button
          className="w-full"
          disabled={isSubmitDisabled}
          type="button"
          onClick={handleSubmit}
        >
          <Send className="h-4 w-4" />
          Log Workout
        </Button>
      </div>
    </div>
  );
}
