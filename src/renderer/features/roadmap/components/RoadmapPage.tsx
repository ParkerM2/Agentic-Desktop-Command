import { CheckCircle2, Circle, Clock, Map } from 'lucide-react';

import { cn } from '@renderer/shared/lib/utils';

type PhaseStatus = 'completed' | 'in-progress' | 'planned';

interface Phase {
  id: string;
  title: string;
  description: string;
  status: PhaseStatus;
  progress: number;
}

const MOCK_PHASES: Phase[] = [
  {
    id: 'phase-1',
    title: 'Phase 1: Foundation',
    description: 'Scaffold, IPC architecture, core infrastructure',
    status: 'completed',
    progress: 100,
  },
  {
    id: 'phase-2',
    title: 'Phase 2: Core Features',
    description: 'Task management, terminals, agent orchestration',
    status: 'completed',
    progress: 100,
  },
  {
    id: 'phase-3',
    title: 'Phase 3: Polish & Settings',
    description: 'Settings UI, profiles, theme system, design polish',
    status: 'in-progress',
    progress: 80,
  },
  {
    id: 'phase-4',
    title: 'Phase 4: Distribution',
    description: 'Windows installer, auto-update, packaging',
    status: 'planned',
    progress: 0,
  },
  {
    id: 'phase-5',
    title: 'Phase 5: Advanced Features',
    description: 'GitHub integration, insights, AI workflows',
    status: 'planned',
    progress: 0,
  },
];

const STATUS_CONFIG: Record<
  PhaseStatus,
  {
    icon: typeof CheckCircle2;
    label: string;
    barClass: string;
    iconClass: string;
  }
> = {
  completed: {
    icon: CheckCircle2,
    label: 'Completed',
    barClass: 'bg-primary',
    iconClass: 'text-primary',
  },
  'in-progress': {
    icon: Clock,
    label: 'In Progress',
    barClass: 'bg-primary',
    iconClass: 'text-primary',
  },
  planned: {
    icon: Circle,
    label: 'Planned',
    barClass: 'bg-muted-foreground',
    iconClass: 'text-muted-foreground',
  },
};

export function RoadmapPage() {
  const completedCount = MOCK_PHASES.filter((p) => p.status === 'completed').length;
  const totalProgress = Math.round(
    MOCK_PHASES.reduce((sum, p) => sum + p.progress, 0) / MOCK_PHASES.length,
  );

  return (
    <div className="mx-auto max-w-3xl p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <Map className="text-primary h-6 w-6" />
          <h1 className="text-2xl font-bold">Roadmap</h1>
        </div>
        <p className="text-muted-foreground mt-1 text-sm">Project milestones and progress</p>
      </div>

      {/* Summary Stats */}
      <div className="mb-8 grid grid-cols-3 gap-4">
        <div className="border-border bg-card rounded-lg border p-4">
          <div className="text-muted-foreground mb-1 text-xs font-medium tracking-wider uppercase">
            Total Phases
          </div>
          <p className="text-lg font-semibold">{MOCK_PHASES.length}</p>
        </div>
        <div className="border-border bg-card rounded-lg border p-4">
          <div className="text-muted-foreground mb-1 text-xs font-medium tracking-wider uppercase">
            Completed
          </div>
          <p className="text-lg font-semibold">
            {completedCount} / {MOCK_PHASES.length}
          </p>
        </div>
        <div className="border-border bg-card rounded-lg border p-4">
          <div className="text-muted-foreground mb-1 text-xs font-medium tracking-wider uppercase">
            Overall Progress
          </div>
          <p className="text-lg font-semibold">{totalProgress}%</p>
        </div>
      </div>

      {/* Timeline */}
      <section>
        <h2 className="text-muted-foreground mb-4 text-sm font-medium tracking-wider uppercase">
          Timeline
        </h2>
        <div className="space-y-4">
          {MOCK_PHASES.map((phase) => {
            const config = STATUS_CONFIG[phase.status];
            const StatusIcon = config.icon;

            return (
              <div key={phase.id} className="border-border bg-card rounded-lg border p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StatusIcon className={cn('h-5 w-5', config.iconClass)} />
                    <h3 className="font-medium">{phase.title}</h3>
                  </div>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-xs font-medium',
                      phase.status === 'completed' && 'bg-primary/10 text-primary',
                      phase.status === 'in-progress' && 'bg-primary/10 text-primary',
                      phase.status === 'planned' && 'bg-muted text-muted-foreground',
                    )}
                  >
                    {config.label}
                  </span>
                </div>
                <p className="text-muted-foreground mb-3 text-sm">{phase.description}</p>
                {/* Progress Bar */}
                <div className="flex items-center gap-3">
                  <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
                    <div
                      className={cn('h-full rounded-full transition-all', config.barClass)}
                      style={{ width: `${String(phase.progress)}%` }}
                    />
                  </div>
                  <span className="text-muted-foreground w-10 text-right text-xs font-medium">
                    {phase.progress}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
