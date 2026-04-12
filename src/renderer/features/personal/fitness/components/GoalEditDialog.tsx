/**
 * GoalEditDialog — Edit an existing fitness goal's type, target, unit, and deadline
 */

import { useState } from 'react';

import type { FitnessGoal, FitnessGoalType } from '@shared/types';

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
} from '@ui';

import { useUpdateGoal } from '../api/useFitness';

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

interface GoalEditDialogProps {
  goal: FitnessGoal;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GoalEditDialog({ goal, open, onOpenChange }: GoalEditDialogProps) {
  const updateGoal = useUpdateGoal();

  const [goalType, setGoalType] = useState<FitnessGoalType>(goal.type);
  const [target, setTarget] = useState(String(goal.target));
  const [unit, setUnit] = useState(goal.unit);
  const [deadline, setDeadline] = useState(goal.deadline ?? '');

  const isValid = Number(target) > 0 && unit.trim().length > 0;

  function handleSave() {
    if (!isValid) return;

    updateGoal.mutate(
      {
        id: goal.id,
        type: goalType,
        target: Number(target),
        unit: unit.trim(),
        deadline: deadline.trim().length > 0 ? deadline.trim() : null,
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Goal</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Goal Type */}
          <div>
            <Label
              className="text-muted-foreground mb-1 block text-xs font-medium"
              htmlFor="edit-goal-type"
            >
              Goal Type
            </Label>
            <Select value={goalType} onValueChange={(v) => setGoalType(v as FitnessGoalType)}>
              <SelectTrigger id="edit-goal-type">
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

          {/* Target + Unit */}
          <div className="flex gap-3">
            <div className="flex-1">
              <Label
                className="text-muted-foreground mb-1 block text-xs font-medium"
                htmlFor="edit-goal-target"
              >
                Target
              </Label>
              <Input
                id="edit-goal-target"
                min="1"
                placeholder="100"
                type="number"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              />
            </div>
            <div className="w-24">
              <Label
                className="text-muted-foreground mb-1 block text-xs font-medium"
                htmlFor="edit-goal-unit"
              >
                Unit
              </Label>
              <Input
                id="edit-goal-unit"
                placeholder="kg"
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              />
            </div>
          </div>

          {/* Deadline */}
          <div>
            <Label
              className="text-muted-foreground mb-1 block text-xs font-medium"
              htmlFor="edit-goal-deadline"
            >
              Deadline (optional)
            </Label>
            <Input
              id="edit-goal-deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
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
            disabled={!isValid || updateGoal.isPending}
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
