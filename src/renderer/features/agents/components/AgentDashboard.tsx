/**
 * AgentDashboard — Shows running agents for the active project
 */

import { useParams } from '@tanstack/react-router';
import { Bot, Pause, Play, Square, Loader2, Clock } from 'lucide-react';

import type { AgentSession } from '@shared/types';

import { cn, formatRelativeTime } from '@renderer/shared/lib/utils';

import { useAgents, useStopAgent, usePauseAgent, useResumeAgent } from '../api/useAgents';
import { useAgentEvents } from '../hooks/useAgentEvents';

const statusColors: Record<string, string> = {
  idle: 'text-zinc-400',
  running: 'text-amber-400',
  paused: 'text-blue-400',
  error: 'text-red-400',
  completed: 'text-emerald-400',
};

export function AgentDashboard() {
  const { projectId } = useParams({ strict: false });
  const { data: agents, isLoading } = useAgents(projectId ?? null);
  const stopAgent = useStopAgent();
  const pauseAgent = usePauseAgent();
  const resumeAgent = useResumeAgent();

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

      {(agents?.length ?? 0) > 0 ? (
        <div className="space-y-3">
          {agents.map((agent: AgentSession) => (
            <div
              key={agent.id}
              className="border-border flex items-center justify-between rounded-lg border p-4"
            >
              <div className="flex items-center gap-3">
                <Bot className={cn('h-5 w-5', statusColors[agent.status] ?? 'text-zinc-400')} />
                <div>
                  <p className="text-sm font-medium">Agent {agent.id.slice(0, 8)}</p>
                  <p className="text-muted-foreground text-xs">
                    Task: {agent.taskId.slice(0, 8)} · {agent.status}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-muted-foreground flex items-center gap-1 text-xs">
                  <Clock className="h-3 w-3" />
                  {formatRelativeTime(agent.startedAt)}
                </span>

                {agent.status === 'running' && (
                  <>
                    <button
                      className="text-muted-foreground hover:bg-accent hover:text-foreground rounded p-1.5"
                      title="Pause"
                      onClick={() => pauseAgent.mutate(agent.id)}
                    >
                      <Pause className="h-4 w-4" />
                    </button>
                    <button
                      className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded p-1.5"
                      title="Stop"
                      onClick={() => stopAgent.mutate(agent.id)}
                    >
                      <Square className="h-4 w-4" />
                    </button>
                  </>
                )}

                {agent.status === 'paused' && (
                  <button
                    className="text-muted-foreground hover:bg-accent hover:text-foreground rounded p-1.5"
                    title="Resume"
                    onClick={() => resumeAgent.mutate(agent.id)}
                  >
                    <Play className="h-4 w-4" />
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
