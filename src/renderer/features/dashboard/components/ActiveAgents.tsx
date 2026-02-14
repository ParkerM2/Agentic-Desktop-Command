/**
 * ActiveAgents — Shows running agents across all projects
 */

import { Bot, CheckCircle2, Loader2, XCircle } from 'lucide-react';

import type { AgentStatus } from '@shared/types';

import { cn } from '@renderer/shared/lib/utils';

import { useAllAgents } from '@features/agents';

type DisplayStatus = Extract<AgentStatus, 'running' | 'completed' | 'error'>;

const STATUS_CONFIG: Record<DisplayStatus, { icon: typeof Loader2; className: string }> = {
  running: { icon: Loader2, className: 'text-blue-400' },
  completed: { icon: CheckCircle2, className: 'text-green-400' },
  error: { icon: XCircle, className: 'text-red-400' },
};

function isDisplayStatus(status: AgentStatus): status is DisplayStatus {
  return status === 'running' || status === 'completed' || status === 'error';
}

export function ActiveAgents() {
  const { data: allAgents, isLoading } = useAllAgents();
  const runningAgents = allAgents?.filter((agent) => agent.status === 'running') ?? [];

  if (isLoading) {
    return (
      <div className="bg-card border-border rounded-lg border p-4">
        <h2 className="text-foreground mb-3 text-sm font-semibold">Active Agents</h2>
        <div className="flex items-center justify-center py-6">
          <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border-border rounded-lg border p-4">
      <h2 className="text-foreground mb-3 text-sm font-semibold">Active Agents</h2>

      {runningAgents.length > 0 ? (
        <div className="space-y-3">
          {runningAgents.map((agent) => {
            const status = isDisplayStatus(agent.status) ? agent.status : 'running';
            const config = STATUS_CONFIG[status];
            const StatusIcon = config.icon;

            return (
              <div key={agent.id} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StatusIcon
                      className={cn(
                        'h-3.5 w-3.5',
                        config.className,
                        agent.status === 'running' && 'animate-spin',
                      )}
                    />
                    <span className="text-foreground text-xs font-medium">{agent.projectId}</span>
                  </div>
                  <span className="text-muted-foreground text-xs">{agent.status}</span>
                </div>
                <p className="text-muted-foreground truncate pl-5.5 text-xs">
                  Task: {agent.taskId}
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-6 text-center">
          <Bot className="text-muted-foreground mx-auto mb-2 h-8 w-8" />
          <p className="text-muted-foreground text-xs">No agents running</p>
        </div>
      )}
    </div>
  );
}
