/**
 * WorkoutEditDialog — Edit an existing workout's date, type, duration, exercises, notes
 */

import type { Workout, WorkoutType } from '@shared/types';

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

import { WorkoutExerciseList } from '../WorkoutExerciseList';

import { useWorkoutEditDialog } from './useWorkoutEditDialog';

// ── Constants ────────────────────────────────────────────────

const WORKOUT_TYPES: Array<{ value: WorkoutType; label: string }> = [
  { value: 'strength', label: 'Strength' },
  { value: 'cardio', label: 'Cardio' },
  { value: 'flexibility', label: 'Flexibility' },
  { value: 'sport', label: 'Sport' },
];

// ── Props ────────────────────────────────────────────────────

interface WorkoutEditDialogProps {
  workout: Workout;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ── Component ────────────────────────────────────────────────

export function WorkoutEditDialog({ workout, open, onOpenChange }: WorkoutEditDialogProps) {
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
    isSaveDisabled,
    handleAddExercise,
    handleRemoveExercise,
    handleExerciseNameChange,
    handleAddSet,
    handleSetChange,
    handleSave,
  } = useWorkoutEditDialog({ workout, onOpenChange });

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
          <WorkoutExerciseList
            exercises={exercises}
            onAddExercise={handleAddExercise}
            onAddSet={handleAddSet}
            onExerciseNameChange={handleExerciseNameChange}
            onRemoveExercise={handleRemoveExercise}
            onSetChange={handleSetChange}
          />

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
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={isSaveDisabled} type="button" onClick={handleSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
