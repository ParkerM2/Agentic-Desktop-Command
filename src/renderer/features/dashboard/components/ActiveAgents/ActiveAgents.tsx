/**
 * ActiveAgents — Shows running agent sessions from the agent dashboard
 * and workspace/progress systems. Reads from useWorkspaceSessions (React Query)
 * and useAllAgents (agent dashboard) to provide a unified view.
 */

import { Bot, CheckCircle2, Loader2, XCircle } from 'lucide-react';

import { cn, formatRelativeTime } from '@renderer/shared/lib/utils';

import { Card, CardContent, EmptyState, Text } from '@ui';

import { isActive, useActiveAgents } from './useActiveAgents';

// ─── Status Mapping ────────────────────────────────────────

const STATUS_ICON = {
  active: { icon: Loader2, className: 'text-info' },
  spawning: { icon: Loader2, className: 'text-info' },
  live: { icon: Loader2, className: 'text-info' },
  starting: { icon: Loader2, className: 'text-info' },
  running: { icon: Loader2, className: 'text-info' },
  idle: { icon: Loader2, className: 'text-info' },
  completed: { icon: CheckCircle2, className: 'text-success' },
  failed: { icon: XCircle, className: 'text-destructive' },
  error: { icon: XCircle, className: 'text-destructive' },
  crashed: { icon: XCircle, className: 'text-destructive' },
} as const;

type KnownStatus = keyof typeof STATUS_ICON;

function getStatusConfig(status: string) {
  if (status in STATUS_ICON) {
    return STATUS_ICON[status as KnownStatus];
  }
  return STATUS_ICON.active;
}

export function ActiveAgents() {
  const { entries, isLoading } = useActiveAgents();

  if (isLoading && entries.length === 0) {
    return (
      <Card>
        <CardContent className="p-4">
          <Text className="mb-3 font-semibold" size="sm">Active Agents</Text>
          <div className="flex items-center justify-center py-6">
            <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <Text className="mb-3 font-semibold" size="sm">Active Agents</Text>

        {entries.length > 0 ? (
          <div className="space-y-3">
            {entries.map((entry) => {
              const config = getStatusConfig(entry.status);
              const StatusIcon = config.icon;

              return (
                <div key={entry.id} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <StatusIcon
                        className={cn(
                          'h-3.5 w-3.5',
                          config.className,
                          isActive(entry.status) && 'animate-spin',
                        )}
                      />
                      <Text className="font-medium" size="sm">{entry.label}</Text>
                    </div>
                    <Text size="sm" variant="muted">{entry.status}</Text>
                  </div>
                  <Text className="truncate pl-5.5" size="sm" variant="muted">
                    {entry.detail}
                    {entry.startedAt === null ? '' : ` · ${formatRelativeTime(new Date(entry.startedAt).toISOString())}`}
                  </Text>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            description="No agents running"
            icon={Bot}
            size="sm"
            title="No active agents"
          />
        )}
      </CardContent>
    </Card>
  );
}
