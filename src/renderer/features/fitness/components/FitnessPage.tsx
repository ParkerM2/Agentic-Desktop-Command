/**
 * FitnessPage — Main fitness dashboard with tabbed views
 */

import { Dumbbell, Plus, Scale, Target, TrendingUp } from 'lucide-react';

import { Button, PageContent, PageHeader, PageLayout } from '@ui';

import { useFitnessEvents } from '../hooks/useFitnessEvents';
import { useFitnessUI } from '../store';

import { BodyComposition } from './BodyComposition';
import { GoalsPanel } from './GoalsPanel';
import { StatsOverview } from './StatsOverview';
import { WorkoutForm } from './WorkoutForm';
import { WorkoutLog } from './WorkoutLog';

// ── Component ────────────────────────────────────────────────

export function FitnessPage() {
  const { activeTab, showWorkoutForm, setActiveTab, setShowWorkoutForm } = useFitnessUI();

  // Subscribe to real-time fitness events
  useFitnessEvents();

  return (
    <PageLayout>
      <PageHeader.Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as typeof activeTab)}
      >
        <PageHeader>
          <PageHeader.Row>
            <PageHeader.Title description="Track workouts, body composition, and goals">
              Fitness
            </PageHeader.Title>
            <PageHeader.Actions>
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
            </PageHeader.Actions>
          </PageHeader.Row>
          <PageHeader.TabList>
            <PageHeader.Tab value="overview">
              <TrendingUp className="h-4 w-4" />
              Overview
            </PageHeader.Tab>
            <PageHeader.Tab value="workouts">
              <Dumbbell className="h-4 w-4" />
              Workouts
            </PageHeader.Tab>
            <PageHeader.Tab value="body">
              <Scale className="h-4 w-4" />
              Body
            </PageHeader.Tab>
            <PageHeader.Tab value="goals">
              <Target className="h-4 w-4" />
              Goals
            </PageHeader.Tab>
          </PageHeader.TabList>
        </PageHeader>
        <PageContent>
          <PageHeader.TabContent value="overview">
            <OverviewTab />
          </PageHeader.TabContent>
          <PageHeader.TabContent value="workouts">
            <WorkoutsTab showForm={showWorkoutForm} />
          </PageHeader.TabContent>
          <PageHeader.TabContent value="body">
            <BodyComposition />
          </PageHeader.TabContent>
          <PageHeader.TabContent value="goals">
            <GoalsPanel />
          </PageHeader.TabContent>
        </PageContent>
      </PageHeader.Tabs>
    </PageLayout>
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
