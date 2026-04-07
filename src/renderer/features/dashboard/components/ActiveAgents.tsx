/**
 * ActiveAgents — Shows running agent sessions from both the orchestrator
 * and workspace/progress systems. Reads from useAgentContext (workspace
 * sessions) and useAllAgents (orchestrator) to provide a unified view.
 */

import { Bot, CheckCircle2, Loader2, XCircle } from 'lucide-react';

import { cn, formatRelativeTime } from '@renderer/shared/lib/utils';
import { useAgentContext } from '@renderer/shared/stores';

import { Card, CardContent, EmptyState, Text } from '@ui';

import { useAllAgents } from '@features/agents';

// ─── Status Mapping ────────────────────────────────────────

const STATUS_ICON = {
  active: { icon: Loader2, className: 'text-info' },
  spawning: { icon: Loader2, className: 'text-info' },
  live: { icon: Loader2, className: 'text-info' },
  starting: { icon: Loader2, className: 'text-info' },
  completed: { icon: CheckCircle2, className: 'text-success' },
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

function isActive(status: string): boolean {
  return status === 'active' || status === 'spawning' || status === 'live' || status === 'starting';
}

// ─── Unified Agent Entry ────────────────────────────────────

interface AgentEntry {
  id: string;
  label: string;
  detail: string;
  status: string;
  startedAt: number | null;
}

// ─── Component ──────────────────────────────────────────────

export function ActiveAgents() {
  // Workspace sessions (primary + team-leads from AgentManagerService)
  const workspaceSessions = useAgentContext((s) => s.sessions);
  const wsLoading = useAgentContext((s) => s.isLoading);

  // Orchestrator sessions (legacy agent orchestrator)
  const { data: orchSessions, isLoading: orchLoading } = useAllAgents();

  const isLoading = wsLoading || orchLoading;

  // Build unified entry list
  const entries: AgentEntry[] = [];

  // Workspace sessions → entries
  for (const ws of workspaceSessions) {
    if (!isActive(ws.status)) continue;
    const typeLabel = ws.key.type === 'primary' ? 'Primary' : `Team Lead #${String(ws.key.index)}`;
    entries.push({
      id: `ws-${ws.agentSessionId}`,
      label: typeLabel,
      detail: ws.model,
      status: ws.status,
      startedAt: ws.startedAt,
    });
  }

  // Orchestrator sessions → entries (deduplicate by session ID)
  const wsIds = new Set(workspaceSessions.map((s) => s.agentSessionId));
  for (const orch of orchSessions ?? []) {
    if (wsIds.has(orch.id)) continue; // already shown via workspace
    if (!isActive(orch.status)) continue;
    entries.push({
      id: `orch-${orch.id}`,
      label: orch.phase,
      detail: `Task: ${orch.taskId}`,
      status: orch.status,
      startedAt: null,
    });
  }

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
                      <Text size="sm" className="font-medium">{entry.label}</Text>
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
