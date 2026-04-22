/**
 * AgentDashboard — Shows running agent sessions from the agent dashboard service
 */

import { Bot, Clock, Loader2, Square } from 'lucide-react';

import { cn, formatRelativeTime } from '@renderer/shared/lib/utils';

import { Button, EmptyState, PageContent, PageHeader, PageLayout } from '@ui';

import { useAgentDashboard } from './useAgentDashboard';

const statusColors: Record<string, string> = {
  running: 'text-amber-400',
  idle: 'text-blue-400',
  'needs-attention': 'text-orange-400',
  completed: 'text-emerald-400',
  failed: 'text-red-400',
};

const statusLabels: Record<string, string> = {
  running: 'Running',
  idle: 'Idle',
  'needs-attention': 'Needs Attention',
  completed: 'Completed',
  failed: 'Failed',
};

export function AgentDashboard() {
  const { sessions, isLoading, stopAgent, projectNameMap } = useAgentDashboard();

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  const sessionList = Array.isArray(sessions) ? sessions : [];

  return (
    <PageLayout>
      <PageHeader>
        <PageHeader.Row>
          <PageHeader.Title>Agents</PageHeader.Title>
        </PageHeader.Row>
      </PageHeader>

      <PageContent>
        {sessionList.length > 0 ? (
          <div className="space-y-3">
            {sessionList.map((session) => {
              const projectName = session.projectId
                ? (projectNameMap.get(session.projectId) ?? 'Unknown Project')
                : null;
              return (
              <div
                key={session.id}
                className="border-border flex items-center justify-between rounded-lg border p-4"
              >
                <div className="flex items-center gap-3">
                  <Bot className={cn('h-5 w-5', statusColors[session.status] ?? 'text-zinc-400')} />
                  <div>
                    <p className="text-sm font-medium">
                      {projectName ?? session.name}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {session.type}
                      {' · '}
                      {statusLabels[session.status] ?? session.status}
                      {session.model ? ` · ${session.model}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground flex items-center gap-1 text-xs">
                    <Clock className="h-3 w-3" />
                    {formatRelativeTime(session.startedAt)}
                  </span>

                  {(session.status === 'running' || session.status === 'idle') ? (
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
              );
            })}
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
