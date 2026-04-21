import { useState } from 'react';

import type { FitnessGoal, FitnessGoalType } from '@shared/types';

import { useUpdateGoal } from '../../api/useFitness';

interface UseGoalEditDialogOptions {
  goal: FitnessGoal;
  onOpenChange: (open: boolean) => void;
}

export function useGoalEditDialog({ goal, onOpenChange }: UseGoalEditDialogOptions) {
  const updateGoal = useUpdateGoal();

  const [goalType, setGoalType] = useState<FitnessGoalType>(goal.type);
  const [target, setTarget] = useState(String(goal.target));
  const [unit, setUnit] = useState(goal.unit);
  const [deadline, setDeadline] = useState(goal.deadline ?? '');

  const isValid = Number(target) > 0 && unit.trim().length > 0;

  function handleSave(): void {
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

  const isSaveDisabled = !isValid || updateGoal.isPending;

  return {
    goalType,
    setGoalType,
    target,
    setTarget,
    unit,
    setUnit,
    deadline,
    setDeadline,
    isSaveDisabled,
    handleSave,
  };
}
