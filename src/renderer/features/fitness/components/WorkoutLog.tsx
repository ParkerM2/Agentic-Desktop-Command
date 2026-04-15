/**
 * WorkoutLog — Recent workouts list
 */

import { useState } from 'react';

import { Pencil, Trash2 } from 'lucide-react';

import type { Workout } from '@shared/types';

import { RelativeTime } from '@renderer/shared/components/RelativeTime';
import { useDebounce } from '@renderer/shared/hooks/useDebounce';

import { Badge, Button, EmptyState, SearchInput, Text } from '@ui';

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
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebounce(searchQuery);

  const allWorkouts = workouts ?? [];

  const displayWorkouts = debouncedQuery.trim()
    ? allWorkouts.filter((w) => {
        const q = debouncedQuery.toLowerCase();
        return w.type.toLowerCase().includes(q) || (w.notes ?? '').toLowerCase().includes(q);
      })
    : allWorkouts;

  return (
    <div className="flex flex-col gap-3">
      <SearchInput
        placeholder="Search workouts by type or notes..."
        showClear={searchQuery.length > 0}
        size="sm"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onClear={() => setSearchQuery('')}
      />
      {displayWorkouts.length === 0 ? (
        <EmptyState
          description={searchQuery ? 'No workouts match your search' : 'No workouts logged yet'}
          size="sm"
          title=""
        />
      ) : (
        <div className="divide-border divide-y">
          {displayWorkouts.slice(0, 20).map((workout) => (
            <WorkoutItem
              key={workout.id}
              workout={workout}
              onDelete={() => deleteWorkout.mutate(workout.id)}
            />
          ))}
        </div>
      )}
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
          <Text className="mt-1" size="sm">
            {String(exerciseCount)} exercise{exerciseCount === 1 ? '' : 's'} &middot;{' '}
            {String(totalSets)} set{totalSets === 1 ? '' : 's'} &middot; {String(workout.duration)}{' '}
            min
          </Text>
          {(workout.exercises.length > 0) ? (
            <Text className="mt-0.5 text-xs" variant="muted">
              {workout.exercises.map((e) => e.name).join(', ')}
            </Text>
          ) : null}
          {workout.notes ? (
            <Text className="mt-1 italic" size="sm" variant="muted">{workout.notes}</Text>
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
