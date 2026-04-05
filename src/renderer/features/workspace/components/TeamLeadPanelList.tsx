/**
 * TeamLeadPanelList — Right column: spawn header + team lead cards below.
 */

import { Plus } from 'lucide-react';

import type { WorkspaceSession } from '@shared/ipc/workspace';

import { Button } from '@ui/button';

import { useSpawnTeamLead } from '../api/useWorkspace';

import { TeamLeadPanel } from './TeamLeadPanel';

interface TeamLeadPanelListProps {
  projectId: string;
  sessions: WorkspaceSession[];
}

export function TeamLeadPanelList({ projectId, sessions }: TeamLeadPanelListProps) {
  const spawn = useSpawnTeamLead(projectId);

  const teamLeadSessions = sessions
    .filter((s) => s.key.type === 'team-lead')
    .sort((a, b) => a.key.index - b.key.index);

  return (
    <div className="flex h-full flex-col">
      {/* Header — matches primary panel header height */}
      <div className="border-border flex items-center border-b px-4 py-2">
        <Button
          className="w-full text-xs"
          disabled={spawn.isPending}
          size="sm"
          variant="outline"
          onClick={() => spawn.mutate({})}
        >
          <Plus className="mr-2 h-3 w-3" />
          Spawn Team Lead
        </Button>
      </div>

      {/* Team lead cards */}
      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {teamLeadSessions.map((session) => (
          <TeamLeadPanel key={`${session.key.type}-${session.key.index}`} session={session} />
        ))}
      </div>
    </div>
  );
}
