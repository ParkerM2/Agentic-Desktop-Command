/**
 * GoalsList — Daily goals checklist.
 * Completion is persisted via the onToggle callback (not local state).
 */

import { useState } from 'react';

import { Check, Plus, Trash2, X } from 'lucide-react';

import { cn } from '@renderer/shared/lib/utils';

import { Button, Input } from '@ui';

interface GoalsListProps {
  goals: string[];
  completedGoals: string[];
  onUpdate: (goals: string[]) => void;
  onToggle: (goalText: string) => void;
}

export function GoalsList({ goals, completedGoals, onUpdate, onToggle }: GoalsListProps) {
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

  return (
    <div className="space-y-3">
      <h3 className="text-foreground text-sm font-semibold">Daily Goals</h3>

      {goals.length === 0 ? (
        <p className="text-muted-foreground text-xs">No goals set for today.</p>
      ) : (
        <ul className="space-y-1.5">
          {goals.map((goal, index) => {
            const isComplete = completedSet.has(goal);
            return (
              <li key={`goal-${String(index)}`} className="group flex items-center gap-2">
                <Button
                  aria-label={isComplete ? 'Mark incomplete' : 'Mark complete'}
                  size="icon"
                  variant="ghost"
                  className={cn(
                    'h-5 w-5 shrink-0 rounded border p-0',
                    isComplete
                      ? 'border-success bg-success text-success-foreground hover:bg-success/90'
                      : 'border-border hover:border-primary',
                  )}
                  onClick={() => onToggle(goal)}
                >
                  {isComplete ? <Check className="h-3 w-3" /> : null}
                </Button>
                <span
                  className={cn(
                    'flex-1 text-sm',
                    isComplete ? 'text-muted-foreground line-through' : 'text-foreground',
                  )}
                >
                  {goal}
                </span>
                <Button
                  aria-label="Remove goal"
                  className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100"
                  size="icon"
                  variant="ghost"
                  onClick={() => handleRemove(index)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex items-center gap-2">
        <Input
          className="flex-1"
          placeholder="Add a goal..."
          value={newGoal}
          onChange={(event) => setNewGoal(event.target.value)}
          onKeyDown={handleKeyDown}
        />
        {newGoal.trim().length > 0 ? (
          <>
            <Button
              aria-label="Add goal"
              className="text-primary hover:text-primary/80"
              size="icon"
              variant="ghost"
              onClick={handleAdd}
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              aria-label="Cancel"
              size="icon"
              variant="ghost"
              onClick={() => setNewGoal('')}
            >
              <X className="h-4 w-4" />
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}
