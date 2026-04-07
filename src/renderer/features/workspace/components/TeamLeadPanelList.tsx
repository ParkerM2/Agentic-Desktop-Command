/**
 * TeamLeadPanelList — Right column: header with spawn button + team lead cards.
 * Cards grow upward from the bottom, newest at top.
 */

import { Plus } from 'lucide-react';

import type { WorkspaceSession } from '@shared/ipc/workspace';

import { Button } from '@ui/button';
import { Text } from '@ui/typography';

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
    .sort((a, b) => b.key.index - a.key.index);

  return (
    <div className="flex h-full flex-col">
      <div className="border-border flex h-10 items-center gap-2 border-b px-4">
        <Text className="font-medium" size="sm" variant="muted">Agent Teams</Text>
        <Button
          className="ml-auto h-7"
          disabled={spawn.isPending}
          size="sm"
          variant="outline"
          onClick={() => spawn.mutate({})}
        >
          <Plus className="h-3.5 w-3.5" />
          Team Lead
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col justify-end overflow-y-auto p-3">
        <div className="space-y-3">
          {teamLeadSessions.map((session) => (
            <TeamLeadPanel key={`${session.key.type}-${String(session.key.index)}`} session={session} />
          ))}
        </div>
      </div>
    </div>
  );
}
