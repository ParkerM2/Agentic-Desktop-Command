/**
 * GoalsPanel — Set and view fitness goals
 */

import { useState } from 'react';

import { Pencil, Plus, Target, Trash2 } from 'lucide-react';

import type { FitnessGoal, FitnessGoalType } from '@shared/types';

import { RelativeTime } from '@renderer/shared/components/RelativeTime';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Card,
  CardContent,
  EmptyState,
  Input,
  Label,
  Progress,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ui';

import { useDeleteGoal, useFitnessGoals, useSetGoal } from '../api/useFitness';

import { GoalEditDialog } from './GoalEditDialog';

// ── Constants ────────────────────────────────────────────────

const GOAL_TYPE_LABELS: Record<FitnessGoalType, string> = {
  weight: 'Weight',
  workout_frequency: 'Workout Frequency',
  lift_target: 'Lift Target',
  cardio_target: 'Cardio Target',
};

const GOAL_TYPES: FitnessGoalType[] = [
  'weight',
  'workout_frequency',
  'lift_target',
  'cardio_target',
];

// ── Component ────────────────────────────────────────────────

export function GoalsPanel() {
  const { data: goals } = useFitnessGoals();
  const setGoal = useSetGoal();
  const [showForm, setShowForm] = useState(false);
  const [goalType, setGoalType] = useState<FitnessGoalType>('weight');
  const [target, setTarget] = useState('');
  const [unit, setUnit] = useState('kg');

  const displayGoals = goals ?? [];

  function handleSubmit() {
    const targetNum = Number(target);
    if (targetNum <= 0) return;

    setGoal.mutate(
      { type: goalType, target: targetNum, unit },
      {
        onSuccess: () => {
          setTarget('');
          setShowForm(false);
        },
      },
    );
  }

  return (
    <div className="space-y-4">
      {/* Goals list */}
      {(displayGoals.length > 0) ? (
        <div className="space-y-3">
          {displayGoals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      ) : (
        <EmptyState
          description="No goals set yet"
          icon={Target}
          size="sm"
          title=""
        />
      )}

      {/* Add goal form */}
      {showForm ? (
        <Card>
          <CardContent className="p-4">
            <h4 className="text-foreground mb-3 text-sm font-medium">Set Goal</h4>
            <div className="space-y-3">
              <div>
                <Label className="mb-1" htmlFor="goal-type">
                  Goal Type
                </Label>
                <Select
                  value={goalType}
                  onValueChange={(v) => setGoalType(v as FitnessGoalType)}
                >
                  <SelectTrigger id="goal-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GOAL_TYPES.map((gt) => (
                      <SelectItem key={gt} value={gt}>
                        {GOAL_TYPE_LABELS[gt]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <Label className="mb-1" htmlFor="goal-target">
                    Target
                  </Label>
                  <Input
                    id="goal-target"
                    placeholder="100"
                    type="number"
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                  />
                </div>
                <div className="w-24">
                  <Label className="mb-1" htmlFor="goal-unit">
                    Unit
                  </Label>
                  <Input
                    id="goal-unit"
                    placeholder="kg"
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  disabled={Number(target) <= 0}
                  type="button"
                  onClick={handleSubmit}
                >
                  Set Goal
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button
          className="text-primary"
          type="button"
          variant="ghost"
          onClick={() => setShowForm(true)}
        >
          <Plus className="h-4 w-4" />
          Set New Goal
        </Button>
      )}
    </div>
  );
}

// ── GoalCard ─────────────────────────────────────────────────

interface GoalCardProps {
  goal: FitnessGoal;
}

function GoalCard({ goal }: GoalCardProps) {
  const deleteGoal = useDeleteGoal();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const progress = goal.target > 0 ? Math.min((goal.current / goal.target) * 100, 100) : 0;

  function handleDeleteConfirm(): void {
    deleteGoal.mutate(goal.id);
  }

  return (
    <>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-muted-foreground text-xs font-medium">
                {GOAL_TYPE_LABELS[goal.type]}
              </span>
              <p className="text-foreground text-sm font-semibold">
                {String(goal.current)} / {String(goal.target)} {goal.unit}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button
                aria-label="Edit goal"
                className="text-muted-foreground hover:text-foreground h-7 w-7"
                size="icon"
                type="button"
                variant="ghost"
                onClick={() => setEditOpen(true)}
              >
                <Pencil className="h-3 w-3" />
              </Button>
              <Button
                aria-label="Delete goal"
                className="text-muted-foreground hover:text-destructive h-7 w-7"
                size="icon"
                type="button"
                variant="ghost"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <Progress className="mt-2" size="sm" value={Math.round(progress)} />
          <p className="text-muted-foreground mt-1 text-xs">
            {String(Math.round(progress))}% complete
            {goal.deadline ? ` \u00B7 Due ${goal.deadline}` : ''}
          </p>
          <div className="mt-1">
            <RelativeTime value={goal.createdAt} />
          </div>
        </CardContent>
      </Card>

      <GoalEditDialog goal={goal} open={editOpen} onOpenChange={setEditOpen} />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete goal?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the {GOAL_TYPE_LABELS[goal.type]} goal. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteConfirm}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
