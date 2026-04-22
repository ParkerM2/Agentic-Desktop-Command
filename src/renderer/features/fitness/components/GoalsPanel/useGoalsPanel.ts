import { useState } from 'react';

import type { FitnessGoalType } from '@shared/types';

import { useDebounce } from '@renderer/shared/hooks/useDebounce';

import { useDeleteGoal, useFitnessGoals, useSetGoal } from '../../api/useFitness';

export function useGoalsPanel() {
  const { data: goals } = useFitnessGoals();
  const setGoal = useSetGoal();

  const [showForm, setShowForm] = useState(false);
  const [goalType, setGoalType] = useState<FitnessGoalType>('weight');
  const [target, setTarget] = useState('');
  const [unit, setUnit] = useState('kg');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebounce(searchQuery);

  const allGoals = goals ?? [];

  const displayGoals = debouncedQuery.trim().length > 0
    ? allGoals.filter((g) => g.type.toLowerCase().includes(debouncedQuery.toLowerCase()))
    : allGoals;

  function handleSubmit(): void {
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

  const isSubmitDisabled = Number(target) <= 0;

  return {
    displayGoals,
    showForm,
    setShowForm,
    goalType,
    setGoalType,
    target,
    setTarget,
    unit,
    setUnit,
    searchQuery,
    setSearchQuery,
    isSubmitDisabled,
    handleSubmit,
  };
}

export function useGoalCard(goalId: string) {
  const deleteGoal = useDeleteGoal();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  function handleDeleteConfirm(): void {
    deleteGoal.mutate(goalId);
  }

  return {
    editOpen,
    setEditOpen,
    deleteOpen,
    setDeleteOpen,
    handleDeleteConfirm,
  };
}
