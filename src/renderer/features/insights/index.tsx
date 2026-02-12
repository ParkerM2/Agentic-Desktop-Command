/**
 * Insights — Project metrics and activity dashboard
 */

import { Activity, BarChart3, CheckCircle2, Clock, TrendingUp, Zap } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────

interface StatCardData {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  trend: string;
}

interface TaskDistribution {
  label: string;
  count: number;
  percentage: number;
  colorVar: string;
}

type ActivityType = 'completed' | 'started' | 'moved' | 'created';

interface ActivityItem {
  id: string;
  type: ActivityType;
  message: string;
  time: string;
}

// ─── Mock Data ───────────────────────────────────────────────

const STAT_CARDS: StatCardData[] = [
  { label: 'Tasks Complete', value: '24', icon: CheckCircle2, trend: '+3 this week' },
  { label: 'Agent Hours', value: '18h', icon: Clock, trend: '+2h today' },
  { label: 'Success Rate', value: '87%', icon: TrendingUp, trend: '+5% vs last week' },
  { label: 'Active Agents', value: '3', icon: Zap, trend: '1 idle' },
];

const TASK_DISTRIBUTION: TaskDistribution[] = [
  { label: 'Done', count: 24, percentage: 80, colorVar: '--primary' },
  { label: 'In Progress', count: 3, percentage: 10, colorVar: '--ring' },
  { label: 'Queued', count: 3, percentage: 10, colorVar: '--muted-foreground' },
];

const ACTIVITY_CONFIG: Record<ActivityType, { dotVar: string }> = {
  completed: { dotVar: '--success' },
  started: { dotVar: '--info' },
  moved: { dotVar: '--warning' },
  created: { dotVar: '--muted-foreground' },
};

const RECENT_ACTIVITY: ActivityItem[] = [
  { id: '1', type: 'completed', message: 'Task "Fix auth flow" completed', time: '2h ago' },
  { id: '2', type: 'started', message: 'Agent started on "Settings page"', time: '3h ago' },
  { id: '3', type: 'moved', message: 'Task "Build UI" moved to review', time: '5h ago' },
  { id: '4', type: 'completed', message: 'Task "Add themes" completed', time: '1d ago' },
  { id: '5', type: 'created', message: 'Task "Insights page" created', time: '1d ago' },
  { id: '6', type: 'started', message: 'Agent started on "Changelog"', time: '2d ago' },
];

// ─── Components ──────────────────────────────────────────────

function StatCard({ stat }: { stat: StatCardData }) {
  const IconComponent = stat.icon;

  return (
    <div className="border-border bg-card rounded-lg border p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-foreground text-2xl font-bold">{stat.value}</p>
          <p className="text-muted-foreground text-sm">{stat.label}</p>
        </div>
        <IconComponent className="text-muted-foreground h-5 w-5" />
      </div>
      <p className="text-muted-foreground mt-2 text-xs">{stat.trend}</p>
    </div>
  );
}

function StatusBar({ item }: { item: TaskDistribution }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-foreground">{item.label}</span>
        <span className="text-muted-foreground">
          {String(item.percentage)}% ({String(item.count)})
        </span>
      </div>
      <div className="bg-muted h-2 overflow-hidden rounded-full">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${String(item.percentage)}%`,
            backgroundColor: `hsl(var(${item.colorVar}))`,
          }}
        />
      </div>
    </div>
  );
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const config = ACTIVITY_CONFIG[item.type];

  return (
    <div className="flex items-center gap-3 py-2">
      <div
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: `hsl(var(${config.dotVar}))` }}
      />
      <span className="text-foreground flex-1 text-sm">{item.message}</span>
      <span className="text-muted-foreground shrink-0 text-xs">{item.time}</span>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────

export function InsightsPage() {
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

      {/* Stat cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {STAT_CARDS.map((stat) => (
          <StatCard key={stat.label} stat={stat} />
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
          <div className="space-y-3">
            {TASK_DISTRIBUTION.map((item) => (
              <StatusBar key={item.label} item={item} />
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="border-border bg-card rounded-lg border p-4">
          <div className="mb-4 flex items-center gap-2">
            <Clock className="text-muted-foreground h-4 w-4" />
            <h2 className="text-foreground text-sm font-semibold">Recent Activity</h2>
          </div>
          <div className="divide-border divide-y">
            {RECENT_ACTIVITY.map((item) => (
              <ActivityRow key={item.id} item={item} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
