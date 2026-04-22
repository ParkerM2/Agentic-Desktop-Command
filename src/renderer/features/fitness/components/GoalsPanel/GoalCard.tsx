/**
 * GoalCard — Individual fitness goal card with edit/delete actions
 */

import { Pencil, Trash2 } from 'lucide-react';

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
  Progress,
  Text,
} from '@ui';

import { GoalEditDialog } from '../GoalEditDialog';

import { useGoalCard } from './useGoalsPanel';

// ── Constants ────────────────────────────────────────────────

const GOAL_TYPE_LABELS: Record<FitnessGoalType, string> = {
  weight: 'Weight',
  workout_frequency: 'Workout Frequency',
  lift_target: 'Lift Target',
  cardio_target: 'Cardio Target',
};

// ── Props ────────────────────────────────────────────────────

interface GoalCardProps {
  goal: FitnessGoal;
}

// ── Component ────────────────────────────────────────────────

export function GoalCard({ goal }: GoalCardProps) {
  const { editOpen, setEditOpen, deleteOpen, setDeleteOpen, handleDeleteConfirm } = useGoalCard(
    goal.id,
  );

  const progress = goal.target > 0 ? Math.min((goal.current / goal.target) * 100, 100) : 0;

  return (
    <>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-muted-foreground text-xs font-medium">
                {GOAL_TYPE_LABELS[goal.type]}
              </span>
              <Text className="font-semibold" size="sm">
                {String(goal.current)} / {String(goal.target)} {goal.unit}
              </Text>
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
          <Text className="mt-1 text-xs" variant="muted">
            {String(Math.round(progress))}% complete
            {goal.deadline === undefined ? '' : ` \u00B7 Due ${goal.deadline}`}
          </Text>
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
