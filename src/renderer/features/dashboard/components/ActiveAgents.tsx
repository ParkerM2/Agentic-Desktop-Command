/**
 * ActiveAgents — Shows running agents across all projects
 */

import { Bot, CheckCircle2, Loader2, XCircle } from 'lucide-react';

import type { AgentStatus } from '@shared/types';

import { cn } from '@renderer/shared/lib/utils';

type MockAgentStatus = Extract<AgentStatus, 'running' | 'completed' | 'error'>;

interface MockAgent {
  id: string;
  projectName: string;
  taskName: string;
  status: MockAgentStatus;
  progress: number;
}

const STATUS_CONFIG: Record<MockAgentStatus, { icon: typeof Loader2; className: string }> = {
  running: { icon: Loader2, className: 'text-blue-400' },
  completed: { icon: CheckCircle2, className: 'text-green-400' },
  error: { icon: XCircle, className: 'text-red-400' },
};

/** Placeholder agent data */
const MOCK_AGENTS: MockAgent[] = [
  {
    id: 'ma-1',
    projectName: 'Claude-UI',
    taskName: 'Build dashboard feature',
    status: 'running',
    progress: 65,
  },
  {
    id: 'ma-2',
    projectName: 'API Server',
    taskName: 'Fix auth middleware',
    status: 'running',
    progress: 30,
  },
];

export function ActiveAgents() {
  return (
    <div className="bg-card border-border rounded-lg border p-4">
      <h2 className="text-foreground mb-3 text-sm font-semibold">Active Agents</h2>

      {MOCK_AGENTS.length > 0 ? (
        <div className="space-y-3">
          {MOCK_AGENTS.map((agent) => {
            const config = STATUS_CONFIG[agent.status];
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
                    <span className="text-foreground text-xs font-medium">{agent.projectName}</span>
                  </div>
                  <span className="text-muted-foreground text-xs">{agent.progress}%</span>
                </div>
                <p className="text-muted-foreground truncate pl-5.5 text-xs">{agent.taskName}</p>
                <div className="ml-5.5 h-1 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all"
                    style={{ width: `${String(agent.progress)}%` }}
                  />
                </div>
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
