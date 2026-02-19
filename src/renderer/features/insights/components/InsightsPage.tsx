import { Activity, BarChart3, CheckCircle2, Clock, TrendingUp, Zap } from 'lucide-react';

import type { InsightMetrics, TaskDistribution } from '@shared/types';

import { useInsightMetrics, useProjectBreakdown, useTaskDistribution } from '../api/useInsights';

const STATUS_COLOR_MAP: Record<string, string> = {
  backlog: '--border',
  planning: '--info',
  plan_ready: '--warning',
  queued: '--muted-foreground',
  running: '--ring',
  paused: '--muted-foreground',
  review: '--warning',
  done: '--primary',
  error: '--destructive',
};

function StatCard(props: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  subtitle: string;
}) {
  const IconComponent = props.icon;

  return (
    <div className="border-border bg-card rounded-lg border p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-foreground text-2xl font-bold">{props.value}</p>
          <p className="text-muted-foreground text-sm">{props.label}</p>
        </div>
        <IconComponent className="text-muted-foreground h-5 w-5" />
      </div>
      <p className="text-muted-foreground mt-2 text-xs">{props.subtitle}</p>
    </div>
  );
}

function StatusBar({ item }: { item: TaskDistribution }) {
  const colorVar = STATUS_COLOR_MAP[item.status] ?? '--muted-foreground';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-foreground capitalize">{item.status.replaceAll('_', ' ')}</span>
        <span className="text-muted-foreground">
          {String(item.percentage)}% ({String(item.count)})
        </span>
      </div>
      <div className="bg-muted h-2 overflow-hidden rounded-full">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${String(item.percentage)}%`,
            backgroundColor: `hsl(var(${colorVar}))`,
          }}
        />
      </div>
    </div>
  );
}

function buildStatCards(metrics: InsightMetrics) {
  return [
    {
      label: 'Tasks Complete',
      value: String(metrics.completedTasks),
      icon: CheckCircle2,
      subtitle: `${String(metrics.completionRate)}% completion rate`,
    },
    {
      label: 'Agent Runs',
      value: String(metrics.agentRunCount),
      icon: Clock,
      subtitle: `${String(metrics.agentSuccessRate)}% success rate`,
    },
    {
      label: 'Success Rate',
      value: `${String(metrics.agentSuccessRate)}%`,
      icon: TrendingUp,
      subtitle: `${String(metrics.agentRunCount)} total runs`,
    },
    {
      label: 'Active Agents',
      value: String(metrics.activeAgents),
      icon: Zap,
      subtitle: `${String(metrics.totalTasks)} total tasks`,
    },
  ];
}

export function InsightsPage() {
  const { data: metrics, isLoading: metricsLoading } = useInsightMetrics();
  const { data: distribution } = useTaskDistribution();
  const { data: projects } = useProjectBreakdown();

  const statCards = metrics ? buildStatCards(metrics) : [];
  const distItems = distribution ?? [];
  const projectItems = projects ?? [];

  return (
    <div className="h-full overflow-y-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <BarChart3 className="text-muted-foreground h-6 w-6" />
          <h1 className="text-foreground text-2xl font-bold">Insights</h1>
        </div>
        <p className="text-muted-foreground mt-1 text-sm">Project metrics and activity</p>
      </div>

      {metricsLoading ? (
        <div className="text-muted-foreground flex items-center justify-center py-12">
          Loading metrics...
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {statCards.map((stat) => (
              <StatCard
                key={stat.label}
                icon={stat.icon}
                label={stat.label}
                subtitle={stat.subtitle}
                value={stat.value}
              />
            ))}
          </div>

          {/* Two-column layout */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Task Distribution */}
            <div className="border-border bg-card rounded-lg border p-4">
              <div className="mb-4 flex items-center gap-2">
                <Activity className="text-muted-foreground h-4 w-4" />
                <h2 className="text-foreground text-sm font-semibold">Task Distribution</h2>
              </div>
              {distItems.length > 0 ? (
                <div className="space-y-3">
                  {distItems.map((item) => (
                    <StatusBar key={item.status} item={item} />
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No tasks yet</p>
              )}
            </div>

            {/* Project Breakdown */}
            <div className="border-border bg-card rounded-lg border p-4">
              <div className="mb-4 flex items-center gap-2">
                <BarChart3 className="text-muted-foreground h-4 w-4" />
                <h2 className="text-foreground text-sm font-semibold">Project Breakdown</h2>
              </div>
              {projectItems.length > 0 ? (
                <div className="space-y-3">
                  {projectItems.map((project) => (
                    <div key={project.projectId} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-foreground">{project.projectName}</span>
                        <span className="text-muted-foreground">
                          {project.completedCount}/{project.taskCount} (
                          {String(project.completionRate)}%)
                        </span>
                      </div>
                      <div className="bg-muted h-2 overflow-hidden rounded-full">
                        <div
                          className="bg-primary h-full rounded-full transition-all"
                          style={{ width: `${String(project.completionRate)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No projects yet</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
