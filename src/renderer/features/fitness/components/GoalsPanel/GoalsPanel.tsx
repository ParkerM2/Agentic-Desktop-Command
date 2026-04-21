/**
 * GoalsPanel — Set and view fitness goals
 */

import { Plus, Target } from 'lucide-react';

import type { FitnessGoalType } from '@shared/types';

import {
  Button,
  Card,
  CardContent,
  EmptyState,
  Heading,
  Input,
  Label,
  SearchInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ui';

import { GoalCard } from './GoalCard';
import { useGoalsPanel } from './useGoalsPanel';

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
  const {
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
  } = useGoalsPanel();

  return (
    <div className="space-y-4">
      {/* Search */}
      <SearchInput
        placeholder="Search goals by type..."
        showClear={searchQuery.length > 0}
        size="sm"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onClear={() => setSearchQuery('')}
      />

      {/* Goals list */}
      {displayGoals.length > 0 ? (
        <div className="space-y-3">
          {displayGoals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      ) : (
        <EmptyState
          description={searchQuery.length > 0 ? 'No goals match your search' : 'No goals set yet'}
          icon={Target}
          size="sm"
          title=""
        />
      )}

      {/* Add goal form */}
      {showForm ? (
        <Card>
          <CardContent className="p-4">
            <Heading as="h4" className="text-foreground mb-3 text-sm font-medium">
              Set Goal
            </Heading>
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
                  disabled={isSubmitDisabled}
                  type="button"
                  onClick={handleSubmit}
                >
                  Set Goal
                </Button>
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
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
