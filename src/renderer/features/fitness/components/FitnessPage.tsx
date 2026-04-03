/**
 * FitnessPage — Main fitness dashboard with tabbed views
 */

import { Dumbbell, Plus, Scale, Target, TrendingUp } from 'lucide-react';

import { cn } from '@renderer/shared/lib/utils';

import { Button } from '@ui';

import { useFitnessEvents } from '../hooks/useFitnessEvents';
import { useFitnessUI } from '../store';

import { BodyComposition } from './BodyComposition';
import { GoalsPanel } from './GoalsPanel';
import { StatsOverview } from './StatsOverview';
import { WorkoutForm } from './WorkoutForm';
import { WorkoutLog } from './WorkoutLog';

// ── Constants ────────────────────────────────────────────────

const TABS = [
  { id: 'overview' as const, label: 'Overview', icon: TrendingUp },
  { id: 'workouts' as const, label: 'Workouts', icon: Dumbbell },
  { id: 'body' as const, label: 'Body', icon: Scale },
  { id: 'goals' as const, label: 'Goals', icon: Target },
];

// ── Component ────────────────────────────────────────────────

export function FitnessPage() {
  const { activeTab, showWorkoutForm, setActiveTab, setShowWorkoutForm } = useFitnessUI();

  // Subscribe to real-time fitness events
  useFitnessEvents();

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Header */}
      <div className="border-border flex items-center justify-between border-b px-6 py-4">
        <div>
          <h1 className="text-foreground text-2xl font-bold">Fitness</h1>
          <p className="text-muted-foreground text-sm">
            Track workouts, body composition, and goals
          </p>
        </div>
        <Button
          type="button"
          onClick={() => {
            setActiveTab('workouts');
            setShowWorkoutForm(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Log Workout
        </Button>
      </div>

      {/* Tabs */}
      <div className="border-border border-b px-6">
        <div className="flex gap-1">
          {TABS.map((tab) => (
            <Button
              key={tab.id}
              type="button"
              variant="ghost"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 rounded-none border-b-2 px-4 py-3 text-sm font-medium',
                activeTab === tab.id
                  ? 'border-primary text-foreground'
                  : 'text-muted-foreground hover:text-foreground border-transparent',
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6">
        {activeTab === 'overview' ? <OverviewTab /> : null}
        {activeTab === 'workouts' ? <WorkoutsTab showForm={showWorkoutForm} /> : null}
        {activeTab === 'body' ? <BodyComposition /> : null}
        {activeTab === 'goals' ? <GoalsPanel /> : null}
      </div>
    </div>
  );
}

// ── OverviewTab ──────────────────────────────────────────────

function OverviewTab() {
  return (
    <div className="space-y-6">
      <StatsOverview />
      <div>
        <h3 className="text-foreground mb-3 text-sm font-semibold">Recent Workouts</h3>
        <div className="bg-card border-border rounded-lg border">
          <WorkoutLog />
        </div>
      </div>
    </div>
  );
}

// ── WorkoutsTab ──────────────────────────────────────────────

interface WorkoutsTabProps {
  showForm: boolean;
}

function WorkoutsTab({ showForm }: WorkoutsTabProps) {
  return (
    <div className="space-y-4">
      {showForm ? <WorkoutForm /> : null}
      <div className="bg-card border-border rounded-lg border">
        <WorkoutLog />
      </div>
    </div>
  );
}
