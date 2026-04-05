/**
 * ActiveAgents — Shows running orchestrator agent sessions
 */

import { Bot, CheckCircle2, Loader2, XCircle } from 'lucide-react';

import { cn } from '@renderer/shared/lib/utils';

import { Card, CardContent, EmptyState } from '@ui';

import { useAllAgents } from '@features/agents';

const STATUS_CONFIG = {
  active: { icon: Loader2, className: 'text-info' },
  completed: { icon: CheckCircle2, className: 'text-success' },
  error: { icon: XCircle, className: 'text-destructive' },
} as const;

type DisplayStatus = keyof typeof STATUS_CONFIG;

function isDisplayStatus(status: string): status is DisplayStatus {
  return status === 'active' || status === 'completed' || status === 'error';
}

export function ActiveAgents() {
  const { data: allSessions, isLoading } = useAllAgents();
  const activeSessions = allSessions?.filter(
    (s) => s.status === 'active' || s.status === 'spawning',
  ) ?? [];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <p className="text-foreground mb-3 text-sm font-semibold">Active Agents</p>
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
        <p className="text-foreground mb-3 text-sm font-semibold">Active Agents</p>

        {activeSessions.length > 0 ? (
          <div className="space-y-3">
            {activeSessions.map((session) => {
              const status = isDisplayStatus(session.status) ? session.status : 'active';
              const config = STATUS_CONFIG[status];
              const StatusIcon = config.icon;

              return (
                <div key={session.id} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <StatusIcon
                        className={cn(
                          'h-3.5 w-3.5',
                          config.className,
                          session.status === 'active' && 'animate-spin',
                        )}
                      />
                      <span className="text-foreground text-xs font-medium">{session.phase}</span>
                    </div>
                    <span className="text-muted-foreground text-xs">{session.status}</span>
                  </div>
                  <p className="text-muted-foreground truncate pl-5.5 text-xs">
                    Task: {session.taskId}
                  </p>
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
