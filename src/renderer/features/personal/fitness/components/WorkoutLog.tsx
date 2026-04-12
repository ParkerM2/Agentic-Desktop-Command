/**
 * WorkoutLog — Recent workouts list
 */

import { useState } from 'react';

import { Pencil, Trash2 } from 'lucide-react';

import type { Workout } from '@shared/types';

import { RelativeTime } from '@renderer/shared/components/RelativeTime';

import { Badge, Button, EmptyState } from '@ui';

import { useDeleteWorkout, useWorkouts } from '../api/useFitness';

import { WorkoutEditDialog } from './WorkoutEditDialog';

// ── Constants ────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  strength: 'Strength',
  cardio: 'Cardio',
  flexibility: 'Flexibility',
  sport: 'Sport',
};

// ── Component ────────────────────────────────────────────────

export function WorkoutLog() {
  const { data: workouts } = useWorkouts();
  const deleteWorkout = useDeleteWorkout();

  const displayWorkouts = workouts ?? [];

  if (displayWorkouts.length === 0) {
    return (
      <EmptyState
        description="No workouts logged yet"
        size="sm"
        title=""
      />
    );
  }

  return (
    <div className="divide-border divide-y">
      {displayWorkouts.slice(0, 20).map((workout) => (
        <WorkoutItem
          key={workout.id}
          workout={workout}
          onDelete={() => deleteWorkout.mutate(workout.id)}
        />
      ))}
    </div>
  );
}

// ── WorkoutItem ──────────────────────────────────────────────

interface WorkoutItemProps {
  workout: Workout;
  onDelete: () => void;
}

function getWorkoutVariant(type: string): 'default' | 'success' | 'info' | 'warning' | 'secondary' {
  if (type === 'strength') return 'default';
  if (type === 'cardio') return 'success';
  if (type === 'flexibility') return 'info';
  if (type === 'sport') return 'warning';
  return 'secondary';
}

function WorkoutItem({ workout, onDelete }: WorkoutItemProps) {
  const [editOpen, setEditOpen] = useState(false);
  const exerciseCount = workout.exercises.length;
  const totalSets = workout.exercises.reduce((sum, e) => sum + e.sets.length, 0);

  return (
    <>
      <div className="flex items-start justify-between px-4 py-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Badge variant={getWorkoutVariant(workout.type)}>
              {TYPE_LABELS[workout.type] ?? workout.type}
            </Badge>
            <span className="text-muted-foreground text-xs">{workout.date}</span>
          </div>
          <p className="text-foreground mt-1 text-sm">
            {String(exerciseCount)} exercise{exerciseCount === 1 ? '' : 's'} &middot;{' '}
            {String(totalSets)} set{totalSets === 1 ? '' : 's'} &middot; {String(workout.duration)}{' '}
            min
          </p>
          {(workout.exercises.length > 0) ? (
            <p className="text-muted-foreground mt-0.5 text-xs">
              {workout.exercises.map((e) => e.name).join(', ')}
            </p>
          ) : null}
          {workout.notes ? (
            <p className="text-muted-foreground mt-1 text-xs italic">{workout.notes}</p>
          ) : null}
          <div className="mt-1">
            <RelativeTime value={workout.createdAt} />
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            aria-label="Edit workout"
            className="text-muted-foreground hover:text-foreground"
            size="icon"
            type="button"
            variant="ghost"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            aria-label="Delete workout"
            className="text-muted-foreground hover:text-destructive"
            size="icon"
            type="button"
            variant="ghost"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <WorkoutEditDialog open={editOpen} workout={workout} onOpenChange={setEditOpen} />
    </>
  );
}
