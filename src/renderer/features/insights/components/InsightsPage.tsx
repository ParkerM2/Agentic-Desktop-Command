import { Activity, BarChart3, CheckCircle2, Clock, TrendingUp, Zap } from 'lucide-react';

import type { InsightMetrics, TaskDistribution } from '@shared/types';

import {
  Card,
  CardContent,
  Heading,
  MetricCard,
  Progress,
  Text,
} from '@ui';

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

function StatusBar({ item }: { item: TaskDistribution }) {
  const colorVar = STATUS_COLOR_MAP[item.status] ?? '--muted-foreground';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-foreground capitalize">{item.status.replaceAll('_', ' ')}</span>
        <Text className="text-xs" variant="muted">
          {String(item.percentage)}% ({String(item.count)})
        </Text>
      </div>
      <div className="relative h-2">
        <Progress
          className="absolute inset-0"
          value={item.percentage}
          style={
            {
              '--progress-indicator-color': `hsl(var(${colorVar}))`,
            } as React.CSSProperties
          }
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
    <div className="space-y-6 p-6">
        {metricsLoading ? (
          <div className="text-muted-foreground flex items-center justify-center py-12">
            Loading metrics...
          </div>
        ) : (
          <>
            {/* Stat cards */}
            <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
              {statCards.map((stat) => (
                <MetricCard
                  key={stat.label}
                  icon={stat.icon}
                  label={stat.label}
                  subtitle={stat.subtitle}
                  value={stat.value}
                  variant="compact"
                />
              ))}
            </div>

            {/* Two-column layout */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Task Distribution */}
              <Card>
                <CardContent className="p-4">
                  <div className="mb-4 flex items-center gap-2">
                    <Activity className="text-muted-foreground h-4 w-4" />
                    <Heading as="h2" className="text-sm">Task Distribution</Heading>
                  </div>
                  {distItems.length > 0 ? (
                    <div className="space-y-3">
                      {distItems.map((item) => (
                        <StatusBar key={item.status} item={item} />
                      ))}
                    </div>
                  ) : (
                    <Text variant="muted">No tasks yet</Text>
                  )}
                </CardContent>
              </Card>

              {/* Project Breakdown */}
              <Card>
                <CardContent className="p-4">
                  <div className="mb-4 flex items-center gap-2">
                    <BarChart3 className="text-muted-foreground h-4 w-4" />
                    <Heading as="h2" className="text-sm">Project Breakdown</Heading>
                  </div>
                  {projectItems.length > 0 ? (
                    <div className="space-y-3">
                      {projectItems.map((project) => (
                        <div key={project.projectId} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-foreground">{project.projectName}</span>
                            <Text className="text-xs" variant="muted">
                              {project.completedCount}/{project.taskCount} (
                              {String(project.completionRate)}%)
                            </Text>
                          </div>
                          <Progress size="sm" value={project.completionRate} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Text variant="muted">No projects yet</Text>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
    </div>
  );
}
