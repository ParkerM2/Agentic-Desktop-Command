import { useState } from 'react';

import type { FitnessGoal, FitnessGoalType } from '@shared/types';

import { useUpdateGoal } from '../../api/useFitness';
import { useEditDialog } from '../../hooks/useEditDialog';

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

  const { isSaveDisabled, handleSave } = useEditDialog({
    mutation: updateGoal,
    buildInput: () => {
      if (Number(target) <= 0 || unit.trim().length === 0) return null;
      return {
        id: goal.id,
        type: goalType,
        target: Number(target),
        unit: unit.trim(),
        deadline: deadline.trim().length > 0 ? deadline.trim() : null,
      };
    },
    onClose: () => onOpenChange(false),
  });

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
