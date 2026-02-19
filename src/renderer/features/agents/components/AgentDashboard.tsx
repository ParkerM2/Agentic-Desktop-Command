/**
 * AgentDashboard — Shows running orchestrator agent sessions
 */

import { Bot, Square, Loader2, Clock } from 'lucide-react';

import { cn, formatRelativeTime } from '@renderer/shared/lib/utils';

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
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="mb-6 text-xl font-bold">Agents</h1>

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

                {(session.status === 'active' || session.status === 'spawning') && (
                  <button
                    className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded p-1.5"
                    title="Stop"
                    onClick={() => stopAgent.mutate(session.id)}
                  >
                    <Square className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="border-border rounded-lg border border-dashed p-12 text-center">
          <Bot className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
          <p className="text-lg font-medium">No agents running</p>
          <p className="text-muted-foreground mt-1 text-sm">Execute a task to start an agent</p>
        </div>
      )}
    </div>
  );
}
