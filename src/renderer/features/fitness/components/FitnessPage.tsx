/**
 * FitnessPage — Main fitness dashboard with tabbed views
 */

import { Dumbbell, Plus, Scale, Target, TrendingUp } from 'lucide-react';

import { Button, PageHeader, PageLayout, Tabs, TabsContent, TabsList, TabsTrigger } from '@ui';

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
      <PageHeader
        description="Track workouts, body composition, and goals"
        title="Fitness"
      >
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
      </PageHeader>

      <div className="flex flex-1 flex-col overflow-hidden">
        <Tabs
          className="flex flex-1 flex-col overflow-hidden"
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as typeof activeTab)}
        >
          <div className="border-border border-b px-6">
            <TabsList className="h-auto rounded-none bg-transparent p-0">
              <TabsTrigger
                className="flex items-center gap-2 rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-medium data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                value="overview"
              >
                <TrendingUp className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger
                className="flex items-center gap-2 rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-medium data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                value="workouts"
              >
                <Dumbbell className="h-4 w-4" />
                Workouts
              </TabsTrigger>
              <TabsTrigger
                className="flex items-center gap-2 rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-medium data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                value="body"
              >
                <Scale className="h-4 w-4" />
                Body
              </TabsTrigger>
              <TabsTrigger
                className="flex items-center gap-2 rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-medium data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                value="goals"
              >
                <Target className="h-4 w-4" />
                Goals
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <TabsContent value="overview">
              <OverviewTab />
            </TabsContent>
            <TabsContent value="workouts">
              <WorkoutsTab showForm={showWorkoutForm} />
            </TabsContent>
            <TabsContent value="body">
              <BodyComposition />
            </TabsContent>
            <TabsContent value="goals">
              <GoalsPanel />
            </TabsContent>
          </div>
        </Tabs>
      </div>
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
