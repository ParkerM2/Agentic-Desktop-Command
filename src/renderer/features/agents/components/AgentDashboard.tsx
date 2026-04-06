/**
 * AgentDashboard — Shows running orchestrator agent sessions
 */

import { Bot, Clock, Loader2, Square } from 'lucide-react';

import { cn, formatRelativeTime } from '@renderer/shared/lib/utils';

import { Button, EmptyState, PageContent, PageHeader, PageLayout } from '@ui';

import { useAllAgents, useStopAgent } from '../api/useAgents';
import { useAgentEvents } from '../hooks/useAgentEvents';

const statusColors: Record<string, string> = {
  spawning: 'text-blue-400',
  active: 'text-amber-400',
  completed: 'text-emerald-400',
  error: 'text-red-400',
  killed: 'text-zinc-400',
};

const statusLabels: Record<string, string> = {
  spawning: 'Spawning',
  active: 'Running',
  completed: 'Completed',
  error: 'Error',
  killed: 'Killed',
};

export function AgentDashboard() {
  const { data: sessions, isLoading } = useAllAgents();
  const stopAgent = useStopAgent();

  useAgentEvents();

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <PageLayout>
      <PageHeader>
        <PageHeader.Row>
          <PageHeader.Title>Agents</PageHeader.Title>
        </PageHeader.Row>
      </PageHeader>

      <PageContent>
        {sessions && sessions.length > 0 ? (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="border-border flex items-center justify-between rounded-lg border p-4"
              >
                <div className="flex items-center gap-3">
                  <Bot className={cn('h-5 w-5', statusColors[session.status] ?? 'text-zinc-400')} />
                  <div>
                    <p className="text-sm font-medium">
                      {session.phase === 'planning' ? 'Planning' : 'Executing'} — {session.taskId.slice(0, 12)}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {statusLabels[session.status] ?? session.status}
                      {session.pid > 0 ? ` · PID ${String(session.pid)}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground flex items-center gap-1 text-xs">
                    <Clock className="h-3 w-3" />
                    {formatRelativeTime(session.spawnedAt)}
                  </span>

                  {(session.status === 'active' || session.status === 'spawning') ? (
                    <Button
                      className="h-8 w-8 p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      size="icon"
                      title="Stop"
                      variant="ghost"
                      onClick={() => stopAgent.mutate(session.id)}
                    >
                      <Square className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            description="Execute a task to start an agent"
            icon={Bot}
            size="lg"
            title="No agents running"
          />
        )}
      </PageContent>
    </PageLayout>
  );
}
