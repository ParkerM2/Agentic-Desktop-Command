/**
 * useGoalsList — logic for GoalsList
 */

import { useState } from 'react';

export function useGoalsList(
  goals: string[],
  completedGoals: string[],
  onUpdate: (goals: string[]) => void,
  onToggle: (goalText: string) => void,
) {
  const [newGoal, setNewGoal] = useState('');
  const completedSet = new Set(completedGoals);

  function handleAdd() {
    const trimmed = newGoal.trim();
    if (trimmed.length === 0) return;
    onUpdate([...goals, trimmed]);
    setNewGoal('');
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Enter') {
      handleAdd();
    }
  }

  function handleRemove(index: number) {
    const removedText = goals[index];
    const updated = goals.filter((_g, idx) => idx !== index);
    onUpdate(updated);
    if (completedSet.has(removedText)) {
      onToggle(removedText);
    }
  }

  return {
    newGoal,
    completedSet,
    setNewGoal,
    handleAdd,
    handleKeyDown,
    handleRemove,
  };
}
