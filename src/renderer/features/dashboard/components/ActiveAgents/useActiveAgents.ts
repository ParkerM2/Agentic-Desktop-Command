import { useLayoutStore } from '@renderer/shared/stores/layout-store';

import { useAllAgents } from '@features/agents';
import { useWorkspaceSessions } from '@features/workspace/api/useWorkspace';

const ACTIVE_STATUSES = new Set(['active', 'spawning', 'live', 'starting', 'running', 'idle']);

export function isActive(status: string): boolean {
  return ACTIVE_STATUSES.has(status);
}

export interface AgentEntry {
  id: string;
  label: string;
  detail: string;
  status: string;
  startedAt: number | null;
}

export function useActiveAgents() {
  const activeProjectId = useLayoutStore((s) => s.activeProjectId);
  const { data: workspaceSessions = [], isLoading: wsLoading } =
    useWorkspaceSessions(activeProjectId);
  const { data: dashboardSessions, isLoading: dashLoading } = useAllAgents();

  const isLoading = wsLoading || dashLoading;

  const entries: AgentEntry[] = [];

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

  const wsIds = new Set(workspaceSessions.map((s) => s.agentSessionId));
  const dashList = Array.isArray(dashboardSessions) ? dashboardSessions : [];
  for (const dash of dashList) {
    if (wsIds.has(dash.id)) continue;
    if (!isActive(dash.status)) continue;
    entries.push({
      id: `dash-${dash.id}`,
      label: dash.name,
      detail: `${dash.type} · ${dash.model}`,
      status: dash.status,
      startedAt: new Date(dash.startedAt).getTime(),
    });
  }

  return { entries, isLoading };
}
