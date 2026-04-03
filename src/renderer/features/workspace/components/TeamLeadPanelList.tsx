/**
 * TeamLeadPanelList — Right column: list of team lead cards + spawn button.
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
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-3">
      {teamLeadSessions.map((session) => (
        <TeamLeadPanel key={`${session.key.type}-${session.key.index}`} session={session} />
      ))}

      <Button
        className="mt-auto w-full text-xs"
        disabled={spawn.isPending}
        variant="outline"
        onClick={() => spawn.mutate({})}
      >
        <Plus className="mr-2 h-3 w-3" />
        Spawn Team Lead
      </Button>
    </div>
  );
}
